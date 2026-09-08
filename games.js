/* ================================================================
 *  🍬 糖果消消乐 v5 - 规则引擎架构（重构版）
 *  设计模式：策略模式 + 工厂模式 + 观察者模式
 * ================================================================ */

// ==================== 常量与配置 ====================
const EMPTY_CELL_VALUE = 'empty';
const BLANK_PIECE_TYPE = 'blank';
const BLANK_PIECE_CODE = 'Z';
const DEFAULT_TYPE_CODES = { apple: 'A', grape: 'B', orange: 'C', lemon: 'D', straw: 'E', water: 'F' };
const WALL_SIDES = ['top', 'right', 'bottom', 'left'];
const WALL_HP_MAP = { none: 0, low: 1, medium: 2, high: 3 };
const EMPTY_TOKENS = new Set(['-', '_', '.', 'empty', 'null', 'none']);
const STATE_TOKENS = new Set(['locked', 'frozen', 'bomb']);

// 性能与稳定性常量
const MAX_STABILIZE_ATTEMPTS = 100;
const MAX_RANDOM_ATTEMPTS = 50;
const FROZEN_CHANCE = 0.12;
const MAX_LEVELS_STORED = 20;
const HINT_DISPLAY_DURATION = 1500;
const MESSAGE_DISPLAY_DURATION = 1600;
const SWAP_ANIMATION_DURATION = 250;
const REMOVE_ANIMATION_DURATION = 300;
const EXPLOSION_ANIMATION_DURATION = 400;
const GRAVITY_ANIMATION_DURATION = 360;

const DEFAULT_PIECE_UI = {
    background: { opacity: 0.35, priority: 0 },
    type: { fontSize: 0.55, priority: 1 },
    walls: { priority: 2, color: '#facc15' },
    ices: { priority: 3, color: 'rgba(190,235,255,0.42)' },
    frozen: { priority: 3, color: 'rgba(255,200,0,0.5)' },
};

function _makeDefaultWalls() {
    const w = {};
    for (const s of WALL_SIDES) w[s] = { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' };
    return w;
}

const DEFAULT_CONFIG = {
    rows: 10, cols: 10, cellSize: 60, gap: 4, totalMoves: 30, matchLength: 3, dragThreshold: 15,
    enableTimeLimit: false, timeLimitSeconds: 90,
    targetScore: 50000, targetScoreEnabled: true,
    requiredPieceType: 'A', requiredPieceCount: 10, requiredPieceEnabled: false,
    initialBoard: null,
    enableSquare: true, enableDiagonal: false, enableDrag: true,
    explodeRules: { 4: 'cross', 5: 'screen', 6: 'blast:2' },
    baseScore: 10, comboMultiplier: true,
    pieceTypes: [
        { id: 'apple', code: 'A', char: '🍎', color: '#ff6b6b', background: '#ff6b6b', pattern: 'dot', patternColor: 'rgba(255,255,255,0.28)', pieceColor: '#fff7f7', pieceUI: { type: { options: [{ value: 'A', label: 'apple' }] } }, walls: _makeDefaultWalls() },
        { id: 'grape', code: 'B', char: '🍇', color: '#a855f7', background: '#a855f7', pattern: 'stripe', patternColor: 'rgba(255,255,255,0.22)', pieceColor: '#ffffff', pieceUI: { type: { options: [{ value: 'B', label: 'grape' }] } }, walls: _makeDefaultWalls() },
        { id: 'orange', code: 'C', char: '🍊', color: '#fb923c', background: '#fb923c', pattern: 'check', patternColor: 'rgba(255,255,255,0.24)', pieceColor: '#fffaf1', pieceUI: { type: { options: [{ value: 'C', label: 'orange' }] } }, walls: _makeDefaultWalls() },
        { id: 'lemon', code: 'D', char: '🍋', color: '#facc15', background: '#facc15', pattern: 'spark', patternColor: 'rgba(255,255,255,0.20)', pieceColor: '#fffef3', pieceUI: { type: { options: [{ value: 'D', label: 'lemon' }] } }, walls: _makeDefaultWalls() },
        { id: 'straw', code: 'E', char: '🍓', color: '#ec4899', background: '#ec4899', pattern: 'dot', patternColor: 'rgba(255,255,255,0.20)', pieceColor: '#fff4f8', pieceUI: { type: { options: [{ value: 'E', label: 'straw' }] } }, walls: _makeDefaultWalls() },
        { id: 'water', code: 'F', char: '🍉', color: '#34d399', background: '#34d399', pattern: 'waves', patternColor: 'rgba(255,255,255,0.22)', pieceColor: '#f0fff7', pieceUI: { type: { options: [{ value: 'F', label: 'water' }] } }, walls: _makeDefaultWalls() },
        { id: BLANK_PIECE_TYPE, code: BLANK_PIECE_CODE, isPiece: true, char: '', color: 'transparent', background: 'transparent', pattern: 'transparent', patternColor: 'transparent', pieceColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)', walls: _makeDefaultWalls() },
        { id: EMPTY_CELL_VALUE, code: '-', isPiece: false, char: '', color: 'transparent', background: 'transparent', pattern: 'transparent', patternColor: 'transparent', pieceColor: 'transparent', borderColor: 'transparent', walls: _makeDefaultWalls() },
    ],
};

const CONFIG_KEY = 'candy_crush_config_v5';
const LEVELS_KEY = 'candy_crush_levels_v5';

// ==================== 工具函数 ====================
function isTransparent(v) { return !v || String(v).trim().toLowerCase() === 'transparent'; }

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

// ==================== UI 辅助 ====================
function syncTileGroups() {
    document.querySelectorAll('.tile-group').forEach(g => {
        const sel = g.previousElementSibling;
        if (!sel || sel.tagName?.toLowerCase() !== 'select') return;
        const v = String(sel.value ?? '');
        g.querySelectorAll('.option-tile').forEach(t => 
            t.classList.toggle('selected', String(t.dataset.value) === v)
        );
    });
}

function buildTileOptions(sel, opts, selectedVal, onSelect) {
    const container = sel?.nextElementSibling;
    if (!container?.classList?.contains('tile-group')) return;
    container.innerHTML = '';
    const v = String(selectedVal ?? sel.value ?? '');
    opts.forEach(o => {
        const btn = document.createElement('button');
        btn.type = 'button'; 
        btn.className = 'option-tile'; 
        btn.textContent = o.label;
        btn.title = o.title || o.label; 
        btn.dataset.value = String(o.value);
        if (String(o.value) === v) btn.classList.add('selected');
        btn.addEventListener('click', () => { 
            sel.value = o.value; 
            onSelect?.(o.value); 
            syncTileGroups(); 
        });
        container.appendChild(btn);
    });
    syncTileGroups();
}

function updateLevelList() {
    const el = document.getElementById('admin-level-list'); 
    if (!el) return;
    try {
        const levels = JSON.parse(localStorage.getItem(LEVELS_KEY) || '[]');
        if (!Array.isArray(levels) || !levels.length) {
            el.innerHTML = '<div class="level-pill"><span>暂无保存关卡</span></div>';
            return;
        }
        el.innerHTML = '';
        levels.forEach(l => {
            const row = document.createElement('div');
            row.className = 'level-pill';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = l?.name || '未命名关卡';
            row.appendChild(nameSpan);
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = '加载';
            btn.addEventListener('click', () => { 
                if (l?.config) { 
                    const c = sanitizeConfig(l.config); 
                    window.__gameEngine?.applyConfig(c); 
                    window.__gameEngine?.init(); 
                    window.__gameEngine?.setMode('admin'); 
                    window.__gameEngine?.showMessage('✅ 已加载关卡：' + (c.name || l.name || '未命名关卡')); 
                } 
            });
            row.appendChild(btn);
            el.appendChild(row);
        });
    } catch {
        el.innerHTML = '<div class="level-pill"><span>关卡列表不可用</span></div>';
    }
}

// ==================== 配置解析 ====================
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

function normalizePieceTypes(value) {
    if (!value) return [...DEFAULT_CONFIG.pieceTypes];
    if (Array.isArray(value)) {
        const r = value.map((e, i) => e && typeof e === 'object' && e.id ? e : parsePieceTypeEntry(e, `piece${i + 1}`)).filter(Boolean);
        _ensureSpecial(r); 
        return r;
    }
    if (typeof value === 'string') {
        const r = splitPieceTypeEntries(value).map((e, i) => parsePieceTypeEntry(e, `piece${i + 1}`)).filter(Boolean);
        _ensureSpecial(r); 
        return r;
    }
    return [...DEFAULT_CONFIG.pieceTypes];
}

function _ensureSpecial(r) {
    if (!r.some(e => e.id === BLANK_PIECE_TYPE)) 
        r.push({ ...DEFAULT_CONFIG.pieceTypes.find(e => e.id === BLANK_PIECE_TYPE) });
    if (!r.some(e => e.id === EMPTY_CELL_VALUE)) 
        r.push({ ...DEFAULT_CONFIG.pieceTypes.find(e => e.id === EMPTY_CELL_VALUE) });
}

function sanitizeConfig(raw) {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
    const fb = { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] }, safe = { ...fb, ...raw };
    const clamp = (k, a, b) => { const v = Number(raw[k]); safe[k] = Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : fb[k]; };
    clamp('rows', 2, 20); clamp('cols', 2, 20); clamp('cellSize', 20, 100); clamp('gap', 0, 12);
    clamp('totalMoves', 1, Infinity); clamp('matchLength', 3, 6); clamp('timeLimitSeconds', 10, Infinity);
    clamp('baseScore', 1, Infinity); clamp('targetScore', 0, Infinity);
    safe.enableTimeLimit = safe.targetScoreEnabled = safe.requiredPieceEnabled = safe.enableSquare = safe.enableDiagonal = safe.comboMultiplier = false;
    safe.enableTimeLimit = raw.enableTimeLimit === true;
    safe.targetScoreEnabled = raw.targetScoreEnabled !== false;
    safe.requiredPieceEnabled = raw.requiredPieceEnabled === true;
    safe.requiredPieceType = (typeof raw.requiredPieceType === 'string' && raw.requiredPieceType.trim()) ? raw.requiredPieceType.trim() : 'A';
    safe.requiredPieceCount = Number.isFinite(Number(raw.requiredPieceCount)) ? Math.max(0, Number(raw.requiredPieceCount)) : 10;
    safe.enableSquare = Boolean(raw.enableSquare); 
    safe.enableDiagonal = Boolean(raw.enableDiagonal);
    safe.enableDrag = raw.enableDrag !== false; 
    safe.comboMultiplier = raw.comboMultiplier !== false;
    const np = normalizePieceTypes(raw.pieceTypes || fb.pieceTypes);
    if (np.length >= 2) {
        safe.pieceTypes = np.map(p => {
            const n = { ...p }; 
            n.id = String(n.id || 'piece'); 
            n.isPiece = n.id === EMPTY_CELL_VALUE ? false : n.isPiece !== false;
            n.code = String((DEFAULT_TYPE_CODES[n.id] && (!n.code || n.code === n.id)) 
                ? DEFAULT_TYPE_CODES[n.id] 
                : (n.code || (n.id === BLANK_PIECE_TYPE ? BLANK_PIECE_CODE : n.id)));
            n.char = n.id === BLANK_PIECE_TYPE ? '' : (n.id === EMPTY_CELL_VALUE ? '' : (typeof n.char === 'string' && n.char ? n.char : n.id));
            n.color = typeof n.color === 'string' && n.color ? n.color : '#888';
            n.background = typeof n.background === 'string' && n.background ? n.background : n.color;
            n.pattern = typeof n.pattern === 'string' ? n.pattern : 'dot';
            n.patternColor = typeof n.patternColor === 'string' ? n.patternColor : 'rgba(255,255,255,0.22)';
            n.pieceColor = typeof n.pieceColor === 'string' ? n.pieceColor : '#ffffff';
            n.borderColor = typeof n.borderColor === 'string' ? n.borderColor : 'rgba(255,255,255,0.3)';
            n.pieceUI = n.pieceUI && typeof n.pieceUI === 'object' ? n.pieceUI : {};
            n.pieceUI.type = n.pieceUI.type && typeof n.pieceUI.type === 'object' ? n.pieceUI.type : {};
            n.pieceUI.type.options = Array.isArray(n.pieceUI.type.options) 
                ? n.pieceUI.type.options.map(o => ({ ...o, value: o.value === n.id ? n.code : o.value })) 
                : [{ value: n.code, label: n.id === BLANK_PIECE_TYPE ? '空白棋子' : (n.label || n.id) }];
            n.walls = sanitizeWallConfig(n.walls || {}); 
            return n;
        });
    } else { 
        safe.pieceTypes = [...fb.pieceTypes]; 
    }
    safe.explodeRules = (raw.explodeRules && typeof raw.explodeRules === 'object') 
        ? { ...fb.explodeRules, ...raw.explodeRules } 
        : { ...fb.explodeRules };
    if (Array.isArray(raw.initialBoard)) 
        safe.initialBoard = raw.initialBoard.map(row => Array.isArray(row) 
            ? row.map(cell => cell && typeof cell === 'object' && !Array.isArray(cell) 
                ? JSON.parse(JSON.stringify(cell)) 
                : String(cell ?? '')) 
            : []);
    else safe.initialBoard = null;
    return safe;
}

