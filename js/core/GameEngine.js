
// ==================== GameEngine 类 ====================

class GameEngine {
    constructor() {
        this.configManager = new ConfigManager();
        this.config = null;
        this.board = null;
        this.matchRules = null;
        this.explosionHandler = null;
        this.scoreSystem = null;
        this.sound = new SoundSystem();
        this._matchCache = new SimpleCache(50);
        
        this.rows = this.cols = this.score = this.movesLeft = this.comboCount = this.timeLeft = this.targetScore = 0;
        this.selected = this.lastHint = this.timerId = this._cellSize = this._gap = this._cellPx = null;
        this.mode = 'admin'; 
        this.isProcessing = this.isGameEnded = false;
        this.targetScoreEnabled = this.requiredPieceEnabled = false;
        this.requiredPieceType = this.requiredPieceCount = 10; 
        this.elimCounts = {}; 
        this._cellCache = {}; 
        this.hintTimer = null;
        this.history = [];
        this.maxHistory = 5;
        
        if (typeof window !== 'undefined') window.__gameEngine = this;
        
        // 延迟绑定事件
        setTimeout(() => {
            this._bindEvents();
            this.refreshSelectorUI();
        }, 0);
    }
    
    // ==================== 配置管理 ====================
    
    applyConfig(cfg) {
        const sc = this.configManager.sanitizeConfig(cfg);
        this.config = { ...sc };
        this.rows = sc.rows;
        this.cols = sc.cols;
        this._cellSize = sc.cellSize;
        this._gap = sc.gap;
        this._cellPx = sc.cellSize + sc.gap;
        this.selected = this.lastHint = null;
        this._cellCache = {};
        this.targetScoreEnabled = sc.targetScoreEnabled !== false;
        this.targetScore = this.targetScoreEnabled ? Math.max(0, Number(sc.targetScore || 50000)) : 0;
        this.timeLeft = sc.enableTimeLimit ? Number(sc.timeLimitSeconds || 90) : 0;
        this.requiredPieceEnabled = sc.requiredPieceEnabled === true;
        this.requiredPieceType = getPieceTypeCodeById(sc.requiredPieceType, sc.pieceTypes) || sc.requiredPieceType || sc.pieceTypes?.[0]?.id || null;
        this.requiredPieceCount = Number.isFinite(Number(sc.requiredPieceCount)) ? Math.max(0, Number(sc.requiredPieceCount)) : 10;
        this.elimCounts = {};
        this.totalMoves = Number.isFinite(Number(sc.totalMoves)) ? Math.max(1, Number(sc.totalMoves)) : 30;
        this._initMatchRules(sc);
        this.explosionHandler = new ExplosionHandler(sc);
        this.scoreSystem = new ScoreSystem(sc);
        this.configManager.saveConfig(sc);
        
        // 更新棋盘DOM
        const be = $('board');
        if (be) {
            const bw = this.cols * sc.cellSize + (this.cols - 1) * sc.gap;
            const bh = this.rows * sc.cellSize + (this.rows - 1) * sc.gap;
            be.style.cssText = `width:${bw}px;height:${bh}px;display:grid;gap:${sc.gap}px;--cell-size:${sc.cellSize}px;--gap:${sc.gap}px;--cols:${this.cols};--rows:${this.rows};grid-template-columns:repeat(${this.cols},${sc.cellSize}px);grid-template-rows:repeat(${this.rows},${sc.cellSize}px);`;
            be.innerHTML = '';
        }
        this.refreshSelectorUI();
    }
    
    _initMatchRules(cfg) {
        this.matchRules = [new LineMatchRule(cfg)];
        if (cfg.enableSquare) this.matchRules.push(new SquareMatchRule(cfg));
        if (cfg.enableDiagonal) this.matchRules.push(new DiagonalMatchRule(cfg));
        this.matchRules.sort((a, b) => b.priority - a.priority);
    }
    
    // ==================== 棋盘管理 ====================
    
    createPiece(typeId) {
        const t = this.config.pieceTypes.find(x => x && (x.id === typeId || x.code === typeId));
        if (!t) return new Piece('unknown', '#888', '❓', { background: '#888', pattern: 'solid', pieceColor: '#fff' });
        return new Piece(t.id, t.background || t.color || '#888', t.id === BLANK_PIECE_TYPE || t.isPiece === false ? '' : (t.char || t.id), {
            background: t.background || t.color || '#888', 
            pattern: t.pattern || 'solid', 
            patternColor: t.patternColor || 'rgba(255,255,255,0.22)',
            pieceColor: t.pieceColor || '#ffffff', 
            borderColor: t.borderColor || 'rgba(255,255,255,0.3)', 
            borderWidth: t.borderWidth || 2,
            walls: t.walls || {}, 
            isPiece: t.isPiece !== false, 
            id: t.id, 
            code: t.code || t.id, 
            pieceUI: t.pieceUI || {},
            iceLevel: t.iceLevel || 0, 
            frozenValue: t.frozenValue || 0
        });
    }
    
    randomPiece() { 
        const ts = (this.config.pieceTypes || []).filter(t => t && t.isPiece !== false); 
        if (!ts.length) return null; 
        return this.createPiece(ts[Math.floor(Math.random() * ts.length)].id); 
    }
    
    createBoard() {
        const b = [];
        for (let r = 0; r < this.rows; r++) {
            b[r] = []; 
            for (let c = 0; c < this.cols; c++) {
                let p, att = 0; 
                do { 
                    p = this.randomPiece(); 
                    att++; 
                    if (att > MAX_RANDOM_ATTEMPTS) break; 
                } while (this._wouldMatch(b, r, c, p));
                if (Math.random() < FROZEN_CHANCE) { 
                    const st = ['frozen', 'locked', 'bomb'][Math.floor(Math.random() * 3)]; 
                    p.addState(st); 
                    if (st === 'bomb') p.stateData.bomb = { radius: 1 }; 
                }
                b[r][c] = p;
            }
        } 
        return b;
    }
    
    _wouldMatch(b, r, c, piece) { 
        const tb = b.map(row => [...row]); 
        tb[r][c] = piece; 
        return this._hasMatchAt(tb, r, c); 
    }
    
    _hasMatchAt(board, r, c) {
        const len = this.config.matchLength || 3, typeId = board[r]?.[c]?.typeId; 
        if (!typeId) return false;
        let cnt = 1; 
        for (let i = c - 1; i >= 0 && board[r][i]?.typeId === typeId; i--) cnt++; 
        for (let i = c + 1; i < this.cols && board[r][i]?.typeId === typeId; i++) cnt++; 
        if (cnt >= len) return true;
        cnt = 1; 
        for (let i = r - 1; i >= 0 && board[i]?.[c]?.typeId === typeId; i--) cnt++; 
        for (let i = r + 1; i < this.rows && board[i]?.[c]?.typeId === typeId; i++) cnt++; 
        if (cnt >= len) return true;
        if (this.config.enableSquare) {
            if (r > 0 && c > 0 && board[r - 1][c - 1]?.typeId === typeId && board[r - 1][c]?.typeId === typeId && board[r][c - 1]?.typeId === typeId) return true;
            if (r < this.rows - 1 && c > 0 && board[r][c - 1]?.typeId === typeId && board[r + 1]?.[c - 1]?.typeId === typeId && board[r + 1]?.[c]?.typeId === typeId) return true;
            if (r > 0 && c < this.cols - 1 && board[r - 1][c]?.typeId === typeId && board[r - 1][c + 1]?.typeId === typeId && board[r][c + 1]?.typeId === typeId) return true;
            if (r < this.rows - 1 && c < this.cols - 1 && board[r][c + 1]?.typeId === typeId && board[r + 1]?.[c]?.typeId === typeId && board[r + 1]?.[c + 1]?.typeId === typeId) return true;
        }
        if (this.config.enableDiagonal) {
            cnt = 1; 
            for (let i = 1; r - i >= 0 && c - i >= 0 && board[r - i][c - i]?.typeId === typeId; i++) cnt++; 
            for (let i = 1; r + i < this.rows && c + i < this.cols && board[r + i]?.[c + i]?.typeId === typeId; i++) cnt++; 
            if (cnt >= len) return true;
            cnt = 1; 
            for (let i = 1; r - i >= 0 && c + i < this.cols && board[r - i][c + i]?.typeId === typeId; i++) cnt++; 
            for (let i = 1; r + i < this.rows && c - i >= 0 && board[r + i]?.[c - i]?.typeId === typeId; i++) cnt++; 
            if (cnt >= len) return true;
        }
        return false;
    }
    
