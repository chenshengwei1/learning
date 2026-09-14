// ==================== 工具函数 ====================

function posToKey(r, c) { return `${r},${c}`; }

function keyToPos(key) {
    const [r, c] = key.split(',').map(Number);
    return { r, c };
}

function isTransparent(v) {
    return !v || String(v).trim().toLowerCase() === 'transparent';
}

function toCssHex(v, fallback = '#888888') {
    if (isTransparent(v)) return fallback;
    const m = String(v).trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(m)) {
        return m.length === 4
            ? '#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]
            : m;
    }
    return fallback;
}

function debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const result = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = deepClone(obj[key]);
        }
    }
    return result;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 导出
window.Utils = {
    posToKey, keyToPos,
    isTransparent, toCssHex,
    debounce, deepClone, clamp, sleep
};