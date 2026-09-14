// ==================== AdminPanel ====================

class AdminPanel {
    constructor(game) {
        this.game = game;
        this._bound = false;
    }
    
    init() {
        if (this._bound) return;
        this._bound = true;
        this._bindEvents();
        this._syncFormValues();
    }
    
    refresh() {
        this._syncFormValues();
        this._refreshLevelList();
    }
    
    _syncFormValues() {
        const cfg = this.game.config;
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v;
        };
        const setChecked = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!v;
        };
        
        set('admin-total-moves', cfg.totalMoves);
        set('admin-target-score', cfg.targetScore || 50000);
        setChecked('admin-target-score-enabled', cfg.targetScoreEnabled !== false);
        setChecked('admin-enable-time-limit', cfg.enableTimeLimit === true);
        set('admin-time-limit-seconds', cfg.timeLimitSeconds || 90);
        set('admin-level-name', cfg.name || '');
    }
    
    _refreshLevelList() {
        const el = document.getElementById('admin-level-list');
        if (!el) return;
        
        const levels = this.game.saveSystem.loadLevels();
        if (!levels.length) {
            el.innerHTML = '<div class="level-pill"><span>暂无保存关卡</span></div>';
            return;
        }
        
        el.innerHTML = '';
        levels.forEach(level => {
            const row = document.createElement('div');
            row.className = 'level-pill';
            
            const name = document.createElement('span');
            name.textContent = level.name || '未命名';
            row.appendChild(name);
            
            const btn = document.createElement('button');
            btn.textContent = '加载';
            btn.addEventListener('click', () => {
                this.game.applyConfig(level.config || level);
                this.game.showMessage(`已加载：${level.name}`);
            });
            row.appendChild(btn);
            
            el.appendChild(row);
        });
    }
    
    _bindEvents() {
        const g = this.game;
        
        // 同步配置
        const syncConfig = () => {
            const get = id => document.getElementById(id);
            const num = (id, def) => {
                const v = Number(get(id)?.value);
                return Number.isFinite(v) ? v : def;
            };
            const checked = (id) => get(id)?.checked === true;
            
            g.config.totalMoves = Math.max(1, num('admin-total-moves', 30));
            g.config.targetScore = Math.max(0, num('admin-target-score', 50000));
            g.config.targetScoreEnabled = checked('admin-target-score-enabled');
            g.config.enableTimeLimit = checked('admin-enable-time-limit');
            g.config.timeLimitSeconds = Math.max(10, num('admin-time-limit-seconds', 90));
            
            const name = get('admin-level-name')?.value?.trim();
            if (name) g.config.name = name;
            
            g.movesLeft = g.config.totalMoves;
            g.updateHUD();
        };
        
        // 绑定所有输入
        [
            'admin-total-moves', 'admin-target-score', 'admin-target-score-enabled',
            'admin-enable-time-limit', 'admin-time-limit-seconds', 'admin-level-name'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', syncConfig);
            el.addEventListener('input', syncConfig);
        });
        
        // 保存规则
        document.getElementById('admin-save-rules-btn')?.addEventListener('click', () => {
            syncConfig();
            g.saveSystem.saveConfig(g.config);
            g.showMessage('✅ 规则已保存');
        });
        
        // 保存关卡
        document.getElementById('admin-save-level-btn')?.addEventListener('click', () => {
            syncConfig();
            
            let name = document.getElementById('admin-level-name')?.value?.trim();
            if (!name) {
                name = `关卡-${Date.now().toString().slice(-6)}`;
            }
            
            const level = {
                id: `custom-${Date.now()}`,
                name,
                board: {
                    rows: g.board.rows,
                    cols: g.board.cols,
                    layout: g.board.layout.map(r => [...r])
                },
                pieces: this._serializePieces(),
                targets: g.board.targets.map(t => ({ ...t })),
                obstacles: g.board.obstacles.map(o => ({ ...o })),
                goals: g.config.goals || [],
                moves: g.config.totalMoves,
                config: {
                    matchLength: g.config.matchLength,
                    enableSquare: g.config.enableSquare,
                    enableDiagonal: g.config.enableDiagonal,
                    enableTimeLimit: g.config.enableTimeLimit,
                    timeLimitSeconds: g.config.timeLimitSeconds,
                    baseScore: g.config.baseScore,
                    comboMultiplier: g.config.comboMultiplier,
                    gravitySpeed: g.config.gravitySpeed
                }
            };

            // ← 新增：保存后同步 levelId
            g.config.levelId = level.id;
            
            const levels = g.saveSystem.loadLevels();
            levels.unshift(level);
            g.saveSystem.saveLevels(levels);
            this._refreshLevelList();
            g.showMessage(`✅ 关卡已保存：${name}`);
        });
        
        // 应用配置
        document.getElementById('admin-apply-board-btn')?.addEventListener('click', () => {
            syncConfig();
            g.init();
            g.showMessage('✅ 配置已应用');
        });
        
        // 切换到游戏模式
        document.getElementById('game-start-btn')?.addEventListener('click', () => {
            g.setMode('game');
        });
    }
    
    _serializePieces() {
        const g = this.game;
        const result = [];
        for (let r = 0; r < g.board.rows; r++) {
            const row = [];
            for (let c = 0; c < g.board.cols; c++) {
                const p = g.board.get(r, c);
                if (!p) {
                    row.push('empty');
                } else {
                    row.push(p.id);
                }
            }
            result.push(row);
        }
        return result;
    }
}

window.AdminPanel = AdminPanel;