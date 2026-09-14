// ==================== SettingsPanel 设置面板 ====================

class SettingsPanel {
    constructor(game) {
        this.game = game;
        this._bound = false;
    }
    
    init() {
        if (this._bound) return;
        this._bound = true;
        this._bindEvents();
    }
    
    // ==================== 打开/关闭 ====================
    
    open() {
        this._fillForm(this.game.config);
        const overlay = document.getElementById('settings-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }
    
    close() {
        const overlay = document.getElementById('settings-overlay');
        if (overlay) overlay.classList.add('hidden');
    }
    
    // ==================== 表单填充 ====================
    
    _fillForm(cfg) {
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        const setChecked = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!value;
        };

        // 下落速度
        const speedEl = document.getElementById('cfg-gravity-speed');
        const speedValEl = document.getElementById('cfg-gravity-speed-value');
        const speed = cfg.gravitySpeed ?? 1.0;
        if (speedEl) speedEl.value = speed;
        if (speedValEl) speedValEl.textContent = speed.toFixed(1) + 'x';
        
        set('cfg-rows', cfg.rows);
        set('cfg-cols', cfg.cols);
        set('cfg-cell-size', cfg.cellSize);
        set('cfg-match-length', cfg.matchLength);
        set('cfg-total-moves', cfg.totalMoves);
        set('cfg-base-score', cfg.baseScore);
        
        setChecked('cfg-enable-square', cfg.enableSquare !== false);
        setChecked('cfg-enable-diagonal', cfg.enableDiagonal === true);
        setChecked('cfg-enable-drag', cfg.enableDrag !== false);
        setChecked('cfg-combo-multiplier', cfg.comboMultiplier !== false);
        
        // 预设检测
        const presetSel = document.getElementById('cfg-preset');
        if (presetSel) {
            let matched = 'custom';
            if (typeof PRESET_CONFIGS !== 'undefined') {
                for (const [key, preset] of Object.entries(PRESET_CONFIGS)) {
                    if (this._matchPreset(cfg, preset.config)) {
                        matched = key;
                        break;
                    }
                }
            }
            presetSel.value = matched;
        }
    }
    
    _matchPreset(cfg, presetCfg) {
        const keys = ['rows', 'cols', 'cellSize', 'matchLength', 
                      'enableSquare', 'enableDiagonal', 'enableDrag',
                      'enableTimeLimit', 'comboMultiplier'];
        for (const key of keys) {
            if (cfg[key] !== presetCfg[key]) return false;
        }
        return true;
    }
    
    // ==================== 读取表单 ====================
    
    _readForm() {
        const get = id => document.getElementById(id);
        const val = (id, def) => {
            const el = get(id);
            return el ? el.value : def;
        };
        const num = (id, def) => {
            const v = Number(val(id, def));
            return Number.isFinite(v) ? v : def;
        };
        const checked = (id, def) => {
            const el = get(id);
            return el ? el.checked : def;
        };

        const gravitySpeed = (() => {
            const el = document.getElementById('cfg-gravity-speed');
            const v = el ? Number(el.value) : 1.0;
            return Number.isFinite(v) ? Math.max(0.3, Math.min(3, v)) : 1.0;
        })();
        
        return {
            rows: Math.max(2, Math.min(20, num('cfg-rows', 10))),
            cols: Math.max(2, Math.min(20, num('cfg-cols', 10))),
            cellSize: Math.max(20, Math.min(100, num('cfg-cell-size', 60))),
            matchLength: Math.max(3, Math.min(6, num('cfg-match-length', 3))),
            totalMoves: Math.max(1, num('cfg-total-moves', 30)),
            baseScore: Math.max(1, num('cfg-base-score', 10)),
            enableSquare: checked('cfg-enable-square', true),
            enableDiagonal: checked('cfg-enable-diagonal', false),
            enableDrag: checked('cfg-enable-drag', true),
            gravitySpeed,
            comboMultiplier: checked('cfg-combo-multiplier', true)
        };
    }
    
    // ==================== 保存 ====================
    
    _save() {
        const formData = this._readForm();
        const newConfig = { ...this.game.config, ...formData };
        
        this.game.applyConfig(newConfig);
        this.game.saveSystem.saveConfig(newConfig);
        this.close();
        this.game.showMessage('✅ 设置已保存并应用');
    }
    
    _reset() {
        if (!confirm('确定恢复所有默认设置吗？')) return;
        const defaultConfig = (typeof createDefaultConfig === 'function') 
            ? createDefaultConfig() 
            : { ...DEFAULT_CONFIG };
        this.game.applyConfig(defaultConfig);
        this.game.saveSystem.saveConfig(defaultConfig);
        this.close();
        this.game.showMessage('✅ 已恢复默认设置');
    }
    
    _applyPreset(name) {
        if (typeof PRESET_CONFIGS === 'undefined') return;
        const preset = PRESET_CONFIGS[name];
        if (!preset) return;
        
        const merged = { ...this.game.config, ...preset.config };
        this.game.applyConfig(merged);
        this.game.saveSystem.saveConfig(merged);
        this.close();
        this.game.showMessage(`✅ 已套用模板：${preset.name}`);
    }
    
    // ==================== 事件绑定 ====================
    
    _bindEvents() {
        document.getElementById('settings-btn')?.addEventListener('click', () => this.open());
        document.getElementById('cfg-close')?.addEventListener('click', () => this.close());
        document.getElementById('cfg-save')?.addEventListener('click', () => this._save());
        document.getElementById('cfg-reset')?.addEventListener('click', () => this._reset());
        
        document.getElementById('cfg-preset')?.addEventListener('change', (e) => {
            if (e.target.value && e.target.value !== 'custom') {
                this._applyPreset(e.target.value);
            }
        });
        
        document.getElementById('cfg-load-preset')?.addEventListener('click', () => {
            const preset = document.getElementById('cfg-preset')?.value;
            if (preset && preset !== 'custom') {
                this._applyPreset(preset);
            }
        });
        
        // 点击遮罩关闭
        document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'settings-overlay') this.close();
        });
        
        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // 下落速度滑块实时显示
        const speedEl = document.getElementById('cfg-gravity-speed');
        const speedValEl = document.getElementById('cfg-gravity-speed-value');
        if (speedEl && speedValEl) {
            speedEl.addEventListener('input', (e) => {
                speedValEl.textContent = Number(e.target.value).toFixed(1) + 'x';
            });
        }
    }
}

window.SettingsPanel = SettingsPanel;