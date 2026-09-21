// ==================== 设置面板 ====================


class SettingsPanel {
    constructor(engine) {
        this.engine = engine;
        this.isOpen = false;
    }
    
    bindEvents() {
        const sb = $('settings-btn'), so = $('settings-overlay'),
              csb = $('cfg-save'), crb = $('cfg-reset'), ccb = $('cfg-close');
        
        sb?.addEventListener('click', () => this.open());
        ccb?.addEventListener('click', () => this.close());
        csb?.addEventListener('click', () => this._save());
        crb?.addEventListener('click', () => {
            if (confirm('确定恢复所有默认设置吗？')) this._save({ ...DEFAULT_CONFIG });
        });
        
        $('cfg-preset')?.addEventListener('change', e => {
            if (e.target.value && e.target.value !== 'custom') this._applyPreset(e.target.value);
        });
        $('cfg-load-preset')?.addEventListener('click', () => {
            const n = $('cfg-preset')?.value;
            if (n && n !== 'custom') this._applyPreset(n);
        });
        
        so?.addEventListener('click', e => { if (e.target === so) this.close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    }
    
    open() {
        this._fillForm(this.engine.config);
        const so = $('settings-overlay');
        if (so) so.classList.remove('hidden');
        this.isOpen = true;
    }
    
    close() {
        const so = $('settings-overlay');
        if (so) so.classList.add('hidden');
        this.isOpen = false;
    }
    
    _fillForm(cfg) {
        $('cfg-rows').value = cfg.rows;
        $('cfg-cols').value = cfg.cols;
        $('cfg-cell-size').value = cfg.cellSize;
        $('cfg-piece-types').value = cfg.pieceTypes.map(this._serializePT).join(';');
        $('cfg-total-moves').value = cfg.totalMoves;
        $('cfg-match-length').value = cfg.matchLength;
        $('cfg-enable-square').checked = cfg.enableSquare;
        $('cfg-enable-diagonal').checked = cfg.enableDiagonal;
        $('cfg-enable-drag').checked = cfg.enableDrag;
        $('cfg-enable-time-limit').checked = cfg.enableTimeLimit === true;
        $('cfg-time-limit-seconds').value = cfg.timeLimitSeconds || 90;
        $('cfg-initial-board').value = Array.isArray(cfg.initialBoard) ? cfg.initialBoard.map(r => r.join(',')).join('\n') : (cfg.initialBoard || '');
        $('cfg-base-score').value = cfg.baseScore;
        $('cfg-combo-multiplier').checked = cfg.comboMultiplier;
        
        // 检测预设
        const ps = $('cfg-preset');
        if (ps) {
            const mt = Object.entries(PRESET_CONFIGS).find(([, pr]) => {
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
            ps.value = mt ? mt[0] : 'custom';
        }
        
        const er = cfg.explodeRules || {};
        $('cfg-explode-4').value = er[4] || '';
        $('cfg-explode-5').value = er[5] || '';
        $('cfg-explode-6').value = er[6] || '';
    }
    
    _serializePT(t) {
        const we = ['top', 'right', 'bottom', 'left'].map(s => {
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
    
    _readForm() {
        const num = id => parseInt($(id).value, 10) || 0;
        const preset = $('cfg-preset')?.value || 'custom';
        const rows = num('cfg-rows'), cols = num('cfg-cols'), cellSize = num('cfg-cell-size'),
              totalMoves = num('cfg-total-moves'), matchLength = num('cfg-match-length'),
              baseScore = num('cfg-base-score');
        const enableTimeLimit = $('cfg-enable-time-limit').checked;
        const timeLimitSeconds = num('cfg-time-limit-seconds');
        const targetScore = Number($('admin-target-score')?.value || 50000);
        const targetScoreEnabled = $('admin-target-score-enabled')?.checked ?? true;
        const ibr = $('cfg-initial-board').value.trim();
        const initialBoard = ibr ? ibr.split(/\n|;/).map(r => r.split(',').map(c => c.trim()).filter(Boolean)) : null;
        const raw = $('cfg-piece-types').value;
        const pieceTypes = splitPieceTypeEntries(raw).map((e, i) => parsePieceTypeEntry(e, `piece${i + 1}`)).filter(Boolean);
        if (pieceTypes.length < 2) { alert('至少需要 2 种棋子'); return null; }
        const explodeRules = {};
        ['4', '5', '6'].forEach(n => { const v = $(`cfg-explode-${n}`).value.trim(); if (v) explodeRules[+n] = v; });
        return {
            presetName: preset, rows, cols, cellSize, pieceTypes, totalMoves, matchLength,
            enableSquare: $('cfg-enable-square').checked,
            enableDiagonal: $('cfg-enable-diagonal').checked,
            enableDrag: $('cfg-enable-drag').checked,
            enableTimeLimit,
            timeLimitSeconds: Number.isFinite(timeLimitSeconds) && timeLimitSeconds > 0 ? timeLimitSeconds : 90,
            targetScore: Number.isFinite(targetScore) ? Math.max(0, targetScore) : 50000,
            targetScoreEnabled,
            initialBoard,
            baseScore,
            comboMultiplier: $('cfg-combo-multiplier').checked,
            explodeRules,
            gap: 4
        };
    }
    
    _applyPreset(name) {
        const p = PRESET_CONFIGS[name];
        if (!p) return;
        this._fillForm({ ...DEFAULT_CONFIG, ...p.config, pieceTypes: p.config.pieceTypes || DEFAULT_CONFIG.pieceTypes });
        const nc = this._readForm();
        if (nc) this._save(nc);
    }
    
    _save(cfg) {
        const sc = cfg || this._readForm();
        if (!sc) return;
        const sanitized = this.engine.configManager.sanitizeConfig(sc);
        this.engine.applyConfig(sanitized);
        this.engine.init();
        this.close();
        this.engine.showMessage('✅ 设置已保存并应用！');
    }
}

// 文件末尾：
window.SettingsPanel = SettingsPanel;