function readAdminRuleForm() {
    const g = (id, f = '') => { const e = document.getElementById(id); return e ? (e.value ?? f) : f; };
    return {
        targetScoreEnabled: document.getElementById('admin-target-score-enabled')?.checked ?? true,
        targetScore: Number.isFinite(Number(g('admin-target-score', '50000'))) ? Math.max(0, Number(g('admin-target-score', '50000'))) : 50000,
        enableTimeLimit: document.getElementById('admin-enable-time-limit')?.checked ?? false,
        timeLimitSeconds: Number.isFinite(Number(g('admin-time-limit-seconds', '90'))) ? Math.max(10, Number(g('admin-time-limit-seconds', '90'))) : 90,
        totalMoves: Number.isFinite(Number(g('admin-total-moves', '30'))) ? Math.max(1, Number(g('admin-total-moves', '30'))) : 30,
        requiredPieceEnabled: document.getElementById('admin-required-piece-enabled')?.checked ?? false,
        requiredPieceType: g('admin-required-piece-type', 'A'),
        requiredPieceCount: Number.isFinite(Number(g('admin-required-piece-count', '10'))) ? Math.max(0, Number(g('admin-required-piece-count', '10'))) : 10,
        levelName: document.getElementById('admin-level-name')?.value?.trim() || '',
    };
}

// ==================== Piece ====================
class Piece {
    constructor(typeId, color, char, def = {}) {
        this.id = def.id || typeId; 
        this.local = { x: Number(def.x || 0), y: Number(def.y || 0) };
        this.background = { 
            type: def.background || color || '#888', 
            pattern: def.pattern || 'solid', 
            patternColor: def.patternColor || 'rgba(255,255,255,0.22)', 
            priority: Number(def.backgroundPriority ?? 0) 
        };
        this.type = { 
            value: def.code || typeId, 
            priority: Number(def.typePriority ?? 1) 
        };
        this.isPiece = def.isPiece !== false;
        this.walls = this._normWalls(def.walls || {}); 
        this.walls.priority = Number(def.wallsPriority ?? 2);
        this.ices = { 
            level: Math.max(0, Math.min(6, Number(def.iceLevel || 0))), 
            priority: Number(def.icesPriority ?? 3) 
        };
        this.frozen = { 
            value: Math.max(0, Math.min(3, Number(def.frozenValue || 0))), 
            priority: Number(def.frozenPriority ?? 3) 
        };
        this.pieceUI = {
            ...DEFAULT_PIECE_UI, 
            ...(def.pieceUI || {}),
            background: { ...DEFAULT_PIECE_UI.background, ...(def.pieceUI?.background || {}) },
            type: { ...DEFAULT_PIECE_UI.type, ...(def.pieceUI?.type || {}) },
            walls: { ...DEFAULT_PIECE_UI.walls, ...(def.pieceUI?.walls || {}) },
            ices: { ...DEFAULT_PIECE_UI.ices, ...(def.pieceUI?.ices || {}) },
            frozen: { ...DEFAULT_PIECE_UI.frozen, ...(def.pieceUI?.frozen || {}) }
        };
        Object.defineProperties(this, {
            typeId: { get: () => this.id, set: v => { this.id = v; } },
            color: { get: () => this.background.type, set: v => { this.background.type = v; } },
            backgroundColor: { get: () => this.background.type, set: v => { this.background.type = v; } },
            pattern: { get: () => this.background.pattern, set: v => { this.background.pattern = v; } },
            patternColor: { get: () => this.background.patternColor, set: v => { this.background.patternColor = v; } },
            char: { get: () => this._char, set: v => { this._char = v; } },
        });
        this._char = char; 
        this.pieceColor = def.pieceColor || '#ffffff'; 
        this.borderColor = def.borderColor || 'rgba(255,255,255,0.3)'; 
        this.borderWidth = def.borderWidth || 2;
        this.states = new Set(); 
        this.stateData = {}; 
        this.metadata = {};
    }
    
    _normWalls(raw = {}) {
        const r = {}; 
        for (const s of WALL_SIDES) { 
            const w = raw[s] || {}; 
            r[s] = { 
                enabled: Boolean(w.enabled), 
                hp: Number(w.hp || 0), 
                maxHp: Number(w.maxHp || w.hp || 0), 
                color: w.color || 'rgba(255,255,255,0.9)' 
            }; 
        }
        r.priority = Number(raw.priority ?? 2); 
        return r;
    }
    
    setWall(side, opt = {}) { 
        if (!this.walls[side]) return false; 
        this.walls[side].enabled = Boolean(opt.enabled ?? true); 
        this.walls[side].hp = Number(opt.hp ?? this.walls[side].hp ?? 0); 
        this.walls[side].maxHp = Number(opt.maxHp ?? this.walls[side].maxHp ?? this.walls[side].hp ?? 0); 
        this.walls[side].color = opt.color || this.walls[side].color || 'rgba(255,255,255,0.9)'; 
        return true; 
    }
    
    damageWall(side, amt = 1) { 
        if (!this.walls[side] || !this.walls[side].enabled) return false; 
        this.walls[side].hp = Math.max(0, Number(this.walls[side].hp || 0) - amt); 
        if (this.walls[side].hp <= 0) { 
            this.walls[side].enabled = false; 
            this.walls[side].hp = 0; 
        } 
        return true; 
    }
    
    getActiveWallSides() { 
        return Object.entries(this.walls).filter(([, v]) => v?.enabled && v.hp > 0).map(([s]) => s); 
    }
    
    addState(st, data = null) { 
        this.states.add(st); 
        if (st === 'frozen') this.frozen.value = Math.max(1, Number(data?.level || this.frozen.value || 1)); 
        if (data !== null) this.stateData[st] = data; 
        return this; 
    }
    
    removeState(st) { 
        this.states.delete(st); 
        if (st === 'frozen') this.frozen.value = 0; 
        delete this.stateData[st]; 
        return this; 
    }
    
    hasState(st) { return this.states.has(st); }
    
    clone() {
        const p = new Piece(this.typeId, this.color, this.char, { 
            code: this.type.value, 
            isPiece: this.isPiece, 
            background: this.background.type, 
            pattern: this.pattern, 
            patternColor: this.patternColor, 
            pieceColor: this.pieceColor, 
            borderColor: this.borderColor, 
            borderWidth: this.borderWidth, 
            walls: JSON.parse(JSON.stringify(this.walls)), 
            iceLevel: this.ices.level, 
            frozenValue: this.frozen.value, 
            pieceUI: JSON.parse(JSON.stringify(this.pieceUI)) 
        });
        p.borderColor = this.borderColor; 
        p.borderWidth = this.borderWidth;
        this.states.forEach(s => p.states.add(s)); 
        p.stateData = { ...this.stateData }; 
        p.metadata = { ...this.metadata }; 
        return p;
    }
    
    isSwappable() { return !this.hasState('locked') && !this.hasState('frozen'); }
    isRemovable() { return !this.hasState('locked'); }
    
    render(cellEl, cellSize, opts = {}) {
        cellEl.innerHTML = ''; 
        cellEl.style.position = 'relative';
        const skip = (opts.skipWallSides) || new Set();
        
        // Layer1 - Background
        const bg = document.createElement('div'); 
        bg.className = 'piece-bg'; 
        bg.style.background = this.background.type; 
        bg.style.opacity = String(this.pieceUI.background.opacity); 
        bg.style.zIndex = String(this.pieceUI.background.priority); 
        cellEl.appendChild(bg);
        
        // Layer2 - Pattern
        const pat = document.createElement('div'); 
        pat.className = 'piece-pattern'; 
        pat.dataset.pattern = this.background.pattern || 'solid';
        const rpc = this.background.patternColor;
        pat.style.background = this._buildPattern(
            this.background.pattern, 
            (typeof rpc === 'string' && rpc && rpc.toLowerCase() !== 'transparent') 
                ? rpc 
                : contrastPatternColor(this.background.type)
        );
        pat.style.zIndex = String(this.pieceUI.background.priority + 0.1); 
        cellEl.appendChild(pat);
        
        // Layer3 - Main content (character)
        const main = document.createElement('div'); 
        main.className = 'piece-main'; 
        main.textContent = this.char; 
        main.style.color = this.pieceColor || '#fff'; 
        main.style.fontSize = `${cellSize * Number(this.pieceUI.type.fontSize || 0.55)}px`; 
        main.style.zIndex = String(this.pieceUI.type.priority); 
        cellEl.appendChild(main);
        
        // Layer4 - Border
        const brd = document.createElement('div'); 
        brd.className = 'piece-border'; 
        brd.style.border = `${this.borderWidth}px solid ${this.borderColor}`; 
        cellEl.appendChild(brd);
        
        // Layer5 - Walls
        const styleMap = { low: 'dotted', medium: 'dashed', high: 'solid' };
        for (const s of WALL_SIDES) {
            const w = this.walls?.[s]; 
            if (!w || !w.enabled || w.hp <= 0 || skip.has(s)) continue;
            const el = document.createElement('div'); 
            el.className = `piece-wall wall-${s}`;
            const wc = this.pieceUI.walls.color || '#facc15', 
                  ws = w.hp >= 3 ? 'high' : w.hp >= 2 ? 'medium' : 'low', 
                  cap = s[0].toUpperCase() + s.slice(1);
            el.style.borderColor = wc; 
            el.style[`border${cap}Width`] = '4px'; 
            el.style[`border${cap}Style`] = styleMap[ws];
            el.style.zIndex = String(this.pieceUI.walls.priority); 
            el.title = `${s} wall hp:${w.hp}`; 
            cellEl.appendChild(el);
        }
        
        // Layer6 - Ice
        if (this.ices.level > 0) { 
            const ice = document.createElement('div'); 
            ice.className = 'piece-ice-layer'; 
            ice.textContent = this.ices.level > 1 ? String(this.ices.level) : ''; 
            ice.style.background = this.pieceUI.ices.color; 
            ice.style.opacity = String(Math.min(0.85, 0.22 + this.ices.level * 0.1)); 
            ice.style.zIndex = String(this.pieceUI.ices.priority); 
            cellEl.appendChild(ice); 
        }
        
        // Layer7 - States
        if (this.hasState('locked')) { 
            const e = document.createElement('div'); 
            e.className = 'piece-locked'; 
            e.textContent = '🔒'; 
            cellEl.appendChild(e); 
        }
        if (this.hasState('frozen')) { 
            const e = document.createElement('div'); 
            e.className = 'piece-frozen'; 
            cellEl.appendChild(e); 
        }
        if (this.hasState('bomb')) { 
            const e = document.createElement('div'); 
            e.className = 'piece-bomb'; 
            e.textContent = '💣'; 
            cellEl.appendChild(e); 
        }
    }
    
