// ==================== MatchSystem 匹配系统 ====================

class MatchSystem {
    constructor(game) {
        this.game = game;
        this.rules = [];
        this._cache = new SimpleCache(50);
    }
    
    registerRule(rule) {
        this.rules.push(rule);
        this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    
    findMatches() {
        const board = this.game.board;
        const cacheKey = this._getBoardKey(board);
        const cached = this._cache.get(cacheKey);
        if (cached) return new Set(cached);
        
        const all = new Set();
        for (const rule of this.rules) {
            for (const key of rule.check(board)) {
                all.add(key);
            }
        }
        
        this._cache.set(cacheKey, [...all]);
        return all;
    }
    
    _getBoardKey(board) {
        let key = '';
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                key += p ? (p.id[0] || '?') : '.';
            }
        }
        return key;
    }
    
    // ===== 形状分析 =====
    
    analyzeShape(matches) {
        if (!matches || matches.size === 0) return null;
        
        const positions = [];
        for (const key of matches) {
            positions.push(keyToPos(key));
        }
        
        return this.detectShape(positions);
    }
    
    detectShape(positions) {
        if (positions.length === 0) return null;
        
        // 按行列分组
        const rowGroups = {}, colGroups = {};
        for (const p of positions) {
            if (!rowGroups[p.r]) rowGroups[p.r] = [];
            if (!colGroups[p.c]) colGroups[p.c] = [];
            rowGroups[p.r].push(p);
            colGroups[p.c].push(p);
        }
        
        // 获取颜色
        const firstPos = positions[0];
        const firstPiece = this.game.board.get(firstPos.r, firstPos.c);
        const color = firstPiece?.id || null;
        
        // 检测直线
        const lineResult = this._detectLine(rowGroups, colGroups, positions);
        if (lineResult) {
            lineResult.color = color;
            return lineResult;
        }
        
        // 检测田字
        const squareResult = this._detectSquare(positions);
        if (squareResult) {
            squareResult.color = color;
            return squareResult;
        }
        
        // 检测 T 形
        const tResult = this._detectTShape(rowGroups, colGroups, positions);
        if (tResult) {
            tResult.color = color;
            return tResult;
        }
        
        // 检测 L 形
        const lResult = this._detectLShape(rowGroups, colGroups, positions);
        if (lResult) {
            lResult.color = color;
            return lResult;
        }
        
        // 检测大 T
        const bigTResult = this._detectBigT(rowGroups, colGroups, positions);
        if (bigTResult) {
            bigTResult.color = color;
            return bigTResult;
        }
        
        // 复杂形状
        return new ShapeResult({
            shape: 'complex',
            length: positions.length,
            positions,
            center: positions[Math.floor(positions.length / 2)],
            color
        });
    }
    
    _detectLine(rowGroups, colGroups, positions) {
        // 水平线
        for (const [r, list] of Object.entries(rowGroups)) {
            if (list.length === positions.length) {
                const sorted = list.sort((a, b) => a.c - b.c);
                // 检查连续
                let continuous = true;
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].c !== sorted[i-1].c + 1) {
                        continuous = false;
                        break;
                    }
                }
                if (continuous && sorted.length >= 3) {
                    return new ShapeResult({
                        shape: 'line',
                        direction: 'horizontal',
                        length: sorted.length,
                        positions: sorted,
                        center: sorted[Math.floor(sorted.length / 2)],
                        extra: { line: sorted }
                    });
                }
            }
        }
        
        // 垂直线
        for (const [c, list] of Object.entries(colGroups)) {
            if (list.length === positions.length) {
                const sorted = list.sort((a, b) => a.r - b.r);
                let continuous = true;
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].r !== sorted[i-1].r + 1) {
                        continuous = false;
                        break;
                    }
                }
                if (continuous && sorted.length >= 3) {
                    return new ShapeResult({
                        shape: 'line',
                        direction: 'vertical',
                        length: sorted.length,
                        positions: sorted,
                        center: sorted[Math.floor(sorted.length / 2)],
                        extra: { line: sorted }
                    });
                }
            }
        }
        
        return null;
    }
    
    _detectSquare(positions) {
        if (positions.length !== 4) return null;
        const rows = [...new Set(positions.map(p => p.r))].sort();
        const cols = [...new Set(positions.map(p => p.c))].sort();
        if (rows.length !== 2 || cols.length !== 2) return null;
        if (rows[1] !== rows[0] + 1 || cols[1] !== cols[0] + 1) return null;
        
        // 找中心
        const centerR = (rows[0] + rows[1]) / 2;
        const centerC = (cols[0] + cols[1]) / 2;
        let center = positions[0];
        let minDist = Infinity;
        for (const p of positions) {
            const d = Math.abs(p.r - centerR) + Math.abs(p.c - centerC);
            if (d < minDist) { minDist = d; center = p; }
        }
        
        return new ShapeResult({
            shape: 'square',
            length: 4,
            positions,
            center,
            extra: { rows, cols }
        });
    }
    
    _detectTShape(rowGroups, colGroups, positions) {
        // 找长度 >= 3 的水平段
        let horizontal = null;
        for (const [r, list] of Object.entries(rowGroups)) {
            if (list.length >= 3) {
                const sorted = list.sort((a, b) => a.c - b.c);
                let continuous = [sorted[0]];
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].c === sorted[i-1].c + 1) continuous.push(sorted[i]);
                    else break;
                }
                if (continuous.length >= 3 && continuous.length > (horizontal?.length || 0)) {
                    horizontal = continuous;
                }
            }
        }
        
        // 找长度 >= 3 的垂直段
        let vertical = null;
        for (const [c, list] of Object.entries(colGroups)) {
            if (list.length >= 3) {
                const sorted = list.sort((a, b) => a.r - b.r);
                let continuous = [sorted[0]];
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].r === sorted[i-1].r + 1) continuous.push(sorted[i]);
                    else break;
                }
                if (continuous.length >= 3 && continuous.length > (vertical?.length || 0)) {
                    vertical = continuous;
                }
            }
        }
        
        if (!horizontal || !vertical) return null;
        
        // 找交点
        const hSet = new Set(horizontal.map(p => posToKey(p.r, p.c)));
        const intersect = vertical.filter(p => hSet.has(posToKey(p.r, p.c)));
        if (intersect.length === 0) return null;
        
        // T 形：一条边是另一条边的端点
        const hLen = horizontal.length;
        const vLen = vertical.length;
        
        // 排除十字（长度接近）
        if (Math.abs(hLen - vLen) < 2) return null;
        
        // 大 T 检测（横竖都 >= 5）
        if (hLen >= 5 && vLen >= 5) {
            return new ShapeResult({
                shape: 'bigT',
                length: hLen + vLen - 1,
                positions,
                center: intersect[0],
                extra: { horizontal, vertical, intersection: intersect[0] }
            });
        }
        
        return new ShapeResult({
            shape: 'tshape',
            length: positions.length,
            positions,
            center: intersect[0],
            extra: { horizontal, vertical, intersection: intersect[0] }
        });
    }
    
    _detectLShape(rowGroups, colGroups, positions) {
        // L 形：一横一竖，交点在端点
        let horizontal = null;
        for (const [r, list] of Object.entries(rowGroups)) {
            if (list.length >= 3) {
                const sorted = list.sort((a, b) => a.c - b.c);
                let continuous = [sorted[0]];
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].c === sorted[i-1].c + 1) continuous.push(sorted[i]);
                    else break;
                }
                if (continuous.length >= 3) horizontal = continuous;
            }
        }
        
        let vertical = null;
        for (const [c, list] of Object.entries(colGroups)) {
            if (list.length >= 3) {
                const sorted = list.sort((a, b) => a.r - b.r);
                let continuous = [sorted[0]];
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].r === sorted[i-1].r + 1) continuous.push(sorted[i]);
                    else break;
                }
                if (continuous.length >= 3) vertical = continuous;
            }
        }
        
        if (!horizontal || !vertical) return null;
        
        // 交点在端点
        const hSet = new Set(horizontal.map(p => posToKey(p.r, p.c)));
        const intersect = vertical.filter(p => hSet.has(posToKey(p.r, p.c)));
        if (intersect.length !== 1) return null;
        
        const intPos = intersect[0];
        const hIdx = horizontal.findIndex(p => p.r === intPos.r && p.c === intPos.c);
        const vIdx = vertical.findIndex(p => p.r === intPos.r && p.c === intPos.c);
        
        const isHEnd = hIdx === 0 || hIdx === horizontal.length - 1;
        const isVEnd = vIdx === 0 || vIdx === vertical.length - 1;
        
        if (isHEnd && isVEnd) {
            return new ShapeResult({
                shape: 'lshape',
                length: positions.length,
                positions,
                center: intPos,
                extra: { horizontal, vertical, intersection: intPos }
            });
        }
        
        return null;
    }
    
    _detectBigT(rowGroups, colGroups, positions) {
        // 大 T 已在 _detectTShape 中处理
        return null;
    }
    
    // ===== 清空缓存 =====
    clearCache() {
        this._cache.clear();
    }
}

