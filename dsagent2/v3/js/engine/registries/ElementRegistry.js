// ==================== ElementRegistry 元素注册表 ====================

class ElementRegistry {
    constructor() {
        this.elements = new Map();  // id -> 元素配置
    }
    
    /**
     * 注册一个元素
     * @param {Object} element - 元素配置
     *   {
     *     id: 'ice',
     *     name: '冰块',
     *     category: 'obstacle',
     *     svg: 'covers/ice.svg',
     *     layer: 'obstacle',
     *     properties: { hp: 3 },
     *     events: [
     *       { event: 'onAdjacent', when: {...}, actions: [...] }
     *     ]
     *   }
     */
    register(element) {
        if (!element?.id) throw new Error('ElementRegistry: 元素必须有 id');
        this.elements.set(element.id, deepClone(element));
        return this;
    }
    
    get(id) {
        return this.elements.get(id) || null;
    }
    
    has(id) {
        return this.elements.has(id);
    }
    
    getAll() {
        return Array.from(this.elements.values());
    }
    
    getByCategory(category) {
        const result = [];
        for (const el of this.elements.values()) {
            if (el.category === category) result.push(el);
        }
        return result;
    }
    
    /**
     * 清空
     */
    clear() {
        this.elements.clear();
    }
    
    /**
     * 批量注册
     */
    registerAll(elements) {
        for (const el of elements) {
            this.register(el);
        }
        return this;
    }
}

window.ElementRegistry = ElementRegistry;