// ==================== Board 棋盘 ====================

class Board {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
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
    
    // ===== 交换 =====
    swap(r1, c1, r2, c2) {
        if (!this.isInBounds(r1, c1) || !this.isInBounds(r2, c2)) return;
        const tmp = this.grid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.grid[r2][c2] = tmp;
    }
    
    // ===== 遍历 =====
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
    
    // ===== 位置相关查询 =====
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
    
    // ===== 序列化 =====
    serialize() {
        return {
            rows: this.rows,
            cols: this.cols,
            grid: this.grid.map(row => 
                row.map(p => p ? p.serialize() : null)
            )
        };
    }
    
    static deserialize(obj) {
        if (!obj) return null;
        const board = new Board(obj.rows, obj.cols);
        for (let r = 0; r < obj.rows; r++) {
            for (let c = 0; c < obj.cols; c++) {
                board.set(r, c, Piece.deserialize(obj.grid?.[r]?.[c]));
            }
        }
        return board;
    }
    
    // ===== 克隆 =====
    clone() {
        const board = new Board(this.rows, this.cols);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.grid[r][c];
                board.set(r, c, p ? p.clone() : null);
            }
        }
        return board;
    }
}

window.Board = Board;