// ===== 内置匹配规则 =====

class LineMatchRule {
    constructor(config) {
        this.priority = 10;
        this.matchLength = config.matchLength || 3;
    }
    
    check(board) {
        const matches = new Set();
        const len = this.matchLength;
        
        // 水平
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c <= board.cols - len; c++) {
                const first = board.get(r, c);
                if (!first) continue;
                let ok = true;
                for (let i = 1; i < len; i++) {
                    const p = board.get(r, c + i);
                    if (!p || p.id !== first.id) { ok = false; break; }
                }
                if (ok) {
                    // 扩展
                    let ext = len;
                    while (c + ext < board.cols && board.get(r, c + ext)?.id === first.id) ext++;
                    for (let i = 0; i < ext; i++) {
                        matches.add(posToKey(r, c + i));
                    }
                    c += ext - 1;
                }
            }
        }
        
        // 垂直
        for (let c = 0; c < board.cols; c++) {
            for (let r = 0; r <= board.rows - len; r++) {
                const first = board.get(r, c);
                if (!first) continue;
                let ok = true;
                for (let i = 1; i < len; i++) {
                    const p = board.get(r + i, c);
                    if (!p || p.id !== first.id) { ok = false; break; }
                }
                if (ok) {
                    let ext = len;
                    while (r + ext < board.rows && board.get(r + ext, c)?.id === first.id) ext++;
                    for (let i = 0; i < ext; i++) {
                        matches.add(posToKey(r + i, c));
                    }
                    r += ext - 1;
                }
            }
        }
        
        return matches;
    }
}

