// ==================== 管理员面板 ====================


class AdminPanel {
    constructor(engine) {
        this.engine = engine;
        this.configManager = new ConfigManager();
    }
    
    refreshUI() {
        this._refreshRequiredPieceType();
        this._refreshCellEditor();
        this._refreshWallSelectors();
        this._refreshLevelList();
        this._syncFormValues();
        syncTileGroups();
    }
    
    _refreshRequiredPieceType() {
        const art = $('admin-required-piece-type');
        const pts = (this.engine.config?.pieceTypes || []).filter(t => t?.isPiece !== false);
        if (!art || !pts.length) return;
        
        const opts = pts.map(getPieceTypeUIOption);
        let cur = getPieceTypeCodeById(this.engine.requiredPieceType || this.engine.config?.requiredPieceType, this.engine.config?.pieceTypes) || opts[0]?.value || 'A';
        art.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        art.value = cur;
        this.engine.requiredPieceType = cur;
        if (this.engine.config) this.engine.config.requiredPieceType = cur;
        buildTileOptions(art, opts, cur, () => {
            this.engine.requiredPieceType = art.value;
            if (this.engine.config) this.engine.config.requiredPieceType = this.engine.requiredPieceType;
        });
    }
    
    _refreshCellEditor() {
        const ct = $('cell-piece-type');
        const pts = (this.engine.config?.pieceTypes || []).filter(t => t?.isPiece !== false);
        if (!ct || !pts.length) return;
        
        const emptyOpt = { value: 'empty', label: '无棋子' };
        const opts = [emptyOpt, ...pts.map(getPieceTypeUIOption)];
        const cur = ct.value || opts[1]?.value || 'empty';
        ct.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        ct.value = cur;
        buildTileOptions(ct, opts, cur, () => {
            if (this.engine.mode === 'admin') this.engine.previewSelectedCellEditor();
        });
        
        // 图案选项
        const ps = $('cell-pattern');
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
                if (this.engine.mode === 'admin') this.engine.previewSelectedCellEditor();
            });
        }
    }
    
    _refreshWallSelectors() {
        for (const s of ['left', 'top', 'right', 'bottom']) {
            const ws = $(`cell-wall-${s}`);
            if (!ws) continue;
            const wallOpts = [
                { value: 'none', label: '无' },
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
            ];
            buildTileOptions(ws, wallOpts, ws.value || 'none', () => {
                if (this.engine.mode === 'admin') this.engine.previewSelectedCellEditor();
            });
        }
    }
    
    _refreshLevelList() {
        const el = $('admin-level-list');
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
                        const c = this.configManager.sanitizeConfig(l.config);
                        this.engine.applyConfig(c);
                        this.engine.init();
                        this.engine.setMode('admin');
                        this.engine.showMessage('✅ 已加载关卡：' + (c.name || l.name || '未命名关卡'));
                    }
                });
                row.appendChild(btn);
                el.appendChild(row);
            });
        } catch {
            el.innerHTML = '<div class="level-pill"><span>关卡列表不可用</span></div>';
        }
    }
    
    _syncFormValues() {
        $$('admin-total-moves', el => el.value = String(this.engine.config?.totalMoves || 30));
        $$('admin-required-piece-count', el => el.value = String(this.engine.requiredPieceCount || this.engine.config?.requiredPieceCount || 10));
        const re = $('admin-required-piece-enabled');
        if (re) re.checked = this.engine.requiredPieceEnabled === true || this.engine.config?.requiredPieceEnabled === true;
        $$('admin-level-name', el => el.value = this.engine.config?.name || '');
        $$('admin-target-score-enabled', el => el.checked = this.engine.targetScoreEnabled !== false);
        $$('admin-target-score', el => el.value = String(this.engine.targetScore || 50000));
        $$('admin-enable-time-limit', el => el.checked = this.engine.config?.enableTimeLimit === true);
        $$('admin-time-limit-seconds', el => el.value = String(this.engine.config?.timeLimitSeconds || 90));
    }
    
    syncEditor() {
        const pt = $('cell-piece-type'), ps = $('cell-pattern'), bg = $('cell-bg-color'), pc = $('cell-pattern-color'), mv = $('cell-movable'), ic = $('cell-ice-layer'), lb = $('selected-cell-label');
        const ws = {};
        for (const s of ['left', 'top', 'right', 'bottom']) ws[s] = $(`cell-wall-${s}`);
        const fill = (bgv, pcv) => {
            if (bg) bg.value = toCssHex(bgv, '#888888');
            if (pc) pc.value = toCssHex(pcv, '#ffffff');
        };
        const resetEmpty = () => {
            if (lb) lb.textContent = '当前选中：未选择格子';
            if (pt) pt.value = 'empty';
            if (ps) ps.value = 'solid';
            fill('transparent', 'rgba(255,255,255,0.7)');
            if (mv) mv.checked = true;
            if (ic) ic.value = '0';
            for (const e of Object.values(ws)) if (e) e.value = 'none';
            syncTileGroups();
        };
        if (!this.engine.selected) { resetEmpty(); return; }
        const { r, c } = this.engine.selected, p = this.engine.board[r]?.[c];
        if (!p) {
            if (lb) lb.textContent = `当前选中：(${r + 1},${c + 1}) 空格`;
            resetEmpty();
            return;
        }
        if (lb) lb.textContent = `当前选中：(${r + 1},${c + 1}) ${p.typeId}`;
        if (pt) pt.value = getPieceTypeUIOption(this.engine.config.pieceTypes.find(t => t.id === p.typeId) || {}).value;
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
    
    bindEvents() {
        // 同步规则变化
        const syncGoal = () => {
            const bc = this.engine.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const se = $('admin-target-score-enabled')?.checked ?? true;
            const sv = Number($('admin-target-score')?.value || 50000);
            const te = $('admin-enable-time-limit')?.checked ?? false;
            const ts = Number($('admin-time-limit-seconds')?.value || 90);
            const mv = Number($('admin-total-moves')?.value || bc.totalMoves || 30);
            const re = $('admin-required-piece-enabled')?.checked ?? false;
            const rt = $('admin-required-piece-type')?.value || this.engine.requiredPieceType || bc.requiredPieceType || bc.pieceTypes?.[0]?.id || 'A';
            const rc = Number($('admin-required-piece-count')?.value || 10);
            this.engine.targetScoreEnabled = se;
            this.engine.targetScore = se ? (Number.isFinite(sv) ? Math.max(0, sv) : 50000) : 0;
            this.engine.config = {
                ...bc,
                targetScore: this.engine.targetScore,
                targetScoreEnabled: se,
                enableTimeLimit: te,
                timeLimitSeconds: Number.isFinite(ts) ? Math.max(10, ts) : 90,
                totalMoves: Number.isFinite(mv) ? Math.max(1, mv) : 30,
                requiredPieceEnabled: re,
                requiredPieceType: rt,
                requiredPieceCount: Number.isFinite(rc) ? Math.max(0, rc) : 10
            };
            this.engine.requiredPieceType = rt;
            this.engine.requiredPieceCount = this.engine.config.requiredPieceCount;
            this.engine.timeLeft = te ? Math.max(0, ts) : 0;
            this.engine.movesLeft = this.engine.config.totalMoves;
            this.engine._updateHUD();
        };
        
        ['admin-target-score-enabled', 'admin-target-score', 'admin-enable-time-limit', 'admin-time-limit-seconds', 'admin-required-piece-enabled'].forEach(id => $(id)?.addEventListener('change', syncGoal));
        ['admin-target-score', 'admin-time-limit-seconds', 'admin-total-moves', 'admin-required-piece-count'].forEach(id => $(id)?.addEventListener('input', syncGoal));
        
        const art = $('admin-required-piece-type');
        art?.addEventListener('change', () => {
            this.engine.requiredPieceType = art.value;
            if (this.engine.config) this.engine.config.requiredPieceType = this.engine.requiredPieceType;
        });
        
        $('admin-total-moves')?.addEventListener('input', () => {
            const m = Number($('admin-total-moves')?.value || 30);
            if (this.engine.config) {
                this.engine.config.totalMoves = Number.isFinite(m) ? Math.max(1, m) : 30;
                this.engine.movesLeft = this.engine.config.totalMoves;
                this.engine._updateHUD();
            }
        });
        
        $('admin-required-piece-count')?.addEventListener('input', () => {
            const c = Number($('admin-required-piece-count')?.value || 10);
            if (this.engine.config) {
                this.engine.config.requiredPieceCount = Number.isFinite(c) ? Math.max(0, c) : 10;
                this.engine.requiredPieceCount = this.engine.config.requiredPieceCount;
            }
        });
        
        // 保存规则
        $('admin-save-rules-btn')?.addEventListener('click', () => {
            const f = this._readAdminRuleForm();
            const bc = this.engine.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const sc = this.configManager.sanitizeConfig({
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
            this.engine.applyConfig(sc);
            this.engine.init();
            this.engine.showMessage('✅ 规则已保存并生效。');
        });
        
        // 保存关卡
        $('admin-save-level-btn')?.addEventListener('click', () => {
            const f = this._readAdminRuleForm();
            const bc = this.engine.config || { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            const sc = this.configManager.sanitizeConfig({
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
            const board = this.engine.serializeCurrentBoard();
            const ln = f.levelName || sc.name || `关卡-${new Date().toLocaleDateString()}-${Date.now().toString().slice(-4)}`;
            this.configManager.saveLevel(ln, sc, board);
            this._refreshLevelList();
            this.engine.applyConfig(sc);
            this.engine.init();
            this.engine.showMessage(`✅ 关卡已保存：${ln}`);
        });
        
        // 应用管理员配置
        $('admin-apply-board-btn')?.addEventListener('click', () => {
            this.engine.init();
            this.engine.showMessage('✅ 管理员配置已应用到棋盘。');
        });
        
        // 切换到游戏模式
        $('game-start-btn')?.addEventListener('click', () => this.engine.setMode('game'));
        
        // 编辑器事件
        ['cell-piece-type', 'cell-pattern', 'cell-bg-color', 'cell-pattern-color', 'cell-movable', 'cell-ice-layer', 'cell-wall-left', 'cell-wall-top', 'cell-wall-right', 'cell-wall-bottom'].forEach(id => {
            $(id)?.addEventListener('change', () => {
                if (this.engine.mode === 'admin') this.engine.previewSelectedCellEditor();
            });
            $(id)?.addEventListener('input', () => {
                if (this.engine.mode === 'admin') this.engine.previewSelectedCellEditor();
            });
        });
        
        $('cell-apply-btn')?.addEventListener('click', () => this.engine.applySelectedCellEditor());
        $('cell-clear-btn')?.addEventListener('click', () => {
            const cu = this.engine.selected;
            if (!cu) return;
            this.engine.board[cu.r][cu.c] = null;
            this.engine.renderBoard();
            this.engine.syncEditorPanel();
        });
    }
    
    _readAdminRuleForm() {
        const g = (id, f = '') => { const e = $(id); return e ? (e.value ?? f) : f; };
        return {
            targetScoreEnabled: $('admin-target-score-enabled')?.checked ?? true,
            targetScore: Number.isFinite(Number(g('admin-target-score', '50000'))) ? Math.max(0, Number(g('admin-target-score', '50000'))) : 50000,
            enableTimeLimit: $('admin-enable-time-limit')?.checked ?? false,
            timeLimitSeconds: Number.isFinite(Number(g('admin-time-limit-seconds', '90'))) ? Math.max(10, Number(g('admin-time-limit-seconds', '90'))) : 90,
            totalMoves: Number.isFinite(Number(g('admin-total-moves', '30'))) ? Math.max(1, Number(g('admin-total-moves', '30'))) : 30,
            requiredPieceEnabled: $('admin-required-piece-enabled')?.checked ?? false,
            requiredPieceType: g('admin-required-piece-type', 'A'),
            requiredPieceCount: Number.isFinite(Number(g('admin-required-piece-count', '10'))) ? Math.max(0, Number(g('admin-required-piece-count', '10'))) : 10,
            levelName: $('admin-level-name')?.value?.trim() || '',
        };
    }
}

// ==================== 全局辅助函数（UI） ====================

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

// 文件末尾：
window.AdminPanel = AdminPanel;
window.syncTileGroups = syncTileGroups;
window.buildTileOptions = buildTileOptions;