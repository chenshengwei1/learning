// ==================== Board 多层棋盘 ====================

class Board {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        
        // Layer 0: 底板（哪些格子存在）
        this.layout = Array.from({ length: rows }, () => Array(cols).fill(1));
        
        // Layer 1: 目标物（水果等，可跨格子）
        // Array<{ id, element, r, c, w, h, hp, maxHp, svg }>
        this.targets = [];
        
        // Layer 2: 障碍物（冰、藤蔓等，逐格）
        // Array<{ id, element, r, c, hp, maxHp, layers }>
        this.obstacles = [];
        
        // Layer 3: 棋子（可移动）
        this.grid = Array.from({ length: rows }, () => Array(cols).fill(null));

        // Layer 4: 棋子（可移动）
        this.overlays  = [];    // ← 新增：棋子上层覆盖
    }
    
    // ===== 基础访问 =====
    get(r, c) {
        if (!this.isInBounds(r, c)) return null;
        return this.grid[r][c];
    }
    
    set(r, c, piece) {
        if (!this.isInBounds(r, c)) return;
        this.grid[r][c] = piece;
    }
    
    isEmpty(r, c) {
        return this.get(r, c) === null;
    }
    
    isInBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }
    
    isCellActive(r, c) {
        return this.isInBounds(r, c) && this.layout[r][c] === 1;
    }
    
    swap(r1, c1, r2, c2) {
        if (!this.isInBounds(r1, c1) || !this.isInBounds(r2, c2)) return;
        const tmp = this.grid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.grid[r2][c2] = tmp;
    }
    
    forEach(callback) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                callback(this.grid[r][c], r, c);
            }
        }
    }
    
    allPositions() {
        const result = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                result.push({ r, c });
            }
        }
        return result;
    }
    
    getAdjacent(r, c, options = {}) {
        const { diagonal = false } = options;
        const result = [];
        const dirs = diagonal
            ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
            : [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (this.isInBounds(nr, nc)) {
                result.push({ r: nr, c: nc });
            }
        }
        return result;
    }
    
    // ===== 目标物层 =====
    addTarget(target, registries = null) {
        const cells = target.cells || this._expandRect(target.r, target.c, target.w, target.h);
        const def = registries?.elements.get(target.element);
        const minR = Math.min(...cells.map(p => p.r));
        const maxR = Math.max(...cells.map(p => p.r));
        const minC = Math.min(...cells.map(p => p.c));
        const maxC = Math.max(...cells.map(p => p.c));
        this.targets.push({
            id: target.id || `target_${this.targets.length}_${Date.now()}`,
            element: target.element || 'target',
            cells,
            // 兼容字段：cells 的 bounding box 左上角
            r: target.r ?? minR, c: target.c ?? minC,          // ← 兼容
            w: target.w ?? (maxC - minC + 1), h: target.h ?? (maxR - minR + 1),   // ← 兼容
            hp: target.hp ?? 1,
            maxHp: target.maxHp ?? target.hp ?? 1,
            hpMode: target.hpMode ?? def?.properties?.hpMode ?? 'whole',
            svg: target.svg || null,
            metadata: target.metadata || {}
        });
    }

    addObstacle(obstacle, registries = null) {
        const cells = obstacle.cells || this._expandRect(obstacle.r, obstacle.c, 1, 1);
        const def = registries?.elements.get(obstacle.element);
        const minR = Math.min(...cells.map(p => p.r));
        const maxR = Math.max(...cells.map(p => p.r));
        const minC = Math.min(...cells.map(p => p.c));
        const maxC = Math.max(...cells.map(p => p.c));
        this.obstacles.push({
            id: obstacle.id || `obs_${this.obstacles.length}_${Date.now()}`,
            element: obstacle.element || 'obstacle',
            cells,
            r: obstacle.r ?? minR, c: obstacle.c ?? minC,       // ← 兼容
            w: obstacle.w ?? (maxC - minC + 1), h: obstacle.h ?? (maxR - minR + 1),   // ← 兼容
            hp: obstacle.hp ?? 1,
            maxHp: obstacle.maxHp ?? obstacle.hp ?? 1,
            hpMode: obstacle.hpMode ?? def?.properties?.hpMode ?? 'whole',
            layers: obstacle.layers || null,
            metadata: obstacle.metadata || {}
        });
    }

    addOverlay(overlay, registries = null) {
        const cells = overlay.cells || this._expandRect(overlay.r, overlay.c, overlay.w, overlay.h);
        const def = registries?.elements.get(overlay.element);
        const minR = Math.min(...cells.map(p => p.r));
        const minC = Math.min(...cells.map(p => p.c));
        const maxR = Math.max(...cells.map(p => p.r));
        const maxC = Math.max(...cells.map(p => p.c));
        this.overlays.push({
            id: overlay.id || `ovl_${this.overlays.length}_${Date.now()}`,
            element: overlay.element,
            cells,
            r: overlay.r ?? minR, c: overlay.c ?? minC,          // ← 兼容
            w: overlay.w ?? (maxC - minC + 1), h: overlay.h ?? (maxR - minR + 1),   // ← 兼容
            hp: overlay.hp ?? def?.properties?.hp ?? 1,
            maxHp: overlay.maxHp ?? overlay.hp ?? def?.properties?.hp ?? 1,
            hpMode: overlay.hpMode ?? def?.properties?.hpMode ?? 'whole',
            blocksMovement: overlay.blocksMovement ?? def?.properties?.blocksMovement ?? false,
            metadata: overlay.metadata || {}
        });
    }
    
    getTargetAt(r, c) {
        return this.targets.find(t => this._entityHasCell(t, r, c)) || null;
    }

    getObstacleAt(r, c) {
        return this.obstacles.find(o => this._entityHasCell(o, r, c)) || null;
    }

    getOverlayAt(r, c) {
        return this.overlays.find(o => this._entityHasCell(o, r, c)) || null;
    }
    
    getTargetById(id) {
        return this.targets.find(t => t.id === id) || null;
    }
    
    damageTargetAt(r, c, amount = 1) {
        const target = this.getTargetAt(r, c);
        if (!target) return false;
        
        target.hp -= amount;
        if (target.hp <= 0) {
            const idx = this.targets.indexOf(target);
            if (idx >= 0) this.targets.splice(idx, 1);
        }
        return true;
    }
    
    removeTarget(target) {
        const idx = this.targets.indexOf(target);
        if (idx >= 0) this.targets.splice(idx, 1);
    }
    
    isAllTargetsCleared() {
        return this.targets.length === 0;
    }
    
    getTargetsByElement(elementId) {
        return this.targets.filter(t => t.element === elementId);
    }
    
    // ===== 障碍物层 =====
    // ===== cells 工具 =====
    _expandRect(r, c, w = 1, h = 1) {
        const cells = [];
        for (let dr = 0; dr < h; dr++)
            for (let dc = 0; dc < w; dc++)
                cells.push({ r: r + dr, c: c + dc });
        return cells;
    }

    _entityHasCell(entity, r, c) {
        if (!entity.cells) return false;
        return entity.cells.some(p => p.r === r && p.c === c);
    }

    _getLayerArray(category) {
        switch (category) {
            case 'target':   return this.targets;
            case 'obstacle': return this.obstacles;
            case 'overlay':  return this.overlays;
            default: return null;
        }
    }

    // ===== 通用层接口 =====
    getAt(category, r, c) {
        const arr = this._getLayerArray(category);
        if (!arr) return null;
        return arr.find(e => this._entityHasCell(e, r, c)) || null;
    }

    damageAt(category, r, c, amount = 1) {
        const entity = this.getAt(category, r, c);
        if (!entity) return { removed: false, entity: null };
        
        entity.hp -= amount;
        
        // perCell：每次受伤减 1 格（按 amount 次）
        if (entity.hpMode === 'perCell' && Array.isArray(entity.cells)) {
            for (let i = 0; i < amount; i++) entity.cells.pop();
        }
        
        const isEmpty = (entity.hpMode === 'perCell')
            ? (entity.cells.length === 0)
            : (entity.hp <= 0);
        
        if (entity.hp <= 0 || isEmpty) {
            const arr = this._getLayerArray(category);
            const idx = arr.indexOf(entity);
            if (idx >= 0) arr.splice(idx, 1);
            return { removed: true, entity };
        }
        
        return { removed: false, entity };
    }

    removeAt(category, r, c) {
        const arr = this._getLayerArray(category);
        if (!arr) return null;
        const entity = this.getAt(category, r, c);
        if (!entity) return null;
        const idx = arr.indexOf(entity);
        if (idx >= 0) arr.splice(idx, 1);
        return entity;
    }

    // 该格所有实体，从上到下：overlay → piece → obstacle → target
    getEntitiesAt(r, c) {
        const result = [];
        const overlay = this.getOverlayAt(r, c);
        if (overlay) result.push({ category: 'overlay', entity: overlay });
        const piece = this.get(r, c);
        if (piece) result.push({ category: 'piece', entity: piece });
        const obstacle = this.getObstacleAt(r, c);
        if (obstacle) result.push({ category: 'obstacle', entity: obstacle });
        const target = this.getTargetAt(r, c);
        if (target) result.push({ category: 'target', entity: target });
        return result;
    }

    hasBlockingOverlay(r, c) {
        const overlay = this.getOverlayAt(r, c);
        return !!(overlay && overlay.blocksMovement);
    }
    

    
    hasObstacle(r, c) {
        return !!this.getObstacleAt(r, c);
    }
    
    damageObstacleAt(r, c, amount = 1) {
        const result = this.damageAt('obstacle', r, c, amount);
        return { removed: result.removed, obstacle: result.entity };
    }

    damageTargetAt(r, c, amount = 1) {
        const result = this.damageAt('target', r, c, amount);
        return result.removed;
    }
    
    removeObstacleAt(r, c) {
        const idx = this.obstacles.findIndex(o => o.r === r && o.c === c);
        if (idx >= 0) {
            const removed = this.obstacles[idx];
            this.obstacles.splice(idx, 1);
            return removed;
        }
        return null;
    }
    
    isObstacleCleared(r, c) {
        return !this.hasObstacle(r, c);
    }
    
    getObstaclesByElement(elementId) {
        return this.obstacles.filter(o => o.element === elementId);
    }
    
    // ===== 查询集成 =====
    // 某位置的所有层信息
    getCellInfo(r, c) {
        return {
            piece: this.get(r, c),
            target: this.getTargetAt(r, c),
            obstacle: this.getObstacleAt(r, c),
            overlay: this.getOverlayAt(r, c),   // ← 新增
            isActive: this.isCellActive(r, c)
        };
    }
    
    // ===== 序列化 =====
    serialize() {
        return {
            rows: this.rows,
            cols: this.cols,
            layout: this.layout.map(row => [...row]),
            overlays: this.overlays.map(o => ({ ...o, metadata: deepClone(o.metadata) })),
            targets: this.targets.map(t => ({
                ...t,
                metadata: deepClone(t.metadata)
            })),
            obstacles: this.obstacles.map(o => ({
                ...o,
                metadata: deepClone(o.metadata)
            })),
            grid: this.grid.map(row =>
                row.map(p => p ? p.serialize() : null)
            )
        };
    }
    
    static deserialize(obj) {
        if (!obj) return null;
        const board = new Board(obj.rows, obj.cols);
        
        if (obj.layout) {
            board.layout = obj.layout.map(row => [...row]);
        }
        
        if (Array.isArray(obj.targets)) {
            board.targets = obj.targets.map(t => ({ ...t, metadata: { ...(t.metadata || {}) } }));
        }
        
        if (Array.isArray(obj.obstacles)) {
            board.obstacles = obj.obstacles.map(o => ({ ...o, metadata: { ...(o.metadata || {}) } }));
        }
        if (Array.isArray(obj.overlays)) {
            board.overlays = obj.overlays.map(o => ({ ...o, metadata: { ...(o.metadata || {}) } }));
        }
        
        for (let r = 0; r < obj.rows; r++) {
            for (let c = 0; c < obj.cols; c++) {
                board.set(r, c, Piece.deserialize(obj.grid?.[r]?.[c]));
            }
        }
        
        return board;
    }
    
    clone() {
        return Board.deserialize(this.serialize());
    }
}

window.Board = Board;