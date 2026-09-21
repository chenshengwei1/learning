// ==================== RenderSystem 渲染系统 ====================

class RenderSystem {
    constructor(game) {
        this.game = game;
        this.boardEl = null;
        this.cellCache = new Map();
        this.layerCache = {
            board: null,
            target: null,
            obstacle: null,
            piece: null
        };
    }
    
    init(boardEl) {
        this.boardEl = boardEl;
        this._applyBoardLayout();
    }
    
    _applyBoardLayout() {
        if (!this.boardEl) return;
        const { rows, cols, cellSize, gap } = this.game.config;
        const width = cols * cellSize + (cols - 1) * gap;
        const height = rows * cellSize + (rows - 1) * gap;
        
        this.boardEl.style.cssText = `
            position: relative;
            width: ${width}px;
            height: ${height}px;
            --cell-size: ${cellSize}px;
            --gap: ${gap}px;
        `;
    }
    
    // ===== 全量渲染 =====
    renderAll() {
        if (!this.boardEl) return;
        this.boardEl.innerHTML = '';
        this.cellCache.clear();
        
        // 确保棋盘容器是 relative
        this.boardEl.style.position = 'relative';
        
        this._renderLayout();
        this._renderLayer('target');      // 替代 _renderTargets
        this._renderLayer('obstacle');    // 替代 _renderObstacles
        this._renderPieces();
        this._renderLayer('overlay');     // ← 新增
    }
    
    _getPos(r, c) {
        const { cellSize, gap } = this.game.config;
        return {
            left: c * (cellSize + gap),
            top: r * (cellSize + gap)
        };
    }
    
    // ===== Layer 0: 底板 =====
    _renderLayout() {
        const { cellSize } = this.game.config;
        const board = this.game.board;
        
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.layout[r][c] !== 1) continue;
                