    _findAllMatches(board) { 
        const cacheKey = board.map(row => row.map(p => p?.typeId || 'null').join(',')).join('|');
        const cached = this._matchCache.get(cacheKey);
        if (cached) return new Set(cached);
        
        const all = new Set(); 
        for (const rule of this.matchRules) {
            for (const idx of rule.check(board, this.rows, this.cols)) all.add(idx); 
        }
        this._matchCache.set(cacheKey, [...all]);
        return all; 
    }
    
    findMatches() { return this._findAllMatches(this.board); }
    
    applyGravity() {
        const changed = new Set();
        for (let c = 0; c < this.cols; c++) {
            const col = []; 
            for (let r = 0; r < this.rows; r++) if (this.board[r][c]) col.push(this.board[r][c]);
            for (let r = this.rows - 1; r >= 0; r--) { 
                const nx = col.length > 0 ? col.pop() : this.randomPiece(); 
                if (this.board[r][c] !== nx) { 
                    this.board[r][c] = nx; 
                    changed.add(rcToIdx(r, c, this.cols)); 
                } 
            }
        }
        return changed;
    }
    
    stabilizeBoard() { 
        let g = 0; 
        while (g++ < MAX_STABILIZE_ATTEMPTS) { 
            const m = this.findMatches(); 
            if (!m.size) break; 
            for (const idx of m) { 
                const { r, c } = idxToRC(idx, this.cols); 
                if (this.board[r][c]?.isRemovable()) this.board[r][c] = null; 
            } 
            this.applyGravity(); 
        }
        if (g >= MAX_STABILIZE_ATTEMPTS) {
            console.warn('Board stabilization exceeded max iterations');
        }
    }
    
