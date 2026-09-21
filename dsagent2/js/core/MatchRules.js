// ==================== 匹配规则类 ====================


class MatchRule { 
    constructor(cfg) { this.config = cfg; this.name = 'base'; } 
    check(b, r, c) { return new Set(); } 
    get priority() { return 0; } 
}

class LineMatchRule extends MatchRule {
    constructor(cfg) { super(cfg); this.matchLength = cfg.matchLength || 3; }
    get priority() { return 10; }
    check(board, rows, cols) {
        const matches = new Set(), len = this.matchLength;
        for (let r = 0; r < rows; r++) {
            if (!board[r]) continue; 
            let c = 0;
            while (c <= cols - len) {
                const base = board[r][c]; 
                if (!base) { c++; continue; }
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r][c + i] || board[r][c + i].typeId !== base.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (c + ext < cols && board[r][c + ext]?.typeId === base.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r, c + i, cols)); 
                    c += ext;
                } else c++;
            }
        }
        for (let c = 0; c < cols; c++) {
            let r = 0;
            while (r <= rows - len) {
                if (!board[r]?.[c]) { r++; continue; } 
                const base = board[r][c];
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r + i]?.[c] || board[r + i][c].typeId !== base.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (r + ext < rows && board[r + ext]?.[c]?.typeId === base.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r + i, c, cols)); 
                    r += ext;
                } else r++;
            }
        }
        return matches;
    }
}

class SquareMatchRule extends MatchRule {
    constructor(cfg) { super(cfg); this.name = 'square'; }
    get priority() { return 5; }
    check(board, rows, cols) {
        const matches = new Set();
        for (let r = 0; r < rows - 1; r++) {
            if (!board[r]) continue;
            for (let c = 0; c < cols - 1; c++) {
                const t = board[r][c]; 
                if (!t) continue;
                const ri = board[r][c + 1], 
                      dn = board[r + 1]?.[c], 
                      dg = board[r + 1]?.[c + 1];
                if (ri?.typeId === t.typeId && dn?.typeId === t.typeId && dg?.typeId === t.typeId) {
                    matches.add(rcToIdx(r, c, cols)); 
                    matches.add(rcToIdx(r, c + 1, cols)); 
                    matches.add(rcToIdx(r + 1, c, cols)); 
                    matches.add(rcToIdx(r + 1, c + 1, cols));
                }
            }
        } 
        return matches;
    }
}

class DiagonalMatchRule extends MatchRule {
    constructor(cfg) { super(cfg); this.name = 'diagonal'; this.matchLength = cfg.matchLength || 3; }
    get priority() { return 8; }
    check(board, rows, cols) {
        const matches = new Set(), len = this.matchLength;
        for (let r = 0; r <= rows - len; r++) {
            if (!board[r]) continue;
            for (let c = 0; c <= cols - len; c++) {
                const t = board[r][c]; 
                if (!t) continue;
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r + i]?.[c + i] || board[r + i][c + i].typeId !== t.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (r + ext < rows && c + ext < cols && board[r + ext]?.[c + ext]?.typeId === t.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r + i, c + i, cols));
                }
            }
        }
        for (let r = 0; r <= rows - len; r++) {
            if (!board[r]) continue;
            for (let c = len - 1; c < cols; c++) {
                const t = board[r][c]; 
                if (!t) continue;
                let ok = true; 
                for (let i = 1; i < len; i++) { 
                    if (!board[r + i]?.[c - i] || board[r + i][c - i].typeId !== t.typeId) { ok = false; break; } 
                }
                if (ok) {
                    let ext = len; 
                    while (r + ext < rows && c - ext >= 0 && board[r + ext]?.[c - ext]?.typeId === t.typeId) ext++;
                    for (let i = 0; i < ext; i++) matches.add(rcToIdx(r + i, c - i, cols));
                }
            }
        } 
        return matches;
    }
}
// 文件末尾：
window.MatchRule = MatchRule;
window.LineMatchRule = LineMatchRule;
window.SquareMatchRule = SquareMatchRule;
window.DiagonalMatchRule = DiagonalMatchRule;