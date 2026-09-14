// ==================== 配置管理 ====================


class ConfigManager {
    constructor() {
        this.config = null;
        this.levels = [];
        this._loadLevels();
    }
    
    loadConfig() {
        try {
            const s = localStorage.getItem(CONFIG_KEY); 
            if (!s) return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const p = JSON.parse(s), f = this.sanitizeConfig(p);
            if (JSON.stringify(f) !== JSON.stringify(p)) localStorage.setItem(CONFIG_KEY, JSON.stringify(f)); 
            return f;
        } catch (e) { 
            console.warn('配置加载失败', e); 
            try { localStorage.removeItem(CONFIG_KEY); } catch { } 
            return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] }; 
        }
    }
    
    saveConfig(cfg) {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
        } catch { }
    }
    
    sanitizeConfig(raw) {
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
        const np = normalizePieceTypes(raw.pieceTypes || fb.pieceTypes, fb.pieceTypes);
        if (np.length >= 2) {
            safe.pieceTypes = np.map(p => {
                const n = { ...p }; 
                n.id = String(n.id || 'piece'); 
                n.isPiece = n.id === EMPTY_CELL_VALUE ? false : n.isPiece !== false;
                n.code = String((DEFAULT_CONFIG.pieceTypes.find(t => t.id === n.id)?.code) 
                    ? DEFAULT_CONFIG.pieceTypes.find(t => t.id === n.id).code
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
    
    _loadLevels() {
        try {
            this.levels = JSON.parse(localStorage.getItem(LEVELS_KEY) || '[]');
            if (!Array.isArray(this.levels)) this.levels = [];
        } catch {
            this.levels = [];
        }
    }
    
    saveLevel(name, config, board) {
        const sc = this.sanitizeConfig({ ...config, name });
        sc.initialBoard = board;
        const pl = { name, config: { ...sc, name } };
        const ix = this.levels.findIndex(l => l?.name === name);
        if (ix >= 0) this.levels[ix] = pl;
        else this.levels.unshift(pl);
        localStorage.setItem(LEVELS_KEY, JSON.stringify(this.levels.slice(0, MAX_LEVELS_STORED)));
        this._loadLevels();
        return pl;
    }
    
    getLevels() { return this.levels; }
    
    getLevelByName(name) {
        return this.levels.find(l => l?.name === name) || null;
    }
}

// 文件末尾：
window.ConfigManager = ConfigManager;