    _buildPattern(p, c) {
        const m = {
            dot: `radial-gradient(circle at 25% 25%,${c} 0 12%,transparent 13%),radial-gradient(circle at 75% 70%,${c} 0 10%,transparent 11%)`,
            stripe: `linear-gradient(135deg,transparent 0 42%,${c} 42% 48%,transparent 48% 100%)`,
            check: `linear-gradient(45deg,${c} 25%,transparent 25%,transparent 75%,${c} 75%),linear-gradient(45deg,${c} 25%,transparent 25%,transparent 75%,${c} 75%)`,
            waves: `radial-gradient(circle at 15% 25%,${c} 0 8%,transparent 9%),radial-gradient(circle at 80% 70%,${c} 0 8%,transparent 9%),linear-gradient(180deg,transparent 0 25%,${c} 25% 35%,transparent 35% 100%)`,
            spark: `radial-gradient(circle at 50% 50%,${c} 0 14%,transparent 15%),linear-gradient(0deg,transparent 0 30%,${c} 30% 35%,transparent 35% 100%)`,
            transparent: 'transparent'
        }; 
        return m[p] ?? 'transparent';
    }
}

// ==================== Match Rules ====================
class MatchRule { 
    constructor(cfg) { this.config = cfg; this.name = 'base'; } 
    check(b, r, c) { return new Set(); } 
    get priority() { return 0; } 
}

class LineMatchRule extends MatchRule {
    constructor(cfg) { super(cfg); this.matchLength = cfg.matchLength || 3; }
    get priority() { return 10; }
    check(board, rows, cols) {
        const matches = new Set(), len = this.matchLength;
        for (let r = 0; r < rows; r++) {
            if (!board[r]) continue; 
            let c = 0;
            while (c <= cols - len) {
                const base = board[r][c]; 
                if (!base) { c++; continue; }
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r][c + i] || board[r][c + i].typeId !== base.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (c + ext < cols && board[r][c + ext]?.typeId === base.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r, c + i, cols)); 
                    c += ext;
                } else c++;
            }
        }
        for (let c = 0; c < cols; c++) {
            let r = 0;
            while (r <= rows - len) {
                if (!board[r]?.[c]) { r++; continue; } 
                const base = board[r][c];
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r + i]?.[c] || board[r + i][c].typeId !== base.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (r + ext < rows && board[r + ext]?.[c]?.typeId === base.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r + i, c, cols)); 
                    r += ext;
                } else r++;
            }
        }
        return matches;
    }
}

class SquareMatchRule extends MatchRule {
    constructor(cfg) { super(cfg); this.name = 'square'; }
    get priority() { return 5; }
    check(board, rows, cols) {
        const matches = new Set();
        for (let r = 0; r < rows - 1; r++) {
            if (!board[r]) continue;
            for (let c = 0; c < cols - 1; c++) {
                const t = board[r][c]; 
                if (!t) continue;
                const ri = board[r][c + 1], 
                      dn = board[r + 1]?.[c], 
                      dg = board[r + 1]?.[c + 1];
                if (ri?.typeId === t.typeId && dn?.typeId === t.typeId && dg?.typeId === t.typeId) {
                    matches.add(rcToIdx(r, c, cols)); 
                    matches.add(rcToIdx(r, c + 1, cols)); 
                    matches.add(rcToIdx(r + 1, c, cols)); 
                    matches.add(rcToIdx(r + 1, c + 1, cols));
                }
            }
        } 
        return matches;
    }
}

class DiagonalMatchRule extends MatchRule {
    constructor(cfg) { super(cfg); this.name = 'diagonal'; this.matchLength = cfg.matchLength || 3; }
    get priority() { return 8; }
    check(board, rows, cols) {
        const matches = new Set(), len = this.matchLength;
        for (let r = 0; r <= rows - len; r++) {
            if (!board[r]) continue;
            for (let c = 0; c <= cols - len; c++) {
                const t = board[r][c]; 
                if (!t) continue;
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r + i]?.[c + i] || board[r + i][c + i].typeId !== t.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (r + ext < rows && c + ext < cols && board[r + ext]?.[c + ext]?.typeId === t.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r + i, c + i, cols));
                }
            }
        }
        for (let r = 0; r <= rows - len; r++) {
            if (!board[r]) continue;
            for (let c = len - 1; c < cols; c++) {
                const t = board[r][c]; 
                if (!t) continue;
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r + i]?.[c - i] || board[r + i][c - i].typeId !== t.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (r + ext < rows && c - ext >= 0 && board[r + ext]?.[c - ext]?.typeId === t.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r + i, c - i, cols));
                }
            }
        } 
        return matches;
    }
}

class ExplosionHandler {
    constructor(cfg) { 
        this.parsedRules = {}; 
        for (const [k, rule] of Object.entries(cfg.explodeRules || {})) { 
            const [typ, radi] = rule.split(':'); 
            this.parsedRules[parseInt(k)] = { type: typ, radius: radi ? parseInt(radi) : 1 }; 
        } 
    }
    
    getExplosionCells(matches, board, rows, cols) {
        const rule = this.parsedRules[matches.size]; 
        if (!rule) return new Set();
        const result = new Set(), arr = Array.from(matches), { r, c } = this._center(arr, cols);
        switch (rule.type) {
            case 'cross': 
                for (let i = -2; i <= 2; i++) { 
                    if (r + i >= 0 && r + i < rows) result.add(rcToIdx(r + i, c, cols)); 
                    if (c + i >= 0 && c + i < cols) result.add(rcToIdx(r, c + i, cols)); 
                } 
                break;
            case 'screen': 
                for (let i = 0; i < rows * cols; i++) result.add(i); 
                break;
            case 'blast': { 
                const rad = rule.radius || 1; 
                for (let dr = -rad; dr <= rad; dr++) {
                    for (let dc = -rad; dc <= rad; dc++) { 
                        const nr = r + dr, nc = c + dc; 
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.add(rcToIdx(nr, nc, cols)); 
                    }
                } 
                break; 
            }
        }
        return result;
    }
    
    _center(indices, cols) { 
        let sr = 0, sc = 0; 
        for (const idx of indices) { 
            sr += Math.floor(idx / cols); 
            sc += idx % cols; 
        } 
        // 修复：使用 indices.length 而不是 indexes.length
        return { r: Math.round(sr / indices.length), c: Math.round(sc / indices.length) }; 
    }
}

class ScoreSystem {
    constructor(cfg) { 
        this.baseScore = cfg.baseScore || 10; 
        this.comboMultiplier = cfg.comboMultiplier !== false; 
    }
    
    calculate(matchCount, comboCount, extra = {}) {
        let score = matchCount * this.baseScore * (this.comboMultiplier ? comboCount : 1);
        if (extra.bonus) score += extra.bonus; 
        if (extra.special) score *= 2; 
        return Math.round(score);
    }
}

// ==================== GameEngine ====================
class GameEngine {
    constructor() {
        this.config = this.board = this.matchRules = this.explosionHandler = this.scoreSystem = null;
        this.rows = this.cols = this.score = this.movesLeft = this.comboCount = this.timeLeft = this.targetScore = 0;
        this.selected = this.lastHint = this.timerId = this._cellSize = this._gap = this._cellPx = null;
        this.mode = 'admin'; 
        this.isProcessing = this.isGameEnded = false;
        this.targetScoreEnabled = this.requiredPieceEnabled = false;
        this.requiredPieceType = this.requiredPieceCount = 10; 
        this.elimCounts = {}; 
        this._cellCache = {}; 
        this._domCache = {}; 
        this.hintTimer = null;
        this._bindEvents(); 
        if (typeof window !== 'undefined') window.__gameEngine = this; 
        this.refreshSelectorUI();
    }
    
    _ref(id) { 
        if (!this._domCache[id]) this._domCache[id] = document.getElementById(id); 
        return this._domCache[id]; 
    }
    
    // 修复：正确的参数传递
    _refChain(id, fn) { 
        const el = this._ref(id); 
        if (el) fn(el); 
    }

