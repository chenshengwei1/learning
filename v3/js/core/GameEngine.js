// ==================== GameEngine 游戏引擎 ====================

class GameEngine {
    constructor(config, registries) {
        this.config = config;
        this.registries = registries;
        
        // 依赖
        this.board = new Board(config.rows, config.cols);
        this.pieceFactory = new PieceFactory(registries);
        
        // 系统
        this.matchSystem = new MatchSystem(this);
        this.gravitySystem = new GravitySystem(this);
        this.scoreSystem = new ScoreSystem(config);
        this.goalSystem = new GoalSystem(this, registries);
        this.timerSystem = new TimerSystem(this);
        this.renderSystem = new RenderSystem(this);
        this.inputSystem = new InputSystem(this);
        this.saveSystem = new SaveSystem();
        
        // 规则运行时
        this.ruleRuntime = new RuleRuntime(this, registries);
        
        // 状态
        this.score = 0;
        this.movesLeft = config.totalMoves;
        this.comboCount = 0;
        this.maxCombo = 0;
        this.turn = 0;
        this.timeLeft = 0;
        this.elimCounts = {};
        this.collectedCounts = {};
        this.initialTargetCount = 0;
        
        this.selected = null;
        this.selectedCells = new Set();   // ← 新增
        this.editorMode = 'single';       // ← 新增：'single' | 'multi'
        this.isProcessing = false;
        this.isGameEnded = false;
        this.mode = 'admin';
        this.history = [];
        if (this.rng) {
            this.rng.reset(config.seed ?? Date.now());
        }
        this.maxHistory = 5;
        
        // 特效合成规则
        this._creationRules = (typeof BUILTIN_CREATION_RULES !== 'undefined') 
            ? BUILTIN_CREATION_RULES 
            : [];
        
        // 全局引用（DSL 用）
        window.__registries__ = registries;
        
        if (typeof window !== 'undefined') window.__gameEngine = this;
    }
    
    // ==================== 初始化 ====================
    
    init() {
        this.timerSystem.stop();
        
        // 重置状态
        this.score = 0;
        this.movesLeft = this.config.totalMoves;
        this.comboCount = 0;
        this.maxCombo = 0;
        this.turn = 0;
        this.elimCounts = {};
        this.collectedCounts = {};
        this.selected = null;
        this.isProcessing = false;
        this.isGameEnded = false;

        // ← 新增：清空回退历史
        this.clearHistory();
        
        this.timeLeft = this.config.enableTimeLimit 
            ? Number(this.config.timeLimitSeconds || 90) 
            : 0;
        
        // ← 关键修复 1：先注册匹配规则，后续 stabilize 才能检测
        this._initMatchRules();

        // ← 新增：种子随机数生成器（默认 Date.now()，每局不同）
        this.rng = new SeededRandom(this.config.seed ?? Date.now());
        
        // 创建棋盘（随机生成时内置 _wouldMatch 防三连，人为指定时保留原状）
        this.board = this._createBoardFromConfig();
        this.initialTargetCount = this.board.targets.length;
        
        // ← 关键修复 2：稳定化，无论随机还是人为，都消除所有初始可消除组合
        this.stabilize();
        this.ensurePlayable();
        
        // 初始化目标
        this.goalSystem.setGoals(this.config.goals || []);
        
        // 更新计分系统
        this.scoreSystem.updateConfig(this.config);
        
        // 初始化规则运行时
        this.ruleRuntime.init();
        
        // 渲染
        this.renderSystem.renderAll();
        this.updateHUD();
        this.showMessage('点击或拖动相邻棋子交换位置！');
        
        // 启动计时
        if (this.mode === 'game' && this.config.enableTimeLimit) {
            this.timerSystem.start(this.config.timeLimitSeconds);
        }
        
        // 触发游戏开始事件
        this.ruleRuntime.emit('game:start', {});
        this.ruleRuntime.flush();
    }
    
    _initMatchRules() {
        this.matchSystem.clearRules();
        this.matchSystem.registerRule(new LineMatchRule(this.config));
        if (this.config.enableSquare) {
            this.matchSystem.registerRule(new SquareMatchRule(this.config));
        }
        if (this.config.enableDiagonal) {
            this.matchSystem.registerRule(new DiagonalMatchRule(this.config));
        }
        this.matchSystem.clearCache();
    }
    
    _createBoardFromConfig() {
        const board = new Board(this.config.rows, this.config.cols);
        
        // layout
        if (this.config.layout) {
            board.layout = this.config.layout.map(row => [...row]);
        }
        
        // 目标物
        if (Array.isArray(this.config.targets)) {
            for (const t of this.config.targets) {
                board.addTarget(t);
            }
        }
        
        // 障碍物
        if (Array.isArray(this.config.obstacles)) {
            for (const o of this.config.obstacles) {
                board.addObstacle(o);
            }
        }
        
        // 棋子
        if (Array.isArray(this.config.pieces) && this.config.pieces.length > 0) {
            // 人为指定
            for (let r = 0; r < board.rows; r++) {
                for (let c = 0; c < board.cols; c++) {
                    const val = this.config.pieces[r]?.[c];
                    if (val === undefined || val === null) continue;
                    if (val === 'empty' || val === '-' || val === '') continue;
                    
                    if (typeof val === 'object' && val.id) {
                        board.set(r, c, Piece.deserialize(val));
                    } else if (typeof val === 'string') {
                        const piece = this.pieceFactory.create(val);
                        if (piece) board.set(r, c, piece);
                    }
                }
            }
        } else {
            // 随机填充（用 _wouldMatch 拦截所有形状的三连/田字）
            for (let r = 0; r < board.rows; r++) {
                for (let c = 0; c < board.cols; c++) {
                    if (board.layout[r][c] !== 1) continue;
                    let piece, attempts = 0;
                    do {
                        piece = this.pieceFactory.random();
                        attempts++;
                        if (attempts > LIMITS.MAX_RANDOM) break;
                    } while (this._wouldMatch(board, r, c, piece));
                    board.set(r, c, piece);
                }
            }
        }
        
        return board;
    }
    
