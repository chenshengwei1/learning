// ==================== DOM工具 ====================

class DOMHelper {
    constructor() {
        this._domCache = {};
    }
    
    ref(id) {
        if (!this._domCache[id]) this._domCache[id] = document.getElementById(id);
        return this._domCache[id];
    }
    
    refChain(id, fn) {
        const el = this.ref(id);
        if (el) fn(el);
        return el;
    }
    
    clearCache() {
        this._domCache = {};
    }
}

// 单例导出
const dom = new DOMHelper();

// 全局便捷函数
function $(id) { return dom.ref(id); }
function $$(id, fn) { return dom.refChain(id, fn); }

// 文件末尾：
window.DOMHelper = DOMHelper;
window.dom = dom;
window.$ = $;
window.$$ = $$;