    loadConfig() {
        try {
            const s = localStorage.getItem(CONFIG_KEY); 
            if (!s) return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const p = JSON.parse(s), f = sanitizeConfig(p);
            if (JSON.stringify(f) !== JSON.stringify(p)) localStorage.setItem(CONFIG_KEY, JSON.stringify(f)); 
            return f;
        } catch (e) { 
            console.warn('配置加载失败', e); 
            try { localStorage.removeItem(CONFIG_KEY); } catch { } 
            return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] }; 
        }
    }
    
    applyConfig(cfg) {
        const sc = sanitizeConfig(cfg); 
        this.config = { ...sc }; 
        this.rows = sc.rows; 
        this.cols = sc.cols;
        this._cellSize = sc.cellSize; 
        this._gap = sc.gap; 
        this._cellPx = sc.cellSize + sc.gap;
        this.selected = this.lastHint = null; 
        this._cellCache = {};
        this.targetScoreEnabled = sc.targetScoreEnabled !== false;
        this.targetScore = this.targetScoreEnabled ? Math.max(0, Number(sc.targetScore || 50000)) : 0;
        this.timeLeft = sc.enableTimeLimit ? Number(sc.timeLimitSeconds || 90) : 0;
        this.requiredPieceEnabled = sc.requiredPieceEnabled === true;
        this.requiredPieceType = getPieceTypeCodeById(sc.requiredPieceType, sc.pieceTypes) || sc.requiredPieceType || sc.pieceTypes?.[0]?.id || null;
        this.requiredPieceCount = Number.isFinite(Number(sc.requiredPieceCount)) ? Math.max(0, Number(sc.requiredPieceCount)) : 10;
        this.elimCounts = {}; 
        this.totalMoves = Number.isFinite(Number(sc.totalMoves)) ? Math.max(1, Number(sc.totalMoves)) : 30;
        this.refreshSelectorUI(); 
        this._initMatchRules(sc);
        this.explosionHandler = new ExplosionHandler(sc); 
        this.scoreSystem = new ScoreSystem(sc);
        const be = this._ref('board'), 
              bw = this.cols * sc.cellSize + (this.cols - 1) * sc.gap, 
              bh = this.rows * sc.cellSize + (this.rows - 1) * sc.gap;
        be.style.cssText = `width:${bw}px;height:${bh}px;display:grid;gap:${sc.gap}px;--cell-size:${sc.cellSize}px;--gap:${sc.gap}px;--cols:${this.cols};--rows:${this.rows};grid-template-columns:repeat(${this.cols},${sc.cellSize}px);grid-template-rows:repeat(${this.rows},${sc.cellSize}px);`;
        be.innerHTML = '';
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify(sc)); } catch { }
    }
    
    _initMatchRules(cfg) {
        this.matchRules = [new LineMatchRule(cfg)];
        if (cfg.enableSquare) this.matchRules.push(new SquareMatchRule(cfg));
        if (cfg.enableDiagonal) this.matchRules.push(new DiagonalMatchRule(cfg));
        this.matchRules.sort((a, b) => b.priority - a.priority);
    }

    createPiece(typeId) {
        const t = this.config.pieceTypes.find(x => x && (x.id === typeId || x.code === typeId));
        if (!t) return new Piece('unknown', '#888', '❓', { background: '#888', pattern: 'solid', pieceColor: '#fff' });
        return new Piece(t.id, t.background || t.color || '#888', t.id === BLANK_PIECE_TYPE || t.isPiece === false ? '' : (t.char || t.id), {
            background: t.background || t.color || '#888', 
            pattern: t.pattern || 'solid', 
            patternColor: t.patternColor || 'rgba(255,255,255,0.22)',
            pieceColor: t.pieceColor || '#ffffff', 
            borderColor: t.borderColor || 'rgba(255,255,255,0.3)', 
            borderWidth: t.borderWidth || 2,
            walls: t.walls || {}, 
            isPiece: t.isPiece !== false, 
            id: t.id, 
            code: t.code || t.id, 
            pieceUI: t.pieceUI || {},
            iceLevel: t.iceLevel || 0, 
            frozenValue: t.frozenValue || 0
        });
    }
    
    randomPiece() { 
        const ts = (this.config.pieceTypes || []).filter(t => t && t.isPiece !== false); 
        if (!ts.length) return null; 
        return this.createPiece(ts[Math.floor(Math.random() * ts.length)].id); 
    }

    _parseInitialBoardValue(value) {
        if (!value) return null;
        const rr = Array.isArray(value) 
            ? value 
            : String(value).split(/\n|;/).map(r => r.trim()).filter(Boolean);
        if (!rr.length) return null;
        const rows = rr.map(row => 
            Array.isArray(row) 
                ? row.map(c => c && typeof c === 'object' ? c : String(c ?? '').trim())
                : String(row).split(',').map(c => c.trim()).filter(Boolean)
        ).filter(r => r.length > 0);
        if (!rows.length) return null;
        const norm = rows.map(r => r.slice(0, this.cols)); 
        while (norm.length < this.rows) norm.push([]);
        return Array.from({ length: this.rows }, (_, r) => { 
            const row = norm[r] || []; 
            return Array.from({ length: this.cols }, (_, c) => { 
                const tk = row[c]; 
                if (!tk || EMPTY_TOKENS.has(String(tk).toLowerCase())) return null; 
                return this._buildPieceFromToken(tk); 
            }); 
        });
    }
    
    _buildPieceFromToken(token) {
        if (token && typeof token === 'object' && !Array.isArray(token)) {
            const p = this.createPiece(token.typeId || token.id);
            if (!p || p.typeId === 'unknown' || p.isPiece === false) return null;
            p.color = token.color || p.color; 
            p.backgroundColor = token.backgroundColor || token.background || p.backgroundColor;
            p.pattern = token.pattern || p.pattern; 
            p.patternColor = token.patternColor || p.patternColor;
            p.pieceColor = token.pieceColor || p.pieceColor; 
            p.char = token.char || p.char;
            p.borderColor = token.borderColor || p.borderColor; 
            p.borderWidth = Number(token.borderWidth || p.borderWidth);
            p.type.value = token.type?.value || token.code || p.type.value; 
            p.type.priority = Number(token.type?.priority ?? p.type.priority);
            p.background.priority = Number(token.background?.priority ?? p.background.priority);
            p.ices.level = Number(token.ices?.level ?? token.stateData?.iceLayers ?? p.ices.level); 
            p.ices.priority = Number(token.ices?.priority ?? p.ices.priority);
            p.frozen.value = Number(token.frozen?.value ?? p.frozen.value); 
            p.frozen.priority = Number(token.frozen?.priority ?? p.frozen.priority);
            p.walls = p._normWalls(token.walls || {}); 
            p.walls.priority = Number(token.walls?.priority ?? p.walls.priority);
            p.pieceUI = token.pieceUI && typeof token.pieceUI === 'object' ? token.pieceUI : p.pieceUI;
            p.states = new Set(Array.isArray(token.states) ? token.states : []);
            p.stateData = token.stateData && typeof token.stateData === 'object' ? { ...token.stateData } : {};
            if (p.states.has('frozen') && p.frozen.value === 0) p.frozen.value = 1;
            if (token.stateData?.iceLayers !== undefined && p.ices.level === 0) p.ices.level = Number(token.stateData.iceLayers) || 0;
            return p;
        }
        const cl = String(token).trim(); 
        if (!cl || EMPTY_TOKENS.has(cl.toLowerCase())) return null;
        const parts = cl.split(/[|:]/).map(p => p.trim()).filter(Boolean);
        const matched = this.config.pieceTypes.find(t => 
            t?.id?.toLowerCase() === parts[0].toLowerCase() || 
            String(t?.code || '').toLowerCase() === parts[0].toLowerCase() || 
            t?.char === parts[0]
        );
        if (!matched) return null;
        const p = this.createPiece(matched.id);
        for (const st of parts.slice(1)) { 
            const n = st.toLowerCase(); 
            if (!STATE_TOKENS.has(n)) continue; 
            p.addState(n); 
            if (n === 'bomb') p.stateData.bomb = { radius: 1 }; 
        }
        return p;
    }
    
    serializeCurrentBoard() {
        return this.board.map(row => row.map(p => { 
            if (!p) return null; 
            return { 
                typeId: p.typeId, 
                code: p.typeId === BLANK_PIECE_TYPE ? BLANK_PIECE_CODE : p.typeId, 
                isPiece: p.isPiece, 
                id: p.id, 
                local: { ...p.local }, 
                background: { ...p.background }, 
                type: { ...p.type }, 
                color: p.color, 
                backgroundColor: p.backgroundColor, 
                pattern: p.pattern, 
                patternColor: p.patternColor, 
                pieceColor: p.pieceColor, 
                char: p.char, 
                borderColor: p.borderColor, 
                borderWidth: p.borderWidth, 
                walls: JSON.parse(JSON.stringify(p.walls || {})), 
                ices: { ...p.ices }, 
                frozen: { ...p.frozen }, 
                pieceUI: JSON.parse(JSON.stringify(p.pieceUI || {})), 
                states: [...p.states], 
                stateData: JSON.parse(JSON.stringify(p.stateData || {})) // 修复：移除多余的分号
            }; 
        }));
    }
    
    createBoard() {
        const b = [];
        for (let r = 0; r < this.rows; r++) {
            b[r] = []; 
            for (let c = 0; c < this.cols; c++) {
                let p, att = 0; 
                do { 
                    p = this.randomPiece(); 
                    att++; 
                    if (att > MAX_RANDOM_ATTEMPTS) break; 
                } while (this._wouldMatch(b, r, c, p));
                if (Math.random() < FROZEN_CHANCE) { 
                    const st = ['frozen', 'locked', 'bomb'][Math.floor(Math.random() * 3)]; 
                    p.addState(st); 
                    if (st === 'bomb') p.stateData.bomb = { radius: 1 }; 
                }
                b[r][c] = p;
            }
        } 
        return b;
    }
    
    _wouldMatch(b, r, c, piece) { 
        const tb = b.map(row => [...row]); 
        tb[r][c] = piece; 
        return this._hasMatchAt(tb, r, c); 
    }
    
    _hasMatchAt(board, r, c) {
        const len = this.config.matchLength || 3, typeId = board[r]?.[c]?.typeId; 
        if (!typeId) return false;
        let cnt = 1; 
        for (let i = c - 1; i >= 0 && board[r][i]?.typeId === typeId; i--) cnt++; 
        for (let i = c + 1; i < this.cols && board[r][i]?.typeId === typeId; i++) cnt++; 
        if (cnt >= len) return true;
        cnt = 1; 
        for (let i = r - 1; i >= 0 && board[i]?.[c]?.typeId === typeId; i--) cnt++; 
        for (let i = r + 1; i < this.rows && board[i]?.[c]?.typeId === typeId; i++) cnt++; 
        if (cnt >= len) return true;
        if (this.config.enableSquare) {
            if (r > 0 && c > 0 && board[r - 1][c - 1]?.typeId === typeId && board[r - 1][c]?.typeId === typeId && board[r][c - 1]?.typeId === typeId) return true;
            if (r < this.rows - 1 && c > 0 && board[r][c - 1]?.typeId === typeId && board[r + 1]?.[c - 1]?.typeId === typeId && board[r + 1]?.[c]?.typeId === typeId) return true;
            if (r > 0 && c < this.cols - 1 && board[r - 1][c]?.typeId === typeId && board[r - 1][c + 1]?.typeId === typeId && board[r][c + 1]?.typeId === typeId) return true;
            if (r < this.rows - 1 && c < this.cols - 1 && board[r][c + 1]?.typeId === typeId && board[r + 1]?.[c]?.typeId === typeId && board[r + 1]?.[c + 1]?.typeId === typeId) return true;
        }
        if (this.config.enableDiagonal) {
            cnt = 1; 
            for (let i = 1; r - i >= 0 && c - i >= 0 && board[r - i][c - i]?.typeId === typeId; i++) cnt++; 
            for (let i = 1; r + i < this.rows && c + i < this.cols && board[r + i]?.[c + i]?.typeId === typeId; i++) cnt++; 
            if (cnt >= len) return true;
            cnt = 1; 
            for (let i = 1; r - i >= 0 && c + i < this.cols && board[r - i][c + i]?.typeId === typeId; i++) cnt++; 
            for (let i = 1; r + i < this.rows && c - i >= 0 && board[r + i]?.[c - i]?.typeId === typeId; i++) cnt++; 
            if (cnt >= len) return true;
        }
        return false;
    }
    
    _findAllMatches(board) { 
        const all = new Set(); 
        for (const rule of this.matchRules) {
            for (const idx of rule.check(board, this.rows, this.cols)) all.add(idx); 
        }
        return all; 
    }
    
    findMatches() { return this._findAllMatches(this.board); }
    
    applyGravity() {
        const changed = new Set();
        for (let c = 0; c < this.cols; c++) {
            const col = []; 
            for (let r = 0; r < this.rows; r++) if (this.board[r][c]) col.push(this.board[r][c]);
            for (let r = this.rows - 1; r >= 0; r--) { 
                const nx = col.length > 0 ? col.pop() : this.randomPiece(); 
                if (this.board[r][c] !== nx) { 
                    this.board[r][c] = nx; 
                    changed.add(rcToIdx(r, c, this.cols)); 
                } 
            }
        }
        return changed;
    }
    
    stabilizeBoard() { 
        let g = 0; 
        while (g++ < MAX_STABILIZE_ATTEMPTS) { 
            const m = this.findMatches(); 
            if (!m.size) break; 
            for (const idx of m) { 
                const { r, c } = idxToRC(idx, this.cols); 
                if (this.board[r][c]?.isRemovable()) this.board[r][c] = null; 
            } 
            this.applyGravity(); 
        }
        if (g >= MAX_STABILIZE_ATTEMPTS) {
            console.warn('Board stabilization exceeded max iterations');
        }
    }
    
    hasValidMove() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] && !this.board[r][c].isSwappable()) continue;
                if (c < this.cols - 1) { 
                    [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]]; 
                    if (this.findMatches().size > 0) { 
                        [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]]; 
                        return true; 
                    } 
                    [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]]; 
                }
                if (r < this.rows - 1) { 
                    [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]]; 
                    if (this.findMatches().size > 0) { 
                        [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]]; 
                        return true; 
                    } 
                    [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]]; 
                }
            }
        } 
        return false;
    }

    _sharedWallSkipSides(r, c) {
        const p = this.board[r]?.[c]; 
        if (!p) return new Set(); 
        const skip = new Set(), myIdx = rcToIdx(r, c, this.cols);
        const sides = [
            { s: 'left', dr: 0, dc: -1, op: 'right' }, 
            { s: 'right', dr: 0, dc: 1, op: 'left' }, 
            { s: 'top', dr: -1, dc: 0, op: 'bottom' }, 
            { s: 'bottom', dr: 1, dc: 0, op: 'top' }
        ];
        for (const { s, dr, dc, op } of sides) {
            const own = p.walls?.[s]; 
            if (!own || !own.enabled || own.hp <= 0) continue;
            const nr = r + dr, nc = c + dc; 
            if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
            const nb = this.board[nr]?.[nc], opp = nb?.walls?.[op];
            if (opp?.enabled && opp.hp > 0 && rcToIdx(nr, nc, this.cols) < myIdx) skip.add(s);
        } 
        return skip;
    }
    
    renderBoard(withFallAnim, changedCells = null) {
        const be = this._ref('board'), exp = this.rows * this.cols;
        if (be.children.length !== exp || changedCells === null) { 
            be.innerHTML = ''; 
            this._cellCache = {}; 
        }
        if (changedCells?.size > 0) {
            for (const idx of changedCells) { 
                const { r, c } = idxToRC(idx, this.cols); 
                const cell = this._mkCell(r, c, withFallAnim); 
                const ex = be.children[idx]; 
                if (ex) be.replaceChild(cell, ex); 
                else be.appendChild(cell); 
            }
            return;
        }
        // 使用 DocumentFragment 优化性能
        const fragment = document.createDocumentFragment();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                fragment.appendChild(this._mkCell(r, c, withFallAnim));
            }
        }
        be.appendChild(fragment);
    }
    
    _mkCell(r, c, withFallAnim) {
        const cell = document.createElement('div'); 
        cell.className = 'cell'; 
        cell.dataset.r = r; 
        cell.dataset.c = c;
        const p = this.board[r][c]; 
        if (p) p.render(cell, this._cellSize, { skipWallSides: this._sharedWallSkipSides(r, c) });
        if (withFallAnim) cell.classList.add('falling');
        if (this.selected?.r === r && this.selected?.c === c) cell.classList.add('selected');
        if (this.lastHint && ((this.lastHint.from.r === r && this.lastHint.from.c === c) || (this.lastHint.to.r === r && this.lastHint.to.c === c))) cell.classList.add('hint-cell');
        this._bindCellEvents(cell, r, c); 
        this._cellCache[`${r},${c}`] = cell; 
        return cell;
    }
    
    getCell(r, c) { return this._cellCache[`${r},${c}`] || null; }

    setMode(mode) {
        const nm = mode === 'game' ? 'game' : 'admin'; 
        this.mode = nm;
        this._ref('mode-admin-btn')?.classList.toggle('active', nm === 'admin');
        this._ref('mode-game-btn')?.classList.toggle('active', nm === 'game');
        const lc = document.querySelector('#left-panel .rules-panel'), 
              ac = document.querySelector('#left-panel .admin-actions-panel'), 
              ep = this._ref('editor-panel');
        if (lc) lc.style.display = nm === 'admin' ? '' : 'none';
        if (ac) ac.style.display = nm === 'admin' ? '' : 'none';
        if (ep) ep.style.display = nm === 'admin' ? '' : 'none';
        if (nm === 'game') { 
            this.selected = null; 
            this.renderBoard(); 
            this.showMessage('🎮 游戏模式已开启！'); 
            this.startTimer(); 
        } else { 
            this.selected = null; 
            this.stopTimer(); 
            this.renderBoard(); 
            this.syncEditorPanel(); 
            this.showMessage('🛠️ 管理员模式已开启。'); 
        }
    }
    
    refreshSelectorUI() {
        const emptyOpt = { value: EMPTY_CELL_VALUE, label: '无棋子' };
        const pts = (this.config?.pieceTypes || []).filter(t => t?.isPiece !== false);
        const so = t => t.map(getPieceTypeUIOption); 
        const sc = this.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
        const art = this._ref('admin-required-piece-type');
        if (art && pts.length) {
            const opts = so(pts); 
            let cur = getPieceTypeCodeById(this.requiredPieceType || sc.requiredPieceType, sc.pieceTypes) || opts[0]?.value || BLANK_PIECE_TYPE;
            art.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join(''); 
            art.value = cur;
            this.requiredPieceType = cur; 
            sc.requiredPieceType = cur;
            buildTileOptions(art, opts, cur, () => { 
                this.requiredPieceType = art.value; 
                sc.requiredPieceType = this.requiredPieceType; 
            });
        }
        const ct = this._ref('cell-piece-type');
        if (ct && pts.length) {
            const opts = [emptyOpt, ...so(pts)], cur = ct.value || opts[1]?.value || EMPTY_CELL_VALUE;
            ct.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join(''); 
            ct.value = cur;
            buildTileOptions(ct, opts, cur, () => { 
                if (this.mode === 'admin') this.previewSelectedCellEditor(); 
            });
        }
        const ps = this._ref('cell-pattern');
        if (ps) {
            const patternOpts = [
                { value: 'solid', label: 'solid' }, 
                { value: 'transparent', label: 'transparent' }, 
                { value: 'dot', label: 'dot' }, 
                { value: 'stripe', label: 'stripe' }, 
                { value: 'check', label: 'check' }, 
                { value: 'waves', label: 'waves' }, 
                { value: 'spark', label: 'spark' }
            ];
            buildTileOptions(ps, patternOpts, ps.value || 'dot', () => { 
                if (this.mode === 'admin') this.previewSelectedCellEditor(); 
            });
        }
        for (const s of ['left', 'top', 'right', 'bottom']) {
            const ws = this._ref(`cell-wall-${s}`); 
            if (!ws) continue;
            const wallOpts = [
                { value: 'none', label: '无' }, 
                { value: 'low', label: '低' }, 
                { value: 'medium', label: '中' }, 
                { value: 'high', label: '高' }
            ];
            buildTileOptions(ws, wallOpts, ws.value || 'none', () => { 
                if (this.mode === 'admin') this.previewSelectedCellEditor(); 
            });
        }
        // 修复：使用 _refChain 正确传递参数
        this._refChain('admin-total-moves', el => el.value = String(this.config?.totalMoves || 30));
        this._refChain('admin-required-piece-count', el => el.value = String(this.requiredPieceCount || this.config?.requiredPieceCount || 10));
        const re = this._ref('admin-required-piece-enabled'); 
        if (re) re.checked = this.requiredPieceEnabled === true || this.config?.requiredPieceEnabled === true;
        this._refChain('admin-level-name', el => el.value = this.config?.name || '');
    }
    
    syncEditorPanel() {
        const pt = this._ref('cell-piece-type'), 
              ps = this._ref('cell-pattern'), 
              bg = this._ref('cell-bg-color'), 
              pc = this._ref('cell-pattern-color'), 
              mv = this._ref('cell-movable'), 
              ic = this._ref('cell-ice-layer'), 
              lb = this._ref('selected-cell-label');
        const ws = {}; 
        for (const s of ['left', 'top', 'right', 'bottom']) ws[s] = this._ref(`cell-wall-${s}`);
        const fill = (bgv, pcv) => { 
            if (bg) bg.value = toCssHex(bgv, '#888888'); 
            if (pc) pc.value = toCssHex(pcv, '#ffffff'); 
        };
        const resetEmpty = () => { 
            if (lb) lb.textContent = '当前选中：未选择格子'; 
            if (pt) pt.value = EMPTY_CELL_VALUE; 
            if (ps) ps.value = 'solid'; 
            fill('transparent', 'rgba(255,255,255,0.7)'); 
            if (mv) mv.checked = true; 
            if (ic) ic.value = '0'; 
            for (const e of Object.values(ws)) if (e) e.value = 'none'; 
            syncTileGroups(); 
        };
        if (!this.selected) { resetEmpty(); return; }
        const { r, c } = this.selected, p = this.board[r]?.[c];
        if (!p) { 
            if (lb) lb.textContent = `当前选中：(${r + 1},${c + 1}) 空格`; 
            resetEmpty(); 
            return; 
        }
        if (lb) lb.textContent = `当前选中：(${r + 1},${c + 1}) ${p.typeId}`;
        if (pt) pt.value = getPieceTypeUIOption(this.config.pieceTypes.find(t => t.id === p.typeId) || {}).value;
        if (ps) ps.value = p.pattern || 'solid';
        fill(p.background.type, isTransparent(p.background.patternColor) ? contrastPatternColor(p.background.type) : p.background.patternColor);
        if (mv) mv.checked = !p.hasState('locked');
        if (ic) ic.value = String(Math.max(0, Math.min(6, Number(p.stateData?.iceLayers || (p.hasState('frozen') ? 1 : 0)))));
        for (const s of ['left', 'top', 'right', 'bottom']) { 
            const w = p.walls?.[s], el = ws[s]; 
            if (!el) continue; 
            el.value = w && !w.enabled || w.hp <= 0 ? 'none' : w.hp >= 3 ? 'high' : w.hp >= 2 ? 'medium' : 'low'; 
        }
        syncTileGroups();
    }
    
    _createEditorPiece() {
        const pt = this._ref('cell-piece-type'), nt = pt?.value || EMPTY_CELL_VALUE;
        if (nt === EMPTY_CELL_VALUE) return null;
        const tt = this.config.pieceTypes.find(t => t.id === nt || t.code === nt);
        if (!tt || tt.isPiece === false) return null;
        const p = this.createPiece(tt.id);
        const ps = this._ref('cell-pattern'), 
              bg = this._ref('cell-bg-color'), 
              pc = this._ref('cell-pattern-color'), 
              mv = this._ref('cell-movable'), 
              ic = this._ref('cell-ice-layer');
        p.background.type = bg?.value || p.background.type; 
        p.background.pattern = ps?.value || tt.pattern || 'dot';
        p.background.patternColor = ps?.value === 'transparent' ? 'transparent' : (pc?.value || p.background.patternColor);
        const il = Math.max(0, Math.min(6, Number(ic?.value || 0))); 
        p.ices.level = il; 
        p.frozen.value = mv && !mv.checked ? 1 : 0;
        if (mv && !mv.checked) p.addState('locked'); 
        p.stateData.iceLayers = il; 
        if (il > 0) p.addState('frozen');
        for (const s of ['left', 'top', 'right', 'bottom']) {
            const vs = this._ref(`cell-wall-${s}`); 
            if (!vs) continue; 
            const hp = WALL_HP_MAP[vs.value] ?? 0; 
            p.walls[s] = { enabled: hp > 0, hp, maxHp: hp, color: '#facc15' };
        } 
        return p;
    }
    
    previewSelectedCellEditor() { 
        if (!this.selected) return; 
        const { r, c } = this.selected, cell = this.getCell(r, c); 
        if (!cell) return; 
        const p = this._createEditorPiece(); 
        if (p) p.render(cell, this._cellSize); 
        else cell.innerHTML = ''; 
        cell.classList.add('selected'); 
    }
    
    applySelectedCellEditor() { 
        if (!this.selected) return; 
        const { r, c } = this.selected; 
        this.board[r][c] = this._createEditorPiece(); 
        this.renderBoard(); 
        this.syncEditorPanel(); 
        syncTileGroups(); 
    }

    _bindCellEvents(cell, r, c) {
        let sx = null, sy = null, drg = false; 
        const ed = this.config.enableDrag !== false, th = this.config.dragThreshold || 15;
        cell.addEventListener('pointerdown', e => { 
            if (this.isProcessing || this.movesLeft <= 0) return; 
            sx = e.clientX; 
            sy = e.clientY; 
            drg = false; 
            try { cell.setPointerCapture(e.pointerId); } catch { }; 
        });
        cell.addEventListener('pointermove', e => { 
            if (sx === null || !ed) return; 
            const dx = e.clientX - sx, dy = e.clientY - sy; 
            if (!drg && Math.hypot(dx, dy) > th) { 
                drg = true; 
                cell.classList.add('dragging'); 
            } 
        });
        cell.addEventListener('pointerup', e => {
            if (sx === null) return; 
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (this.mode !== 'game') { 
                sx = sy = null; 
                drg = false; 
                this.selected = { r, c }; 
                this.syncEditorPanel(); 
                this.renderBoard(); 
                return; 
            }
            if (drg && ed) {
                cell.classList.remove('dragging'); 
                let tr = r, tc = c; 
                if (Math.abs(dx) > Math.abs(dy)) tc = c + (dx > 0 ? 1 : -1); 
                else tr = r + (dy > 0 ? 1 : -1); 
                sx = sy = null; 
                drg = false;
                if (tr < 0 || tr >= this.rows || tc < 0 || tc >= this.cols) { 
                    this.selected = null; 
                    this.renderBoard(); 
                    return; 
                } 
                this.selected = null; 
                this._handleSwap(r, c, tr, tc);
            } else { 
                sx = sy = null; 
                drg = false; 
                this._onCellClick(r, c); 
            }
        });
    }
    
    _onCellClick(r, c) {
        if (this.mode !== 'game') { 
            this.selected = { r, c }; 
            this.syncEditorPanel(); 
            this.renderBoard(); 
            return; 
        }
        if (this.isProcessing || this.movesLeft <= 0) return;
        const p = this.board[r][c]; 
        if (p && !p.isSwappable()) { 
            this.showMessage('🔒 这个棋子被锁定了！'); 
            return; 
        }
        if (!this.selected) { 
            this.selected = { r, c }; 
            this.renderBoard(); 
            return; 
        }
        const { r: sr, c: sc } = this.selected; 
        if (sr === r && sc === c) { 
            this.selected = null; 
            this.renderBoard(); 
            return; 
        }
        if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) { 
            this.selected = { r, c }; 
            this.renderBoard(); 
            return; 
        }
        this.selected = null; 
        this._handleSwap(sr, sc, r, c);
    }
    
    findPlayableMove() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cu = this.board[r][c]; 
                if (!cu || !cu.isSwappable()) continue;
                for (const { r: tr, c: tc } of [{ r: r + 1, c }, { r, c: c + 1 }]) {
                    if (tr >= this.rows || tc >= this.cols) continue; 
                    const ot = this.board[tr][tc]; 
                    if (!ot || !ot.isSwappable()) continue;
                    [this.board[r][c], this.board[tr][tc]] = [this.board[tr][tc], this.board[r][c]];
                    if (this.findMatches().size > 0) { 
                        [this.board[r][c], this.board[tr][tc]] = [this.board[tr][tc], this.board[r][c]]; 
                        return { from: { r, c }, to: { r: tr, c: tc } }; 
                    }
                    [this.board[r][c], this.board[tr][tc]] = [this.board[tr][tc], this.board[r][c]];
                }
            }
        } 
        return null;
    }
    
    async showHint() {
        if (this.isProcessing) return; 
        const move = this.findPlayableMove();
        if (!move) { 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
            this.renderBoard(); 
            this.showMessage('💡 当前盘面无有效组合，已重新洗牌！'); 
            return; 
        }
        this.lastHint = move; 
        this.renderBoard(); 
        this.showMessage(`💡 提示：尝试交换 (${move.from.r + 1},${move.from.c + 1}) 和 (${move.to.r + 1},${move.to.c + 1})`);
        clearTimeout(this.hintTimer); 
        this.hintTimer = setTimeout(() => { 
            this.lastHint = null; 
            this.renderBoard(); 
        }, HINT_DISPLAY_DURATION);
    }
    
    async _flashInvalidSwap(r1, c1, r2, c2) { 
        const cs = [this.getCell(r1, c1), this.getCell(r2, c2)].filter(Boolean); 
        cs.forEach(c => c.classList.add('invalid-swap')); 
        await this._sleep(260); 
        cs.forEach(c => c.classList.remove('invalid-swap')); 
    }

    async _handleSwap(r1, c1, r2, c2) {
        if (this.isGameEnded) return; 
        this.isProcessing = true;
        const p1 = this.board[r1][c1], p2 = this.board[r2][c2];
        if (!p1 || !p1.isSwappable() || !p2 || !p2.isSwappable()) { 
            this.showMessage('🔒 有棋子被锁定，无法交换！'); 
            this.isProcessing = false; 
            return; 
        }
        const e1 = this.getCell(r1, c1), e2 = this.getCell(r2, c2);
        const dx = (c2 - c1) * this._cellPx, dy = (r2 - r1) * this._cellPx;
        if (e1 && e2) { 
            e1.style.transition = e2.style.transition = 'transform 0.25s ease'; 
            e1.style.transform = `translate(${dx}px,${dy}px)`; 
            e2.style.transform = `translate(${-dx}px,${-dy}px)`; 
            e1.style.zIndex = e2.style.zIndex = '2'; 
            await this._sleep(SWAP_ANIMATION_DURATION); 
        }
        [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];
        let matches = this.findMatches();
        if (!matches.size) {
            await this._sleep(60); 
            if (e1 && e2) { 
                e1.style.transform = e2.style.transform = 'translate(0,0)'; 
                await this._sleep(SWAP_ANIMATION_DURATION); 
            }
            [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]]; 
            this.renderBoard(); 
            await this._flashInvalidSwap(r1, c1, r2, c2);
            this.showMessage('不能消除哦，换一个试试～'); 
            this.isProcessing = false; 
            return;
        }
        this.movesLeft--; 
        this.comboCount = 0; 
        this._updateHUD(); 
        await this._processMatches(matches);
        if (!this.hasValidMove()) { 
            await this._sleep(200); 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
            this.renderBoard(); 
            this.showMessage('没有可消除的移动，重新洗牌啦！✨'); 
        }
        if (this._checkGoalsAfterMove()) return; 
        this.isProcessing = false;
    }
    
    async _processMatches(matches) {
        while (matches.size > 0) {
            this.comboCount++; 
            const ma = Array.from(matches);
            for (const idx of ma) { 
                const { r, c } = idxToRC(idx, this.cols); 
                this.getCell(r, c)?.classList.add('removed'); 
            }
            await this._sleep(REMOVE_ANIMATION_DURATION);
            const bombIdx = new Set();
            for (const idx of ma) {
                const { r, c } = idxToRC(idx, this.cols); 
                const p = this.board[r][c];
                if (p?.hasState('bomb')) { 
                    bombIdx.add(idx); 
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) { 
                            const nr = r + dr, nc = c + dc; 
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) bombIdx.add(rcToIdx(nr, nc, this.cols)); 
                        }
                    }
                }
            }
            const expCells = new Set(this.explosionHandler.getExplosionCells(matches, this.board, this.rows, this.cols));
            for (const idx of bombIdx) expCells.add(idx);
            const pts = this.scoreSystem.calculate(matches.size + expCells.size, this.comboCount, { special: expCells.size > 0 }); 
            this.score += pts; 
            this._updateHUD();
            let msg = this.comboCount > 1 ? `🔥 连击 x${this.comboCount}！+${pts}` : `消除！+${pts}`; 
            if (expCells.size > 0) msg += ' 💥 爆炸！'; 
            this.showMessage(msg);
            for (const idx of ma) { 
                const { r, c } = idxToRC(idx, this.cols); 
                const p = this.board[r][c]; 
                if (p?.isRemovable()) { 
                    this._countElim(p); 
                    this.board[r][c] = null; 
                } 
            }
            this._damageWalls(ma);
            if (expCells.size > 0) {
                for (const idx of expCells) { 
                    const { r, c } = idxToRC(idx, this.cols); 
                    this.getCell(r, c)?.classList.add('exploding'); 
                }
                await this._sleep(EXPLOSION_ANIMATION_DURATION);
                for (const idx of expCells) { 
                    const { r, c } = idxToRC(idx, this.cols); 
                    const p = this.board[r][c]; 
                    if (p?.isRemovable()) { 
                        this._countElim(p); 
                        this.board[r][c] = null; 
                    } 
                }
                this._damageWalls(Array.from(expCells));
            }
            const cc = this.applyGravity(); 
            await this._sleep(60); 
            this.renderBoard(true, cc); 
            await this._sleep(GRAVITY_ANIMATION_DURATION); 
            matches = this.findMatches();
        }
    }
    
    _damageWalls(indices) {
        const sm = [
            { dr: -1, dc: 0, tgt: 'bottom' }, 
            { dr: 1, dc: 0, tgt: 'top' }, 
            { dr: 0, dc: -1, tgt: 'right' }, 
            { dr: 0, dc: 1, tgt: 'left' }
        ];
        for (const idx of indices) {
            const { r, c } = idxToRC(idx, this.cols);
            for (const { dr, dc, tgt } of sm) { 
                const nr = r + dr, nc = c + dc; 
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue; 
                const nb = this.board[nr][nc]; 
                if (!nb) continue; 
                const w = nb.walls?.[tgt]; 
                if (w?.enabled && w.hp > 0) nb.damageWall(tgt, 1); 
            }
        }
    }
    
    _countElim(p) { 
        if (!this.requiredPieceEnabled || !p || !this.requiredPieceType) return; 
        const cd = p.type?.value || p.typeId || ''; 
        if (cd === this.requiredPieceType) { 
            this.elimCounts[this.requiredPieceType] = (this.elimCounts[this.requiredPieceType] || 0) + 1; 
            if (this.mode === 'game') this._updateHUD(); 
        } 
    }
    
    _scoreGoalMet() { 
        return this.targetScoreEnabled && this.targetScore > 0 && this.score >= this.targetScore; 
    }
    
    _elimGoalMet() { 
        return this.requiredPieceEnabled && this.requiredPieceType && this.requiredPieceCount > 0 && (this.elimCounts[this.requiredPieceType] || 0) >= this.requiredPieceCount; 
    }
    
    _elimGoalProgress() { 
        const d = this.requiredPieceEnabled && this.requiredPieceType ? (this.elimCounts[this.requiredPieceType] || 0) : 0; 
        return `${d}/${this.requiredPieceCount || 0}`; 
    }
    
    _checkGoalsAfterMove() {
        const sg = this._scoreGoalMet(), eg = this._elimGoalMet(); 
        this._updateHUD();
        if (this.movesLeft <= 0 && !sg && !eg) { 
            this.isProcessing = false; 
            setTimeout(() => this.finishRound(false, `🏆 步数耗尽！最终得分：${this.score}`), 400); 
            return true; 
        }
        if (sg || eg) {
            const parts = []; 
            if (sg) parts.push(`分数 ${this.score}/${this.targetScore}`); 
            if (eg) parts.push(`${this.requiredPieceType} 消除 ${this.elimCounts[this.requiredPieceType]}/${this.requiredPieceCount}`);
            this.isProcessing = false; 
            this.finishRound(true, `🎉 达成通关条件！(${parts.join('；')})`); 
            return true;
        }
        return false;
    }
    
    _updateHUD() {
        const se = this._ref('score'), me = this._ref('moves'), ce = this._ref('combo'), te = this._ref('target-score'), tle = this._ref('time-left');
        if (se) se.textContent = this.score; 
        if (me) me.textContent = this.movesLeft; 
        if (ce) ce.textContent = this.comboCount;
        let tgt = this.targetScoreEnabled ? String(this.targetScore) : '—';
        if (this.requiredPieceEnabled && this.requiredPieceType && this.requiredPieceCount > 0) tgt += ` · ${this.requiredPieceType}×${this.requiredPieceCount}[${this._elimGoalProgress()}]`;
        if (te) te.textContent = tgt; 
        if (tle) tle.textContent = this.config?.enableTimeLimit && this.mode === 'game' ? this.timeLeft : '∞';
        if (me) me.parentElement?.classList.toggle('warning', this.movesLeft <= 5);
        if (tle) tle.parentElement?.classList.toggle('warning', this.config?.enableTimeLimit && this.timeLeft <= 10);
    }
    
    startTimer() {
        this.stopTimer();
        if (this.mode !== 'game') { 
            this.timeLeft = this.config?.enableTimeLimit ? Number(this.config.timeLimitSeconds || 90) : 0; 
            this._updateHUD(); 
            return; 
        }
        if (!this.config?.enableTimeLimit) { 
            this.timeLeft = 0; 
            this._updateHUD(); 
            return; 
        }
        const sec = Number(this.config.timeLimitSeconds || 90); 
        if (!Number.isFinite(sec) || sec <= 0) { 
            this.timeLeft = 0; 
            this._updateHUD(); 
            return; 
        }
        this.timeLeft = sec;
        this.timerId = setInterval(() => {
            if (this.isGameEnded) return; 
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0; 
                this._updateHUD();
                const won = this._scoreGoalMet() || this._elimGoalMet(), goals = [];
                if (this._scoreGoalMet()) goals.push(`分数 ${this.score}/${this.targetScore}`);
                if (this._elimGoalMet()) goals.push(`${this.requiredPieceType} 消除 ${this.elimCounts[this.requiredPieceType]}/${this.requiredPieceCount}`);
                this.finishRound(won, won ? `🎉 时间到但已通关！(${goals.join('；')})` : `⏰ 时间到！最终得分：${this.score}，目标：${this.targetScore}，消除目标：${this._elimGoalProgress()}。`); 
                return; 
            } 
            this._updateHUD();
        }, 1000);
    }
    
    stopTimer() { 
        if (this.timerId) { 
            clearInterval(this.timerId); 
            this.timerId = null; 
        } 
    }
    
    finishRound(won, msg) { 
        if (this.isGameEnded) return; 
        this.isGameEnded = true; 
        this.stopTimer(); 
        this.showMessage(msg); 
        setTimeout(() => alert(`${won ? '🎉 过关成功！' : '😵 关卡失败！'}\n\n${msg}`), 300); 
    }
    
    showMessage(msg) { 
        const el = this._ref('message'); 
        if (!el) return;
        el.textContent = msg; 
        el.classList.add('show'); 
        clearTimeout(el._t); 
        el._t = setTimeout(() => el.classList.remove('show'), MESSAGE_DISPLAY_DURATION); 
    }
    
    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    
    ensurePlayableBoard() { 
        let att = 0; 
        while (!this.hasValidMove() && att < 8) { 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
            att++; 
        } 
        if (!this.hasValidMove()) { 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
        } 
    }
    
    init() {
        this.stopTimer(); 
        const cb = this.config?.initialBoard ? this._parseInitialBoardValue(this.config.initialBoard) : null;
        this.board = cb?.length > 0 ? cb : this.createBoard(); 
        if (!cb) { 
            this.stabilizeBoard(); 
            this.ensurePlayableBoard(); 
        }
        this.score = 0; 
        this.movesLeft = this.config.totalMoves || 30; 
        this.comboCount = 0; 
        this.selected = null; 
        this.isProcessing = false;
        this.lastHint = null; 
        this.isGameEnded = false; 
        this.elimCounts = {};
        this.requiredPieceEnabled = this.config?.requiredPieceEnabled === true;
        this.requiredPieceType = getPieceTypeCodeById(this.config?.requiredPieceType, this.config?.pieceTypes) || this.config?.requiredPieceType || null;
        this.requiredPieceCount = Number.isFinite(Number(this.config?.requiredPieceCount)) ? Math.max(0, Number(this.config?.requiredPieceCount)) : 10;
        this.targetScoreEnabled = this.config?.targetScoreEnabled !== false;
        this.targetScore = this.targetScoreEnabled ? Math.max(0, Number(this.config?.targetScore || 50000)) : 0;
        const movesEl = this._ref('moves');
        if (movesEl) movesEl.parentElement?.classList.remove('warning'); 
        this._updateHUD(); 
        this.renderBoard();
        this.showMessage('点击或拖动相邻糖果交换位置！'); 
        if (this.mode === 'game') this.startTimer();
    }
    
    _bindEvents() {
        this._ref('restart-btn')?.addEventListener('click', () => this.init());
        this._ref('hint-btn')?.addEventListener('click', () => this.showHint());
        this._ref('docs-btn')?.addEventListener('click', () => window.location.href = 'docs/index.html');

        const syncGoal = () => {
            const bc = this.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const se = this._ref('admin-target-score-enabled')?.checked ?? true;
            const sv = Number(this._ref('admin-target-score')?.value || 50000);
            const te = this._ref('admin-enable-time-limit')?.checked ?? false;
            const ts = Number(this._ref('admin-time-limit-seconds')?.value || 90);
            const mv = Number(this._ref('admin-total-moves')?.value || bc.totalMoves || 30);
            const re = this._ref('admin-required-piece-enabled')?.checked ?? false;
            const rt = this._ref('admin-required-piece-type')?.value || this.requiredPieceType || bc.requiredPieceType || bc.pieceTypes?.[0]?.id || 'A';
            const rc = Number(this._ref('admin-required-piece-count')?.value || 10);
            this.targetScoreEnabled = se; 
            this.targetScore = se ? (Number.isFinite(sv) ? Math.max(0, sv) : 50000) : 0;
            this.config = { 
                ...bc, 
                targetScore: this.targetScore, 
                targetScoreEnabled: se, 
                enableTimeLimit: te, 
                timeLimitSeconds: Number.isFinite(ts) ? Math.max(10, ts) : 90, 
                totalMoves: Number.isFinite(mv) ? Math.max(1, mv) : 30, 
                requiredPieceEnabled: re, 
                requiredPieceType: rt, 
                requiredPieceCount: Number.isFinite(rc) ? Math.max(0, rc) : 10 
            };
            this.requiredPieceType = rt; 
            this.requiredPieceCount = this.config.requiredPieceCount;
            this.timeLeft = te ? Math.max(0, ts) : 0; 
            this.movesLeft = this.config.totalMoves; 
            this._updateHUD();
        };
        ['admin-target-score-enabled', 'admin-target-score', 'admin-enable-time-limit', 'admin-time-limit-seconds', 'admin-required-piece-enabled'].forEach(id => this._ref(id)?.addEventListener('change', syncGoal));
        ['admin-target-score', 'admin-time-limit-seconds', 'admin-total-moves', 'admin-required-piece-count'].forEach(id => this._ref(id)?.addEventListener('input', syncGoal));

        const art = this._ref('admin-required-piece-type');
        art?.addEventListener('change', () => { 
            this.requiredPieceType = art.value; 
            this.config = this.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] }; 
            this.config.requiredPieceType = this.requiredPieceType; 
        });
        this._ref('admin-total-moves')?.addEventListener('input', () => {
            const m = Number(this._ref('admin-total-moves')?.value || 30);
            this.config = this.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            this.config.totalMoves = Number.isFinite(m) ? Math.max(1, m) : 30; 
            this.movesLeft = this.config.totalMoves; 
            this._updateHUD();
        });
        this._ref('admin-required-piece-count')?.addEventListener('input', () => {
            const c = Number(this._ref('admin-required-piece-count')?.value || 10);
            this.config = this.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            this.config.requiredPieceCount = Number.isFinite(c) ? Math.max(0, c) : 10; 
            this.requiredPieceCount = this.config.requiredPieceCount;
        });
        this._refChain('admin-level-name', el => { 
            if (el) el.value = this.config?.name || ''; 
        });

        this._ref('mode-admin-btn')?.addEventListener('click', () => this.setMode('admin'));
        this._ref('mode-game-btn')?.addEventListener('click', () => this.setMode('game'));

        this._ref('admin-save-rules-btn')?.addEventListener('click', () => {
            const f = readAdminRuleForm(), bc = this.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const sc = sanitizeConfig({ 
                ...bc, 
                targetScoreEnabled: f.targetScoreEnabled, 
                targetScore: f.targetScore, 
                enableTimeLimit: f.enableTimeLimit, 
                timeLimitSeconds: f.timeLimitSeconds, 
                totalMoves: f.totalMoves, 
                requiredPieceEnabled: f.requiredPieceEnabled, 
                requiredPieceType: f.requiredPieceType, 
                requiredPieceCount: f.requiredPieceCount, 
                name: f.levelName || bc.name || '自定义关卡' 
            });
            sc.requiredPieceType = f.requiredPieceType || sc.requiredPieceType || sc.pieceTypes?.[0]?.id || 'A';
            sc.requiredPieceCount = f.requiredPieceCount || sc.requiredPieceCount || 10;
            this.applyConfig(sc); 
            this.init(); 
            this.showMessage('✅ 规则已保存并生效。');
        });
        this._ref('admin-save-level-btn')?.addEventListener('click', () => {
            const f = readAdminRuleForm(), bc = this.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const sc = sanitizeConfig({ 
                ...bc, 
                targetScoreEnabled: f.targetScoreEnabled, 
                targetScore: f.targetScore, 
                enableTimeLimit: f.enableTimeLimit, 
                timeLimitSeconds: f.timeLimitSeconds, 
                totalMoves: f.totalMoves, 
                requiredPieceEnabled: f.requiredPieceEnabled, 
                requiredPieceType: f.requiredPieceType, 
                requiredPieceCount: f.requiredPieceCount, 
                name: f.levelName || bc.name || `关卡-${new Date().toLocaleDateString()}-${Date.now().toString().slice(-4)}` 
            });
            sc.initialBoard = this.serializeCurrentBoard();
            const ln = f.levelName || sc.name || `关卡-${new Date().toLocaleDateString()}-${Date.now().toString().slice(-4)}`;
            const lv = JSON.parse(localStorage.getItem(LEVELS_KEY) || '[]'), 
                  nl = Array.isArray(lv) ? lv : [], 
                  pl = { name: ln, config: { ...sc, name: ln } };
            const ix = nl.findIndex(l => l?.name === ln); 
            if (ix >= 0) nl[ix] = pl; 
            else nl.unshift(pl);
            localStorage.setItem(LEVELS_KEY, JSON.stringify(nl.slice(0, MAX_LEVELS_STORED))); 
            updateLevelList();
            this.applyConfig(sc); 
            this.init(); 
            this.showMessage(`✅ 关卡已保存：${ln}`);
        });
        this._ref('admin-apply-board-btn')?.addEventListener('click', () => { 
            this.init(); 
            this.showMessage('✅ 管理员配置已应用到棋盘。'); 
        });
        this._ref('game-start-btn')?.addEventListener('click', () => this.setMode('game'));

        ['cell-piece-type', 'cell-pattern', 'cell-bg-color', 'cell-pattern-color', 'cell-movable', 'cell-ice-layer', 'cell-wall-left', 'cell-wall-top', 'cell-wall-right', 'cell-wall-bottom'].forEach(id => {
            this._ref(id)?.addEventListener('change', () => { if (this.mode === 'admin') this.previewSelectedCellEditor(); });
            this._ref(id)?.addEventListener('input', () => { if (this.mode === 'admin') this.previewSelectedCellEditor(); });
        });
        this._ref('cell-apply-btn')?.addEventListener('click', () => this.applySelectedCellEditor());
        this._ref('cell-clear-btn')?.addEventListener('click', () => {
            const cu = this.selected; 
            if (!cu) return; 
            this.board[cu.r][cu.c] = null; 
            this.renderBoard(); 
            this.syncEditorPanel();
        });
    }
}