    /**
     * 检测在 (r, c) 放置 piece 是否会形成匹配
     * 覆盖：直线（水平/垂直）、田字、斜线
     */
    _wouldMatch(board, r, c, piece) {
        if (!piece) return false;
        const len = this.config.matchLength || 3;
        
        // ===== 水平检查 =====
        let count = 1;
        for (let i = c - 1; i >= 0 && board.get(r, i)?.id === piece.id; i--) count++;
        for (let i = c + 1; i < board.cols && board.get(r, i)?.id === piece.id; i++) count++;
        if (count >= len) return true;
        
        // ===== 垂直检查 =====
        count = 1;
        for (let i = r - 1; i >= 0 && board.get(i, c)?.id === piece.id; i--) count++;
        for (let i = r + 1; i < board.rows && board.get(i, c)?.id === piece.id; i++) count++;
        if (count >= len) return true;
        
        // ===== 田字检查 =====
        if (this.config.enableSquare) {
            // 情况 A：当前是右下角
            if (r > 0 && c > 0) {
                const p1 = board.get(r - 1, c - 1);
                const p2 = board.get(r - 1, c);
                const p3 = board.get(r, c - 1);
                if (p1?.id === piece.id && p2?.id === piece.id && p3?.id === piece.id) return true;
            }
            // 情况 B：当前是左下角
            if (r > 0 && c < board.cols - 1) {
                const p1 = board.get(r - 1, c);
                const p2 = board.get(r - 1, c + 1);
                const p3 = board.get(r, c + 1);
                if (p1?.id === piece.id && p2?.id === piece.id && p3?.id === piece.id) return true;
            }
            // 情况 C：当前是右上角
            if (r < board.rows - 1 && c > 0) {
                const p1 = board.get(r, c - 1);
                const p2 = board.get(r + 1, c - 1);
                const p3 = board.get(r + 1, c);
                if (p1?.id === piece.id && p2?.id === piece.id && p3?.id === piece.id) return true;
            }
            // 情况 D：当前是左上角
            if (r < board.rows - 1 && c < board.cols - 1) {
                const p1 = board.get(r, c + 1);
                const p2 = board.get(r + 1, c);
                const p3 = board.get(r + 1, c + 1);
                if (p1?.id === piece.id && p2?.id === piece.id && p3?.id === piece.id) return true;
            }
        }
        
        // ===== 斜线检查 =====
        if (this.config.enableDiagonal) {
            // 右下方向
            count = 1;
            for (let i = 1; r + i < board.rows && c + i < board.cols && board.get(r + i, c + i)?.id === piece.id; i++) count++;
            for (let i = 1; r - i >= 0 && c - i >= 0 && board.get(r - i, c - i)?.id === piece.id; i++) count++;
            if (count >= len) return true;
            
            // 左下方向
            count = 1;
            for (let i = 1; r + i < board.rows && c - i >= 0 && board.get(r + i, c - i)?.id === piece.id; i++) count++;
            for (let i = 1; r - i >= 0 && c + i < board.cols && board.get(r - i, c + i)?.id === piece.id; i++) count++;
            if (count >= len) return true;
        }
        
        return false;
    }
    
    /**
     * 稳定化：反复消除直到棋盘无任何匹配
     * 无论随机生成还是人为指定，都会执行
     */
    stabilize() {
        let attempts = 0;
        while (attempts++ < LIMITS.MAX_STABILIZE) {
            this.matchSystem.clearCache();   // ← 清缓存，确保检测的是最新状态
            const matches = this.matchSystem.findMatches();
            if (matches.size === 0) break;
            
            for (const key of matches) {
                const { r, c } = keyToPos(key);
                this.board.set(r, c, null);
            }
            
            this.gravitySystem.apply();
        }
        
        if (attempts >= LIMITS.MAX_STABILIZE) {
            console.warn('stabilize: 超过最大尝试次数，棋盘可能仍存在匹配');
        }
    }
    
    ensurePlayable() {
        let attempts = 0;
        while (!this.hasValidMove() && attempts++ < 10) {
            for (let r = 0; r < this.board.rows; r++) {
                for (let c = 0; c < this.board.cols; c++) {
                    if (this.board.layout[r][c] !== 1) continue;
                    this.board.set(r, c, this.pieceFactory.random());
                }
            }
            this.stabilize();
        }
    }
    
