// ==================== MatchSystem 匹配系统 ====================

class MatchSystem {
    constructor(game) {
        this.game = game;
        this.rules = [];
        this._cache = new SimpleCache(30);
    }
    
    registerRule(rule) {
        this.rules.push(rule);
        this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    
    clearRules() {
        this.rules = [];
    }
    
    clearCache() {
        this._cache.clear();
    }
    
    /**
     * 查找所有匹配
     */
    findMatches() {
        const board = this.game.board;
        const cacheKey = this._getBoardKey(board);
        const cached = this._cache.get(cacheKey);
        if (cached) return new Set(cached);
        
        const all = new Set();
        for (const rule of this.rules) {
            const matches = rule.check(board);
            for (const key of matches) all.add(key);
        }
        
        this._cache.set(cacheKey, [...all]);
        return all;
    }
    
    _getBoardKey(board) {
        let key = '';
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                if (!p) {
                    key += '.';
                } else {
                    // 用元素 id 首字符 + 效果标记
                    key += p.id[0] || '?';
                    if (p.effect) key += '!';
                }
            }
        }
        return key;
    }
    
    /**
     * 分析匹配的形状
     */
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
        
        const firstPos = positions[0];
        const firstPiece = this.game.board.get(firstPos.r, firstPos.c);
        const color = firstPiece?.id || null;
        
        const posSet = new Set(positions.map(p => posToKey(p.r, p.c)));
        
        const templates = window.SHAPE_TEMPLATES || [];
        const sorted = [...templates].sort((a, b) => b.priority - a.priority);
        
        console.log(`[MatchSystem] detectShape: positions=${positions.length} 格, 模板数=${sorted.length}`);
        
        for (const template of sorted) {
            const result = this._tryTemplate(template, positions, posSet, color);
            if (result) {
                console.log(`[MatchSystem] detectShape → 匹配模板 ${template.id}`);
                return result;
            }
        }
        
        console.log(`[MatchSystem] detectShape → 复杂（无模板匹配）`);
        return new ShapeResult({
            shape: SHAPES.COMPLEX,
            length: positions.length,
            positions,
            center: positions[Math.floor(positions.length / 2)],
            color
        });
    }
    
    _tryTemplate(template, positions, posSet, color) {
        for (const origin of positions) {
            let allMatch = true;
            for (const cell of template.cells) {
                const r = origin.r + cell.dr;
                const c = origin.c + cell.dc;
                if (!posSet.has(posToKey(r, c))) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch) {
                const center = {
                    r: origin.r + (template.center?.dr || 0),
                    c: origin.c + (template.center?.dc || 0),
                };
                return new ShapeResult({
                    shape: template.shape,
                    direction: template.direction,
                    length: template.cells.length,
                    positions,
                    center,
                    color,
                    extra: { templateId: template.id, matchedAt: origin },
                });
            }
        }
        return null;
    }
    
    _detectLine(rowGroups, colGroups, positions, color) {
        // 水平
        for (const [r, list] of Object.entries(rowGroups)) {
            if (list.length !== positions.length) continue;
            const sorted = list.sort((a, b) => a.c - b.c);
            if (!this._isContinuous(sorted, 'c')) continue;
            if (sorted.length < 3) continue;
            return new ShapeResult({
                shape: SHAPES.LINE,
                direction: DIRECTIONS.HORIZONTAL,
                length: sorted.length,
                positions: sorted,
                center: sorted[Math.floor(sorted.length / 2)],
                color,
                extra: { line: sorted }
            });
        }
        
        // 垂直
        for (const [c, list] of Object.entries(colGroups)) {
            if (list.length !== positions.length) continue;
            const sorted = list.sort((a, b) => a.r - b.r);
            if (!this._isContinuous(sorted, 'r')) continue;
            if (sorted.length < 3) continue;
            return new ShapeResult({
                shape: SHAPES.LINE,
                direction: DIRECTIONS.VERTICAL,
                length: sorted.length,
                positions: sorted,
                center: sorted[Math.floor(sorted.length / 2)],
                color,
                extra: { line: sorted }
            });
        }
        
        return null;
    }
    
    _detectSquare(positions, color) {
        if (positions.length !== 4) return null;
        const rows = [...new Set(positions.map(p => p.r))].sort();
        const cols = [...new Set(positions.map(p => p.c))].sort();
        if (rows.length !== 2 || cols.length !== 2) return null;
        if (rows[1] !== rows[0] + 1 || cols[1] !== cols[0] + 1) return null;
        
        const centerR = (rows[0] + rows[1]) / 2;
        const centerC = (cols[0] + cols[1]) / 2;
        let center = positions[0];
        let minDist = Infinity;
        for (const p of positions) {
            const d = Math.abs(p.r - centerR) + Math.abs(p.c - centerC);
            if (d < minDist) { minDist = d; center = p; }
        }
        
        return new ShapeResult({
            shape: SHAPES.SQUARE,
            length: 4,
            positions,
            center,
            color,
            extra: { rows, cols }
        });
    }
    
    _detectTShape(rowGroups, colGroups, positions, color) {
        const horizontal = this._longestContinuous(rowGroups, 'c');
        const vertical = this._longestContinuous(colGroups, 'r');
        
        if (!horizontal || !vertical) return null;
        if (horizontal.length < 3 || vertical.length < 3) return null;
        
        // 交集
        const hSet = new Set(horizontal.map(p => posToKey(p.r, p.c)));
        const intersect = vertical.filter(p => hSet.has(posToKey(p.r, p.c)));
        if (intersect.length === 0) return null;
        
        const hLen = horizontal.length;
        const vLen = vertical.length;
        
        // 排除十字架（长度接近）
        if (Math.abs(hLen - vLen) < 2) return null;
        
        // 排除大 T（长度都 >= 5）
        if (hLen >= 5 && vLen >= 5) return null;
        
        return new ShapeResult({
            shape: SHAPES.T_SHAPE,
            length: positions.length,
            positions,
            center: intersect[0],
            color,
            extra: { horizontal, vertical, intersection: intersect[0] }
        });
    }
    
    _detectLShape(rowGroups, colGroups, positions, color) {
        const horizontal = this._longestContinuous(rowGroups, 'c');
        const vertical = this._longestContinuous(colGroups, 'r');
        
        if (!horizontal || !vertical) return null;
        if (horizontal.length < 3 || vertical.length < 3) return null;
        
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
                shape: SHAPES.L_SHAPE,
                length: positions.length,
                positions,
                center: intPos,
                color,
                extra: { horizontal, vertical, intersection: intPos }
            });
        }
        
        return null;
    }
    
    _detectCross(rowGroups, colGroups, positions, color) {
        const horizontal = this._longestContinuous(rowGroups, 'c');
        const vertical = this._longestContinuous(colGroups, 'r');
        
        if (!horizontal || !vertical) return null;
        if (horizontal.length < 5 || vertical.length < 5) return null;
        
        // 长度接近
        if (Math.abs(horizontal.length - vertical.length) >= 2) return null;
        
        const hSet = new Set(horizontal.map(p => posToKey(p.r, p.c)));
        const intersect = vertical.filter(p => hSet.has(posToKey(p.r, p.c)));
        if (intersect.length !== 1) return null;
        
        return new ShapeResult({
            shape: SHAPES.CROSS,
            length: positions.length,
            positions,
            center: intersect[0],
            color,
            extra: { horizontal, vertical, intersection: intersect[0] }
        });
    }
    
    _detectBigT(rowGroups, colGroups, positions, color) {
        const horizontal = this._longestContinuous(rowGroups, 'c');
        const vertical = this._longestContinuous(colGroups, 'r');
        
        if (!horizontal || !vertical) return null;
        if (horizontal.length < 5 || vertical.length < 5) return null;
        
        // 长度差异大
        if (Math.abs(horizontal.length - vertical.length) < 2) return null;
        
        const hSet = new Set(horizontal.map(p => posToKey(p.r, p.c)));
        const intersect = vertical.filter(p => hSet.has(posToKey(p.r, p.c)));
        if (intersect.length === 0) return null;
        
        return new ShapeResult({
            shape: SHAPES.BIG_T,
            length: positions.length,
            positions,
            center: intersect[0],
            color,
            extra: { horizontal, vertical, intersection: intersect[0] }
        });
    }
    
    _isContinuous(sorted, key) {
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i][key] !== sorted[i - 1][key] + 1) return false;
        }
        return true;
    }
    
    _longestContinuous(groups, key) {
        let longest = null;
        for (const list of Object.values(groups)) {
            if (list.length < 3) continue;
            const sorted = list.sort((a, b) => a[key] - b[key]);
            const continuous = [sorted[0]];
            for (let i = 1; i < sorted.length; i++) {
                if (sorted[i][key] === sorted[i - 1][key] + 1) {
                    continuous.push(sorted[i]);
                } else {
                    if (continuous.length > (longest?.length || 0)) {
                        longest = continuous;
                    }
                    continuous.length = 0;
                    continuous.push(sorted[i]);
                }
            }
            if (continuous.length > (longest?.length || 0)) {
                longest = continuous;
            }
        }
        return longest;
    }
}

