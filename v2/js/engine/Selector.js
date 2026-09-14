// ==================== Selector 选择器 ====================
// 选择器返回函数：(board, context) => Set<"r,c">

class Selector {
    // ===== 基础选择器 =====
    
    static row(rExpr) {
        return (board, ctx) => {
            const r = typeof rExpr === 'function' ? rExpr(ctx) : rExpr;
            const result = new Set();
            if (r < 0 || r >= board.rows) return result;
            for (let c = 0; c < board.cols; c++) {
                result.add(posToKey(r, c));
            }
            return result;
        };
    }
    
    static col(cExpr) {
        return (board, ctx) => {
            const c = typeof cExpr === 'function' ? cExpr(ctx) : cExpr;
            const result = new Set();
            if (c < 0 || c >= board.cols) return result;
            for (let r = 0; r < board.rows; r++) {
                result.add(posToKey(r, c));
            }
            return result;
        };
    }
    
    static area(rExpr, cExpr, radius, options = {}) {
        const { diagonal = true } = options;
        return (board, ctx) => {
            const r = typeof rExpr === 'function' ? rExpr(ctx) : rExpr;
            const c = typeof cExpr === 'function' ? cExpr(ctx) : cExpr;
            const result = new Set();
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    if (!diagonal && Math.abs(dr) + Math.abs(dc) > radius) continue;
                    const nr = r + dr, nc = c + dc;
                    if (board.isInBounds(nr, nc)) {
                        result.add(posToKey(nr, nc));
                    }
                }
            }
            return result;
        };
    }
    
    static allOfColor(colorExpr) {
        return (board, ctx) => {
            const color = typeof colorExpr === 'function' ? colorExpr(ctx) : colorExpr;
            const result = new Set();
            board.forEach((p, r, c) => {
                if (p && p.id === color) {
                    result.add(posToKey(r, c));
                }
            });
            return result;
        };
    }
    
    static all() {
        return (board) => {
            const result = new Set();
            board.forEach((p, r, c) => result.add(posToKey(r, c)));
            return result;
        };
    }
    
    static random(n) {
        return (board) => {
            const all = [];
            board.forEach((p, r, c) => {
                if (p) all.push(posToKey(r, c));
            });
            // 洗牌
            for (let i = all.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [all[i], all[j]] = [all[j], all[i]];
            }
            return new Set(all.slice(0, n));
        };
    }
    
    // ===== 组合器 =====
    
    static union(...selectors) {
        return (board, ctx) => {
            const result = new Set();
            for (const sel of selectors) {
                const fn = typeof sel === 'function' ? sel : sel;
                for (const key of fn(board, ctx)) {
                    result.add(key);
                }
            }
            return result;
        };
    }
    
    static intersect(...selectors) {
        return (board, ctx) => {
            if (selectors.length === 0) return new Set();
            const sets = selectors.map(sel => sel(board, ctx));
            const result = new Set(sets[0]);
            for (let i = 1; i < sets.length; i++) {
                for (const key of result) {
                    if (!sets[i].has(key)) result.delete(key);
                }
            }
            return result;
        };
    }
    
    static subtract(a, b) {
        return (board, ctx) => {
            const result = new Set(a(board, ctx));
            for (const key of b(board, ctx)) {
                result.delete(key);
            }
            return result;
        };
    }
    
    // ===== 常用组合 =====
    
    static cross(rExpr, cExpr) {
        return Selector.union(
            Selector.row(rExpr),
            Selector.col(cExpr)
        );
    }
}

window.Selector = Selector;

// 简写
const S = Selector;