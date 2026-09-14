// ==================== AdminPanel 管理员面板 ====================

class AdminPanel {
    constructor(game) {
        this.game = game;
        this._bound = false;
    }
    
    // ==================== 初始化 ====================
    
    init() {
        if (this._bound) return;
        this._bound = true;
        
        this._refreshPieceTypeSelectors();
        this._refreshLevelList();
        this._syncFormValues();
        this._bindEvents();
        this._bindEditorEvents();
    }
    
    // ==================== 刷新 UI ====================
    
    refresh() {
        this._refreshPieceTypeSelectors();
        this._refreshLevelList();
        this._syncFormValues();
        this.syncEditor();
        this.syncTileGroups();
    }
    
    _refreshPieceTypeSelectors() {
        const pieceTypes = (this.game.config.pieceTypes || []).filter(t => t.isPiece !== false);
        
        // 指定棋子类型选择器
        const artSel = document.getElementById('admin-required-piece-type');
        if (artSel) {
            const current = this.game.config.requiredPieceType || pieceTypes[0]?.id || '';
            artSel.innerHTML = pieceTypes
                .map(t => `<option value="${t.id}">${t.char || ''} ${t.id}</option>`)
                .join('');
            if (pieceTypes.find(t => t.id === current)) {
                artSel.value = current;
            }
            this._buildTileOptions(artSel, pieceTypes.map(t => ({
                value: t.id,
                label: `${t.char || ''} ${t.id}`
            })), artSel.value);
        }
        
        // 编辑器棋子类型选择器
        const ctSel = document.getElementById('cell-piece-type');
        if (ctSel) {
            const emptyOpt = { value: 'empty', label: '无棋子' };
            const opts = [emptyOpt, ...pieceTypes.map(t => ({
                value: t.id,
                label: `${t.char || ''} ${t.id}`
            }))];
            const current = ctSel.value || pieceTypes[0]?.id || 'empty';
            ctSel.innerHTML = opts
                .map(o => `<option value="${o.value}">${o.label}</option>`)
                .join('');
            ctSel.value = current;
            this._buildTileOptions(ctSel, opts, current);
        }
        
        // 图案选择器
        const patternSel = document.getElementById('cell-pattern');
        if (patternSel) {
            const patterns = [
                { value: 'solid', label: 'solid' },
                { value: 'transparent', label: 'transparent' },
                { value: 'dot', label: 'dot' },
                { value: 'stripe', label: 'stripe' },
                { value: 'check', label: 'check' },
                { value: 'waves', label: 'waves' },
                { value: 'spark', label: 'spark' }
            ];
            this._buildTileOptions(patternSel, patterns, patternSel.value || 'dot');
        }
        
        // 围墙选择器
        for (const side of ['left', 'top', 'right', 'bottom']) {
            const sel = document.getElementById(`cell-wall-${side}`);
            if (!sel) continue;
            const wallOpts = [
                { value: 'none', label: '无' },
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
            ];
            this._buildTileOptions(sel, wallOpts, sel.value || 'none');
        }
    }
    
