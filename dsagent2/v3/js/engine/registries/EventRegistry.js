// ==================== EventRegistry 事件注册表 ====================

class EventRegistry {
    constructor() {
        this.events = new Map();  // type -> { meta, match }
    }
    
    /**
     * 注册一个事件
     * @param {string} type - 事件类型（唯一标识）
     * @param {Object} def - 事件定义
     * @param {Object} def.meta - 元数据（给表单用）
     * @param {Function} def.match - 判断配置是否响应此事件 (config, event) => bool
     */
    register(type, def) {
        if (!type || typeof type !== 'string') {
            throw new Error('EventRegistry: type 必须是非空字符串');
        }
        if (!def || typeof def.match !== 'function') {
            throw new Error(`EventRegistry: 事件 ${type} 必须有 match 函数`);
        }
        
        this.events.set(type, {
            type,
            meta: def.meta || {
                label: type,
                description: '',
                category: '其他',
                params: []
            },
            match: def.match
        });
        
        return this;
    }
    
    get(type) {
        return this.events.get(type) || null;
    }
    
    has(type) {
        return this.events.has(type);
    }
    
    getAllMeta() {
        const result = [];
        for (const [type, def] of this.events) {
            result.push({
                type,
                ...def.meta
            });
        }
        return result;
    }
    
    getMetaByCategory() {
        const groups = {};
        for (const [type, def] of this.events) {
            const cat = def.meta.category || '其他';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push({ type, ...def.meta });
        }
        return groups;
    }
    
    clear() {
        this.events.clear();
    }
}

window.EventRegistry = EventRegistry;