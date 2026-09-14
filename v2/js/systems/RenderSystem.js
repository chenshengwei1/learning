// ==================== RenderSystem 渲染系统 ====================

class RenderSystem {
    constructor(game) {
        this.game = game;
        this.boardEl = null;
        this.cellCache = new Map();
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
            width: ${width}px;
            height: ${height}px;
            display: grid;
            gap: ${gap}px;
            grid-template-columns: repeat(${cols}, ${cellSize}px);
            grid-template-rows: repeat(${rows}, ${cellSize}px);
            --cell-size: ${cellSize}px;
        `;
    }
    
    renderAll() {
        if (!this.boardEl) return;
        this.boardEl.innerHTML = '';
        this.cellCache.clear();
        
        const fragment = document.createDocumentFragment();
        for (let r = 0; r < this.game.board.rows; r++) {
            for (let c = 0; c < this.game.board.cols; c++) {
                fragment.appendChild(this._createCell(r, c));
            }
        }
        this.boardEl.appendChild(fragment);
    }
    
    renderPartial(changedKeys) {
        if (!this.boardEl) return;
        for (const key of changedKeys) {
            const { r, c } = keyToPos(key);
            const oldCell = this.cellCache.get(key);
            const newCell = this._createCell(r, c);
            if (oldCell && oldCell.parentNode) {
                oldCell.parentNode.replaceChild(newCell, oldCell);
            } else {
                this.boardEl.appendChild(newCell);
            }
        }
    }
    
    _createCell(r, c) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        
        const piece = this.game.board.get(r, c);
        if (piece) {
            this._renderPiece(cell, piece, r, c);
        }
        
        // 选中高亮
        if (this.game.selected?.r === r && this.game.selected?.c === c) {
            cell.classList.add('selected');
        }
        
        // 绑定事件
        this.game.inputSystem.bindCell(cell, r, c);
        
        this.cellCache.set(posToKey(r, c), cell);
        return cell;
    }
    
    _renderPiece(cell, piece, r, c) {
        cell.innerHTML = '';
        cell.style.position = 'relative';
        
        // Layer 1: 背景
        const bg = document.createElement('div');
        bg.className = 'piece-bg';
        bg.style.background = piece.visual.color;
        bg.style.opacity = '0.35';
        bg.style.zIndex = String(RENDER_LAYERS.BG);
        cell.appendChild(bg);
        
        // Layer 2: 图案
        const pat = document.createElement('div');
        pat.className = 'piece-pattern';
        pat.style.background = this._buildPattern(piece.visual.pattern, piece.visual.patternColor);
        pat.style.zIndex = String(RENDER_LAYERS.PATTERN);
        cell.appendChild(pat);
        
        // Layer 3: 主体
        const main = document.createElement('div');
        main.className = 'piece-main';
        main.textContent = piece.effect 
            ? (this._getEffectIcon(piece.effect) || piece.visual.char)
            : piece.visual.char;
        main.style.color = piece.visual.pieceColor || '#fff';
        main.style.fontSize = `${this.game.config.cellSize * 0.55}px`;
        main.style.zIndex = String(RENDER_LAYERS.MAIN);
        cell.appendChild(main);
        
        // Layer 4: 边框
        const brd = document.createElement('div');
        brd.className = 'piece-border';
        brd.style.border = `${piece.visual.borderWidth || 2}px solid ${piece.visual.borderColor || 'rgba(255,255,255,0.3)'}`;
        brd.style.zIndex = String(RENDER_LAYERS.BORDER);
        cell.appendChild(brd);
        
        // Layer 5: 围墙
        this._renderWalls(cell, piece);
        
        // Layer 6: 冰层
        if (piece.getAttr('ice') > 0) {
            const ice = document.createElement('div');
            ice.className = 'piece-ice';
            ice.textContent = piece.getAttr('ice') > 1 ? String(piece.getAttr('ice')) : '';
            ice.style.zIndex = String(RENDER_LAYERS.ICE);
            cell.appendChild(ice);
        }
        
        // Layer 7: 特效动画
        if (piece.effect) {
            const eff = document.createElement('div');
            eff.className = `effect-anim effect-${piece.effect}`;
            eff.style.zIndex = String(RENDER_LAYERS.EFFECT);
            cell.appendChild(eff);
        }
        
        // Layer 8: 状态
        if (piece.hasAttr('locked')) {
            const lock = document.createElement('div');
            lock.className = 'piece-locked';
            lock.textContent = '🔒';
            lock.style.zIndex = String(RENDER_LAYERS.STATE);
            cell.appendChild(lock);
        }
        if (piece.hasAttr('frozen')) {
            const frozen = document.createElement('div');
            frozen.className = 'piece-frozen';
            frozen.style.zIndex = String(RENDER_LAYERS.STATE);
            cell.appendChild(frozen);
        }
    }
    
    _renderWalls(cell, piece) {
        const sides = ['top', 'right', 'bottom', 'left'];
        const styleMap = { 1: 'dotted', 2: 'dashed', 3: 'solid' };
        
        for (const side of sides) {
            const hp = piece.getAttr(`wall_${side}`);
            if (hp <= 0) continue;
            
            const wall = document.createElement('div');
            wall.className = `piece-wall wall-${side}`;
            const style = styleMap[Math.min(3, hp)] || 'solid';
            const cap = side[0].toUpperCase() + side.slice(1);
            wall.style.borderColor = '#facc15';
            wall.style[`border${cap}Width`] = '4px';
            wall.style[`border${cap}Style`] = style;
            wall.style.zIndex = String(RENDER_LAYERS.WALL);
            cell.appendChild(wall);
        }
    }
    
    _getEffectIcon(effectName) {
        const effect = this.game.ruleEngine?.getEffect(effectName);
        return effect?.visual?.char || null;
    }
    
    _buildPattern(pattern, color) {
        const c = color || 'rgba(255,255,255,0.22)';
        const patterns = {
            dot: `radial-gradient(circle at 25% 25%, ${c} 0 12%, transparent 13%), radial-gradient(circle at 75% 70%, ${c} 0 10%, transparent 11%)`,
            stripe: `linear-gradient(135deg, transparent 0 42%, ${c} 42% 48%, transparent 48% 100%)`,
            check: `linear-gradient(45deg, ${c} 25%, transparent 25%, transparent 75%, ${c} 75%), linear-gradient(45deg, ${c} 25%, transparent 25%, transparent 75%, ${c} 75%)`,
            waves: `radial-gradient(circle at 15% 25%, ${c} 0 8%, transparent 9%), radial-gradient(circle at 80% 70%, ${c} 0 8%, transparent 9%)`,
            spark: `radial-gradient(circle at 50% 50%, ${c} 0 14%, transparent 15%)`,
            solid: 'transparent',
            transparent: 'transparent'
        };
        return patterns[pattern] || 'transparent';
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
    
    async animateFall() {
        await sleep(ANIMATION.GRAVITY);
    }

    async animateFall() {
    // 兼容旧 API：仅等待固定时长
        await sleep(this._getGravityDuration());
    }

    _getGravityDuration() {
        const speed = this.game.config.gravitySpeed ?? 1.0;
        const base = 400;
        return Math.round(base / speed);
    }
    
    // ===== 获取格子 =====
    
    getCell(r, c) {
        return this.cellCache.get(posToKey(r, c)) || null;
    }

    // ==================== 重力下落动画 ====================

    /**
     * 执行重力下落动画
     * @param {Array} drops - 下落信息数组
     * @param {Object} options - 配置
     */
    async animateGravityDrop(drops, options = {}) {
        if (!drops || drops.length === 0) return;
        
        const cellSize = this.game.config.cellSize;
        const gap = this.game.config.gap;
        const unit = cellSize + gap;
        
        // 下落速度配置（可从 game.config 读取）
        const speed = options.speed ?? this.game.config.gravitySpeed ?? 1.0;
        const baseDuration = options.baseDuration ?? 400;  // 基准时长（毫秒）
        const maxDistance = Math.max(...drops.map(d => Math.abs(d.distance || 1)));
        
        // 每个棋子的下落时长 = 基准时长 / 速度
        // 距离越长，时长越长
        const duration = Math.round(baseDuration / speed);
        
        // 标记所有受影响格子为"下落中"
        const animatedCells = [];
        
        for (const drop of drops) {
            const cellEl = this.cellCache.get(posToKey(drop.to.r, drop.to.c));
            if (!cellEl) continue;
            
            // 计算起始偏移量（相对于目标位置）
            const rowDelta = drop.from.r - drop.to.r;  // 负数表示从上方来
            const startOffset = rowDelta * unit;
            
            // 设置初始位置
            cellEl.style.transition = 'none';
            cellEl.style.transform = `translateY(${startOffset}px)`;
            cellEl.style.opacity = drop.isNew ? '0' : '1';
            cellEl.classList.add('falling');
            
            animatedCells.push({
                el: cellEl,
                drop,
                startOffset
            });
        }
        
        // 强制重排，确保初始位置生效
        void this.boardEl.offsetHeight;
        
        // 应用过渡动画
        for (const item of animatedCells) {
            const easing = options.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            item.el.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ease`;
            item.el.style.transform = 'translateY(0)';
            item.el.style.opacity = '1';
        }
        
        // 等待动画完成
        await sleep(duration + 30);
        
        // 清理样式
        for (const item of animatedCells) {
            item.el.style.transition = '';
            item.el.style.transform = '';
            item.el.style.opacity = '';
            item.el.classList.remove('falling');
        }
    }
}

window.RenderSystem = RenderSystem;