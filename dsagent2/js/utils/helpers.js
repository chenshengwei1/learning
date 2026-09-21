// ==================== 工具函数 ====================


function isTransparent(v) { 
    return !v || String(v).trim().toLowerCase() === 'transparent'; 
}

function toCssHex(v, fallback = '#888888') {
    if (isTransparent(v)) return fallback;
    const m = String(v).trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(m)) {
        return m.length === 4 ? '#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3] : m;
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
    const n = parseInt(full, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function contrastPatternColor(bg) {
    return isTransparent(bg) 
        ? 'rgba(255,255,255,0.7)' 
        : hexLuminance(toCssHex(bg, '#888888')) > 0.55 
            ? 'rgba(0,0,0,0.55)' 
            : 'rgba(255,255,255,0.7)';
}

const idxToRC = (idx, c) => ({ r: Math.floor(idx / c), c: idx % c });
const rcToIdx = (r, c, cols) => r * cols + c;

function getPieceTypeCodeById(idOrCode, pieceTypes) {
    if (!idOrCode) return null;
    const m = (pieceTypes || []).find(t => t && (t.id === idOrCode || t.code === idOrCode || DEFAULT_TYPE_CODES[t.id] === idOrCode));
    return m ? (m.code || m.id) : idOrCode;
}

function getPieceTypeUIOption(type) {
    const code = type.code || DEFAULT_TYPE_CODES[type.id] || type.id;
    const cfg = Array.isArray(type.pieceUI?.type?.options) 
        ? type.pieceUI.type.options.find(o => String(o.value) === String(code) || String(o.value) === String(type.id)) 
        : null;
    return { 
        value: code, 
        label: cfg?.label || (type.id === BLANK_PIECE_TYPE ? '空白棋子' : type.label || type.id) 
    };
}

function sanitizeWallConfig(walls) {
    const r = {};
    for (const s of WALL_SIDES) {
        const raw = (walls && typeof walls === 'object') ? walls[s] || {} : {}, 
              hp = Number(raw.hp ?? raw.maxHp ?? 0);
        r[s] = {
            enabled: Boolean(raw.enabled) && hp > 0, 
            hp: Number.isFinite(hp) ? Math.max(0, hp) : 0,
            maxHp: Number.isFinite(Number(raw.maxHp ?? hp)) ? Math.max(0, Number(raw.maxHp ?? hp)) : Math.max(0, hp),
            color: typeof raw.color === 'string' ? raw.color : '#ffffff'
        };
    }
    return r;
}

function splitPieceTypeEntries(raw) {
    if (!raw) return [];
    const items = []; 
    let cur = '', depth = 0;
    const fin = () => { const t = cur.trim(); if (t) items.push(t); cur = ''; };
    for (const ch of String(raw)) {
        if (ch === '(') depth++;
        else if (ch === ')') depth = Math.max(0, depth - 1);
        else if ((ch === ';' || ch === '\n') && depth === 0) { fin(); continue; }
        else if (ch === ',' && depth === 0) {
            const cand = cur.trim(), ci = cand.indexOf(':');
            if (ci > 0 && cand.slice(0, ci).trim() && cand.slice(ci + 1).trim()) { fin(); continue; }
        }
        cur += ch;
    }
    fin(); 
    return items.filter(Boolean);
}

function parsePieceTypeEntry(entry, fallbackId = 'piece') {
    const t = String(entry || '').trim(); 
    if (!t) return null;
    const ci = t.indexOf(':');
    if (ci <= 0) { 
        const id = (t || fallbackId).trim() || fallbackId; 
        return { id, id, char: id, color: '#888', background: '#888', pattern: 'dot', patternColor: 'rgba(255,255,255,0.22)', pieceColor: '#ffffff', borderColor: 'rgba(255,255,255,0.3)', walls: {} }; 
    }
    const id = t.slice(0, ci).trim() || fallbackId, tail = t.slice(ci + 1).trim();
    const [colPart, ...optParts] = tail.split('|');
    const optMap = {};
    for (const seg of (optParts.join('|') ? optParts.join('|').split('|') : [])) {
        const i = seg.indexOf('='); 
        if (i === -1) continue; 
        const n = seg.slice(0, i).trim(), v = seg.slice(i + 1).trim(); 
        if (n) optMap[n] = v;
    }
    const walls = {};
    for (const s of WALL_SIDES) {
        const cap = s[0].toUpperCase() + s.slice(1);
        const rawEn = optMap[`wall${cap}`] ?? optMap[`wall${cap}Enabled`];
        const hpV = optMap[`wall${cap}Hp`] ?? optMap[`wall${cap}Value`] ?? 0;
        walls[s] = { 
            enabled: String(rawEn ?? 'false').trim().toLowerCase() === 'true' || rawEn === true, 
            hp: Number(hpV || 0), 
            maxHp: Number(hpV || 0), 
            color: optMap[`wall${cap}Color`] || 'rgba(255,255,255,0.9)' 
        };
    }
    let charO = ''; 
    if (optMap.char) { 
        try { charO = decodeURIComponent(optMap.char); } 
        catch { charO = optMap.char; } 
    }
    const safeChar = (charO && !charO.includes('(') && !charO.includes(',')) ? charO.trim() : id;
    let codeO = ''; 
    if (optMap.code) { 
        try { codeO = decodeURIComponent(optMap.code); } 
        catch { codeO = optMap.code; } 
    }
    let typeOpts = null; 
    if (optMap.typeOptions) { 
        try { typeOpts = JSON.parse(decodeURIComponent(optMap.typeOptions)); } 
        catch { typeOpts = null; } 
    }
    const resolvedCode = id === BLANK_PIECE_TYPE 
        ? BLANK_PIECE_CODE 
        : id === EMPTY_CELL_VALUE 
            ? '-' 
            : (codeO && codeO !== id ? codeO : id);
    return {
        id, 
        code: resolvedCode, 
        isPiece: id !== EMPTY_CELL_VALUE, 
        char: safeChar, 
        color: (colPart || '#888').trim(), 
        background: (colPart || '#888').trim(),
        pattern: optMap.pattern || 'dot', 
        patternColor: optMap.patternColor || 'rgba(255,255,255,0.22)',
        pieceColor: optMap.pieceColor || '#ffffff', 
        borderColor: optMap.borderColor || 'rgba(255,255,255,0.3)',
        pieceUI: typeOpts ? { type: { options: typeOpts } } : {}, 
        walls
    };
}

function normalizePieceTypes(value, defaultPieceTypes) {
    if (!value) return [...defaultPieceTypes];
    if (Array.isArray(value)) {
        const r = value.map((e, i) => e && typeof e === 'object' && e.id ? e : parsePieceTypeEntry(e, `piece${i + 1}`)).filter(Boolean);
        _ensureSpecial(r, defaultPieceTypes); 
        return r;
    }
    if (typeof value === 'string') {
        const r = splitPieceTypeEntries(value).map((e, i) => parsePieceTypeEntry(e, `piece${i + 1}`)).filter(Boolean);
        _ensureSpecial(r, defaultPieceTypes); 
        return r;
    }
    return [...defaultPieceTypes];
}

function _ensureSpecial(r, defaultPieceTypes) {
    const blank = defaultPieceTypes.find(e => e.id === BLANK_PIECE_TYPE);
    const empty = defaultPieceTypes.find(e => e.id === EMPTY_CELL_VALUE);
    if (!r.some(e => e.id === BLANK_PIECE_TYPE) && blank) 
        r.push({ ...blank });
    if (!r.some(e => e.id === EMPTY_CELL_VALUE) && empty) 
        r.push({ ...empty });
}

function debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// 文件末尾：
Object.assign(window, {
    isTransparent,
    toCssHex,
    hexLuminance,
    contrastPatternColor,
    idxToRC,
    rcToIdx,
    getPieceTypeCodeById,
    getPieceTypeUIOption,
    sanitizeWallConfig,
    splitPieceTypeEntries,
    parsePieceTypeEntry,
    normalizePieceTypes,
    debounce
});