// ==================== 内置匹配规则 ====================

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
            let c = 0;
            while (c <= board.cols - len) {
                const first = board.get(r, c);
                if (!first) { c++; continue; }
                
                let ok = true;
                for (let i = 1; i < len; i++) {
                    const p = board.get(r, c + i);
                    if (!p || p.id !== first.id) { ok = false; break; }
                }
                
                if (ok) {
                    let ext = len;
                    while (c + ext < board.cols && board.get(r, c + ext)?.id === first.id) ext++;
                    for (let i = 0; i < ext; i++) {
                        matches.add(posToKey(r, c + i));
                    }
                    c += ext;
                } else {
                    c++;
                }
            }
        }
        
        // 垂直
        for (let c = 0; c < board.cols; c++) {
            let r = 0;
            while (r <= board.rows - len) {
                const first = board.get(r, c);
                if (!first) { r++; continue; }
                
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
                    r += ext;
                } else {
                    r++;
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
        
        // 右下
        for (let r = 0; r <= board.rows - len; r++) {
            for (let c = 0; c <= board.cols - len; c++) {
                const first = board.get(r, c);
                if (!first) continue;
                let ok = true;
                for (let i = 1; i < len; i++) {
                    if (board.get(r + i, c + i)?.id !== first.id) { ok = false; break; }
                }
                if (ok) {
                    for (let i = 0; i < len; i++) matches.add(posToKey(r + i, c + i));
                }
            }
        }
        
        // 左下
        for (let r = 0; r <= board.rows - len; r++) {
            for (let c = len - 1; c < board.cols; c++) {
                const first = board.get(r, c);
                if (!first) continue;
                let ok = true;
                for (let i = 1; i < len; i++) {
                    if (board.get(r + i, c - i)?.id !== first.id) { ok = false; break; }
                }
                if (ok) {
                    for (let i = 0; i < len; i++) matches.add(posToKey(r + i, c - i));
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