// ==================== GoalRegistry 目标注册表 ====================

class GoalRegistry {
    constructor() {
        this.goals = new Map();
    }
    
    /**
     * 注册一个目标类型
     * @param {string} type - 目标类型
     * @param {Object} def
     * @param {Object} def.meta - 元数据
     * @param {Function} def.check - 检查是否达成 (game, config) => bool
     * @param {Function} def.progress - 获取进度 (game, config) => { current, target }
     */
    register(type, def) {
        if (!def || typeof def.check !== 'function') {
            throw new Error(`GoalRegistry: 目标 ${type} 必须有 check 函数`);
        }
        
        this.goals.set(type, {
            type,
            meta: def.meta || {
                label: type,
                description: '',
                params: []
            },
            check: def.check,
            progress: def.progress || null
        });
        
        return this;
    }
    
    get(type) {
        return this.goals.get(type) || null;
    }
    
    has(type) {
        return this.goals.has(type);
    }
    
    getAllMeta() {
        const result = [];
        for (const [type, def] of this.goals) {
            result.push({ type, ...def.meta });
        }
        return result;
    }
    
    clear() {
        this.goals.clear();
    }
}

window.GoalRegistry = GoalRegistry;