                const el = document.createElement('div');
                el.className = 'board-cell';
                const pos = this._getPos(r, c);
                el.style.cssText = `
                    position: absolute;
                    left: ${pos.left}px;
                    top: ${pos.top}px;
                    width: ${cellSize}px;
                    height: ${cellSize}px;
                    z-index: ${RENDER_LAYERS.BOARD};
                `;
                this.boardEl.appendChild(el);
            }
        }
    }
    
    // ===== Layer 1: 目标物 =====
    _renderTargets() {
        const { cellSize, gap } = this.game.config;
        const board = this.game.board;
        
        for (const target of board.targets) {
            const el = document.createElement('div');
            el.className = 'target-layer';
            el.dataset.targetId = target.id;
            el.dataset.r = target.r;
            el.dataset.c = target.c;
            el.dataset.w = target.w;   // ← 新增
            el.dataset.h = target.h;   // ← 新增
            
            const pos = this._getPos(target.r, target.c);
            const w = target.w * cellSize + (target.w - 1) * gap;
            const h = target.h * cellSize + (target.h - 1) * gap;
            
            el.style.cssText = `
                position: absolute;
                left: ${pos.left}px;
                top: ${pos.top}px;
                width: ${w}px;
                height: ${h}px;
                z-index: ${RENDER_LAYERS.TARGET};
                pointer-events: none;
            `;
            
            this._paintTarget(el, target);
            this.boardEl.appendChild(el);
        }
    }
    
    // ===== Layer 2: 障碍物 =====
    _renderObstacles() {
        const { cellSize } = this.game.config;
        const board = this.game.board;
        
        for (const obs of board.obstacles) {
            const pos = this._getPos(obs.r, obs.c);
            const el = document.createElement('div');
            el.className = `obstacle-layer obstacle-${obs.element}`;
            el.dataset.obstacleId = obs.id;
            el.dataset.r = obs.r;
            el.dataset.c = obs.c;
            
            el.style.cssText = `
                position: absolute;
                left: ${pos.left}px;
                top: ${pos.top}px;
                width: ${cellSize}px;
                height: ${cellSize}px;
                z-index: ${RENDER_LAYERS.OBSTACLE};
                pointer-events: none;
            `;
            
            this._paintObstacle(el, obs);
            this.boardEl.appendChild(el);
        }
    }

    // ==================== 视觉解析器（通用）====================

    /**
     * 根据元素配置和实体数据，解析出应该使用的 SVG
     * @param {Object} elementDef - 元素配置
     * @param {Object} entity - 实体（obstacle / target / piece）
     * @returns {string|null}
     */
    _resolveVisual(elementDef, entity) {
        if (!elementDef) return null;
        
        // 如果元素有 visualResolver，按规则解析
        if (elementDef.visualResolver) {
            const { by, map } = elementDef.visualResolver;
            if (by && map) {
                const key = String(entity[by]);
                if (map[key]) return map[key];
            }
        }
        
        // 兜底：元素自身的 svg
        return elementDef.svg || null;
    }

    // ==================== 障碍物绘制 ====================

    /**
     * 绘制障碍物内容到 DOM
     */
    _paintObstacle(el, obs) {
        el.innerHTML = '';
        
        const elementDef = this.game.registries.elements.get(obs.element);
        const svg = this._resolveVisual(elementDef, obs);
        
        if (svg) {
            const img = document.createElement('img');
            img.src = SVGLibrary.resolve(svg) || svg;
            img.style.cssText = 'width:100%;height:100%;object-fit:fill;';
            el.appendChild(img);
        }
    }

    /**
     * 重绘某格障碍物（增量）
     */
    renderObstacleAt(r, c) {
        this.renderLayerAt('obstacle', r, c);
    }

    /**
     * 追加单个障碍物 DOM
     */
    _appendObstacle(obs) {
        const { cellSize } = this.game.config;
        const pos = this._getPos(obs.r, obs.c);
        
        const el = document.createElement('div');
        el.className = `obstacle-layer obstacle-${obs.element}`;
        el.dataset.obstacleId = obs.id;
        el.dataset.r = obs.r;
        el.dataset.c = obs.c;
        
        el.style.cssText = `
            position: absolute;
            left: ${pos.left}px;
            top: ${pos.top}px;
            width: ${cellSize}px;
            height: ${cellSize}px;
            z-index: ${RENDER_LAYERS.OBSTACLE};
            pointer-events: none;
        `;
        
        this._paintObstacle(el, obs);
        this.boardEl.appendChild(el);
    }

    // ==================== 目标物绘制 ====================

    /**
     * 绘制目标物内容到 DOM
     */
    _paintTarget(el, target) {
        el.innerHTML = '';
        
        const elementDef = this.game.registries.elements.get(target.element);
        const svg = this._resolveVisual(elementDef, target);
        
        if (svg) {
            const img = document.createElement('img');
            img.src = SVGLibrary.resolve(svg) || svg;
            img.style.cssText = 'width:100%;height:100%;object-fit:fill;';
            el.appendChild(img);
        } else if (target.char) {
            el.textContent = target.char;
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = `${this.game.config.cellSize * 0.8}px`;
        }
    }

    /**
     * 重绘某格目标物（增量）
     */
    renderTargetAt(r, c) {
        this.renderLayerAt('target', r, c);
    }
    
    // ===== Layer 3: 棋子 =====
    _renderPieces() {
        const board = this.game.board;
        const fragment = document.createDocumentFragment();
        
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.layout[r][c] !== 1) continue;
                
                const cell = this._createCellElement(r, c);
                this.cellCache.set(posToKey(r, c), cell);
                fragment.appendChild(cell);
            }
        }
        
        this.boardEl.appendChild(fragment);
    }
    
    _renderPiece(cell, piece, r, c) {
        // 清除临时动画类
        cell.classList.remove('removed', 'exploding', 'bomb-spawn', 'hint-cell', 'invalid-swap');
        
        // 清除特效类（防止残留）
        cell.className = cell.className.replace(/\beffect-[\w-]+\b/g, '').trim();
        
        cell.innerHTML = '';
        const { cellSize } = this.game.config;
        
        if (!piece) return;
        
        const effect = piece.effect;
        
        // ===== 特殊：rainbow-plus → 固定彩色彩虹鸟 =====
        // if (effect === 'rainbow-plus') {
        //     const rainbowEl = document.createElement('img');
        //     rainbowEl.className = 'piece-svg rainbow-bird';
        //     rainbowEl.src = SVGLibrary.resolve('@rainbow-bird');
        //     rainbowEl.style.cssText = `
        //         position: absolute;
        //         inset: 6%;
        //         width: 88%;
        //         height: 88%;
        //         object-fit: contain;
        //         pointer-events: none;
        //         z-index: 1;
        //     `;
        //     cell.appendChild(rainbowEl);
        //     cell.classList.add('effect-rainbow-plus');
        //     return;
        // }
        
        // ===== 其他情况：保留棋子图标 =====
        const elementDef = piece.element 
            ? this.game.registries.elements.get(piece.element)
            : null;
        
        const svg = piece.visual.svg || elementDef?.svg;
        
        if (svg) {
            const img = document.createElement('img');
            img.src = SVGLibrary.resolve(svg) || svg;
            img.className = 'piece-svg';
            img.style.cssText = `
                position: absolute;
                inset: 8%;
                width: 84%;
                height: 84%;
                object-fit: contain;
                pointer-events: none;
                z-index: 1;
                filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
            `;
            cell.appendChild(img);
        } else {
            const main = document.createElement('div');
            main.className = 'piece-main';
            main.textContent = piece.visual.char || '';
            main.style.color = piece.visual.pieceColor || '#fff';
            main.style.fontSize = `${cellSize * 0.55}px`;
            main.style.zIndex = '1';
            cell.appendChild(main);
        }
        
        // ===== 特效：保留棋子 + 加动画类 =====
        if (effect) {
            cell.classList.add(`effect-${effect}`);
        }
        
        // 状态
        if (piece.hasAttr('locked')) {
            const lock = document.createElement('div');
            lock.className = 'piece-locked';
            lock.textContent = '🔒';
            lock.style.zIndex = '3';
            cell.appendChild(lock);
        }
        if (piece.hasAttr('frozen')) {
            const frozen = document.createElement('div');
            frozen.className = 'piece-frozen';
            frozen.style.zIndex = '3';
            cell.appendChild(frozen);
        }
    }
    
    // ===== 增量渲染 =====
    renderPartial(changedKeys) {
        if (!this.boardEl || !changedKeys || changedKeys.size === 0) return;
        
        const board = this.game.board;
        
        for (const key of changedKeys) {
            const { r, c } = keyToPos(key);
            if (!board.isInBounds(r, c)) continue;
            if (board.layout[r][c] !== 1) continue;
            
            const cell = this.cellCache.get(key);
            if (!cell) {
                // 没有旧 DOM，跳过（全量渲染时应该已创建）
                console.warn(`renderPartial: ${key} 没有缓存的 DOM`);
                continue;
            }
            
            // 只更新内容，不重建 DOM
            this._updateCellContent(cell, r, c);
        }
    }

    /**
     * 创建一个格子的 DOM（可复用）
     */
    _createCellElement(r, c) {
        const { cellSize } = this.game.config;
        const board = this.game.board;
        
        const pos = this._getPos(r, c);
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.style.cssText = `
            position: absolute;
            left: ${pos.left}px;
            top: ${pos.top}px;
            width: ${cellSize}px;
            height: ${cellSize}px;
            z-index: ${RENDER_LAYERS.PIECE};
        `;
        
        const piece = board.get(r, c);
        if (piece) this._renderPiece(cell, piece, r, c);
        
        // ← 修改：支持多选高亮
        const key = posToKey(r, c);
        if (this.game.mode === 'admin') {
            if (this.game.selectedCells?.has(key)) {
                cell.classList.add('selected-multi');
            }
        } else {
            if (this.game.selected?.r === r && this.game.selected?.c === c) {
                cell.classList.add('selected');
            }
        }
        
        this.game.inputSystem.bindCell(cell, r, c);
        
        return cell;
    }

    _updateCellContent(cell, r, c) {
        // 兜底重置
        cell.style.zIndex = String(RENDER_LAYERS.PIECE);
        cell.style.transform = '';
        cell.style.transition = '';
        cell.style.opacity = '';
        
        // 只更新内容
        const piece = this.game.board.get(r, c);
        this._renderPiece(cell, piece, r, c);
        
        // ← 修改：支持单选和多选高亮
        const key = posToKey(r, c);
        cell.classList.remove('selected', 'selected-multi');
        
        if (this.game.mode === 'admin') {
            // 管理员模式：多选高亮
            if (this.game.selectedCells?.has(key)) {
                cell.classList.add('selected-multi');
            }
        } else {
            // 游戏模式：单选高亮
            if (this.game.selected?.r === r && this.game.selected?.c === c) {
                cell.classList.add('selected');
            }
        }
    }
    
    // ===== 动画 =====
    async animateSwap(r1, c1, r2, c2) {
        const c1El = this.cellCache.get(posToKey(r1, c1));
        const c2El = this.cellCache.get(posToKey(r2, c2));
        if (!c1El || !c2El) return;
        
        const dx = (c2 - c1) * (this.game.config.cellSize + this.game.config.gap);
        const dy = (r2 - r1) * (this.game.config.cellSize + this.game.config.gap);
        
        c1El.style.transition = c2El.style.transition = 'transform 0.25s ease';
        c1El.style.transform = `translate(${dx}px, ${dy}px)`;
        c2El.style.transform = `translate(${-dx}px, ${-dy}px)`;
        c1El.style.zIndex = c2El.style.zIndex = '10';
        
        await sleep(ANIMATION.SWAP);
        
        // ← 新增：动画结束后恢复
        c1El.style.transition = c2El.style.transition = '';
        c1El.style.transform = c2El.style.transform = '';
        c1El.style.zIndex = c2El.style.zIndex = String(RENDER_LAYERS.PIECE);
    }
    
    async animateRemove(keys) {
        for (const key of keys) {
            const cell = this.cellCache.get(key);
            if (cell) cell.classList.add('removed');
        }
        await sleep(ANIMATION.REMOVE);
    }
    
    async animateExplode(keys) {
        for (const key of keys) {
            const cell = this.cellCache.get(key);
            if (cell) cell.classList.add('exploding');
        }
        await sleep(ANIMATION.EXPLODE);
    }
    
    async animateGravityDrop(drops, options = {}) {
        if (!drops || drops.length === 0) return;
        
        const { cellSize, gap } = this.game.config;
        const unit = cellSize + gap;
        const speed = options.speed ?? this.game.config.gravitySpeed ?? 1.0;
        const baseDuration = options.baseDuration ?? ANIMATION.GRAVITY_BASE;
        const duration = Math.round(baseDuration / speed);
        
        const animated = [];
        
        for (const drop of drops) {
            const cellEl = this.cellCache.get(posToKey(drop.to.r, drop.to.c));
            if (!cellEl) continue;
            
            const rowDelta = drop.from.r - drop.to.r;
            const startOffset = rowDelta * unit;
            
            cellEl.style.transition = 'none';
            cellEl.style.transform = `translateY(${startOffset}px)`;
            cellEl.style.opacity = drop.isNew ? '0' : '1';
            
            animated.push({ el: cellEl, startOffset });
        }
        
        // 强制重排
        void this.boardEl.offsetHeight;
        
        for (const item of animated) {
            const easing = options.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            item.el.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ease`;
            item.el.style.transform = 'translateY(0)';
            item.el.style.opacity = '1';
        }
        
        await sleep(duration + 30);
        
        for (const item of animated) {
            item.el.style.transition = '';
            item.el.style.transform = '';
            item.el.style.opacity = '';
            item.el.style.zIndex = String(RENDER_LAYERS.PIECE);   // ← 新增
        }
    }
    
    async animateFall() {
        await sleep(ANIMATION.GRAVITY_BASE);
    }
    
    getCell(r, c) {
        return this.cellCache.get(posToKey(r, c)) || null;
    }

    _getCellsBounds(cells) {
        let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        for (const { r, c } of cells) {
            minR = Math.min(minR, r); maxR = Math.max(maxR, r);
            minC = Math.min(minC, c); maxC = Math.max(maxC, c);
        }
        return { minR, maxR, minC, maxC };
    }

    _renderLayer(category) {
        const arr = this.game.board._getLayerArray(category);
        if (!arr) return;
        const layer = CATEGORY_LAYERS[category] ?? RENDER_LAYERS.OBSTACLE;
        const { cellSize, gap } = this.game.config;
        
        for (const entity of arr) {
            const el = document.createElement('div');
            el.className = `${category}-layer ${category}-${entity.element}`;
            el.dataset.id = entity.id;
            el.dataset.r = entity.cells[0].r;
            el.dataset.c = entity.cells[0].c;

            // ← 新增：兼容 page-checker 的 target 查询
            if (category === 'target') {
                el.dataset.targetId = entity.id;
            }
            // ← 可选：兼容旧障碍物查询
            if (category === 'obstacle') {
                el.dataset.obstacleId = entity.id;
            }
            
            const bounds = this._getCellsBounds(entity.cells);
            const pos = this._getPos(bounds.minR, bounds.minC);
            const w = (bounds.maxC - bounds.minC + 1) * cellSize + (bounds.maxC - bounds.minC) * gap;
            const h = (bounds.maxR - bounds.minR + 1) * cellSize + (bounds.maxR - bounds.minR) * gap;
            
            el.style.cssText = `
                position: absolute;
                left: ${pos.left}px;
                top: ${pos.top}px;
                width: ${w}px;
                height: ${h}px;
                z-index: ${layer};
                pointer-events: none;
            `;
            
            this._paintEntity(el, entity);
            this.boardEl.appendChild(el);
        }
    }

    _paintEntity(el, entity) {
        el.innerHTML = '';
        const elementDef = this.game.registries.elements.get(entity.element);
        const svg = this._resolveVisual(elementDef, entity);
        if (svg) {
            const img = document.createElement('img');
            img.src = SVGLibrary.resolve(svg) || svg;
            img.style.cssText = 'width:100%;height:100%;object-fit:fill;';
            el.appendChild(img);
        }
    }

    renderLayerAt(category, r, c) {
        const arr = this.game.board._getLayerArray(category);
        if (!arr) return;
        
        const entity = this.game.board.getAt(category, r, c);
        
        // 按 id 找该实体对应的 DOM（跨格时 data-r/c 只存第一个 cell，不能精确匹配）
        let oldEl = null;
        if (entity) {
            oldEl = this.boardEl.querySelector(`.${category}-layer[data-id="${entity.id}"]`);
        }
        
        if (!entity) {
            // 该格没实体：遍历该层 DOM，删掉"覆盖 (r,c) 但数据里已不存在"的
            // 简化：全量重绘该层
            this._removeLayerEls(category);
            this._renderLayer(category);
            return;
        }
        
        if (!oldEl) {
            // DOM 里没有该实体 → 全量重绘该层（简单可靠）
            this._removeLayerEls(category);
            this._renderLayer(category);
            return;
        }
        
        // 更新内容
        oldEl.className = `${category}-layer ${category}-${entity.element}`;
        oldEl.dataset.id = entity.id;
        oldEl.dataset.id = entity.id;
        if (category === 'target') oldEl.dataset.targetId = entity.id;
        if (category === 'obstacle') oldEl.dataset.obstacleId = entity.id;
        this._paintEntity(oldEl, entity);
    }

    _removeLayerEls(category) {
        const els = this.boardEl.querySelectorAll(`.${category}-layer`);
        els.forEach(el => el.remove());
    }
}

window.RenderSystem = RenderSystem;