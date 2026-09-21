// ==================== VariableResolver 变量解析器 ====================

class VariableResolver {
    /**
     * 解析配置中的变量
     * @param {any} value - 可能是变量字符串，也可能是普通值
     * @param {Object} context - 变量作用域
     */
    static resolve(value, context) {
        if (typeof value !== 'string') return value;
        if (!value.startsWith('$')) return value;
        
        const varName = value.slice(1);
        return context[varName] !== undefined ? context[varName] : null;
    }
    
    /**
     * 递归解析对象中的所有变量
     */
    static resolveDeep(obj, context) {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') return this.resolve(obj, context);
        if (Array.isArray(obj)) return obj.map(item => this.resolveDeep(item, context));
        if (typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                result[key] = this.resolveDeep(obj[key], context);
            }
            return result;
        }
        return obj;
    }
    
    /**
     * 检查是否是变量
     */
    static isVariable(value) {
        return typeof value === 'string' && value.startsWith('$');
    }
}

window.VariableResolver = VariableResolver;