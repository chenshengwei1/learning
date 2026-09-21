// ==================== ActionRegistry 动作注册表 ====================

class ActionRegistry {
    constructor() {
        this.actions = new Map();  // type -> { meta, validate, execute }
    }
    
    /**
     * 注册一个动作
     * @param {string} type - 动作类型（唯一标识）
     * @param {Object} def - 动作定义
     * @param {Object} def.meta - 元数据（给表单用）
     * @param {Function} def.validate - 参数校验（可选）
     * @param {Function} def.execute - 执行逻辑
     */
    register(type, def) {
        if (!type || typeof type !== 'string') {
            throw new Error('ActionRegistry: type 必须是非空字符串');
        }
        if (!def || typeof def.execute !== 'function') {
            throw new Error(`ActionRegistry: 动作 ${type} 必须有 execute 函数`);
        }
        
        this.actions.set(type, {
            type,
            meta: def.meta || {
                label: type,
                description: '',
                category: '其他',
                params: []
            },
            validate: def.validate || null,
            execute: def.execute
        });
        
        return this;
    }
    
    /**
     * 获取动作定义
     */
    get(type) {
        return this.actions.get(type) || null;
    }
    
    /**
     * 检查是否存在
     */
    has(type) {
        return this.actions.has(type);
    }
    
    /**
     * 获取所有动作的元数据（用于生成表单）
     */
    getAllMeta() {
        const result = [];
        for (const [type, def] of this.actions) {
            result.push({
                type,
                ...def.meta
            });
        }
        return result;
    }
    
    /**
     * 按分类分组
     */
    getMetaByCategory() {
        const groups = {};
        for (const [type, def] of this.actions) {
            const cat = def.meta.category || '其他';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push({ type, ...def.meta });
        }
        return groups;
    }
    
    /**
     * 清空（用于测试）
     */
    clear() {
        this.actions.clear();
    }
}

window.ActionRegistry = ActionRegistry;