    _buildTileOptions(sel, opts, selectedVal) {
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
                this.syncTileGroups();
                if (this.game.mode === 'admin') {
                    this.previewSelectedCell();
                }
            });
            container.appendChild(btn);
        });
    }
    
    _refreshLevelList() {
        const el = document.getElementById('admin-level-list');
        if (!el) return;
        
        const levels = this.game.saveSystem.listLevels();
        if (!levels.length) {
            el.innerHTML = '<div class="level-pill"><span>暂无保存关卡</span></div>';
            return;
        }
        
        el.innerHTML = '';
        levels.forEach(level => {
            const row = document.createElement('div');
            row.className = 'level-pill';
            
            const name = document.createElement('span');
            name.textContent = level.name || '未命名关卡';
            row.appendChild(name);
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = '加载';
            btn.addEventListener('click', () => this._loadLevel(level));
            row.appendChild(btn);
            
            el.appendChild(row);
        });
    }
    
    _syncFormValues() {
        const cfg = this.game.config;
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        const setChecked = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!value;
        };
        
        setChecked('admin-target-score-enabled', cfg.targetScoreEnabled !== false);
        set('admin-target-score', cfg.targetScore);
        setChecked('admin-enable-time-limit', cfg.enableTimeLimit === true);
        set('admin-time-limit-seconds', cfg.timeLimitSeconds);
        set('admin-total-moves', cfg.totalMoves);
        setChecked('admin-required-piece-enabled', cfg.requiredPieceEnabled === true);
        set('admin-required-piece-count', cfg.requiredPieceCount);
        set('admin-level-name', cfg.name || '');
        
        const artSel = document.getElementById('admin-required-piece-type');
        if (artSel && cfg.requiredPieceType) {
            artSel.value = cfg.requiredPieceType;
        }
    }
    
    syncTileGroups() {
        document.querySelectorAll('.tile-group').forEach(group => {
            const sel = group.previousElementSibling;
            if (!sel || sel.tagName?.toLowerCase() !== 'select') return;
            const v = String(sel.value ?? '');
            group.querySelectorAll('.option-tile').forEach(t => {
                t.classList.toggle('selected', String(t.dataset.value) === v);
            });
        });
    }
    
    // ==================== 编辑器同步 ====================
    
    syncEditor() {
        const label = document.getElementById('selected-cell-label');
        const pt = document.getElementById('cell-piece-type');
        const ps = document.getElementById('cell-pattern');
        const bg = document.getElementById('cell-bg-color');
        const pc = document.getElementById('cell-pattern-color');
        const mv = document.getElementById('cell-movable');
        const ic = document.getElementById('cell-ice-layer');
        const walls = {};
        for (const s of ['left', 'top', 'right', 'bottom']) {
            walls[s] = document.getElementById(`cell-wall-${s}`);
        }
        
        const reset = () => {
            if (label) label.textContent = '当前选中：未选择格子';
            if (pt) pt.value = 'empty';
            if (ps) ps.value = 'solid';
            if (bg) bg.value = '#888888';
            if (pc) pc.value = '#ffffff';
            if (mv) mv.checked = true;
            if (ic) ic.value = '0';
            for (const el of Object.values(walls)) {
                if (el) el.value = 'none';
            }
            this.syncTileGroups();
        };
        
        // 未选中
        if (!this.game.selected) {
            reset();
            return;
        }
        
        const { r, c } = this.game.selected;
        const piece = this.game.board.get(r, c);
        
        // 空格
        if (!piece) {
            if (label) label.textContent = `当前选中：(${r + 1},${c + 1}) 空格`;
            reset();
            if (label) label.textContent = `当前选中：(${r + 1},${c + 1}) 空格`;
            return;
        }
        
        // 有棋子
        if (label) label.textContent = `当前选中：(${r + 1},${c + 1}) ${piece.id}`;
        if (pt) pt.value = piece.id;
        if (ps) ps.value = piece.visual.pattern || 'solid';
        if (bg) bg.value = Utils.toCssHex(piece.visual.color, '#888888');
        if (pc) pc.value = Utils.toCssHex(piece.visual.patternColor, '#ffffff');
        if (mv) mv.checked = !piece.hasAttr('locked');
        if (ic) ic.value = String(piece.getAttr('ice') || 0);
        
        for (const s of ['left', 'top', 'right', 'bottom']) {
            const el = walls[s];
            if (!el) continue;
            const hp = piece.getAttr(`wall_${s}`) || 0;
            el.value = hp <= 0 ? 'none' : hp >= 3 ? 'high' : hp >= 2 ? 'medium' : 'low';
        }
        
        this.syncTileGroups();
    }
    
    previewSelectedCell() {
        if (!this.game.selected) return;
        const { r, c } = this.game.selected;
        const cell = this.game.renderSystem.getCell(r, c);
        if (!cell) return;
        
        const piece = this._buildEditorPiece();
        if (piece) {
            this.game.renderSystem._renderPiece(cell, piece, r, c);
        } else {
            cell.innerHTML = '';
        }
        cell.classList.add('selected');
    }
    
    _buildEditorPiece() {
        const pt = document.getElementById('cell-piece-type');
        const typeId = pt?.value || 'empty';
        if (typeId === 'empty') return null;
        
        const piece = this.game.pieceFactory.create(typeId);
        if (!piece) return null;
        
        const ps = document.getElementById('cell-pattern');
        const bg = document.getElementById('cell-bg-color');
        const pc = document.getElementById('cell-pattern-color');
        const mv = document.getElementById('cell-movable');
        const ic = document.getElementById('cell-ice-layer');
        
        piece.visual.color = bg?.value || piece.visual.color;
        piece.visual.pattern = ps?.value || 'solid';
        piece.visual.patternColor = ps?.value === 'transparent' 
            ? 'transparent' 
            : (pc?.value || piece.visual.patternColor);
        
        // 冰层
        const iceLevel = Math.max(0, Math.min(6, Number(ic?.value || 0)));
        if (iceLevel > 0) piece.attrs.ice = iceLevel;
        
        // 锁定
        if (mv && !mv.checked) piece.attrs.locked = 1;
        
        // 围墙
        const wallMap = { none: 0, low: 1, medium: 2, high: 3 };
        for (const side of ['left', 'top', 'right', 'bottom']) {
            const sel = document.getElementById(`cell-wall-${side}`);
            const hp = wallMap[sel?.value] || 0;
            if (hp > 0) piece.attrs[`wall_${side}`] = hp;
        }
        
        return piece;
    }
    
    applyToSelectedCell() {
        if (!this.game.selected) {
            this.game.showMessage('请先选择一个格子');
            return;
        }
        const { r, c } = this.game.selected;
        const piece = this._buildEditorPiece();
        this.game.board.set(r, c, piece);
        this.game.matchSystem.clearCache();
        this.game.renderSystem.renderAll();
        this.syncEditor();
        this.game.showMessage('✅ 已应用到当前格子');
    }
    
    clearSelectedCell() {
        if (!this.game.selected) return;
        const { r, c } = this.game.selected;
        this.game.board.set(r, c, null);
        this.game.matchSystem.clearCache();
        this.game.renderSystem.renderAll();
        this.syncEditor();
    }
    
    // ==================== 事件绑定 ====================
    
    _bindEvents() {
        const g = this.game;
        
        // 保存规则
        document.getElementById('admin-save-rules-btn')?.addEventListener('click', () => {
            this._saveRules();
        });
        
        // 保存关卡
        document.getElementById('admin-save-level-btn')?.addEventListener('click', () => {
            this._saveLevel();
        });
        
        // 应用配置
        document.getElementById('admin-apply-board-btn')?.addEventListener('click', () => {
            g.init();
            g.showMessage('✅ 管理员配置已应用');
        });
        
        // 切换到游戏模式
        document.getElementById('game-start-btn')?.addEventListener('click', () => {
            g.setMode('game');
        });
        
        // 表单实时同步
        const formIds = [
            'admin-target-score-enabled', 'admin-target-score',
            'admin-enable-time-limit', 'admin-time-limit-seconds',
            'admin-total-moves', 'admin-required-piece-enabled',
            'admin-required-piece-type', 'admin-required-piece-count'
        ];
        
        for (const id of formIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            el.addEventListener('change', () => this._syncConfigFromForm());
            el.addEventListener('input', () => this._syncConfigFromForm());
        }
    }
    
    _syncConfigFromForm() {
        const g = this.game;
        const get = id => document.getElementById(id);
        const val = (id, def) => {
            const el = get(id);
            return el ? el.value : def;
        };
        const checked = (id, def) => {
            const el = get(id);
            return el ? el.checked : def;
        };
        const num = (id, def) => {
            const v = Number(val(id, def));
            return Number.isFinite(v) ? v : def;
        };
        
        g.config.targetScoreEnabled = checked('admin-target-score-enabled', true);
        g.config.targetScore = Math.max(0, num('admin-target-score', 50000));
        g.config.enableTimeLimit = checked('admin-enable-time-limit', false);
        g.config.timeLimitSeconds = Math.max(10, num('admin-time-limit-seconds', 90));
        g.config.totalMoves = Math.max(1, num('admin-total-moves', 30));
        g.config.requiredPieceEnabled = checked('admin-required-piece-enabled', false);
        g.config.requiredPieceType = val('admin-required-piece-type', 'A');
        g.config.requiredPieceCount = Math.max(0, num('admin-required-piece-count', 10));
        
        // 同步步数/时间显示
        g.movesLeft = g.config.totalMoves;
        g.timerSystem.timeLeft = g.config.enableTimeLimit ? g.config.timeLimitSeconds : 0;
        g.updateHUD();
    }
    
    _saveRules() {
        const g = this.game;
        this._syncConfigFromForm();
        
        const name = document.getElementById('admin-level-name')?.value?.trim();
        if (name) g.config.name = name;
        
        g.saveSystem.saveConfig(g.config);
        g.init();
        g.showMessage('✅ 规则已保存并生效');
    }
    
    _saveLevel() {
        const g = this.game;
        this._syncConfigFromForm();
        
        let name = document.getElementById('admin-level-name')?.value?.trim();
        if (!name) {
            name = `关卡-${new Date().toLocaleDateString()}-${Date.now().toString().slice(-4)}`;
        }
        
        const level = {
            name,
            config: { ...g.config, name },
            board: g.board.serialize()
        };
        
        g.saveSystem.saveLevel(level);
        this._refreshLevelList();
        g.showMessage(`✅ 关卡已保存：${name}`);
    }
    
    _loadLevel(level) {
        const g = this.game;
        if (!level?.config) return;
        
        // 恢复配置
        g.config = { ...DEFAULT_CONFIG, ...level.config };
        
        // 恢复棋盘
        if (level.board) {
            g.board = Board.deserialize(level.board);
        }
        
        g.pieceFactory.updateConfig(g.config);
        g.scoreSystem.updateConfig(g.config);
        g._initMatchRules();
        g._initGoals();
        
        // 渲染
        g.renderSystem.renderAll();
        g.updateHUD();
        this.refresh();
        g.showMessage(`✅ 已加载关卡：${level.name}`);
    }
    
    // ==================== 编辑器事件 ====================
    
    _bindEditorEvents() {
        const editorIds = [
            'cell-piece-type', 'cell-pattern', 'cell-bg-color',
            'cell-pattern-color', 'cell-movable', 'cell-ice-layer',
            'cell-wall-left', 'cell-wall-top', 'cell-wall-right', 'cell-wall-bottom'
        ];
        
        for (const id of editorIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            const handler = () => {
                if (this.game.mode === 'admin') {
                    this.previewSelectedCell();
                }
            };
            el.addEventListener('change', handler);
            el.addEventListener('input', handler);
        }
        
        document.getElementById('cell-apply-btn')?.addEventListener('click', () => {
            this.applyToSelectedCell();
        });
        
        document.getElementById('cell-clear-btn')?.addEventListener('click', () => {
            this.clearSelectedCell();
        });
    }
}

window.AdminPanel = AdminPanel;