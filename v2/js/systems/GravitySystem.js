// ==================== GravitySystem 重力系统 ====================

class GravitySystem {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * 应用重力
     * 返回 { changed: Set<key>, drops: Array<{ from, to, piece, isNew }> }
     */
    apply() {
        const changed = new Set();
        const drops = [];
        const board = this.game.board;
        
        for (let c = 0; c < board.cols; c++) {
            const result = this._applyColumn(c);
            for (const key of result.changed) changed.add(key);
            for (const drop of result.drops) drops.push(drop);
        }
        
        return { changed, drops };
    }
    
    applyColumn(c) {
        return this._applyColumn(c);
    }
    
    _applyColumn(c) {
        const changed = new Set();
        const drops = [];
        const board = this.game.board;
        
        // 收集当前列的所有非空棋子（从上到下）
        const existingPieces = [];
        for (let r = 0; r < board.rows; r++) {
            const p = board.get(r, c);
            if (p) {
                existingPieces.push({ piece: p, originalRow: r });
            }
        }
        
        // 从底部向上填充
        let pieceIdx = existingPieces.length - 1;
        
        for (let r = board.rows - 1; r >= 0; r--) {
            const currentPiece = board.get(r, c);
            
            if (pieceIdx >= 0) {
                // 有存量棋子
                const { piece, originalRow } = existingPieces[pieceIdx];
                
                if (originalRow !== r) {
                    // 棋子需要下落
                    board.set(r, c, piece);
                    board.set(originalRow, c, null);
                    changed.add(posToKey(r, c));
                    drops.push({
                        from: { r: originalRow, c },
                        to: { r, c },
                        piece,
                        isNew: false,
                        distance: r - originalRow
                    });
                }
                
                pieceIdx--;
            } else {
                // 需要生成新棋子
                const newPiece = this.game.pieceFactory.random();
                board.set(r, c, newPiece);
                changed.add(posToKey(r, c));
                drops.push({
                    from: { r: -1 - (board.rows - 1 - r), c },  // 从顶部之上
                    to: { r, c },
                    piece: newPiece,
                    isNew: true,
                    distance: r + 1 + (board.rows - 1 - r)  // 计算总距离
                });
            }
        }
        
        return { changed, drops };
    }
}

window.GravitySystem = GravitySystem;