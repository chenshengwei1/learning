// ==================== 工具函数 ====================

// 位置转换
function posToKey(r, c) { return `${r},${c}`; }
function keyToPos(key) {
    const [r, c] = key.split(',').map(Number);
    return { r, c };
}

// 颜色处理
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
    const rgb = m.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (rgb) {
        const t = n => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, '0');
        return '#' + t(rgb[1]) + t(rgb[2]) + t(rgb[3]);
    }
    return fallback;
}

function hexLuminance(hex) {
    const full = (String(hex || '').replace('#').length === 3
        ? String(hex || '').replace('#').split('').map(c => c + c).join('')
        : String(hex || '').replace('#')) || '888888';
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function contrastPatternColor(bg) {
    return isTransparent(bg)
        ? 'rgba(255,255,255,0.7)'
        : hexLuminance(toCssHex(bg, '#888888')) > 0.55
            ? 'rgba(0,0,0,0.55)'
            : 'rgba(255,255,255,0.7)';
}

// 防抖
function debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// 深拷贝
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

// 范围限制
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// 睡眠
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 导出
window.Utils = {
    posToKey, keyToPos,
    isTransparent, toCssHex, hexLuminance, contrastPatternColor,
    debounce, deepClone, clamp, sleep
};