class SquareMatchRule {
    constructor(config) {
        this.priority = 5;
        this.enabled = config.enableSquare !== false;
    }
    
    check(board) {
        if (!this.enabled) return new Set();
        const matches = new Set();
        
        for (let r = 0; r < board.rows - 1; r++) {
            for (let c = 0; c < board.cols - 1; c++) {
                const p1 = board.get(r, c);
                if (!p1) continue;
                const p2 = board.get(r, c + 1);
                const p3 = board.get(r + 1, c);
                const p4 = board.get(r + 1, c + 1);
                if (p2?.id === p1.id && p3?.id === p1.id && p4?.id === p1.id) {
                    matches.add(posToKey(r, c));
                    matches.add(posToKey(r, c + 1));
                    matches.add(posToKey(r + 1, c));
                    matches.add(posToKey(r + 1, c + 1));
                }
            }
        }
        
        return matches;
    }
}

class DiagonalMatchRule {
    constructor(config) {
        this.priority = 8;
        this.enabled = config.enableDiagonal === true;
        this.matchLength = config.matchLength || 3;
    }
    
    check(board) {
        if (!this.enabled) return new Set();
        const matches = new Set();
        const len = this.matchLength;
        
        // 右下方向
        for (let r = 0; r <= board.rows - len; r++) {
            for (let c = 0; c <= board.cols - len; c++) {
                const first = board.get(r, c);
                if (!first) continue;
                let ok = true;
                for (let i = 1; i < len; i++) {
                    const p = board.get(r + i, c + i);
                    if (!p || p.id !== first.id) { ok = false; break; }
                }
                if (ok) {
                    for (let i = 0; i < len; i++) {
                        matches.add(posToKey(r + i, c + i));
                    }
                }
            }
        }
        
        // 左下方向
        for (let r = 0; r <= board.rows - len; r++) {
            for (let c = len - 1; c < board.cols; c++) {
                const first = board.get(r, c);
                if (!first) continue;
                let ok = true;
                for (let i = 1; i < len; i++) {
                    const p = board.get(r + i, c - i);
                    if (!p || p.id !== first.id) { ok = false; break; }
                }
                if (ok) {
                    for (let i = 0; i < len; i++) {
                        matches.add(posToKey(r + i, c - i));
                    }
                }
            }
        }
        
        return matches;
    }
}

window.MatchSystem = MatchSystem;
window.LineMatchRule = LineMatchRule;
window.SquareMatchRule = SquareMatchRule;
window.DiagonalMatchRule = DiagonalMatchRule;