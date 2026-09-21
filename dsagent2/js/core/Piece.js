// ==================== Piece 类 ====================

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
            
            const bombType = this.stateData.bomb?.type || 'A';
            const bombIcon = this._getBombIcon(bombType);
            e.textContent = bombIcon;
            
            // 添加动画类
            if (bombType === 'A' || bombType === 'B') {
                const dir = this.stateData.bomb?.direction || 'horizontal';
                e.classList.add(`bomb-${dir}`);
            } else if (bombType === 'C') {
                e.classList.add('bomb-c');
            } else if (bombType === 'D') {
                e.classList.add('bomb-d');
            } else if (bombType === 'E') {
                e.classList.add('bomb-e');
            } else if (bombType === 'F') {
                e.classList.add('bomb-f');
                // F炸弹显示小鸟
                e.textContent = '🐦';
                e.style.color = this.pieceColor || '#ffffff';
            }
            
            cellEl.appendChild(e); 
        }
    }

    // 添加获取炸弹图标的方法
    _getBombIcon(type) {
        const icons = {
            'A': '💥',
            'B': '💥',
            'C': '✨',
            'D': '⭐',
            'E': '🌈',
            'F': '🐦'
        };
        return icons[type] || '💣';
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

// 文件末尾：
window.Piece = Piece;