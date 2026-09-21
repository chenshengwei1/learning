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
    addTarget(target) {
        this.targets.push({
            id: target.id || `target_${this.targets.length}_${Date.now()}`,
            element: target.element || 'target',
            r: target.r,
            c: target.c,
            w: target.w || 1,
            h: target.h || 1,
            hp: target.hp ?? 1,
            maxHp: target.maxHp ?? target.hp ?? 1,
            svg: target.svg || null,
            metadata: target.metadata || {}
        });
    }
    
    getTargetAt(r, c) {
        return this.targets.find(t =>
            r >= t.r && r < t.r + t.h &&
            c >= t.c && c < t.c + t.w
        ) || null;
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
    addObstacle(obstacle) {
        this.obstacles.push({
            id: obstacle.id || `obs_${this.obstacles.length}_${Date.now()}`,
            element: obstacle.element || 'obstacle',
            r: obstacle.r,
            c: obstacle.c,
            hp: obstacle.hp ?? 1,
            maxHp: obstacle.maxHp ?? obstacle.hp ?? 1,
            layers: obstacle.layers || null,   // 多层结构
            metadata: obstacle.metadata || {}
        });
    }
    
    getObstacleAt(r, c) {
        return this.obstacles.find(o => o.r === r && o.c === c) || null;
    }
    
    hasObstacle(r, c) {
        return !!this.getObstacleAt(r, c);
    }
    
    damageObstacleAt(r, c, amount = 1) {
        const obs = this.getObstacleAt(r, c);
        if (!obs) return { removed: false, obstacle: null };
        
        obs.hp -= amount;
        
        if (obs.hp <= 0) {
            const idx = this.obstacles.indexOf(obs);
            if (idx >= 0) this.obstacles.splice(idx, 1);
            return { removed: true, obstacle: obs };
        }
        
        return { removed: false, obstacle: obs };
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
            isActive: this.isCellActive(r, c)
        };
    }
    
    // ===== 序列化 =====
    serialize() {
        return {
            rows: this.rows,
            cols: this.cols,
            layout: this.layout.map(row => [...row]),
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