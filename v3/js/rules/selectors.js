// ==================== 内置选择器 ====================

function registerBuiltinSelectors(registries) {
    const S = registries.selectors;
    
    // ===== 单格 =====
    S.register('cell', {
        meta: {
            label: '指定格子',
            description: '某个具体格子',
            params: [
                { name: 'r', label: '行', type: 'number', required: true },
                { name: 'c', label: '列', type: 'number', required: true }
            ]
        },
        resolve: (board, { r, c }) => {
            if (!board.isInBounds(r, c)) return new Set();
            return new Set([posToKey(r, c)]);
        }
    });
    
    // ===== 整行 =====
    S.register('row', {
        meta: {
            label: '整行',
            description: '一整行',
            params: [
                { name: 'r', label: '行号', type: 'number', required: true }
            ]
        },
        resolve: (board, { r }) => {
            const result = new Set();
            if (r < 0 || r >= board.rows) return result;
            for (let c = 0; c < board.cols; c++) {
                result.add(posToKey(r, c));
            }
            return result;
        }
    });
    
    // ===== 整列 =====
    S.register('col', {
        meta: {
            label: '整列',
            description: '一整列',
            params: [
                { name: 'c', label: '列号', type: 'number', required: true }
            ]
        },
        resolve: (board, { c }) => {
            const result = new Set();
            if (c < 0 || c >= board.cols) return result;
            for (let r = 0; r < board.rows; r++) {
                result.add(posToKey(r, c));
            }
            return result;
        }
    });
    
    // ===== 十字 =====
    S.register('cross', {
        meta: {
            label: '十字',
            description: '整行 + 整列',
            params: [
                { name: 'r', label: '行', type: 'number', required: true },
                { name: 'c', label: '列', type: 'number', required: true }
            ]
        },
        resolve: (board, { r, c }) => {
            const result = new Set();
            if (r >= 0 && r < board.rows) {
                for (let cc = 0; cc < board.cols; cc++) result.add(posToKey(r, cc));
            }
            if (c >= 0 && c < board.cols) {
                for (let rr = 0; rr < board.rows; rr++) result.add(posToKey(rr, c));
            }
            return result;
        }
    });
    
    // ===== 范围 =====
    S.register('area', {
        meta: {
            label: '范围',
            description: '以某点为中心，半径 N 格',
            params: [
                { name: 'r', label: '中心行', type: 'number', required: true },
                { name: 'c', label: '中心列', type: 'number', required: true },
                { name: 'radius', label: '半径', type: 'number', default: 1, min: 0, max: 10 },
                { name: 'diagonal', label: '含斜角', type: 'boolean', default: true }
            ]
        },
        resolve: (board, { r, c, radius = 1, diagonal = true }) => {
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
        }
    });
    
    // ===== 相邻 =====
    S.register('adjacent', {
        meta: {
            label: '相邻',
            description: '紧邻的格子',
            params: [
                { name: 'r', label: '行', type: 'number', required: true },
                { name: 'c', label: '列', type: 'number', required: true },
                { name: 'diagonal', label: '含斜角', type: 'boolean', default: false }
            ]
        },
        resolve: (board, { r, c, diagonal = false }) => {
            const result = new Set();
            const dirs = diagonal
                ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
                : [[-1,0],[1,0],[0,-1],[0,1]];
            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (board.isInBounds(nr, nc)) {
                    result.add(posToKey(nr, nc));
                }
            }
            return result;
        }
    });
    
    // ===== 全屏 =====
    S.register('all', {
        meta: {
            label: '全屏',
            description: '整个棋盘',
            params: []
        },
        resolve: (board) => {
            const result = new Set();
            board.forEach((_, r, c) => result.add(posToKey(r, c)));
            return result;
        }
    });
    
    // ===== 同色 =====
    S.register('sameColor', {
        meta: {
            label: '同色棋子',
            description: '所有与某颜色相同的棋子',
            params: [
                { name: 'color', label: '颜色', type: 'elementRef', required: true }
            ]
        },
        resolve: (board, { color }) => {
            const result = new Set();
            if (!color) return result;
            board.forEach((p, r, c) => {
                if (p?.id === color) result.add(posToKey(r, c));
            });
            return result;
        }
    });
    
    // ===== 同元素 =====
    S.register('sameElement', {
        meta: {
            label: '同类型棋子',
            description: '所有与指定元素相同的棋子',
            params: [
                { name: 'element', label: '元素', type: 'elementRef', required: true }
            ]
        },
        resolve: (board, { element }) => {
            const result = new Set();
            if (!element) return result;
            board.forEach((p, r, c) => {
                if (p?.element === element) result.add(posToKey(r, c));
            });
            return result;
        }
    });
    
    // ===== 随机 N 个 =====
    S.register('random', {
        meta: {
            label: '随机选择',
            description: '从棋盘上随机选 N 个格子',
            params: [
                { name: 'count', label: '数量', type: 'number', default: 1, min: 1 },
                { name: 'filter', label: '筛选条件', type: 'selector', default: null }
            ]
        },
        resolve: (board, { count = 1, filter = null }, context) => {
            let candidates = [];
            if (filter) {
                // filter 本身是一个选择器配置
                const parser = new ExpressionParser({ selectors: window.__registries__.selectors });
                const filtered = parser.resolveSelector(filter, board, context);
                candidates = Array.from(filtered);
            } else {
                board.forEach((p, r, c) => {
                    if (p) candidates.push(posToKey(r, c));
                });
            }
            
            // 洗牌
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
            
            return new Set(candidates.slice(0, count));
        }
    });
    
    // ===== 障碍物 =====
    S.register('obstacles', {
        meta: {
            label: '障碍物',
            description: '所有有障碍物的格子',
            params: [
                { name: 'element', label: '障碍类型', type: 'elementRef', default: null }
            ]
        },
        resolve: (board, { element = null }) => {
            const result = new Set();
            for (const obs of board.obstacles) {
                if (element && obs.element !== element) continue;
                result.add(posToKey(obs.r, obs.c));
            }
            return result;
        }
    });
    
    // ===== 目标物 =====
    S.register('targets', {
        meta: {
            label: '目标物',
            description: '所有目标物覆盖的格子',
            params: [
                { name: 'element', label: '目标类型', type: 'elementRef', default: null }
            ]
        },
        resolve: (board, { element = null }) => {
            const result = new Set();
            for (const target of board.targets) {
                if (element && target.element !== element) continue;
                for (let r = target.r; r < target.r + target.h; r++) {
                    for (let c = target.c; c < target.c + target.w; c++) {
                        result.add(posToKey(r, c));
                    }
                }
            }
            return result;
        }
    });
    
    // ===== 形状内格子 =====
    S.register('inShape', {
        meta: {
            label: '匹配形状内',
            description: '当前匹配涉及的所有格子',
            params: []
        },
        resolve: (board, _, context) => {
            if (!context.$shapeResult) return new Set();
            return new Set(context.$shapeResult.keys);
        }
    });
    
    // ===== 变量位置 =====
    S.register('varCell', {
        meta: {
            label: '变量位置',
            description: '从变量中取位置',
            params: [
                { name: 'var', label: '变量名', type: 'string', required: true }
            ]
        },
        resolve: (board, { var: varName }, context) => {
            const pos = context[varName];
            if (!pos || typeof pos !== 'object') return new Set();
            if (pos.r === undefined || pos.c === undefined) return new Set();
            return new Set([posToKey(pos.r, pos.c)]);
        }
    });
}