    hasValidMove() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] && !this.board[r][c].isSwappable()) continue;
                if (c < this.cols - 1) { 
                    [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]]; 
                    if (this.findMatches().size > 0) { 
                        [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]]; 
                        return true; 
                    } 
                    [this.board[r][c], this.board[r][c + 1]] = [this.board[r][c + 1], this.board[r][c]]; 
                }
                if (r < this.rows - 1) { 
                    [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]]; 
                    if (this.findMatches().size > 0) { 
                        [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]]; 
                        return true; 
                    } 
                    [this.board[r][c], this.board[r + 1][c]] = [this.board[r + 1][c], this.board[r][c]]; 
                }
            }
        } 
        return false;
    }
    
    ensurePlayableBoard() { 
        let att = 0; 
        while (!this.hasValidMove() && att < 8) { 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
            att++; 
        } 
        if (!this.hasValidMove()) { 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
        } 
    }
    
    // ==================== 渲染 ====================
    
    renderBoard(withFallAnim, changedCells = null) {
        const be = $('board');
        if (!be) return;
        
        const exp = this.rows * this.cols;
        if (be.children.length !== exp || changedCells === null) { 
            be.innerHTML = ''; 
            this._cellCache = {}; 
        }
        
        if (changedCells?.size > 0) {
            for (const idx of changedCells) { 
                const { r, c } = idxToRC(idx, this.cols); 
                const cell = this._mkCell(r, c, withFallAnim); 
                const ex = be.children[idx]; 
                if (ex) be.replaceChild(cell, ex); 
                else be.appendChild(cell); 
            }
            return;
        }
        
        const fragment = document.createDocumentFragment();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                fragment.appendChild(this._mkCell(r, c, withFallAnim));
            }
        }
        be.appendChild(fragment);
    }
    
    _mkCell(r, c, withFallAnim) {
        const cell = document.createElement('div'); 
        cell.className = 'cell'; 
        cell.dataset.r = r; 
        cell.dataset.c = c;
        const p = this.board[r][c]; 
        if (p) p.render(cell, this._cellSize, { skipWallSides: this._sharedWallSkipSides(r, c) });
        if (withFallAnim) cell.classList.add('falling');
        if (this.selected?.r === r && this.selected?.c === c) cell.classList.add('selected');
        if (this.lastHint && ((this.lastHint.from.r === r && this.lastHint.from.c === c) || (this.lastHint.to.r === r && this.lastHint.to.c === c))) cell.classList.add('hint-cell');
        this._bindCellEvents(cell, r, c); 
        this._cellCache[`${r},${c}`] = cell; 
        return cell;
    }
    
    getCell(r, c) { return this._cellCache[`${r},${c}`] || null; }
    
    _sharedWallSkipSides(r, c) {
        const p = this.board[r]?.[c]; 
        if (!p) return new Set(); 
        const skip = new Set(), myIdx = rcToIdx(r, c, this.cols);
        const sides = [
            { s: 'left', dr: 0, dc: -1, op: 'right' }, 
            { s: 'right', dr: 0, dc: 1, op: 'left' }, 
            { s: 'top', dr: -1, dc: 0, op: 'bottom' }, 
            { s: 'bottom', dr: 1, dc: 0, op: 'top' }
        ];
        for (const { s, dr, dc, op } of sides) {
            const own = p.walls?.[s]; 
            if (!own || !own.enabled || own.hp <= 0) continue;
            const nr = r + dr, nc = c + dc; 
            if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
            const nb = this.board[nr]?.[nc], opp = nb?.walls?.[op];
            if (opp?.enabled && opp.hp > 0 && rcToIdx(nr, nc, this.cols) < myIdx) skip.add(s);
        } 
        return skip;
    }
    
    // ==================== 交互 ====================
    
    _bindCellEvents(cell, r, c) {
        let sx = null, sy = null, drg = false; 
        const ed = this.config.enableDrag !== false, th = this.config.dragThreshold || 15;
        cell.addEventListener('pointerdown', e => { 
            if (this.isProcessing || this.movesLeft <= 0) return; 
            sx = e.clientX; 
            sy = e.clientY; 
            drg = false; 
            try { cell.setPointerCapture(e.pointerId); } catch { }; 
        });
        cell.addEventListener('pointermove', e => { 
            if (sx === null || !ed) return; 
            const dx = e.clientX - sx, dy = e.clientY - sy; 
            if (!drg && Math.hypot(dx, dy) > th) { 
                drg = true; 
                cell.classList.add('dragging'); 
            } 
        });
        cell.addEventListener('pointerup', e => {
            if (sx === null) return; 
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (this.mode !== 'game') { 
                sx = sy = null; 
                drg = false; 
                this.selected = { r, c }; 
                this.syncEditorPanel(); 
                this.renderBoard(); 
                return; 
            }
            if (drg && ed) {
                cell.classList.remove('dragging'); 
                let tr = r, tc = c; 
                if (Math.abs(dx) > Math.abs(dy)) tc = c + (dx > 0 ? 1 : -1); 
                else tr = r + (dy > 0 ? 1 : -1); 
                sx = sy = null; 
                drg = false;
                if (tr < 0 || tr >= this.rows || tc < 0 || tc >= this.cols) { 
                    this.selected = null; 
                    this.renderBoard(); 
                    return; 
                } 
                this.selected = null; 
                this._handleSwap(r, c, tr, tc);
            } else { 
                sx = sy = null; 
                drg = false; 
                this._onCellClick(r, c); 
            }
        });
    }
    
    _onCellClick(r, c) {
        if (this.isGameEnded) {
            this.showMessage('⛔ 游戏已结束，请重新开始');
            return;
        }
        if (this.mode !== 'game') { 
            this.selected = { r, c }; 
            this.syncEditorPanel(); 
            this.renderBoard(); 
            return; 
        }
        if (this.isProcessing || this.movesLeft <= 0) return;
        const p = this.board[r][c]; 
        if (p && !p.isSwappable()) { 
            this.showMessage('🔒 这个棋子被锁定了！'); 
            return; 
        }
        if (!this.selected) { 
            this.selected = { r, c }; 
            this.renderBoard(); 
            return; 
        }
        const { r: sr, c: sc } = this.selected; 
        if (sr === r && sc === c) { 
            this.selected = null; 
            this.renderBoard(); 
            return; 
        }
        if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) { 
            this.selected = { r, c }; 
            this.renderBoard(); 
            return; 
        }
        this.selected = null; 
        this._handleSwap(sr, sc, r, c);
    }
    
    // ==================== 交换与消除 ====================
    
    async _handleSwap(r1, c1, r2, c2) {
        if (this.isGameEnded) {
            this.showMessage('⛔ 游戏已结束，请重新开始');
            return;
        }
        
        // 保存状态用于撤销
        this.history.push({
            board: this.board.map(row => row.map(p => p ? p.clone() : null)),
            score: this.score,
            movesLeft: this.movesLeft,
            comboCount: this.comboCount,
            elimCounts: { ...this.elimCounts },
            timeLeft: this.timeLeft
        });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        let isFinished = await _handleSwap_bom(r1, c1, r2, c2);
        if (isFinished) return;
        
        this.isProcessing = true;
        const p1 = this.board[r1][c1], p2 = this.board[r2][c2];
        if (!p1 || !p1.isSwappable() || !p2 || !p2.isSwappable()) { 
            this.showMessage('🔒 有棋子被锁定，无法交换！'); 
            this.isProcessing = false; 
            return; 
        }
        const e1 = this.getCell(r1, c1), e2 = this.getCell(r2, c2);
        const dx = (c2 - c1) * this._cellPx, dy = (r2 - r1) * this._cellPx;
        if (e1 && e2) { 
            e1.style.transition = e2.style.transition = 'transform 0.25s ease'; 
            e1.style.transform = `translate(${dx}px,${dy}px)`; 
            e2.style.transform = `translate(${-dx}px,${-dy}px)`; 
            e1.style.zIndex = e2.style.zIndex = '2'; 
            await this._sleep(SWAP_ANIMATION_DURATION); 
        }
        [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];
        let matches = this.findMatches();
        if (!matches.size) {
            await this._sleep(60); 
            if (e1 && e2) { 
                e1.style.transform = e2.style.transform = 'translate(0,0)'; 
                await this._sleep(SWAP_ANIMATION_DURATION); 
            }
            [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]]; 
            this.renderBoard(); 
            await this._flashInvalidSwap(r1, c1, r2, c2);
            this.showMessage('不能消除哦，换一个试试～'); 
            this.isProcessing = false; 
            return;
        }
        this.movesLeft--; 
        this.comboCount = 0; 
        this._updateHUD(); 
        await this._processMatches(matches);
        if (!this.hasValidMove()) { 
            await this._sleep(200); 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
            this.renderBoard(); 
            this.showMessage('没有可消除的移动，重新洗牌啦！✨'); 
        }
        if (this._checkGoalsAfterMove()) return; 
        this.isProcessing = false;
    }

    async _handleSwap_bom(r1, c1, r2, c2) {
        
        
        this.isProcessing = true;
        const p1 = this.board[r1][c1], p2 = this.board[r2][c2];
        
        if (!p1 || !p2) {
            this.isProcessing = false;
            return;
        }
        
        // ========== 检测炸弹交换 ==========
        const isBomb1 = p1.hasState('bomb');
        const isBomb2 = p2.hasState('bomb');
        
        if (isBomb1 && isBomb2) {
            // 两个炸弹交换
            await this._handleBombSwap(r1, c1, r2, c2, p1, p2);
            this.isProcessing = false;
            return;
        }
        
        if (isBomb1 || isBomb2) {
            // 炸弹和普通棋子交换：触发炸弹效果
            const bombR = isBomb1 ? r1 : r2;
            const bombC = isBomb1 ? c1 : c2;
            const bombP = isBomb1 ? p1 : p2;
            const bombType = bombP.stateData.bomb?.type || 'A';
            
            // 触发炸弹爆炸
            const affected = this._getBombAffectedCells(
                bombR, bombC,
                bombType,
                bombP.stateData.bomb?.color || bombP.typeId,
                bombP.stateData.bomb?.direction || null
            );
            
            // 消除影响范围内的棋子
            for (const idx of affected) {
                const { r, c } = idxToRC(idx, this.cols);
                const target = this.board[r][c];
                if (target?.isRemovable()) {
                    this._countElim(target);
                    this.board[r][c] = null;
                }
            }
            
            // 清除炸弹本身
            this.board[bombR][bombC] = null;
            
            // 如果另一个不是炸弹，保留
            if (!isBomb1) {
                this.board[r1][c1] = p1;
            }
            if (!isBomb2) {
                this.board[r2][c2] = p2;
            }
            
            // 应用重力
            const cc = this.applyGravity();
            this.renderBoard(true, cc);
            await this._sleep(GRAVITY_ANIMATION_DURATION);
            this.showMessage(`💥 炸弹 ${bombType} 爆炸！`);
            
            // 如果是F炸弹，处理二次爆炸
            if (bombType === 'F') {
                await this._processFExplosion({
                    bombType: 'F',
                    bombColor: bombP.stateData.bomb?.color || bombP.typeId
                });
            }
            
            // 检查是否触发连锁
            const newMatches = this.findMatches();
            if (newMatches.size > 0) {
                await this._processMatches(newMatches);
            }
            
            this.isProcessing = false;
            return 'finished';
        }
        
        // ========== 普通交换逻辑 ==========
        // ... 原有交换代码
    }

    // ========== 炸弹交换处理方法 ==========


    async _handleBombSwap(r1, c1, r2, c2, p1, p2) {
        const bombType1 = p1.stateData.bomb?.type || 'A';
        const bombType2 = p2.stateData.bomb?.type || 'A';
        const color1 = p1.stateData.bomb?.color || p1.typeId;
        const color2 = p2.stateData.bomb?.color || p2.typeId;
        const dir1 = p1.stateData.bomb?.direction || null;
        const dir2 = p2.stateData.bomb?.direction || null;
        
        // 先清除两个炸弹
        this.board[r1][c1] = null;
        this.board[r2][c2] = null;
        
        let affected = new Set();
        
        // 根据炸弹组合触发不同效果
        if (bombType1 === 'A' && bombType2 === 'A') {
            // A+A：各自触发一次
            const aff1 = this._getBombAffectedCells(r1, c1, 'A', color1, dir1);
            const aff2 = this._getBombAffectedCells(r2, c2, 'A', color2, dir2);
            for (const idx of aff1) affected.add(idx);
            for (const idx of aff2) affected.add(idx);
            this.showMessage('💥 A+A 炸弹连锁爆炸！');
        } 
        else if ((bombType1 === 'A' && bombType2 === 'C') || (bombType1 === 'C' && bombType2 === 'A')) {
            // A+C：C变成A方向跟随
            const aType = bombType1 === 'A' ? bombType1 : bombType2;
            const cType = bombType1 === 'C' ? bombType1 : bombType2;
            const aR = bombType1 === 'A' ? r1 : r2;
            const aC = bombType1 === 'A' ? c1 : c2;
            const aDir = bombType1 === 'A' ? dir1 : dir2;
            const aColor = bombType1 === 'A' ? color1 : color2;
            
            // A爆炸
            const affA = this._getBombAffectedCells(aR, aC, 'A', aColor, aDir);
            for (const idx of affA) affected.add(idx);
            
            // C变成A（在原来C的位置生成A炸弹）
            const cR = bombType1 === 'C' ? r1 : r2;
            const cC = bombType1 === 'C' ? c1 : c2;
            const cColor = bombType1 === 'C' ? color1 : color2;
            
            // 生成新的A炸弹，方向随机
            const newDir = Math.random() > 0.5 ? 'horizontal' : 'vertical';
            const newBomb = this._createBombPiece('A', cColor, newDir);
            this.board[cR][cC] = newBomb;
            
            // 新炸弹立即爆炸
            const affNew = this._getBombAffectedCells(cR, cC, 'A', cColor, newDir);
            for (const idx of affNew) affected.add(idx);
            this.board[cR][cC] = null;
            
            this.showMessage('💥 A+C 炸弹交换！');
        }
        else if ((bombType1 === 'E' && bombType2 === 'E') || 
                (bombType1 === 'F' && bombType2 === 'E') ||
                (bombType1 === 'E' && bombType2 === 'F')) {
            // E+E 或 F+E：全屏消除一次
            const isF = bombType1 === 'F' || bombType2 === 'F';
            for (let i = 0; i < this.rows * this.cols; i++) {
                const { r, c } = idxToRC(i, this.cols);
                const p = this.board[r][c];
                if (p?.isRemovable()) {
                    this._countElim(p);
                    this.board[r][c] = null;
                }
            }
            this.showMessage('💥 全屏消除！');
            
            // 应用重力
            const cc = this.applyGravity();
            this.renderBoard(true, cc);
            await this._sleep(GRAVITY_ANIMATION_DURATION);
            
            // 如果有F，再消除一次F颜色
            if (isF) {
                const fColor = bombType1 === 'F' ? color1 : color2;
                await this._processFExplosion({
                    bombType: 'F',
                    bombColor: fColor
                });
            }
            return;
        }
        else if (bombType1 === 'E' && (bombType2 === 'A' || bombType2 === 'C' || bombType2 === 'D')) {
            // E + A/C/D：所有A/C/D颜色变成E
            await this._convertPiecesToType(color2, color2);
            // 然后触发一次该类型炸弹
            const aff = this._getBombAffectedCells(r2, c2, bombType2, color2, dir2);
            for (const idx of aff) affected.add(idx);
            this.showMessage(`💥 E+${bombType2} 炸弹交换！`);
        }
        else if ((bombType1 === 'A' || bombType1 === 'C' || bombType1 === 'D') && bombType2 === 'E') {
            // A/C/D + E
            await this._convertPiecesToType(color1, color1);
            const aff = this._getBombAffectedCells(r1, c1, bombType1, color1, dir1);
            for (const idx of aff) affected.add(idx);
            this.showMessage(`💥 ${bombType1}+E 炸弹交换！`);
        }
        else if (bombType1 === 'F' && (bombType2 === 'A' || bombType2 === 'C' || bombType2 === 'D')) {
            // F + A/C/D：所有A/C/D颜色变成F，并触发
            await this._convertPiecesToType(color2, color2);
            const aff = this._getBombAffectedCells(r2, c2, bombType2, color2, dir2);
            for (const idx of aff) affected.add(idx);
            this.showMessage(`💥 F+${bombType2} 炸弹交换！`);
        }
        else if ((bombType1 === 'A' || bombType1 === 'C' || bombType1 === 'D') && bombType2 === 'F') {
            await this._convertPiecesToType(color1, color1);
            const aff = this._getBombAffectedCells(r1, c1, bombType1, color1, dir1);
            for (const idx of aff) affected.add(idx);
            this.showMessage(`💥 ${bombType1}+F 炸弹交换！`);
        }
        else {
            // 其他炸弹组合：各自触发
            const aff1 = this._getBombAffectedCells(r1, c1, bombType1, color1, dir1);
            const aff2 = this._getBombAffectedCells(r2, c2, bombType2, color2, dir2);
            for (const idx of aff1) affected.add(idx);
            for (const idx of aff2) affected.add(idx);
            this.showMessage(`💥 ${bombType1}+${bombType2} 炸弹交换！`);
        }
        
        // 执行消除
        for (const idx of affected) {
            const { r, c } = idxToRC(idx, this.cols);
            const target = this.board[r][c];
            if (target?.isRemovable()) {
                this._countElim(target);
                this.board[r][c] = null;
            }
        }
        
        // 应用重力
        const cc = this.applyGravity();
        this.renderBoard(true, cc);
        await this._sleep(GRAVITY_ANIMATION_DURATION);
        
        // 检查连锁
        const newMatches = this.findMatches();
        if (newMatches.size > 0) {
            await this._processMatches(newMatches);
        }
    }

    // ========== 颜色转换辅助方法 ==========

    async _convertPiecesToType(sourceType, targetType) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const p = this.board[i][j];
                if (p?.typeId === sourceType && p.isRemovable()) {
                    // 创建新的棋子
                    const newPiece = this.createPiece(targetType);
                    // 保留位置
                    this.board[i][j] = newPiece;
                }
            }
        }
        // 刷新显示
        this.renderBoard();
        await this._sleep(200);
    }
    
    // 修改 _processMatches 方法中的消除逻辑

    async _processMatches(matches) {
        while (matches.size > 0) {
            this.comboCount++;
            const ma = Array.from(matches);
            
            // ========== 检测匹配形状 ==========
            const shapeInfo = this._detectMatchShape(ma);
            const bombType = shapeInfo?.bombType || null;
            const bombColor = shapeInfo?.color || null;
            const bombCenter = shapeInfo?.center || null;
            const bombDirection = shapeInfo?.direction || null;
            
            // 标记消除动画
            for (const idx of ma) {
                const { r, c } = idxToRC(idx, this.cols);
                this.getCell(r, c)?.classList.add('removed');
            }
            await this._sleep(REMOVE_ANIMATION_DURATION);
            
            // 先处理普通消除（计分、消除棋子）
            const pts = this.scoreSystem.calculate(ma.length, this.comboCount, {});
            this.score += pts;
            this._updateHUD();
            this.showMessage(`消除！+${pts}`);
            
            // 清除匹配的棋子
            for (const idx of ma) {
                const { r, c } = idxToRC(idx, this.cols);
                const p = this.board[r][c];
                if (p?.isRemovable()) {
                    this._countElim(p);
                    this.board[r][c] = null;
                }
            }
            this._damageWalls(ma);
            
            // ========== 生成炸弹 ==========
            if (bombType && bombCenter) {
                const { r, c } = bombCenter;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
                    // 检查该位置是否为空或可放置炸弹
                    const target = this.board[r][c];
                    if (!target || target.isRemovable()) {
                        const bombPiece = this._createBombPiece(bombType, bombColor, bombDirection);
                        this.board[r][c] = bombPiece;
                        // 标记生成动画
                        const cell = this.getCell(r, c);
                        if (cell) cell.classList.add('bomb-spawn');
                        await this._sleep(200);
                    }
                }
            }
            
            // 重力下落
            const cc = this.applyGravity();
            await this._sleep(60);
            this.renderBoard(true, cc);
            await this._sleep(GRAVITY_ANIMATION_DURATION);
            
            // 检测是否有炸弹需要爆炸（炸弹交换检测在交换时处理）
            // 这里检测是否触发了炸弹（即炸弹被消除）
            const bombMatches = this._findBombMatches();
            if (bombMatches.size > 0) {
                await this._processBombExplosions(bombMatches);
            }
            
            matches = this.findMatches();
        }
    }

    // ========== 形状检测方法 ==========

    _detectMatchShape(matches) {
        const idxArr = Array.from(matches);
        if (idxArr.length < 4) return null;
        
        // 获取所有匹配位置的坐标
        const positions = idxArr.map(idx => idxToRC(idx, this.cols));
        const rows = positions.map(p => p.r);
        const cols = positions.map(p => p.c);
        const minR = Math.min(...rows);
        const maxR = Math.max(...rows);
        const minC = Math.min(...cols);
        const maxC = Math.max(...cols);
        const width = maxC - minC + 1;
        const height = maxR - minR + 1;
        const count = idxArr.length;
        const color = this.board[positions[0].r]?.[positions[0].c]?.typeId || null;
        
        // 构建位置集合用于快速查找
        const posSet = new Set(idxArr);
        
        // ---- 检测大T型 (F炸弹) ----
        // 条件：横竖都≥5，且形状为T
        if (count >= 7) {
            // 检测水平方向和垂直方向
            const horizontal = this._getLinePositions(positions, 'horizontal');
            const vertical = this._getLinePositions(positions, 'vertical');
            
            // 大T：水平≥5 且 垂直≥5
            if (horizontal.length >= 5 && vertical.length >= 5) {
                // 计算中心（水平垂直相交处）
                const hSet = new Set(horizontal.map(p => rcToIdx(p.r, p.c, this.cols)));
                const vSet = new Set(vertical.map(p => rcToIdx(p.r, p.c, this.cols)));
                const intersect = horizontal.filter(p => vSet.has(rcToIdx(p.r, p.c, this.cols)));
                
                if (intersect.length > 0) {
                    const center = intersect[0];
                    // 检查是否确实是T型（而不是矩形）
                    const isT = this._isTShape(horizontal, vertical, center, positions);
                    if (isT) {
                        // 检查大T条件：水平方向至少5个，垂直方向至少5个
                        if (horizontal.length >= 5 && vertical.length >= 5) {
                            return {
                                bombType: 'F',
                                color: color,
                                center: center,
                                direction: null,
                                horizontal: horizontal,
                                vertical: vertical
                            };
                        }
                    }
                }
            }
        }
        
        // ---- 检测5连及以上 (E炸弹) ----
        if (count >= 5) {
            // 检查是否是纯直线
            const isLine = this._isLine(positions);
            if (isLine) {
                // 检查是否是大T（大T已经在上面的条件中处理）
                // E炸弹：5连及以上但不是大T
                return {
                    bombType: 'E',
                    color: color,
                    center: this._getCenterPosition(positions, this.cols),
                    direction: isLine === 'horizontal' ? 'horizontal' : 'vertical'
                };
            }
        }
        
        // ---- 检测T字 (D炸弹) ----
        if (count >= 5) {
            const tResult = this._detectTShape(positions);
            if (tResult) {
                return {
                    bombType: 'D',
                    color: color,
                    center: tResult.center,
                    direction: null
                };
            }
        }
        
        // ---- 检测田字 (C炸弹) ----
        if (count === 4) {
            const isSquare = this._isSquare(positions);
            if (isSquare) {
                const centerR = (minR + maxR) / 2;
                const centerC = (minC + maxC) / 2;
                // 找最近的棋子位置作为炸弹生成位置
                let centerPos = positions[0];
                let minDist = Infinity;
                for (const p of positions) {
                    const dist = Math.abs(p.r - centerR) + Math.abs(p.c - centerC);
                    if (dist < minDist) {
                        minDist = dist;
                        centerPos = p;
                    }
                }
                return {
                    bombType: 'C',
                    color: color,
                    center: centerPos,
                    direction: null
                };
            }
        }
        
        // ---- 检测4连 (A/B炸弹) ----
        if (count === 4) {
            const isLine = this._isLine(positions);
            if (isLine) {
                // 取中间两个位置的左边那个作为炸弹生成位置
                const sorted = [...positions].sort((a, b) => {
                    if (isLine === 'horizontal') return a.c - b.c;
                    return a.r - b.r;
                });
                const centerIdx = Math.floor(sorted.length / 2) - 1;
                const centerPos = sorted[Math.max(0, centerIdx)];
                return {
                    bombType: 'A', // A和B合并，统一用A
                    color: color,
                    center: centerPos,
                    direction: isLine
                };
            }
        }
        
        return null;
    }

    // ---- 辅助检测方法 ----

    _getLinePositions(positions, direction) {
        if (direction === 'horizontal') {
            // 按行分组，取最长行
            const groups = {};
            for (const p of positions) {
                if (!groups[p.r]) groups[p.r] = [];
                groups[p.r].push(p);
            }
            let longest = [];
            for (const key in groups) {
                const sorted = groups[key].sort((a, b) => a.c - b.c);
                // 检查是否连续
                const continuous = this._getContinuous(sorted, 'c');
                if (continuous.length > longest.length) {
                    longest = continuous;
                }
            }
            return longest;
        } else {
            // 按列分组，取最长列
            const groups = {};
            for (const p of positions) {
                if (!groups[p.c]) groups[p.c] = [];
                groups[p.c].push(p);
            }
            let longest = [];
            for (const key in groups) {
                const sorted = groups[key].sort((a, b) => a.r - b.r);
                const continuous = this._getContinuous(sorted, 'r');
                if (continuous.length > longest.length) {
                    longest = continuous;
                }
            }
            return longest;
        }
    }

    _getContinuous(arr, key) {
        if (arr.length === 0) return [];
        const result = [arr[0]];
        for (let i = 1; i < arr.length; i++) {
            if (arr[i][key] === arr[i-1][key] + 1) {
                result.push(arr[i]);
            } else {
                break;
            }
        }
        return result;
    }

    _isLine(positions) {
        const rows = positions.map(p => p.r);
        const cols = positions.map(p => p.c);
        const uniqueRows = new Set(rows);
        const uniqueCols = new Set(cols);
        
        if (uniqueRows.size === 1 && positions.length >= 3) return 'horizontal';
        if (uniqueCols.size === 1 && positions.length >= 3) return 'vertical';
        return null;
    }

    _isSquare(positions) {
        if (positions.length !== 4) return false;
        const rows = positions.map(p => p.r);
        const cols = positions.map(p => p.c);
        const uniqueRows = new Set(rows);
        const uniqueCols = new Set(cols);
        
        if (uniqueRows.size === 2 && uniqueCols.size === 2) {
            const rowVals = [...uniqueRows].sort();
            const colVals = [...uniqueCols].sort();
            if (rowVals[1] === rowVals[0] + 1 && colVals[1] === colVals[0] + 1) {
                return true;
            }
        }
        return false;
    }

    _detectTShape(positions) {
        // T字检测：3个在一行，2个在垂直方向（或反过来）
        const rows = positions.map(p => p.r);
        const cols = positions.map(p => p.c);
        const rowCount = {};
        const colCount = {};
        
        for (const p of positions) {
            rowCount[p.r] = (rowCount[p.r] || 0) + 1;
            colCount[p.c] = (colCount[p.c] || 0) + 1;
        }
        
        let horizontalRow = null;
        let verticalCol = null;
        
        // 找水平行（至少3个）
        for (const [r, cnt] of Object.entries(rowCount)) {
            if (cnt >= 3) {
                const rowPos = positions.filter(p => p.r === parseInt(r));
                // 检查是否连续
                const sorted = rowPos.sort((a, b) => a.c - b.c);
                const continuous = this._getContinuous(sorted, 'c');
                if (continuous.length >= 3) {
                    horizontalRow = continuous;
                    break;
                }
            }
        }
        
        // 找垂直列（至少3个）
        for (const [c, cnt] of Object.entries(colCount)) {
            if (cnt >= 3) {
                const colPos = positions.filter(p => p.c === parseInt(c));
                const sorted = colPos.sort((a, b) => a.r - b.r);
                const continuous = this._getContinuous(sorted, 'r');
                if (continuous.length >= 3) {
                    verticalCol = continuous;
                    break;
                }
            }
        }
        
        if (horizontalRow && verticalCol) {
            // 找交点
            const hSet = new Set(horizontalRow.map(p => rcToIdx(p.r, p.c, this.cols)));
            const vSet = new Set(verticalCol.map(p => rcToIdx(p.r, p.c, this.cols)));
            const intersect = horizontalRow.filter(p => vSet.has(rcToIdx(p.r, p.c, this.cols)));
            
            if (intersect.length > 0) {
                // 确认是T字（水平≥3，垂直≥3，且不是十字）
                if (horizontalRow.length >= 3 && verticalCol.length >= 3) {
                    // 检查是否是大T（大T已经在前面处理）
                    if (horizontalRow.length < 5 || verticalCol.length < 5) {
                        return {
                            center: intersect[0],
                            horizontal: horizontalRow,
                            vertical: verticalCol
                        };
                    }
                }
            }
        }
        return null;
    }

    _isTShape(horizontal, vertical, center, allPositions) {
        // 检查形状是否为T（相对于十字）
        const hSet = new Set(horizontal.map(p => rcToIdx(p.r, p.c, this.cols)));
        const vSet = new Set(vertical.map(p => rcToIdx(p.r, p.c, this.cols)));
        
        // T字的特征：水平方向有左右延伸，垂直方向有上下延伸
        // 但其中一个方向延伸较短（相对于另一个方向）
        const hLen = horizontal.length;
        const vLen = vertical.length;
        
        // 如果水平长度明显大于垂直长度，或者反之，就是T
        // 如果长度相近，可能是十字或矩形
        return Math.abs(hLen - vLen) >= 2;
    }

    _getCenterPosition(positions, cols) {
        const sorted = [...positions].sort((a, b) => {
            if (a.r !== b.r) return a.r - b.r;
            return a.c - b.c;
        });
        // 取中间位置（偶数长度取左边）
        const mid = Math.floor((sorted.length - 1) / 2);
        return sorted[mid];
    }

    // ========== 炸弹创建方法 ==========

    _createBombPiece(bombType, color, direction) {
        const piece = this.createPiece(color || 'apple');
        
        // 标记为炸弹
        piece.addState('bomb');
        piece.stateData.bomb = {
            type: bombType,
            direction: direction || null,
            color: color
        };
        
        // 设置炸弹图标
        if (bombType === 'E') {
            // E炸弹使用彩色图标
            piece.char = '🌈';
            piece.pieceColor = '#ff6b6b';
        } else if (bombType === 'F') {
            // F炸弹是小鸟
            piece.char = '🐦';
            piece.pieceColor = piece.pieceColor || '#ffffff';
        } else if (bombType === 'C') {
            piece.char = '✨';
        } else if (bombType === 'D') {
            piece.char = '⭐';
        } else {
            piece.char = '💥';
        }
        
        return piece;
    }

    // ========== 炸弹爆炸处理方法 ==========

    _findBombMatches() {
        const bombMatches = new Set();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.board[r][c];
                if (p?.hasState('bomb')) {
                    bombMatches.add(rcToIdx(r, c, this.cols));
                }
            }
        }
        return bombMatches;
    }

    async _processBombExplosions(bombIndices) {
        const explosions = [];
        
        for (const idx of bombIndices) {
            const { r, c } = idxToRC(idx, this.cols);
            const p = this.board[r][c];
            if (!p || !p.hasState('bomb')) continue;
            
            const bombType = p.stateData.bomb?.type || 'A';
            const bombColor = p.stateData.bomb?.color || p.typeId;
            const direction = p.stateData.bomb?.direction || null;
            
            // 获取爆炸影响的格子
            const affected = this._getBombAffectedCells(r, c, bombType, bombColor, direction);
            
            explosions.push({
                idx,
                r, c,
                bombType,
                bombColor,
                direction,
                affected
            });
        }
        
        // 执行爆炸（先清除所有炸弹）
        for (const exp of explosions) {
            for (const idx of exp.affected) {
                const { r, c } = idxToRC(idx, this.cols);
                const target = this.board[r][c];
                if (target?.isRemovable()) {
                    // 如果是炸弹，先记录
                    if (target.hasState('bomb')) {
                        // 炸弹会被触发
                    }
                    this._countElim(target);
                    this.board[r][c] = null;
                }
            }
            // 清除炸弹本身
            const { r, c } = idxToRC(exp.idx, this.cols);
            if (this.board[r][c]) {
                this.board[r][c] = null;
            }
        }
        
        // 应用重力
        const cc = this.applyGravity();
        this.renderBoard(true, cc);
        await this._sleep(GRAVITY_ANIMATION_DURATION);
        
        // 对于F炸弹的二次消除（如果触发了）
        for (const exp of explosions) {
            if (exp.bombType === 'F') {
                // 等待填充完成后，再消除一次F颜色和随机颜色
                await this._processFExplosion(exp);
            }
        }
    }

    _getBombAffectedCells(r, c, bombType, color, direction) {
        const affected = new Set();
        affected.add(rcToIdx(r, c, this.cols));
        
        switch (bombType) {
            case 'A':
            case 'B':
                // A/B炸弹：整行+整列
                for (let i = 0; i < this.cols; i++) {
                    affected.add(rcToIdx(r, i, this.cols));
                }
                for (let i = 0; i < this.rows; i++) {
                    affected.add(rcToIdx(i, c, this.cols));
                }
                break;
                
            case 'C':
                // C炸弹：十字半径1（不含斜角）
                for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        affected.add(rcToIdx(nr, nc, this.cols));
                    }
                }
                break;
                
            case 'D':
                // D炸弹：十字半径2（不含斜角）
                for (const [dr, dc] of [[-2,0],[-1,0],[1,0],[2,0],[0,-2],[0,-1],[0,1],[0,2]]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        affected.add(rcToIdx(nr, nc, this.cols));
                    }
                }
                break;
                
            case 'E':
                // E炸弹：全屏同色棋子
                for (let i = 0; i < this.rows; i++) {
                    for (let j = 0; j < this.cols; j++) {
                        const p = this.board[i][j];
                        if (p?.typeId === color) {
                            affected.add(rcToIdx(i, j, this.cols));
                        }
                    }
                }
                break;
                
            case 'F':
                // F炸弹：全屏同色 + 随机一种颜色（二次处理）
                for (let i = 0; i < this.rows; i++) {
                    for (let j = 0; j < this.cols; j++) {
                        const p = this.board[i][j];
                        if (p?.typeId === color) {
                            affected.add(rcToIdx(i, j, this.cols));
                        }
                    }
                }
                // 随机颜色在 _processFExplosion 中处理
                break;
        }
        
        return affected;
    }

    async _processFExplosion(exp) {
        // F炸弹二次爆炸：随机选一种颜色
        const allTypes = (this.config.pieceTypes || [])
            .filter(t => t.isPiece !== false && t.id !== exp.bombColor && t.id !== 'blank' && t.id !== 'empty');
        
        if (allTypes.length > 0) {
            const randomType = allTypes[Math.floor(Math.random() * allTypes.length)];
            const randomColor = randomType.id;
            
            // 消除所有随机颜色的棋子
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const p = this.board[i][j];
                    if (p?.typeId === randomColor && p.isRemovable()) {
                        this._countElim(p);
                        this.board[i][j] = null;
                    }
                }
            }
            
            // 再次应用重力
            const cc = this.applyGravity();
            this.renderBoard(true, cc);
            await this._sleep(GRAVITY_ANIMATION_DURATION);
            this.showMessage(`🐦 F炸弹二次爆炸！消除了 ${randomColor}`);
        }
    }
    
    _damageWalls(indices) {
        const sm = [
            { dr: -1, dc: 0, tgt: 'bottom' }, 
            { dr: 1, dc: 0, tgt: 'top' }, 
            { dr: 0, dc: -1, tgt: 'right' }, 
            { dr: 0, dc: 1, tgt: 'left' }
        ];
        for (const idx of indices) {
            const { r, c } = idxToRC(idx, this.cols);
            for (const { dr, dc, tgt } of sm) { 
                const nr = r + dr, nc = c + dc; 
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue; 
                const nb = this.board[nr][nc]; 
                if (!nb) continue; 
                const w = nb.walls?.[tgt]; 
                if (w?.enabled && w.hp > 0) nb.damageWall(tgt, 1); 
            }
        }
    }
    
    _countElim(p) { 
        if (!this.requiredPieceEnabled || !p || !this.requiredPieceType) return; 
        const cd = p.type?.value || p.typeId || ''; 
        if (cd === this.requiredPieceType) { 
            this.elimCounts[this.requiredPieceType] = (this.elimCounts[this.requiredPieceType] || 0) + 1; 
            if (this.mode === 'game') this._updateHUD(); 
        } 
    }
    
    // ==================== 提示 ====================
    
    findPlayableMove() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cu = this.board[r][c]; 
                if (!cu || !cu.isSwappable()) continue;
                for (const { r: tr, c: tc } of [{ r: r + 1, c }, { r, c: c + 1 }]) {
                    if (tr >= this.rows || tc >= this.cols) continue; 
                    const ot = this.board[tr][tc]; 
                    if (!ot || !ot.isSwappable()) continue;
                    [this.board[r][c], this.board[tr][tc]] = [this.board[tr][tc], this.board[r][c]];
                    if (this.findMatches().size > 0) { 
                        [this.board[r][c], this.board[tr][tc]] = [this.board[tr][tc], this.board[r][c]]; 
                        return { from: { r, c }, to: { r: tr, c: tc } }; 
                    }
                    [this.board[r][c], this.board[tr][tc]] = [this.board[tr][tc], this.board[r][c]];
                }
            }
        } 
        return null;
    }
    
    async showHint() {
        if (this.isProcessing) return; 
        const move = this.findPlayableMove();
        if (!move) { 
            this.board = this.createBoard(); 
            this.stabilizeBoard(); 
            this.renderBoard(); 
            this.showMessage('💡 当前盘面无有效组合，已重新洗牌！'); 
            return; 
        }
        this.lastHint = move; 
        this.renderBoard(); 
        this.showMessage(`💡 提示：尝试交换 (${move.from.r + 1},${move.from.c + 1}) 和 (${move.to.r + 1},${move.to.c + 1})`);
        clearTimeout(this.hintTimer); 
        this.hintTimer = setTimeout(() => { 
            this.lastHint = null; 
            this.renderBoard(); 
        }, HINT_DISPLAY_DURATION);
    }
    
    async _flashInvalidSwap(r1, c1, r2, c2) { 
        const cs = [this.getCell(r1, c1), this.getCell(r2, c2)].filter(Boolean); 
        cs.forEach(c => c.classList.add('invalid-swap')); 
        await this._sleep(260); 
        cs.forEach(c => c.classList.remove('invalid-swap')); 
    }
    
    // ==================== 游戏状态 ====================
    
    _scoreGoalMet() { 
        return this.targetScoreEnabled && this.targetScore > 0 && this.score >= this.targetScore; 
    }
    
    _elimGoalMet() { 
        return this.requiredPieceEnabled && this.requiredPieceType && this.requiredPieceCount > 0 && (this.elimCounts[this.requiredPieceType] || 0) >= this.requiredPieceCount; 
    }
    
    _elimGoalProgress() { 
        const d = this.requiredPieceEnabled && this.requiredPieceType ? (this.elimCounts[this.requiredPieceType] || 0) : 0; 
        return `${d}/${this.requiredPieceCount || 0}`; 
    }
    
    _checkGoalsAfterMove() {
        const sg = this._scoreGoalMet(), eg = this._elimGoalMet(); 
        this._updateHUD();
        if (this.movesLeft <= 0 && !sg && !eg) { 
            this.isProcessing = false; 
            setTimeout(() => this.finishRound(false, `🏆 步数耗尽！最终得分：${this.score}`), 400); 
            return true; 
        }
        if (sg || eg) {
            const parts = []; 
            if (sg) parts.push(`分数 ${this.score}/${this.targetScore}`); 
            if (eg) parts.push(`${this.requiredPieceType} 消除 ${this.elimCounts[this.requiredPieceType]}/${this.requiredPieceCount}`);
            this.isProcessing = false; 
            this.finishRound(true, `🎉 达成通关条件！(${parts.join('；')})`); 
            return true;
        }
        return false;
    }
    
    _updateHUD() {
        const se = $('score'), me = $('moves'), ce = $('combo'), te = $('target-score'), tle = $('time-left');
        if (se) se.textContent = this.score; 
        if (me) me.textContent = this.movesLeft; 
        if (ce) ce.textContent = this.comboCount;
        let tgt = this.targetScoreEnabled ? String(this.targetScore) : '—';
        if (this.requiredPieceEnabled && this.requiredPieceType && this.requiredPieceCount > 0) tgt += ` · ${this.requiredPieceType}×${this.requiredPieceCount}[${this._elimGoalProgress()}]`;
        if (te) te.textContent = tgt; 
        if (tle) {
            if (this.config?.enableTimeLimit && this.mode === 'game' && this.timeLeft > 0) {
                tle.textContent = this.timeLeft;
            } else {
                tle.textContent = '∞';
            }
        }
        if (me) me.parentElement?.classList.toggle('warning', this.movesLeft <= 5);
        if (tle) tle.parentElement?.classList.toggle('warning', this.config?.enableTimeLimit && this.timeLeft <= 10);
    }
    
    finishRound(won, msg) { 
        if (this.isGameEnded) return; 
        this.isGameEnded = true; 
        this.stopTimer(); 
        this.showMessage(msg); 
        setTimeout(() => alert(`${won ? '🎉 过关成功！' : '😵 关卡失败！'}\n\n${msg}`), 300); 
    }
    
    // ==================== 计时器 ====================
    
    startTimer() {
        this.stopTimer();
        if (this.mode !== 'game') { 
            this.timeLeft = this.config?.enableTimeLimit ? Number(this.config.timeLimitSeconds || 90) : 0; 
            this._updateHUD(); 
            return; 
        }
        if (!this.config?.enableTimeLimit) { 
            this.timeLeft = 0; 
            this._updateHUD(); 
            return; 
        }
        const sec = Number(this.config.timeLimitSeconds || 90); 
        if (!Number.isFinite(sec) || sec <= 0) { 
            this.timeLeft = 0; 
            this._updateHUD(); 
            return; 
        }
        this.timeLeft = sec;
        this.timerId = setInterval(() => {
            if (this.isGameEnded) return; 
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0; 
                this._updateHUD();
                const won = this._scoreGoalMet() || this._elimGoalMet(), goals = [];
                if (this._scoreGoalMet()) goals.push(`分数 ${this.score}/${this.targetScore}`);
                if (this._elimGoalMet()) goals.push(`${this.requiredPieceType} 消除 ${this.elimCounts[this.requiredPieceType]}/${this.requiredPieceCount}`);
                this.finishRound(won, won ? `🎉 时间到但已通关！(${goals.join('；')})` : `⏰ 时间到！最终得分：${this.score}，目标：${this.targetScore}，消除目标：${this._elimGoalProgress()}。`); 
                return; 
            } 
            this._updateHUD();
        }, 1000);
    }
    
    stopTimer() { 
        if (this.timerId) { 
            clearInterval(this.timerId); 
            this.timerId = null; 
        } 
    }
    
    // ==================== 模式切换 ====================
    
    setMode(mode) {
        const nm = mode === 'game' ? 'game' : 'admin'; 
        this.mode = nm;
        $('mode-admin-btn')?.classList.toggle('active', nm === 'admin');
        $('mode-game-btn')?.classList.toggle('active', nm === 'game');
        const lc = document.querySelector('#left-panel .rules-panel'), 
              ac = document.querySelector('#left-panel .admin-actions-panel'), 
              ep = $('editor-panel');
        if (lc) lc.style.display = nm === 'admin' ? '' : 'none';
        if (ac) ac.style.display = nm === 'admin' ? '' : 'none';
        if (ep) ep.style.display = nm === 'admin' ? '' : 'none';
        if (nm === 'game') { 
            this.selected = null; 
            this.renderBoard(); 
            this.showMessage('🎮 游戏模式已开启！'); 
            this.startTimer(); 
        } else { 
            this.selected = null; 
            this.stopTimer(); 
            this.renderBoard(); 
            this.syncEditorPanel(); 
            this.showMessage('🛠️ 管理员模式已开启。'); 
        }
    }
    
    // ==================== 初始化 ====================
    
    init() {
        this.stopTimer(); 
        const cb = this.config?.initialBoard ? this._parseInitialBoardValue(this.config.initialBoard) : null;
        this.board = cb?.length > 0 ? cb : this.createBoard(); 
        if (!cb) { 
            this.stabilizeBoard(); 
            this.ensurePlayableBoard(); 
        }
        this.score = 0; 
        this.movesLeft = this.config.totalMoves || 30; 
        this.comboCount = 0; 
        this.selected = null; 
        this.isProcessing = false;
        this.lastHint = null; 
        this.isGameEnded = false; 
        this.elimCounts = {};
        this.requiredPieceEnabled = this.config?.requiredPieceEnabled === true;
        this.requiredPieceType = getPieceTypeCodeById(this.config?.requiredPieceType, this.config?.pieceTypes) || this.config?.requiredPieceType || null;
        this.requiredPieceCount = Number.isFinite(Number(this.config?.requiredPieceCount)) ? Math.max(0, Number(this.config?.requiredPieceCount)) : 10;
        this.targetScoreEnabled = this.config?.targetScoreEnabled !== false;
        this.targetScore = this.targetScoreEnabled ? Math.max(0, Number(this.config?.targetScore || 50000)) : 0;
        const movesEl = $('moves');
        if (movesEl) movesEl.parentElement?.classList.remove('warning'); 
        this._updateHUD(); 
        this.renderBoard();
        this.showMessage('点击或拖动相邻糖果交换位置！'); 
        if (this.mode === 'game') this.startTimer();
    }
    
    _parseInitialBoardValue(value) {
        if (!value) return null;
        const rr = Array.isArray(value) 
            ? value 
            : String(value).split(/\n|;/).map(r => r.trim()).filter(Boolean);
        if (!rr.length) return null;
        const rows = rr.map(row => 
            Array.isArray(row) 
                ? row.map(c => c && typeof c === 'object' ? c : String(c ?? '').trim())
                : String(row).split(',').map(c => c.trim()).filter(Boolean)
        ).filter(r => r.length > 0);
        if (!rows.length) return null;
        const norm = rows.map(r => r.slice(0, this.cols)); 
        while (norm.length < this.rows) norm.push([]);
        return Array.from({ length: this.rows }, (_, r) => { 
            const row = norm[r] || []; 
            return Array.from({ length: this.cols }, (_, c) => { 
                const tk = row[c]; 
                if (!tk || !tk.typeId || tk.isPiece === false) return null; 
                return this._buildPieceFromToken(tk); 
            }); 
        });
    }
    
    _buildPieceFromToken(token) {
        if (token && typeof token === 'object' && !Array.isArray(token)) {
            const p = this.createPiece(token.typeId || token.id);
            if (!p || p.typeId === 'unknown' || p.isPiece === false) return null;
            p.color = token.color || p.color; 
            p.backgroundColor = token.backgroundColor || token.background || p.backgroundColor;
            p.pattern = token.pattern || p.pattern; 
            p.patternColor = token.patternColor || p.patternColor;
            p.pieceColor = token.pieceColor || p.pieceColor; 
            p.char = token.char || p.char;
            p.borderColor = token.borderColor || p.borderColor; 
            p.borderWidth = Number(token.borderWidth || p.borderWidth);
            p.type.value = token.type?.value || token.code || p.type.value; 
            p.type.priority = Number(token.type?.priority ?? p.type.priority);
            p.background.priority = Number(token.background?.priority ?? p.background.priority);
            p.ices.level = Number(token.ices?.level ?? token.stateData?.iceLayers ?? p.ices.level); 
            p.ices.priority = Number(token.ices?.priority ?? p.ices.priority);
            p.frozen.value = Number(token.frozen?.value ?? p.frozen.value); 
            p.frozen.priority = Number(token.frozen?.priority ?? p.frozen.priority);
            p.walls = p._normWalls(token.walls || {}); 
            p.walls.priority = Number(token.walls?.priority ?? p.walls.priority);
            p.pieceUI = token.pieceUI && typeof token.pieceUI === 'object' ? token.pieceUI : p.pieceUI;
            p.states = new Set(Array.isArray(token.states) ? token.states : []);
            p.stateData = token.stateData && typeof token.stateData === 'object' ? { ...token.stateData } : {};
            if (p.states.has('frozen') && p.frozen.value === 0) p.frozen.value = 1;
            if (token.stateData?.iceLayers !== undefined && p.ices.level === 0) p.ices.level = Number(token.stateData.iceLayers) || 0;
            return p;
        }
        return null;
    }
    
    // ==================== UI ====================
    
    showMessage(msg) { 
        const el = $('message'); 
        if (!el) return;
        el.textContent = msg; 
        el.classList.add('show'); 
        clearTimeout(el._t); 
        el._t = setTimeout(() => el.classList.remove('show'), MESSAGE_DISPLAY_DURATION); 
    }
    
    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    
    // ==================== 面板同步 ====================
    
    refreshSelectorUI() {
        const adminPanel = new AdminPanel(this);
        adminPanel.refreshUI();
    }
    
    syncEditorPanel() {
        // 管理员面板会处理编辑器同步
        const adminPanel = new AdminPanel(this);
        adminPanel.syncEditor();
    }
    
    // ==================== 事件绑定 ====================
    
    _bindEvents() {
        // 按钮事件
        $('restart-btn')?.addEventListener('click', () => this.init());
        $('hint-btn')?.addEventListener('click', () => this.showHint());
        $('docs-btn')?.addEventListener('click', () => window.location.href = 'docs/index.html');
        
        // 模式切换
        $('mode-admin-btn')?.addEventListener('click', () => this.setMode('admin'));
        $('mode-game-btn')?.addEventListener('click', () => this.setMode('game'));
        
        // 初始化管理面板和设置面板
        const adminPanel = new AdminPanel(this);
        adminPanel.bindEvents();
        
        const settingsPanel = new SettingsPanel(this);
        settingsPanel.bindEvents();
    }
}

