// ==================== GameEngine 核心游戏引擎 ====================

class GameEngine {
    constructor(config) {
        this.config = config;
        this.board = new Board(config.rows, config.cols);
        this.pieceFactory = new PieceFactory(config);
        this.eventBus = new EventBus();
        
        // 系统
        this.matchSystem = new MatchSystem(this);
        this.gravitySystem = new GravitySystem(this);
        this.scoreSystem = new ScoreSystem(config);
        this.goalSystem = new GoalSystem(this);
        this.timerSystem = new TimerSystem(this);
        this.renderSystem = new RenderSystem(this);
        this.inputSystem = new InputSystem(this);
        this.saveSystem = new SaveSystem();
        
        // 规则引擎
        this.ruleEngine = new RuleEngine(this);
        
        // 状态
        this.score = 0;
        this.movesLeft = config.totalMoves;
        this.comboCount = 0;
        this.maxCombo = 0;
        this.timeLeft = 0;
        this.elimCounts = {};
        
        this.selected = null;
        this.isProcessing = false;
        this.isGameEnded = false;
        this.mode = 'admin';

        // 在 constructor 中追加
        this.adminPanel = new AdminPanel(this);
        this.settingsPanel = new SettingsPanel(this);
        this.hud = new HUD(this);
        
        this._bindEngineEvents();
    }
    
    // ==================== 初始化 ====================
    
    init() {
        this.timerSystem.stop();
        
        // 重置状态
        this.score = 0;
        this.movesLeft = this.config.totalMoves;
        this.comboCount = 0;
        this.maxCombo = 0;
        this.elimCounts = {};
        this.selected = null;
        this.isProcessing = false;
        this.isGameEnded = false;
        
        // 初始化计时
        this.timeLeft = this.config.enableTimeLimit 
            ? Number(this.config.timeLimitSeconds || 90) 
            : 0;
        
        // 生成棋盘
        const initialBoard = this._parseInitialBoard(this.config.initialBoard);
        this.board = initialBoard || this._createRandomBoard();
        
        if (!initialBoard) {
            this.stabilize();
            this.ensurePlayable();
        }
        
        // 更新工厂
        this.pieceFactory.updateConfig(this.config);
        
        // 重新注册匹配规则
        this._initMatchRules();
        
        // 更新计分系统
        this.scoreSystem.updateConfig(this.config);
        
        // 更新目标系统
        this._initGoals();
        
        // 渲染
        this.renderSystem.renderAll();
        this.updateHUD();
        this.showMessage('点击或拖动相邻棋子交换位置！');
        
        // 启动计时
        if (this.mode === 'game' && this.config.enableTimeLimit) {
            this.timerSystem.start(this.config.timeLimitSeconds);
        }
    }
    
    _initMatchRules() {
        this.matchSystem.rules = [];
        this.matchSystem.registerRule(new LineMatchRule(this.config));
        if (this.config.enableSquare) {
            this.matchSystem.registerRule(new SquareMatchRule(this.config));
        }
        if (this.config.enableDiagonal) {
            this.matchSystem.registerRule(new DiagonalMatchRule(this.config));
        }
        this.matchSystem.clearCache();
    }
    
    _initGoals() {
        this.goalSystem.clear();
        this.goalSystem.register(new ScoreGoal());
        this.goalSystem.register(new EliminateGoal());
        this.goalSystem.register(new MovesGoal());
        this.goalSystem.register(new TimeGoal());
    }
    