// ==================== Settings Panel ====================
function setupSettingsPanel(engine) {
    const sb = document.getElementById('settings-btn'), 
          so = document.getElementById('settings-overlay'), 
          csb = document.getElementById('cfg-save'), 
          crb = document.getElementById('cfg-reset'), 
          ccb = document.getElementById('cfg-close');
    
    function serializePT(t) {
        const we = WALL_SIDES.map(s => { 
            const w = t.walls?.[s] || {}; 
            return [
                `wall${s[0].toUpperCase()}${s.slice(1)}=${Boolean(w.enabled)}`, 
                `wall${s[0].toUpperCase()}${s.slice(1)}Hp=${Number(w.hp || 0)}`, 
                `wall${s[0].toUpperCase()}${s.slice(1)}Color=${w.color || 'rgba(255,255,255,0.9)'}`
            ]; 
        }).flat();
        return [
            `${t.id}:${t.color || t.background || '#888'}`, 
            `char=${encodeURIComponent(t.char || '')}`, 
            `code=${encodeURIComponent(t.code || t.id)}`,
            `typeOptions=${encodeURIComponent(JSON.stringify(t.pieceUI?.type?.options || [{ value: t.code || t.id, label: t.id }]))}`,
            `pattern=${t.pattern || 'dot'}`, 
            `patternColor=${t.patternColor || 'rgba(255,255,255,0.22)'}`,
            `pieceColor=${t.pieceColor || '#ffffff'}`, 
            `borderColor=${t.borderColor || 'rgba(255,255,255,0.3)'}`, 
            ...we
        ].join('|');
    }
    
    function fillForm(cfg) {
        document.getElementById('cfg-rows').value = cfg.rows; 
        document.getElementById('cfg-cols').value = cfg.cols;
        document.getElementById('cfg-cell-size').value = cfg.cellSize;
        document.getElementById('cfg-piece-types').value = cfg.pieceTypes.map(serializePT).join(';');
        document.getElementById('cfg-total-moves').value = cfg.totalMoves; 
        document.getElementById('cfg-match-length').value = cfg.matchLength;
        document.getElementById('cfg-enable-square').checked = cfg.enableSquare; 
        document.getElementById('cfg-enable-diagonal').checked = cfg.enableDiagonal;
        document.getElementById('cfg-enable-drag').checked = cfg.enableDrag; 
        document.getElementById('cfg-enable-time-limit').checked = cfg.enableTimeLimit === true;
        document.getElementById('cfg-time-limit-seconds').value = cfg.timeLimitSeconds || 90;
        document.getElementById('cfg-initial-board').value = Array.isArray(cfg.initialBoard) ? cfg.initialBoard.map(r => r.join(',')).join('\n') : (cfg.initialBoard || '');
        document.getElementById('cfg-base-score').value = cfg.baseScore; 
        document.getElementById('cfg-combo-multiplier').checked = cfg.comboMultiplier;
        const ps = document.getElementById('cfg-preset');
        // 注意：PRESET_CONFIGS 未在代码中定义，这里保持原有逻辑
        const mt = Object.entries(PRESET_CONFIGS || {}).find(([, pr]) => {
            const p = { ...DEFAULT_CONFIG, ...pr.config, pieceTypes: pr.config.pieceTypes || DEFAULT_CONFIG.pieceTypes };
            return JSON.stringify({ 
                rows: p.rows, cols: p.cols, cellSize: p.cellSize, totalMoves: p.totalMoves, 
                matchLength: p.matchLength, enableSquare: p.enableSquare, enableDiagonal: p.enableDiagonal, 
                enableDrag: p.enableDrag, enableTimeLimit: p.enableTimeLimit, timeLimitSeconds: p.timeLimitSeconds, 
                baseScore: p.baseScore, comboMultiplier: p.comboMultiplier, explodeRules: p.explodeRules, 
                initialBoard: p.initialBoard 
            }) === JSON.stringify({ 
                rows: cfg.rows, cols: cfg.cols, cellSize: cfg.cellSize, totalMoves: cfg.totalMoves, 
                matchLength: cfg.matchLength, enableSquare: cfg.enableSquare, enableDiagonal: cfg.enableDiagonal, 
                enableDrag: cfg.enableDrag, enableTimeLimit: cfg.enableTimeLimit, timeLimitSeconds: cfg.timeLimitSeconds, 
                baseScore: cfg.baseScore, comboMultiplier: cfg.comboMultiplier, explodeRules: cfg.explodeRules, 
                initialBoard: cfg.initialBoard 
            });
        });
        if (ps) ps.value = mt ? mt[0] : 'custom';
        const er = cfg.explodeRules || {};
        document.getElementById('cfg-explode-4').value = er[4] || ''; 
        document.getElementById('cfg-explode-5').value = er[5] || ''; 
        document.getElementById('cfg-explode-6').value = er[6] || '';
    }
    
    function readForm() {
        const num = id => parseInt(document.getElementById(id).value, 10);
        const preset = document.getElementById('cfg-preset')?.value || 'custom';
        const rows = num('cfg-rows'), cols = num('cfg-cols'), cellSize = num('cfg-cell-size'), 
              totalMoves = num('cfg-total-moves'), matchLength = num('cfg-match-length'), 
              baseScore = num('cfg-base-score');
        const enableTimeLimit = document.getElementById('cfg-enable-time-limit').checked;
        const timeLimitSeconds = num('cfg-time-limit-seconds');
        const targetScore = Number(document.getElementById('admin-target-score')?.value || 50000);
        const targetScoreEnabled = document.getElementById('admin-target-score-enabled')?.checked ?? true;
        const ibr = document.getElementById('cfg-initial-board').value.trim();
        const initialBoard = ibr ? ibr.split(/\n|;/).map(r => r.split(',').map(c => c.trim()).filter(Boolean)) : null;
        const raw = document.getElementById('cfg-piece-types').value;
        const pieceTypes = splitPieceTypeEntries(raw).map((e, i) => parsePieceTypeEntry(e, `piece${i + 1}`)).filter(Boolean);
        if (pieceTypes.length < 2) { alert('至少需要 2 种棋子'); return null; }
        const explodeRules = {};
        ['4', '5', '6'].forEach(n => { const v = document.getElementById(`cfg-explode-${n}`).value.trim(); if (v) explodeRules[+n] = v; });
        return {
            presetName: preset, rows, cols, cellSize, pieceTypes, totalMoves, matchLength,
            enableSquare: document.getElementById('cfg-enable-square').checked, 
            enableDiagonal: document.getElementById('cfg-enable-diagonal').checked, 
            enableDrag: document.getElementById('cfg-enable-drag').checked,
            enableTimeLimit, 
            timeLimitSeconds: Number.isFinite(timeLimitSeconds) && timeLimitSeconds > 0 ? timeLimitSeconds : 90,
            targetScore: Number.isFinite(targetScore) ? Math.max(0, targetScore) : 50000, 
            targetScoreEnabled, 
            initialBoard, 
            baseScore,
            comboMultiplier: document.getElementById('cfg-combo-multiplier').checked, 
            explodeRules, 
            gap: 4
        };
    }
    
    function openSettings() { fillForm(engine.config); so.classList.remove('hidden'); }
    function closeSettings() { so.classList.add('hidden'); }
    
    function applyPreset(n) { 
        const p = (PRESET_CONFIGS || {})[n]; 
        if (!p) return; 
        fillForm({ ...DEFAULT_CONFIG, ...p.config, pieceTypes: p.config.pieceTypes || DEFAULT_CONFIG.pieceTypes }); 
        const nc = readForm(); 
        if (nc) saveConfig(nc); 
    }
    
    function saveConfig(cfg) { 
        const sc = sanitizeConfig(cfg || DEFAULT_CONFIG); 
        engine.applyConfig(sc); 
        engine.init(); 
        closeSettings(); 
        engine.showMessage('✅ 设置已保存并应用！'); 
    }
    
    sb?.addEventListener('click', openSettings); 
    ccb?.addEventListener('click', closeSettings);
    csb?.addEventListener('click', () => { const cfg = readForm(); if (cfg) saveConfig(cfg); });
    crb?.addEventListener('click', () => { if (confirm('确定恢复所有默认设置吗？')) saveConfig({ ...DEFAULT_CONFIG }); });
    document.getElementById('cfg-preset')?.addEventListener('change', e => { 
        if (e.target.value && e.target.value !== 'custom') applyPreset(e.target.value); 
    });
    document.getElementById('cfg-load-preset')?.addEventListener('click', () => { 
        const n = document.getElementById('cfg-preset')?.value; 
        if (n && n !== 'custom') applyPreset(n); 
    });
    so?.addEventListener('click', e => { if (e.target === so) closeSettings(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSettings(); });
}

// ==================== 启动 ====================
const game = new GameEngine(); 
const sc = game.loadConfig(); 
game.applyConfig(sc); 
game.init(); 
setupSettingsPanel(game);
console.log('🍬 糖果消消乐 v5 已启动！');
console.log('📐 棋盘:', game.rows, 'x', game.cols);
console.log('🎯 匹配规则:', game.matchRules.map(r => r.name).join(', '));
console.log('💥 爆炸规则:', game.config.explodeRules);