    hasValidMove() {
        const board = this.board;
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                if (!p || !p.isSwappable()) continue;
                
                if (c < board.cols - 1) {
                    const p2 = board.get(r, c + 1);
                    if (p2?.isSwappable()) {
                        board.swap(r, c, r, c + 1);
                        this.matchSystem.clearCache();
                        const has = this.matchSystem.findMatches().size > 0;
                        board.swap(r, c, r, c + 1);
                        this.matchSystem.clearCache();
                        if (has) return true;
                    }
                }
                
                if (r < board.rows - 1) {
                    const p2 = board.get(r + 1, c);
                    if (p2?.isSwappable()) {
                        board.swap(r, c, r + 1, c);
                        this.matchSystem.clearCache();
                        const has = this.matchSystem.findMatches().size > 0;
                        board.swap(r, c, r + 1, c);
                        this.matchSystem.clearCache();
                        if (has) return true;
                    }
                }
            }
        }
        return false;
    }
    
    // ==================== 交换 ====================
    
    async swap(r1, c1, r2, c2) {
        console.log('[swap] 被调用', r1, c1, r2, c2);

        if (this.isProcessing || this.isGameEnded){
            console.log('[swap] 被拦截: isProcessing=', this.isProcessing, 'isGameEnded=', this.isGameEnded);
            return;
        } 
        if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1)  {
            console.log('[swap] 不相邻');
            return;
        }
        
        // 清空选中状态
        if (this.selected) {
            this._updateSelectionUI(this.selected, null);
            this.selected = null;
        }
        
        const p1 = this.board.get(r1, c1);
        const p2 = this.board.get(r2, c2);
        if (!p1 || !p2) return;
        if (!p1.isSwappable() || !p2.isSwappable()) {
            this.showMessage('🔒 有棋子被锁定');
            return;
        }
        
        // ← 新增：双特效交换分支
        if (p1.effect && p2.effect) {
            console.log('[swap] 走双特效分支');
            this.isProcessing = true;
            this._saveHistory();   // ← 新增
            await this._handleEffectSwap(r1, c1, r2, c2);
            this.isProcessing = false;
            return;
        }
        
        console.log('[swap] 走普通交换分支');
        this.isProcessing = true;

        if (window.__DEBUG_TRACE__) {
            console.log(`\n========== [SWAP] (${r1},${c1}) ↔ (${r2},${c2}) ==========`);
            const p1 = this.board.get(r1, c1);
            const p2 = this.board.get(r2, c2);
            console.log(`  ${p1?.id || '空'} ↔ ${p2?.id || '空'}`);
        }

        this._saveHistory();
        
        // 触发交换事件
        await this.ruleRuntime.emit('piece:swapped', {
            r1, c1, r2, c2,
            piece1: p1, piece2: p2,
            r: r1, c: c1,
            otherPiece: p2,
            color: p1.id
        });
        await this.ruleRuntime.flush();
        
        // 交换动画
        await this.renderSystem.animateSwap(r1, c1, r2, c2);
        
        // 交换数据
        this.board.swap(r1, c1, r2, c2);
        this.matchSystem.clearCache();
        this.renderSystem.renderPartial(new Set([posToKey(r1, c1), posToKey(r2, c2)]));
        await sleep(50);
        
        // 检查匹配
        const matches = this.matchSystem.findMatches();
        if (matches.size === 0) {
            // 回退
            this.board.swap(r1, c1, r2, c2);
            this.matchSystem.clearCache();
            this.renderSystem.renderPartial(new Set([posToKey(r1, c1), posToKey(r2, c2)]));
            await this._flashInvalid(r1, c1, r2, c2);
            this.showMessage('不能消除，换一个试试～');
            this.isProcessing = false;
            return;
        }
        
        this.movesLeft--;
        this.updateHUD();
        
        await this.processMatches(matches);
        this._checkGameEnd();
        
        this.isProcessing = false;
    }

    // ==================== 双特效交换 ====================

    /**
     * 处理双特效交换
     */
    async _handleEffectSwap(r1, c1, r2, c2) {
        console.log('[EffectSwap] 开始', r1, c1, r2, c2);

        const p1 = this.board.get(r1, c1);
        const p2 = this.board.get(r2, c2);
        
        // 1. 数据层交换
        this.board.swap(r1, c1, r2, c2);
        this.matchSystem.clearCache();
        this.renderSystem.renderPartial(new Set([posToKey(r1, c1), posToKey(r2, c2)]));
        await sleep(200);
        
        // 2. 交换后的棋子
        const p1After = this.board.get(r1, c1);   // 交换后 (r1,c1) 的棋子
        const p2After = this.board.get(r2, c2);   // 交换后 (r2,c2) 的棋子
        console.log('[EffectSwap] 交换后 p1After:', p1After?.id, 'effect=', p1After?.effect, '| p2After:', p2After?.id, 'effect=', p2After?.effect);
        
        // 3. 匹配组合规则
        const rule = this._findSwapRule(p1After, p2After, r1, c1, r2, c2);
        console.log('[EffectSwap] 匹配规则:', rule?.id, 'targets=', rule?.effect?.targets);
        
        if (window.__DEBUG_TRACE__) {
            console.log(`[EffectSwap] 规则=${rule.id}`);
            console.log(`  交换后: (${r1},${c1})=${p1After.effect}  (${r2},${c2})=${p2After.effect}`);
        }
        
        // 4. 构建 context
        const context = this._buildSwapContext(p1After, p2After, r1, c1, r2, c2);
        console.log('[EffectSwap] context:', context);
        
        // 5. 解析目标
        let targets;
        if (rule.effect.targets === 'each') {
            console.log('[EffectSwap] 走 each 分支');
            targets = await this._resolveEachTrigger(p1After, p2After, r1, c1, r2, c2);
        } else {
            console.log('[EffectSwap] 走 targets 分支');
            targets = this._resolveSwapEffectTargets(rule.effect, context);
        }
        
        console.log('[EffectSwap] 受影响格子数:', targets.size, [...targets]);
        const damage = rule.effect.damage || 1;
        
        if (window.__DEBUG_TRACE__) {
            console.log(`  受影响格子数: ${targets.size}`);
        }
        
        // 6. 应用效果
        await this._applySwapEffect(targets, damage);

        
        // 7. 消耗步数
        this.movesLeft--;
        this.updateHUD();
        
        // 8. 连锁检查
        await sleep(200);
        this.matchSystem.clearCache();
        const chainMatches = this.matchSystem.findMatches();
        console.log('[EffectSwap] 连锁匹配:', chainMatches.size);
        if (chainMatches.size > 0) {
            await this.processMatches(chainMatches);
        }
        
        this._checkGameEnd();
    }

    /**
     * 查找匹配的组合规则
     */
    _findSwapRule(p1, p2, r1, c1, r2, c2) {
        const rules = (typeof BUILTIN_SWAP_RULES !== 'undefined') ? BUILTIN_SWAP_RULES : [];
        
        for (const rule of rules) {
            if (this._matchSwapRule(rule.when, p1, p2, r1, c1, r2, c2)) {
                return rule;
            }
        }
        
        return rules[rules.length - 1] || { id: 'empty', effect: { targets: 'each', damage: 1 } };
    }

    /**
     * 检查规则是否匹配
     */
    _matchSwapRule(when, p1, p2, r1, c1, r2, c2) {
        // 效应匹配
        if (when.p1Effect) {
            const expected = Array.isArray(when.p1Effect) ? when.p1Effect : [when.p1Effect];
            if (!p1?.effect || !expected.includes(p1.effect)) return false;
        }
        if (when.p2Effect) {
            const expected = Array.isArray(when.p2Effect) ? when.p2Effect : [when.p2Effect];
            if (!p2?.effect || !expected.includes(p2.effect)) return false;
        }
        
        // 条件匹配
        if (when.condition) {
            switch (when.condition) {
                case 'sameRow': if (r1 !== r2) return false; break;
                case 'diffRow': if (r1 === r2) return false; break;
                case 'sameCol': if (c1 !== c2) return false; break;
                case 'diffCol': if (c1 === c2) return false; break;
            }
        }
        
        return true;
    }

    /**
     * 构建 context 变量
     */
    _buildSwapContext(p1After, p2After, r1, c1, r2, c2) {
        // 判定哪个是 line
        const isLine1 = p1After.effect?.startsWith('line');
        const isLine2 = p2After.effect?.startsWith('line');
        const isBomb1 = p1After.effect === 'bomb';
        const isBomb2 = p2After.effect === 'bomb';
        
        // line 优先
        let lineRow, lineCol, lineRow2, lineCol2;
        if (isLine1) {
            lineRow = r1; lineCol = c1;
            lineRow2 = r2; lineCol2 = c2;
        } else if (isLine2) {
            lineRow = r2; lineCol = c2;
            lineRow2 = r1; lineCol2 = c1;
        } else {
            lineRow = r1; lineCol = c1;
            lineRow2 = r2; lineCol2 = c2;
        }
        
        // bomb 优先
        let bombRow, bombCol;
        if (isBomb1) {
            bombRow = r1; bombCol = c1;
        } else if (isBomb2) {
            bombRow = r2; bombCol = c2;
        } else {
            bombRow = r1; bombCol = c1;
        }
        
        return {
            $r1: r1, $c1: c1, $r2: r2, $c2: c2,
            $piece1: p1After, $piece2: p2After,
            $row1: r1, $row2: r2,
            $col1: c1, $col2: c2,
            $lineRow: lineRow, $lineCol: lineCol,
            $lineRow2: lineRow2, $lineCol2: lineCol2,
            $bombRow: bombRow, $bombCol: bombCol,
            // offset 变量用于 ± 1 行/列
            $bombRowOffset: bombRow,
            $bombColOffset: bombCol,
            $lineRowOffset: lineRow,
            $lineColOffset: lineCol
        };
    }

    /**
     * fallback：各自触发各自效果
     */
    async _resolveEachTrigger(p1After, p2After, r1, c1, r2, c2) {
        const targets = new Set();
        
        for (const [p, r, c] of [[p1After, r1, c1], [p2After, r2, c2]]) {
            if (!p?.effect) continue;
            
            const effectEl = this.registries.elements.get(p.effect);
            if (!effectEl?.events) continue;
            
            for (const ev of effectEl.events) {
                if (ev.event !== 'onRemove') continue;
                
                for (const action of ev.actions || []) {
                    if (action.type !== 'remove') continue;
                    
                    const ctx = { r, c, $r: r, $c: c };
                    for (const sel of (Array.isArray(action.targets) ? action.targets : [action.targets])) {
                        const cells = this._resolveSelectorSimple(sel, ctx);
                        for (const k of cells) targets.add(k);
                    }
                }
            }
        }
        
        return targets;
    }

    /**
     * 解析组合效果的目标格子
     */
    _resolveSwapEffectTargets(effect, context) {
        const targets = new Set();
        
        for (const sel of effect.targets) {
            const cells = this._resolveSelectorSimple(sel, context);
            for (const k of cells) targets.add(k);
        }
        
        return targets;
    }

    /**
     * 简化版选择器解析（支持 row / col / area / all）
     * 支持 offset 字段：表示在解析出的行/列基础上偏移
     */
    _resolveSelectorSimple(sel, ctx) {
        const board = this.board;
        const result = new Set();
        
        if (sel.type === 'row') {
            let r = this._resolveValue(sel.r, ctx);
            if (typeof sel.offset === 'number') r += sel.offset;
            if (r < 0 || r >= board.rows) return result;
            for (let c = 0; c < board.cols; c++) result.add(posToKey(r, c));
        } else if (sel.type === 'col') {
            let c = this._resolveValue(sel.c, ctx);
            if (typeof sel.offset === 'number') c += sel.offset;
            if (c < 0 || c >= board.cols) return result;
            for (let r = 0; r < board.rows; r++) result.add(posToKey(r, c));
        } else if (sel.type === 'area') {
            const r = this._resolveValue(sel.r, ctx);
            const c = this._resolveValue(sel.c, ctx);
            const radius = sel.radius || 1;
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    if (!sel.diagonal && Math.abs(dr) + Math.abs(dc) > radius) continue;
                    const nr = r + dr, nc = c + dc;
                    if (board.isInBounds(nr, nc)) result.add(posToKey(nr, nc));
                }
            }
        } else if (sel.type === 'all') {
            for (let r = 0; r < board.rows; r++) {
                for (let c = 0; c < board.cols; c++) result.add(posToKey(r, c));
            }
        }
        
        return result;
    }

    /**
     * 解析变量值
     */
    _resolveValue(val, ctx) {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            if (val.startsWith('$')) {
                // context 里的 key 是 '$xxx' 格式，直接用 val 查
                const value = ctx[val];
                if (value === undefined) {
                    console.warn(`[EffectSwap] 变量 "${val}" 未定义，context keys:`, Object.keys(ctx));
                    return 0;
                }
                return value;
            }
        }
        return Number(val) || 0;
    }

    /**
     * 应用双特效交换的效果
     */
    async _applySwapEffect(targets, damage) {
        if (targets.size === 0) return;
        let eliminated = 0;
        // 1. 消除棋子
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = this.board.get(r, c);
            if (piece?.isRemovable()) {
                this._countElim(piece);
                this.board.set(r, c, null);
                eliminated++;   // ← 新增：统计消除数量
            }
        }
        
        // ← 新增：计分
        if (eliminated > 0) {
            const points = this.scoreSystem.calculate(eliminated, 1, { special: true });
            this.score += points;
            this.updateHUD();
            console.log(`[EffectSwap] 消除 ${eliminated} 个棋子，+${points} 分`);
        }
        
        // 2. 对障碍物造成伤害（每个冰单独计算）
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const obstacle = this.board.getObstacleAt(r, c);
            if (obstacle) {
                this.board.damageObstacleAt(r, c, damage);
            }
        }
        
        // 3. 重绘
        this.renderSystem.renderAll();
        await sleep(350);
        
        // 4. 重力
        const gravityResult = this.gravitySystem.apply();
        this.matchSystem.clearCache();
        this.renderSystem.renderPartial(gravityResult.changed);
        await this.renderSystem.animateGravityDrop(gravityResult.drops);
    }
    
    async handleCellClick(r, c, ctrlKey = false) {
        // ← 管理员模式
        if (this.mode === 'admin') {
            const key = posToKey(r, c);
            
            if (this.editorMode === 'single') {
                // 单选模式：只保留一个
                this.selectedCells.clear();
                this.selectedCells.add(key);
            } else {
                // 多选模式
                if (ctrlKey) {
                    // Ctrl 点击：切换
                    if (this.selectedCells.has(key)) {
                        this.selectedCells.delete(key);
                    } else {
                        this.selectedCells.add(key);
                    }
                } else {
                    // 普通点击：清空后只选这一个
                    this.selectedCells.clear();
                    this.selectedCells.add(key);
                }
            }
            
            // 同步 selected（指向第一个）
            const first = [...this.selectedCells][0];
            this.selected = first ? keyToPos(first) : null;
            
            this.renderSystem.renderAll();
            
            // 打开编辑器
            if (this.selectedCells.size > 0) {
                if (this.adminPanel) {
                    this.adminPanel.showCellEditorForMultiple([...this.selectedCells]);
                }
            } else {
                // 全部取消，关闭编辑器
                document.getElementById('editor-panel')?.classList.add('hidden');
            }
            return;
        }
        
        // ← 游戏模式（原有逻辑）
        if (this.isGameEnded) return;
        if (this.isProcessing) return;
        if (this.movesLeft <= 0) {
            this.showMessage('⛔ 步数耗尽');
            return;
        }
        
        const piece = this.board.get(r, c);
        if (piece && !piece.isSwappable()) {
            this.showMessage('🔒 这个棋子被锁定了');
            return;
        }
        
        if (!this.selected) {
            this.selected = { r, c };
            this._updateSelectionUI(null, { r, c });
            return;
        }
        
        if (this.selected.r === r && this.selected.c === c) {
            const old = this.selected;
            this.selected = null;
            this._updateSelectionUI(old, null);
            return;
        }
        
        const dist = Math.abs(this.selected.r - r) + Math.abs(this.selected.c - c);
        if (dist !== 1) {
            const old = this.selected;
            this.selected = { r, c };
            this._updateSelectionUI(old, { r, c });
            return;
        }
        
        const sr = this.selected.r, sc = this.selected.c;
        this.selected = null;
        this._updateSelectionUI({ r: sr, c: sc }, null);
        await this.swap(sr, sc, r, c);
    }
    
    /**
     * 只更新选中格的 class，不重建 DOM
     */
    _updateSelectionUI(oldSel, newSel) {
        if (oldSel) {
            const cell = this.renderSystem.getCell(oldSel.r, oldSel.c);
            cell?.classList.remove('selected');
        }
        if (newSel) {
            const cell = this.renderSystem.getCell(newSel.r, newSel.c);
            cell?.classList.add('selected');
        }
    }
    
    // ==================== 消除流程（核心）====================
    
    async processMatches(matches) {
        this.comboCount = 0;
        let chainCount = 0;
        
        while (matches.size > 0 && chainCount++ < LIMITS.MAX_CHAIN) {
            this.comboCount++;
            this.maxCombo = Math.max(this.maxCombo, this.comboCount);

            // ← 加这里：轮次开始，记录"匹配位置"
            if (window.__DEBUG_TRACE__) {
                console.log(`\n---------- [轮 ${chainCount}] 匹配 ${matches.size} 格 ----------`);
                console.log('  匹配位置:', [...matches].join(' '));
            }

            // ← 新增：打印本轮匹配信息
            if (window.__DEBUG_MATCH__) {
                console.log(`\n========== 第 ${chainCount} 轮匹配 ==========`);
                console.log('匹配格子:', [...matches]);
                console.log('匹配棋子:', [...matches].map(k => {
                    const { r, c } = keyToPos(k);
                    const p = this.board.get(r, c);
                    return `${p?.id || '空'}(${r},${c})`;
                }).join(', '));
            }
            
            // ========== 步骤 1：形状分析 ==========
            const shapeResult = this.matchSystem.analyzeShape(matches);
            
            // ========== 步骤 2：判断合成（基于形状）==========
            let creation = null;
            if (shapeResult && typeof resolveCreationFromShape === 'function') {
                creation = resolveCreationFromShape(this, shapeResult, matches);
            }
            
            // ========== 步骤 3：触发匹配事件 ==========
            await this.ruleRuntime.emit('match:done', {
                matches,
                shapeResult,
                shape: shapeResult?.shape,
                direction: shapeResult?.direction,
                color: shapeResult?.color,
                count: matches.size,
                $shapeResult: shapeResult,
                r: shapeResult?.center?.r,
                c: shapeResult?.center?.c
            });
            await this.ruleRuntime.flush();
            
            // ========== 步骤 4：计分 ==========
            const points = this.scoreSystem.calculate(matches.size, this.comboCount, {
                special: !!creation
            });
            this.score += points;
            this.updateHUD();

            // ← 加这里：消除前，记录所有要消除的棋子
            if (window.__DEBUG_TRACE__) {
                const toRemove = [];
                for (const key of matches) {
                    const { r, c } = keyToPos(key);
                    const p = this.board.get(r, c);
                    if (p) toRemove.push(`${key}=${p.id}`);
                }
                console.log('  将消除:', toRemove.join(' '));
            }
            
            // ========== 步骤 5：消除动画 ==========
            await this.renderSystem.animateRemove(matches);
            
            // ========== 步骤 6：记录匹配位置（用于生成特效）==========
            let creationPos = null;
            if (creation) {
                creationPos = resolveCreationPosition(creation.place, shapeResult, this);
            }
            
            // ========== 步骤 7：遍历匹配，收集要触发的特效，并消除普通棋子 ==========
            const toTrigger = [];
            
            for (const key of matches) {
                const { r, c } = keyToPos(key);
                const piece = this.board.get(r, c);
                if (!piece) continue;
                
                if (piece.isRemovable()) {
                    this._countElim(piece);
                    
                    await this.ruleRuntime.emit('piece:removed', {
                        r, c, piece, color: piece.id
                    });
                    
                    // ← 新增：cell:cleared 事件（同格障碍物响应）
                    const obstacle = this.board.getObstacleAt(r, c);
                    if (obstacle) {
                        await this.ruleRuntime.emit('cell:cleared', {
                            r, c,
                            obstacle,
                            element: obstacle.element
                        });
                    }
                    
                    if (piece.effect) {
                        toTrigger.push({ piece, r, c });
                    }
                    this.board.set(r, c, null);
                }
            }
            await this.ruleRuntime.flush();

            // ← 新增：any:match 事件（全屏响应）
            await this.ruleRuntime.emit('any:match', {
                matches: [...matches],
                count: matches.size
            });
            await this.ruleRuntime.flush();
            
            // ========== 步骤 8：生成新特效 ==========
            if (creation && creationPos) {
                const { r, c } = creationPos;
                if (this.board.isEmpty(r, c)) {
                    const data = resolveCreationData(creation.preserve, shapeResult, matches);
                    const effectPiece = this.pieceFactory.createEffect(creation.create, {
                        direction: data.direction,
                        color: data.color
                    });
                    
                    if (effectPiece) {
                        this.board.set(r, c, effectPiece);
                        
                        const cell = this.renderSystem.getCell(r, c);
                        if (cell) {
                            cell.classList.add('bomb-spawn');
                        }
                        
                        await this.ruleRuntime.emit('effect:created', {
                            r, c,
                            piece: effectPiece,
                            effect: creation.create,
                            color: data.color,
                            direction: data.direction
                        });
                        await this.ruleRuntime.flush();
                    }
                }
            }
            
            // ========== 步骤 9：触发相邻消除事件（障碍物受伤）==========
            await this._emitAdjacentEvents(matches);
            
            // ========== 步骤 10：触发被消除的特效（连锁）==========
            for (const { piece, r, c } of toTrigger) {
                await this.triggerEffect(r, c, piece);
            }

            // ========== 步骤 11：重力下落 ==========
            if (window.__DEBUG_MATCH__) {
                console.log('--- 消除前棋盘 ---');
                this._debugPrintBoard();
            }

            if (window.__DEBUG_TRACE__) {
                console.log('  [消除后]');
                this._traceBoardCompact();
            }
            
            // ========== 步骤 11：重力下落 ==========
            const gravityResult = this.gravitySystem.apply();

            // ← 加这里：记录重力变化
            if (window.__DEBUG_TRACE__) {
                console.log(`  重力: ${gravityResult.drops.length} 个棋子移动`);
                const newPieces = gravityResult.drops.filter(d => d.isNew);
                const movedPieces = gravityResult.drops.filter(d => !d.isNew);
                
                if (movedPieces.length > 0) {
                    console.log('    移动:', movedPieces.map(d => 
                        `${d.piece.id}(${d.from.r},${d.from.c})→(${d.to.r},${d.to.c})`
                    ).join(' '));
                }
                if (newPieces.length > 0) {
                    console.log('    新增:', newPieces.map(d => 
                        `${d.piece.id}@(${d.to.r},${d.to.c})`
                    ).join(' '));
                }
                
                console.log('  [重力后]');
                this._traceBoardCompact();
            }

            this.matchSystem.clearCache();

            // ← 新增：特效生成位置也加入 changed
            if (creation && creationPos) {
                gravityResult.changed.add(posToKey(creationPos.r, creationPos.c));
            }
            
            if (gravityResult.changed && gravityResult.changed.size > 0) {
                this.renderSystem.renderPartial(gravityResult.changed);
            }
            
            await this.renderSystem.animateGravityDrop(gravityResult.drops);

            if (window.__DEBUG_MATCH__) {
                console.log('--- 重力后棋盘 ---');
                this._debugPrintBoard();
            }
            
            // ========== 步骤 12：检查新匹配（连锁）==========
            matches = this.matchSystem.findMatches();

            if (window.__DEBUG_MATCH__) {
                console.log('下一轮匹配:', [...matches]);
            }
        }
        
        // ========== 回合结束 ==========
        this.turn++;
        await this.ruleRuntime.emit('turn:end', { turn: this.turn });
        await this.ruleRuntime.flush();
        
        this.comboCount = 0;
    }

    // ← 新增：辅助方法
    _debugPrintBoard() {
        const board = this.board;
        const lines = [];
        for (let r = 0; r < board.rows; r++) {
            let line = `r${r}: `;
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                if (!p) {
                    line += '[空 ] ';
                } else {
                    const id = p.id.substring(0, 3).padEnd(3, ' ');
                    line += `[${id}] `;
                }
            }
            lines.push(line);
        }
        console.log(lines.join('\n'));
    }
    
    /**
     * 发送相邻消除事件（用于障碍物受伤）
     */
    async _emitAdjacentEvents(matches) {
        const crossSet = new Set();      // 上下左右（cross）
        const diagonalSet = new Set();   // 斜角（diagonal）
        const neighborMap = new Map();   // key -> direction
        
        for (const key of matches) {
            const { r, c } = keyToPos(key);
            
            // 先收集 cross
            const crossNeighbors = this.board.getAdjacent(r, c, { diagonal: false });
            for (const n of crossNeighbors) {
                const nKey = posToKey(n.r, n.c);
                if (!neighborMap.has(nKey)) {
                    neighborMap.set(nKey, 'cross');
                }
            }
            
            // 再收集 diagonal（不覆盖已有的 cross）
            const allNeighbors = this.board.getAdjacent(r, c, { diagonal: true });
            for (const n of allNeighbors) {
                const nKey = posToKey(n.r, n.c);
                if (!neighborMap.has(nKey)) {
                    neighborMap.set(nKey, 'diagonal');
                }
            }
        }
        
        console.log('[adjacent] crossSet:', [...crossSet]);
        console.log('[adjacent] diagonalSet:', [...diagonalSet]);
        console.log('[adjacent] neighborMap:', [...neighborMap]);
        
        // 逐个触发
        for (const [key, direction] of neighborMap) {
            const { r, c } = keyToPos(key);
            const obstacle = this.board.getObstacleAt(r, c);
            if (obstacle) {
                console.log(`[adjacent] ${direction} 事件 (${r},${c}) obstacle=${obstacle.element}`);
                await this.ruleRuntime.emit('adjacent:match', {
                    r, c,
                    obstacle,
                    element: obstacle.element,
                    source: 'match',
                    direction
                });
            }
        }
        
        await this.ruleRuntime.flush();
    }
    
    /**
     * 触发特效棋子
     */
    async triggerEffect(r, c, piece) {
        if (!piece.effect) return;
        
        await this.ruleRuntime.emit('effect:created', {
            r, c, piece,
            effect: piece.effect,
            color: piece.stateData?.color || piece.id,
            direction: piece.stateData?.direction
        });
        await this.ruleRuntime.flush();
    }
    
    _countElim(piece) {
        if (!piece) return;
        this.elimCounts[piece.id] = (this.elimCounts[piece.id] || 0) + 1;
    }
    
    /**
     * 供 DSL 动作调用的移除接口
     */
    async removePieces(targets, context = {}) {
        const toTrigger = [];
        const removedPieces = [];
        
        for (const key of targets) {
            const { r, c } = keyToPos(key);
            const piece = this.board.get(r, c);
            if (!piece || !piece.isRemovable()) continue;
            
            this._countElim(piece);
            removedPieces.push({ r, c, piece });
            
            if (piece.effect) {
                toTrigger.push({ piece, r, c });
            }
            this.board.set(r, c, null);
        }
        
        for (const { r, c, piece } of removedPieces) {
            await this.ruleRuntime.emit('piece:removed', {
                r, c, piece, color: piece.id
            });
        }
        await this.ruleRuntime.flush();
        
        for (const { piece, r, c } of toTrigger) {
            await this.triggerEffect(r, c, piece);
        }
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
        
        this.ruleRuntime.emit('game:end', { won, score: this.score });
        
        const msg = won 
            ? `🎉 通关！分数：${this.score}` 
            : `😵 失败！分数：${this.score}`;
        
        this.showMessage(msg);
        
        setTimeout(() => {
            alert(`${won ? '🎉 过关！' : '😵 失败！'}\n\n${msg}`);
        }, 300);
    }
    
    updateHUD() {
        const se = document.getElementById('score');
        const me = document.getElementById('moves');
        const ce = document.getElementById('combo');
        const tle = document.getElementById('time-left');
        const ge = document.getElementById('goals');
        
        if (se) se.textContent = this.score;
        if (me) me.textContent = this.movesLeft;
        if (ce) ce.textContent = this.comboCount;
        
        if (tle) {
            if (this.config.enableTimeLimit && this.mode === 'game') {
                tle.textContent = this.timerSystem.timeLeft;
            } else {
                tle.textContent = '∞';
            }
        }
        
        if (ge) {
            const progress = this.goalSystem.getProgress();
            if (progress && progress.length > 0) {
                ge.innerHTML = progress.map(p => {
                    let text = p.label;
                    if (p.progress) {
                        text += ` ${p.progress.current}/${p.progress.target}`;
                    }
                    const cls = p.achieved ? 'goal-item achieved' : 'goal-item';
                    return `<div class="${cls}">${text}</div>`;
                }).join('');
            } else {
                ge.innerHTML = '';
            }
        }
        
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
    
    _saveHistory() {
        this.history.push({
            board: this.board.serialize(),
            score: this.score,
            movesLeft: this.movesLeft,
            elimCounts: { ...this.elimCounts },
            rngState: this.rng.saveState(),   // ← 新增
        });
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    /**
     * 回退到上一次交换前的状态
     */
    undo() {
        if (this.history.length === 0) {
            this.showMessage('⚠️ 没有可回退的操作');
            return false;
        }
        
        if (this.isProcessing) {
            this.showMessage('⏳ 正在处理中，请稍后');
            return false;
        }
        
        if (this.isGameEnded) {
            this.showMessage('⛔ 游戏已结束，无法回退');
            return false;
        }
        
        const snapshot = this.history.pop();
        
        // 恢复棋盘
        this.board = Board.deserialize(snapshot.board);
        
        // 恢复状态
        this.score = snapshot.score;
        this.movesLeft = snapshot.movesLeft;
        this.elimCounts = { ...(snapshot.elimCounts || {}) };

        // ← 恢复随机数状态（关键！）
        if (snapshot.rngState !== undefined) {
            this.rng.restoreState(snapshot.rngState);
        }
        
        // 清空选中
        this.selected = null;
        this.selectedCells.clear();
        
        // 清缓存 + 重绘
        this.matchSystem.clearCache();
        this.renderSystem.renderAll();
        this.updateHUD();
        
        this.showMessage(`↩️ 已回退（剩余可回退 ${this.history.length} 步）`);
        return true;
    }

    /**
     * 清空回退历史
     */
    clearHistory() {
        this.history = [];
    }
    
    async _flashInvalid(r1, c1, r2, c2) {
        const cell1 = this.renderSystem.getCell(r1, c1);
        const cell2 = this.renderSystem.getCell(r2, c2);
        [cell1, cell2].forEach(el => el?.classList.add('invalid-swap'));
        await sleep(300);
        [cell1, cell2].forEach(el => el?.classList.remove('invalid-swap'));
    }
    
    // ==================== 模式 ====================
    
    setMode(mode) {
        this.mode = mode === 'game' ? 'game' : 'admin';
        
        document.getElementById('mode-admin-btn')?.classList.toggle('active', this.mode === 'admin');
        document.getElementById('mode-game-btn')?.classList.toggle('active', this.mode === 'game');
        
        const rulesPanel = document.querySelector('.rules-panel');
        const adminActions = document.querySelector('.admin-actions-panel');
        
        if (rulesPanel) rulesPanel.style.display = this.mode === 'admin' ? '' : 'none';
        if (adminActions) adminActions.style.display = this.mode === 'admin' ? '' : 'none';
        
        // 控制按钮显示
        const restartBtn = document.getElementById('restart-btn');
        const resetLevelBtn = document.getElementById('reset-level-btn');
        
        if (this.mode === 'admin') {
            restartBtn?.classList.add('hidden');
            resetLevelBtn?.classList.remove('hidden');
        } else {
            restartBtn?.classList.remove('hidden');
            resetLevelBtn?.classList.add('hidden');
        }
        
        // 关闭编辑器
        if (this.mode === 'game') {
            document.getElementById('editor-panel')?.classList.add('hidden');
        }
        
        this.selected = null;
        this.selectedCells.clear();   // ← 新增
        this.renderSystem.renderAll();
        
        if (this.mode === 'game') {
            this.showMessage('🎮 游戏模式已开启！');
            if (this.config.enableTimeLimit && !this.isGameEnded) {
                this.timerSystem.start(this.timerSystem.timeLeft || this.config.timeLimitSeconds);
            }
        } else {
            this.timerSystem.stop();
            this.showMessage('🛠️ 管理员模式');
        }
        
        this.updateHUD();
    }
    
    applyConfig(config) {
        this.config = { ...config };
        this.pieceFactory = new PieceFactory(this.registries);
        this.scoreSystem.updateConfig(config);
        this.init();
    }
    
    // ==================== 提示 ====================
    
    showHint() {
        const hint = this._findHint();
        if (!hint) {
            this.showMessage('💡 无可消除步骤，正在洗牌…');
            this.ensurePlayable();
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
    
    _findHint() {
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
                    
                    if (has) return { from: { r, c }, to: { r: nr, c: nc } };
                }
            }
        }
        return null;
    }

    _traceBoardCompact() {
        const board = this.board;
        const lines = [];
        for (let r = 0; r < board.rows; r++) {
            let line = `    r${r}: `;
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                const obs = board.getObstacleAt(r, c);
                const tgt = board.getTargetAt(r, c);
                
                let cell = '';
                if (p) {
                    // 棋子：用前 2 字符 + 如果有特效加 *；如果是特效棋子用括号
                    const id = p.id.substring(0, 3);
                    cell = p.effect ? `[${id}]` : ` ${id} `;
                } else {
                    cell = ' .. ';
                }
                
                // 障碍物标记
                if (obs) cell += `{${obs.element[0]}${obs.hp}}`;
                
                line += cell + ' ';
            }
            lines.push(line);
        }
        console.log(lines.join('\n'));
    }
}

window.GameEngine = GameEngine;