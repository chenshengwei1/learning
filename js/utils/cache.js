// ==================== 缓存工具 ====================

 class SimpleCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (item) {
            this.cache.delete(key);
            this.cache.set(key, item);
            return item.value;
        }
        return null;
    }
    
    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, { value });
    }
    
    clear() { this.cache.clear(); }
}

window.SimpleCache = SimpleCache;