// ==================== ExplosionHandler ====================

class ExplosionHandler {
    constructor(cfg) { 
        this.parsedRules = {}; 
        for (const [k, rule] of Object.entries(cfg.explodeRules || {})) { 
            const [typ, radi] = rule.split(':'); 
            this.parsedRules[parseInt(k)] = { type: typ, radius: radi ? parseInt(radi) : 1 }; 
        } 
    }
    
    getExplosionCells(matches, board, rows, cols) {
        const rule = this.parsedRules[matches.size]; 
        if (!rule) return new Set();
        const result = new Set(), arr = Array.from(matches), { r, c } = this._center(arr, cols);
        switch (rule.type) {
            case 'cross': 
                for (let i = -2; i <= 2; i++) { 
                    if (r + i >= 0 && r + i < rows) result.add(rcToIdx(r + i, c, cols)); 
                    if (c + i >= 0 && c + i < cols) result.add(rcToIdx(r, c + i, cols)); 
                } 
                break;
            case 'screen': 
                for (let i = 0; i < rows * cols; i++) result.add(i); 
                break;
            case 'blast': { 
                const rad = rule.radius || 1; 
                for (let dr = -rad; dr <= rad; dr++) {
                    for (let dc = -rad; dc <= rad; dc++) { 
                        const nr = r + dr, nc = c + dc; 
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.add(rcToIdx(nr, nc, cols)); 
                    }
                } 
                break; 
            }
        }
        return result;
    }
    
    _center(indices, cols) { 
        let sr = 0, sc = 0; 
        for (const idx of indices) { 
            sr += Math.floor(idx / cols); 
            sc += idx % cols; 
        } 
        return { r: Math.round(sr / indices.length), c: Math.round(sc / indices.length) }; 
    }
}

// 文件末尾：
window.GameEngine = GameEngine;
window.ExplosionHandler = ExplosionHandler;