    _createRandomBoard() {
        const board = new Board(this.config.rows, this.config.cols);
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                let piece, attempts = 0;
                do {
                    piece = this.pieceFactory.random();
                    attempts++;
                    if (attempts > LIMITS.MAX_RANDOM) break;
                } while (this._wouldMatch(board, r, c, piece));
                board.set(r, c, piece);
            }
        }
        return board;
    }
    
    _wouldMatch(board, r, c, piece) {
        if (!piece) return false;
        const len = this.config.matchLength || 3;
        
        // 水平
        let count = 1;
        for (let i = c - 1; i >= 0 && board.get(r, i)?.id === piece.id; i--) count++;
        for (let i = c + 1; i < board.cols && board.get(r, i)?.id === piece.id; i++) count++;
        if (count >= len) return true;
        
        // 垂直
        count = 1;
        for (let i = r - 1; i >= 0 && board.get(i, c)?.id === piece.id; i--) count++;
        for (let i = r + 1; i < board.rows && board.get(i, c)?.id === piece.id; i++) count++;
        if (count >= len) return true;
        
        return false;
    }
    
    _parseInitialBoard(initialBoard) {
        if (!initialBoard) return null;
        if (!Array.isArray(initialBoard) || initialBoard.length === 0) return null;
        
        const board = new Board(this.config.rows, this.config.cols);
        for (let r = 0; r < this.config.rows; r++) {
            for (let c = 0; c < this.config.cols; c++) {
                const cell = initialBoard[r]?.[c];
                if (!cell) continue;
                const piece = Piece.deserialize(cell);
                if (piece && piece.id !== 'empty') {
                    board.set(r, c, piece);
                }
            }
        }
        return board;
    }
    
    // 消除初始匹配
    stabilize() {
        let attempts = 0;
        while (attempts++ < LIMITS.MAX_STABILIZE) {
            const matches = this.matchSystem.findMatches();
            if (matches.size === 0) break;
            for (const key of matches) {
                const { r, c } = keyToPos(key);
                this.board.set(r, c, null);
            }
            this.gravitySystem.apply();
        }
    }
    
    // 确保有可玩步骤
    ensurePlayable() {
        let attempts = 0;
        while (!this.hasValidMove() && attempts++ < 10) {
            this.board = this._createRandomBoard();
            this.stabilize();
        }
    }
    
    hasValidMove() {
        const board = this.board;
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                if (!p || !p.isSwappable()) continue;
                
                // 尝试右交换
                if (c < board.cols - 1) {
                    const p2 = board.get(r, c + 1);
                    if (p2 && p2.isSwappable()) {
                        board.swap(r, c, r, c + 1);
                        const has = this.matchSystem.findMatches().size > 0;
                        board.swap(r, c, r, c + 1);
                        if (has) return true;
                    }
                }
                
                // 尝试下交换
                if (r < board.rows - 1) {
                    const p2 = board.get(r + 1, c);
                    if (p2 && p2.isSwappable()) {
                        board.swap(r, c, r + 1, c);
                        const has = this.matchSystem.findMatches().size > 0;
                        board.swap(r, c, r + 1, c);
                        if (has) return true;
                    }
                }
            }
        }
        return false;
    }
    
    // ==================== 交换 ====================
    
    async swap(r1, c1, r2, c2) {
        if (this.isProcessing || this.isGameEnded) return;
        
        // 相邻检查
        if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
        
        const p1 = this.board.get(r1, c1);
        const p2 = this.board.get(r2, c2);
        
        if (!p1 || !p2) return;
        if (!p1.isSwappable() || !p2.isSwappable()) {
            this.showMessage('🔒 有棋子被锁定，无法交换');
            return;
        }
        
        this.isProcessing = true;
        
        // 检查是否为特效交换
        if (p1.effect || p2.effect) {
            await this._handleEffectSwap(p1, p2, { r: r1, c: c1 }, { r: r2, c: c2 });
            this.isProcessing = false;
            return;
        }
        
        // 普通交换
        await this._handleNormalSwap(r1, c1, r2, c2);
        
        this.isProcessing = false;
    }
    
    async _handleNormalSwap(r1, c1, r2, c2) {
        // 交换动画
        await this.renderSystem.animateSwap(r1, c1, r2, c2);
        
        // 交换数据
        this.board.swap(r1, c1, r2, c2);
        this.matchSystem.clearCache();
        this.renderSystem.renderAll();
        await sleep(50);
        
        // 检查匹配
        const matches = this.matchSystem.findMatches();
        if (matches.size === 0) {
            // 回退
            this.board.swap(r1, c1, r2, c2);
            this.matchSystem.clearCache();
            this.renderSystem.renderAll();
            await this._flashInvalid(r1, c1, r2, c2);
            this.showMessage('不能消除，换一个试试～');
            return;
        }
        
        // 扣除步数
        this.movesLeft--;
        this.updateHUD();
        
        // 处理匹配
        await this.processMatches(matches);
        
        // 检查游戏结束
        this._checkGameEnd();
    }
    
    async _handleEffectSwap(p1, p2, pos1, pos2) {
        // 通过规则引擎解析交换
        const result = await this.ruleEngine.resolveSwap(p1, p2, pos1, pos2);
        if (!result) {
            this.isProcessing = false;
            return;
        }
        
        // 清除两个特效棋子
        this.board.set(pos1.r, pos1.c, null);
        this.board.set(pos2.r, pos2.c, null);
        
        // 执行各阶段
        const phases = result.phases || [{ targets: result.targets, damage: result.damage || 1 }];
        for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            await this._executePhase(phase);
            
            // 阶段之间等待重力
            if (i < phases.length - 1) {
                const gravityResult = this.gravitySystem.apply();
                this.matchSystem.clearCache();
                this.renderSystem.renderAll();
                await this.renderSystem.animateFall(gravityResult.drops);
            }
        }
        
        this.movesLeft--;
        this.updateHUD();
        
        // 处理连锁
        const matches = this.matchSystem.findMatches();
        if (matches.size > 0) {
            await this.processMatches(matches);
        }
        
        this._checkGameEnd();
    }
    
    async _executePhase(phase) {
        const targets = phase.targets;
        if (!targets || targets.size === 0) return;
        
        // 标记消除动画
        await this.renderSystem.animateRemove(targets);
        
        // 收集被消除的棋子（用于触发特效）
        const toTrigger = [];
        
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = this.board.get(r, c);
            if (!piece) continue;
            
            if (piece.isRemovable()) {
                this._countElim(piece);
                if (piece.effect) {
                    toTrigger.push({ piece, r, c });
                }
                this.board.set(r, c, null);
            } else {
                this._damageAttrs(piece, phase.damage || 1);
            }
        }
        
        // 触发被消除的特效（连锁）
        for (const { piece, r, c } of toTrigger) {
            const chainTargets = await this.ruleEngine.resolveTrigger(piece.effect, {
                r, c,
                color: piece.stateData?.color || piece.id,
                direction: piece.stateData?.direction,
                ...piece.stateData
            });
            if (chainTargets.size > 0) {
                await this._executePhase({ targets: chainTargets, damage: 1 });
            }
        }
        
        // 应用重力
        const gravityResult = this.gravitySystem.apply();
        this.matchSystem.clearCache();
        this.renderSystem.renderAll();
        await this.renderSystem.animateFall(gravityResult.drops);
    }
    
    _countElim(piece) {
        if (!piece) return;
        const id = piece.id;
        this.elimCounts[id] = (this.elimCounts[id] || 0) + 1;
    }
    
    _damageAttrs(piece, damage) {
        for (const attrName of Object.keys(piece.attrs)) {
            if (attrName === 'locked') continue;
            const current = piece.attrs[attrName];
            if (current > 0) {
                piece.attrs[attrName] = Math.max(0, current - damage);
            }
        }
    }
    
    // ==================== 匹配处理 ====================
    
    async processMatches(matches) {
        this.comboCount = 0;
        
        while (matches.size > 0) {
            this.comboCount++;
            this.maxCombo = Math.max(this.maxCombo, this.comboCount);
            
            // 分析形状
            const shapeResult = this.matchSystem.analyzeShape(matches);
            
            // 询问规则引擎：生成什么特效？
            const creation = this.ruleEngine.resolveCreation(matches, shapeResult);
            
            // 计分
            const points = this.scoreSystem.calculate(matches.size, this.comboCount, {
                special: !!creation
            });
            this.score += points;
            this.updateHUD();
            
            // 消除动画
            await this.renderSystem.animateRemove(matches);
            
            // 收集被消除的棋子
            const toTrigger = [];
            for (const key of matches) {
                const { r, c } = keyToPos(key);
                const piece = this.board.get(r, c);
                if (!piece) continue;
                
                if (piece.isRemovable()) {
                    this._countElim(piece);
                    if (piece.effect) {
                        toTrigger.push({ piece, r, c });
                    }
                    this.board.set(r, c, null);
                } else {
                    this._damageAttrs(piece, 1);
                }
            }
            
            // 生成特效棋子
            if (creation) {
                const pos = this._resolveCreationPosition(creation, shapeResult);
                if (pos) {
                    const effectPiece = this.pieceFactory.createEffect(creation.effect, {
                        color: creation.color,
                        direction: creation.direction
                    });
                    // 生成动画
                    const cell = this.renderSystem.getCell(pos.r, pos.c);
                    if (cell) cell.classList.add('bomb-spawn');
                    this.board.set(pos.r, pos.c, effectPiece);
                }
            }
            
            // 触发被消除的特效（连锁）
            for (const { piece, r, c } of toTrigger) {
                const chainTargets = await this.ruleEngine.resolveTrigger(piece.effect, {
                    r, c,
                    color: piece.stateData?.color || piece.id,
                    direction: piece.stateData?.direction,
                    ...piece.stateData
                });
                if (chainTargets.size > 0) {
                    await this._executeChain(chainTargets);
                }
            }
            
            // 重力
            const gravityResult = this.gravitySystem.apply();
            this.matchSystem.clearCache();
            this.renderSystem.renderAll();
            await this.renderSystem.animateFall(gravityResult.drops);
            
            // 检查新匹配（连锁）
            matches = this.matchSystem.findMatches();
        }
        
        this.comboCount = 0;
    }
    
    async _executeChain(targets) {
        // 连锁消除
        await this.renderSystem.animateRemove(targets);
        
        const toTrigger = [];
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = this.board.get(r, c);
            if (!piece) continue;
            
            if (piece.isRemovable()) {
                this._countElim(piece);
                if (piece.effect) {
                    toTrigger.push({ piece, r, c });
                }
                this.board.set(r, c, null);
            } else {
                this._damageAttrs(piece, 1);
            }
        }
        
        // 递归触发
        for (const { piece, r, c } of toTrigger) {
            const chainTargets = await this.ruleEngine.resolveTrigger(piece.effect, {
                r, c,
                color: piece.stateData?.color || piece.id,
                direction: piece.stateData?.direction,
                ...piece.stateData
            });
            if (chainTargets.size > 0) {
                await this._executeChain(chainTargets);
            }
        }
    }
    
    _resolveCreationPosition(creation, shapeResult) {
        const { place } = creation;
        const positions = shapeResult.positions;
        
        if (positions.length === 0) return null;
        
        switch (place) {
            case 'middle':
                return positions[Math.floor(positions.length / 2)];
            case 'intersection':
                return shapeResult.extra?.intersection || positions[0];
            case 'random':
                return positions[Math.floor(Math.random() * positions.length)];
            case 'first':
            default:
                return positions[0];
        }
    }
    
    // ==================== 移除棋子（供规则引擎调用）====================
    
    async removePieces(targets, context = {}) {
        if (!targets || targets.size === 0) return;
        
        const toTrigger = [];
        
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = this.board.get(r, c);
            if (!piece) continue;
            
            if (piece.isRemovable()) {
                this._countElim(piece);
                if (piece.effect) {
                    toTrigger.push({ piece, r, c });
                }
                this.board.set(r, c, null);
            }
        }
        
        // 递归触发
        for (const { piece, r, c } of toTrigger) {
            const chainTargets = await this.ruleEngine.resolveTrigger(piece.effect, {
                r, c,
                color: piece.stateData?.color || piece.id,
                direction: piece.stateData?.direction,
                ...piece.stateData
            });
            if (chainTargets.size > 0) {
                await this._executeChain(chainTargets);
            }
        }
    }
    
    // ==================== 交互 ====================
    
    selectCell(r, c) {
        if (this.mode !== 'admin') return;
        this.selected = { r, c };
        this.renderSystem.renderAll();
    }
    
    async handleCellClick(r, c) {
        if (this.isGameEnded) {
            this.showMessage('⛔ 游戏已结束');
            return;
        }
        if (this.movesLeft <= 0) {
            this.showMessage('⛔ 步数已耗尽');
            return;
        }
        
        const piece = this.board.get(r, c);
        if (piece && !piece.isSwappable()) {
            this.showMessage('🔒 这个棋子被锁定了');
            return;
        }
        
        // 无选中 → 选中
        if (!this.selected) {
            this.selected = { r, c };
            this.renderSystem.renderAll();
            return;
        }
        
        // 点击同一个 → 取消
        if (this.selected.r === r && this.selected.c === c) {
            this.selected = null;
            this.renderSystem.renderAll();
            return;
        }
        
        // 不相邻 → 重新选中
        const dist = Math.abs(this.selected.r - r) + Math.abs(this.selected.c - c);
        if (dist !== 1) {
            this.selected = { r, c };
            this.renderSystem.renderAll();
            return;
        }
        
        // 交换
        const sr = this.selected.r, sc = this.selected.c;
        this.selected = null;
        await this.swap(sr, sc, r, c);
    }
    
    // ==================== 游戏状态 ====================
    
    _checkGameEnd() {
        const result = this.goalSystem.check();
        
        if (result.status === 'win') {
            this._finishRound(true, result);
        } else if (result.status === 'lose') {
            this._finishRound(false, result);
        }
    }
    
    _finishRound(won, result) {
        if (this.isGameEnded) return;
        this.isGameEnded = true;
        this.timerSystem.stop();
        
        const achieved = result.achieved.map(g => g.name).join('、');
        const msg = won 
            ? `🎉 通关！达成：${achieved}` 
            : `😵 失败！分数：${this.score}`;
        
        this.showMessage(msg);
        this.eventBus.emit(won ? 'game:won' : 'game:lost', { score: this.score, result });
        
        // 延迟弹窗
        setTimeout(() => {
            alert(`${won ? '🎉 过关成功！' : '😵 关卡失败！'}\n\n${msg}`);
        }, 300);
    }
    
    // ==================== 工具 ====================
    
    updateHUD() {
        const se = document.getElementById('score');
        const me = document.getElementById('moves');
        const ce = document.getElementById('combo');
        const te = document.getElementById('target-score');
        const tle = document.getElementById('time-left');
        
        if (se) se.textContent = this.score;
        if (me) me.textContent = this.movesLeft;
        if (ce) ce.textContent = this.comboCount;
        
        // 目标显示
        if (te) {
            let text = '';
            if (this.config.targetScoreEnabled !== false) {
                text = String(this.config.targetScore);
            } else {
                text = '—';
            }
            if (this.config.requiredPieceEnabled) {
                const type = this.config.requiredPieceType;
                const cur = this.elimCounts[type] || 0;
                const tgt = this.config.requiredPieceCount;
                text += ` · ${type}×${tgt}[${cur}]`;
            }
            te.textContent = text;
        }
        
        // 时间显示
        if (tle) {
            if (this.config.enableTimeLimit && this.mode === 'game') {
                tle.textContent = this.timerSystem.timeLeft;
            } else {
                tle.textContent = '∞';
            }
        }
        
        // 警告样式
        if (me) me.parentElement?.classList.toggle('warning', this.movesLeft <= 5);
        if (tle) tle.parentElement?.classList.toggle('warning', 
            this.config.enableTimeLimit && this.timerSystem.timeLeft <= 10
        );
    }
    
    showMessage(msg) {
        const el = document.getElementById('message');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.remove('show'), ANIMATION.MESSAGE);
    }
    
    async _flashInvalid(r1, c1, r2, c2) {
        const cell1 = this.renderSystem.getCell(r1, c1);
        const cell2 = this.renderSystem.getCell(r2, c2);
        [cell1, cell2].forEach(el => el?.classList.add('invalid-swap'));
        await sleep(300);
        [cell1, cell2].forEach(el => el?.classList.remove('invalid-swap'));
    }
    
    // ==================== 模式切换 ====================
    
    setMode(mode) {
        this.mode = mode === 'game' ? 'game' : 'admin';
        
        document.getElementById('mode-admin-btn')?.classList.toggle('active', this.mode === 'admin');
        document.getElementById('mode-game-btn')?.classList.toggle('active', this.mode === 'game');
        
        const rulesPanel = document.querySelector('.rules-panel');
        const adminActions = document.querySelector('.admin-actions-panel');
        const editorPanel = document.getElementById('editor-panel');
        
        if (rulesPanel) rulesPanel.style.display = this.mode === 'admin' ? '' : 'none';
        if (adminActions) adminActions.style.display = this.mode === 'admin' ? '' : 'none';
        if (editorPanel) editorPanel.style.display = this.mode === 'admin' ? '' : 'none';
        
        this.selected = null;
        this.renderSystem.renderAll();
        this.adminPanel?.syncEditor();
        
        if (this.mode === 'game') {
            this.showMessage('🎮 游戏模式已开启！');
            if (this.config.enableTimeLimit && !this.isGameEnded) {
                this.timerSystem.start(this.timerSystem.timeLeft || this.config.timeLimitSeconds);
            }
        } else {
            this.timerSystem.stop();
            this.showMessage('🛠️ 管理员模式已开启');
        }
        
        this.updateHUD();
    }
    
    // ==================== 配置应用 ====================
    
    applyConfig(config) {
        this.config = { ...config };
        this.pieceFactory.updateConfig(config);
        this.scoreSystem.updateConfig(config);
        this.init();
    }
    
    // ==================== 事件绑定 ====================
    
    _bindEngineEvents() {
        this.eventBus.on('timer:tick', ({ timeLeft }) => {
            this.timeLeft = timeLeft;
            this.updateHUD();
        });
        
        this.eventBus.on('timer:expired', () => {
            const result = this.goalSystem.check();
            const won = result.achieved.length > 0;
            this._finishRound(won, result);
        });
    }
    
    // ==================== 提示 ====================
    
    findHint() {
        const board = this.board;
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                if (!p || !p.isSwappable()) continue;
                
                for (const [dr, dc] of [[0, 1], [1, 0]]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= board.rows || nc >= board.cols) continue;
                    const p2 = board.get(nr, nc);
                    if (!p2 || !p2.isSwappable()) continue;
                    
                    board.swap(r, c, nr, nc);
                    this.matchSystem.clearCache();
                    const has = this.matchSystem.findMatches().size > 0;
                    board.swap(r, c, nr, nc);
                    this.matchSystem.clearCache();
                    
                    if (has) {
                        return { from: { r, c }, to: { r: nr, c: nc } };
                    }
                }
            }
        }
        return null;
    }
    
    showHint() {
        const hint = this.findHint();
        if (!hint) {
            this.showMessage('💡 无可消除步骤，正在洗牌…');
            this.board = this._createRandomBoard();
            this.stabilize();
            this.renderSystem.renderAll();
            return;
        }
        
        const c1 = this.renderSystem.getCell(hint.from.r, hint.from.c);
        const c2 = this.renderSystem.getCell(hint.to.r, hint.to.c);
        c1?.classList.add('hint-cell');
        c2?.classList.add('hint-cell');
        
        this.showMessage(`💡 提示：(${hint.from.r + 1},${hint.from.c + 1}) ↔ (${hint.to.r + 1},${hint.to.c + 1})`);
        
        setTimeout(() => {
            c1?.classList.remove('hint-cell');
            c2?.classList.remove('hint-cell');
        }, ANIMATION.HINT);
    }

    initUI() {
        this.adminPanel = new AdminPanel(this);
        this.settingsPanel = new SettingsPanel(this);
        this.hud = new HUD(this);
        
        this.adminPanel.init();
        this.settingsPanel.init();
    }

    // 替换 updateHUD 为委托 HUD
    updateHUD() {
        if (this.hud) {
            this.hud.update();
        } else {
            // 降级：直接更新关键元素
            const se = document.getElementById('score');
            const me = document.getElementById('moves');
            const ce = document.getElementById('combo');
            if (se) se.textContent = this.score;
            if (me) me.textContent = this.movesLeft;
            if (ce) ce.textContent = this.comboCount;
        }
    }

    // 替换 selectCell 为联动编辑器
    selectCell(r, c) {
        if (this.mode !== 'admin') return;
        this.selected = { r, c };
        this.renderSystem.renderAll();
        this.adminPanel?.syncEditor();
    }

    // 新增：清空选中
    clearSelection() {
        this.selected = null;
        this.renderSystem.renderAll();
        this.adminPanel?.syncEditor();
    }
}

window.GameEngine = GameEngine;