// ==================== SelectorRegistry 选择器注册表 ====================

class SelectorRegistry {
    constructor() {
        this.selectors = new Map();  // type -> { meta, resolve }
    }
    
    /**
     * 注册一个选择器
     * @param {string} type - 选择器类型
     * @param {Object} def - 定义
     * @param {Object} def.meta - 元数据
     * @param {Function} def.resolve - 解析函数 (board, config, context) => Set<"r,c">
     */
    register(type, def) {
        if (!def || typeof def.resolve !== 'function') {
            throw new Error(`SelectorRegistry: 选择器 ${type} 必须有 resolve 函数`);
        }
        
        this.selectors.set(type, {
            type,
            meta: def.meta || {
                label: type,
                description: '',
                params: []
            },
            resolve: def.resolve
        });
        
        return this;
    }
    
    get(type) {
        return this.selectors.get(type) || null;
    }
    
    has(type) {
        return this.selectors.has(type);
    }
    
    getAllMeta() {
        const result = [];
        for (const [type, def] of this.selectors) {
            result.push({ type, ...def.meta });
        }
        return result;
    }
    
    clear() {
        this.selectors.clear();
    }
}

window.SelectorRegistry = SelectorRegistry;