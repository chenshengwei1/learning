// ==================== AdminPanel ====================

class AdminPanel {
    constructor(game) {
        this.game = game;
        this._bound = false;
        
        // 格子编辑器状态
        this._cellEditorBound = false;
        this._modeSwitchBound = false;
        this._currentEditCells = [];
    }
    
    // ==================== 初始化 ====================
    
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
    
    // ==================== 基础表单 ====================
    
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
    
    // ==================== 事件绑定 ====================
    
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
            this._saveCurrentLevel(syncConfig);
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
        
        // 重置关卡按钮
        document.getElementById('reset-level-btn')?.addEventListener('click', () => {
            this._resetCurrentLevel();
        });
    }
    
    /**
     * 保存当前棋盘为关卡
     */
    _saveCurrentLevel(syncConfig) {
        const g = this.game;
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
        
        // 同步 levelId
        g.config.levelId = level.id;
        
        const levels = g.saveSystem.loadLevels();
        levels.unshift(level);
        g.saveSystem.saveLevels(levels);
        
        this._refreshLevelList();
        
        // 刷新 LevelSelector
        if (this.game.levelSelector) {
            this.game.levelSelector.refresh();
        }
        
        // 刷新 ConfigLoader
        if (this.game.configLoader) {
            this.game.configLoader.refreshCustomLevels();
        }
        
        g.showMessage(`✅ 关卡已保存：${name}`);
    }
    
    /**
     * 重置当前关卡
     */
    _resetCurrentLevel() {
        const levelId = this.game.config.levelId;
        if (!levelId) {
            this.game.showMessage('⚠️ 当前没有关卡，无法重置');
            return;
        }
        
        const configLoader = this.game.configLoader;
        if (!configLoader) {
            this.game.showMessage('⚠️ ConfigLoader 未挂载');
            return;
        }
        
        const level = configLoader.getLevel(levelId);
        if (!level) {
            this.game.showMessage(`⚠️ 找不到关卡：${levelId}`);
            return;
        }
        
        const config = configLoader.levelToConfig(level);
        this.game.applyConfig(config);
        
        this.game.showMessage(`🔄 已重置：${level.name}`);
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
    
    // ==================== 格子编辑器（单选/多选）====================
    
    /**
     * 显示编辑器（支持单个或多个格子）
     * @param {string[]} keys - ["r,c", ...]
     */
    showCellEditorForMultiple(keys) {
        const panel = document.getElementById('editor-panel');
        if (!panel) {
            console.warn('editor-panel 不存在');
            return;
        }
        
        this._currentEditCells = keys;
        panel.classList.remove('hidden');
        this._renderCellEditorMulti(keys);
        this._bindCellEditorStaticEvents();
    }
    
    /**
     * 渲染编辑器内容
     */
    _renderCellEditorMulti(keys) {
        const content = document.getElementById('editor-panel-content');
        if (!content) return;
        
        const board = this.game.board;
        const isMulti = keys.length > 1;
        
        // 取第一个格子的数据作为显示值（混合值按 B 方案：显示第一个格子的值）
        const { r, c } = keyToPos(keys[0]);
        const piece = board.get(r, c);
        const obstacle = board.getObstacleAt(r, c);
        const target = board.getTargetAt(r, c);
        
        // 检查多选时状态一致性
        const warnings = isMulti ? this._checkMixedState(keys) : [];
        
        // 位置标题
        const posLabel = isMulti 
            ? `已选中 ${keys.length} 个格子` 
            : `位置：(${r}, ${c})`;
        
        content.innerHTML = `
            <div class="editor-section">
                <div class="position-label">${posLabel}</div>
                ${warnings.length > 0 ? warnings.map(w => `<div class="mixed-warning">⚠️ ${w}</div>`).join('') : ''}
            </div>
            
            <!-- 棋子 -->
            <div class="editor-section">
                <h4>🐾 棋子</h4>
                <label>类型
                    <select id="edit-piece-type">
                        <option value="">— 无 —</option>
                        ${this._renderOptions(ELEMENT_CATEGORIES.PIECE, piece?.id || '')}
                    </select>
                </label>
                <label class="check-line">
                    <input type="checkbox" id="edit-piece-locked" ${piece?.hasAttr('locked') ? 'checked' : ''}>
                    锁定（不可交换）
                </label>
                <label class="check-line">
                    <input type="checkbox" id="edit-piece-frozen" ${piece?.hasAttr('frozen') ? 'checked' : ''}>
                    冻结（不可交换）
                </label>
            </div>
            
            <!-- 特效 -->
            <div class="editor-section">
                <h4 class="effect-title">✨ 特效</h4>
                <label>类型
                    <select id="edit-effect-type">
                        <option value="">— 无 —</option>
                        ${this._renderOptions(ELEMENT_CATEGORIES.EFFECT, piece?.effect || '')}
                    </select>
                </label>
                <p style="font-size:11px;color:#64748b;margin-top:4px;">
                    设置后，此棋子被消除时会触发对应特效。
                </p>
            </div>
            
            <!-- 障碍物 -->
            <div class="editor-section">
                <h4>🧊 障碍物</h4>
                <label>类型
                    <select id="edit-obstacle-type">
                        <option value="">— 无 —</option>
                        ${this._renderOptions('obstacle', obstacle?.element || '')}
                    </select>
                </label>
                <label>HP
                    <input type="number" id="edit-obstacle-hp" min="1" max="10" value="${obstacle?.hp ?? 1}">
                </label>
            </div>
            
            <!-- 目标物 -->
            <div class="editor-section">
                <h4>🍉 目标物</h4>
                <label>类型
                    <select id="edit-target-type">
                        <option value="">— 无 —</option>
                        ${this._renderOptions('target', target?.element || '')}
                    </select>
                </label>
                <div class="inline-fields">
                    <label>宽
                        <input type="number" id="edit-target-w" min="1" max="5" value="${target?.w ?? 1}">
                    </label>
                    <label>高
                        <input type="number" id="edit-target-h" min="1" max="5" value="${target?.h ?? 1}">
                    </label>
                </div>
            </div>
            
            <div class="editor-actions">
                <button id="editor-apply-btn" class="primary-btn" type="button">应用</button>
                <button id="editor-clear-btn" class="danger-btn" type="button">清空</button>
            </div>
        `;
        
        this._bindCellEditorDynamicEvents(keys);
        this._bindModeSwitch();
    }
    
    /**
     * 渲染元素选项
     */
    _renderOptions(category, currentId) {
        const elements = this.game.registries.elements.getByCategory(category);
        return elements.map(e => 
            `<option value="${e.id}" ${e.id === currentId ? 'selected' : ''}>${e.name || e.id}</option>`
        ).join('');
    }
    
    /**
     * 检查多选状态是否一致，返回警告信息
     */
    _checkMixedState(keys) {
        const board = this.game.board;
        const warnings = [];
        
        const pieceIds = new Set();
        const effectIds = new Set();
        const obstacles = new Set();
        const targets = new Set();
        let lockedCount = 0;
        let frozenCount = 0;
        
        for (const key of keys) {
            const { r, c } = keyToPos(key);
            const p = board.get(r, c);
            const o = board.getObstacleAt(r, c);
            const t = board.getTargetAt(r, c);
            
            pieceIds.add(p?.id || 'empty');
            effectIds.add(p?.effect || 'none');
            obstacles.add(o?.element || 'none');
            targets.add(t?.element || 'none');
            
            if (p?.hasAttr('locked')) lockedCount++;
            if (p?.hasAttr('frozen')) frozenCount++;
        }
        
        if (pieceIds.size > 1) warnings.push('棋子类型不一致');
        if (effectIds.size > 1) warnings.push('特效状态不一致');
        if (obstacles.size > 1) warnings.push('障碍物不一致');
        if (targets.size > 1) warnings.push('目标物不一致');
        if (lockedCount > 0 && lockedCount < keys.length) warnings.push('锁定状态不一致');
        if (frozenCount > 0 && frozenCount < keys.length) warnings.push('冻结状态不一致');
        
        return warnings;
    }
    
    /**
     * 绑定固定的编辑器事件（只绑一次）
     */
    _bindCellEditorStaticEvents() {
        if (this._cellEditorBound) return;
        this._cellEditorBound = true;
        
        // 关闭按钮
        document.getElementById('editor-panel-close')?.addEventListener('click', () => {
            document.getElementById('editor-panel')?.classList.add('hidden');
            this.game.selectedCells.clear();
            this.game.selected = null;
            this.game.renderSystem.renderAll();
        });
    }
    
    /**
     * 绑定动态的编辑器事件（每次渲染后重新绑）
     */
    _bindCellEditorDynamicEvents(keys) {
        // 应用按钮
        document.getElementById('editor-apply-btn')?.addEventListener('click', () => {
            this._applyCellEditorToMultiple(keys);
        });
        
        // 清空按钮
        document.getElementById('editor-clear-btn')?.addEventListener('click', () => {
            this._clearCells(keys);
        });
    }
    
    /**
     * 绑定选择模式切换
     */
    _bindModeSwitch() {
        const singleBtn = document.getElementById('editor-mode-single');
        const multiBtn = document.getElementById('editor-mode-multi');
        
        if (!singleBtn || !multiBtn) return;
        
        // 同步当前模式
        if (this.game.editorMode === 'multi') {
            singleBtn.classList.remove('active');
            multiBtn.classList.add('active');
        } else {
            singleBtn.classList.add('active');
            multiBtn.classList.remove('active');
        }
        
        // 绑定事件（防止重复绑）
        if (!this._modeSwitchBound) {
            this._modeSwitchBound = true;
            
            singleBtn.addEventListener('click', () => {
                this.game.editorMode = 'single';
                singleBtn.classList.add('active');
                multiBtn.classList.remove('active');
                
                // 单选模式下，只保留第一个选中的格子
                const keys = [...this.game.selectedCells];
                this.game.selectedCells.clear();
                if (keys.length > 0) {
                    this.game.selectedCells.add(keys[0]);
                    this.game.selected = keyToPos(keys[0]);
                }
                this.game.renderSystem.renderAll();
                
                if (keys.length > 0) {
                    this.showCellEditorForMultiple([keys[0]]);
                }
            });
            
            multiBtn.addEventListener('click', () => {
                this.game.editorMode = 'multi';
                multiBtn.classList.add('active');
                singleBtn.classList.remove('active');
            });
        }
    }
    
    /**
     * 应用编辑到多个格子（覆盖式）
     */
    _applyCellEditorToMultiple(keys) {
        const board = this.game.board;
        
        const pieceType = document.getElementById('edit-piece-type')?.value || '';
        const locked = document.getElementById('edit-piece-locked')?.checked || false;
        const frozen = document.getElementById('edit-piece-frozen')?.checked || false;
        const effectType = document.getElementById('edit-effect-type')?.value || '';
        
        const obstacleType = document.getElementById('edit-obstacle-type')?.value || '';
        const obstacleHp = parseInt(document.getElementById('edit-obstacle-hp')?.value) || 1;
        
        const targetType = document.getElementById('edit-target-type')?.value || '';
        const targetW = parseInt(document.getElementById('edit-target-w')?.value) || 1;
        const targetH = parseInt(document.getElementById('edit-target-h')?.value) || 1;
        
        for (const key of keys) {
            const { r, c } = keyToPos(key);
            
            // 1. 棋子
            if (pieceType) {
                const piece = this.game.pieceFactory.create(pieceType);
                if (locked) piece.addState('locked');
                if (frozen) piece.addState('frozen');
                
                // 特效
                if (effectType) {
                    piece.effect = effectType;
                }
                
                board.set(r, c, piece);
            } else {
                board.set(r, c, null);
            }
            
            // 2. 障碍物
            board.removeObstacleAt(r, c);
            if (obstacleType) {
                board.addObstacle({ element: obstacleType, r, c, hp: obstacleHp });
            }
            
            // 3. 目标物
            const oldTarget = board.getTargetAt(r, c);
            if (oldTarget) board.removeTarget(oldTarget);
            if (targetType) {
                board.addTarget({ element: targetType, r, c, w: targetW, h: targetH, hp: 1 });
            }
        }
        
        this.game.renderSystem.renderAll();
        this._renderCellEditorMulti(keys);
        
        this.game.showMessage(`✅ 已更新 ${keys.length} 个格子`);
    }
    
    /**
     * 清空多个格子
     */
    _clearCells(keys) {
        const board = this.game.board;
        
        for (const key of keys) {
            const { r, c } = keyToPos(key);
            board.set(r, c, null);
            board.removeObstacleAt(r, c);
            const target = board.getTargetAt(r, c);
            if (target) board.removeTarget(target);
        }
        
        this.game.renderSystem.renderAll();
        this._renderCellEditorMulti(keys);
        
        this.game.showMessage(`🗑️ 已清空 ${keys.length} 个格子`);
    }
}

window.AdminPanel = AdminPanel;