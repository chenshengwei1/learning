// ==================== ConditionRegistry 条件注册表 ====================

class ConditionRegistry {
    constructor() {
        this.conditions = new Map();
    }
    
    register(type, def) {
        if (!def || typeof def.match !== 'function') {
            throw new Error(`ConditionRegistry: 条件 ${type} 必须有 match 函数`);
        }
        
        this.conditions.set(type, {
            type,
            meta: def.meta || {
                label: type,
                description: '',
                params: []
            },
            match: def.match
        });
        
        return this;
    }
    
    get(type) {
        return this.conditions.get(type) || null;
    }
    
    has(type) {
        return this.conditions.has(type);
    }
    
    getAllMeta() {
        const result = [];
        for (const [type, def] of this.conditions) {
            result.push({ type, ...def.meta });
        }
        return result;
    }
    
    clear() {
        this.conditions.clear();
    }
}

window.ConditionRegistry = ConditionRegistry;