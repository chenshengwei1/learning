// ==================== GravitySystem 重力系统 ====================

class GravitySystem {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * 应用重力，返回变化信息
     * @returns { changed: Set, drops: Array }
     */
    apply() {
        const changed = new Set();
        const drops = [];
        const board = this.game.board;
        
        // ← 新增：打印 apply 前的棋盘状态
        if (window.__DEBUG_GRAVITY__) {
            console.log('=== GravitySystem.apply() 开始 ===');
            console.log('apply 前棋盘:');
            this._debugPrintBoard();
        }
        
        for (let c = 0; c < board.cols; c++) {
            const result = this._applyColumn(c);
            for (const key of result.changed) changed.add(key);
            for (const drop of result.drops) drops.push(drop);
        }
        
        // ← 新增：打印 apply 后的棋盘状态 + drops
        if (window.__DEBUG_GRAVITY__) {
            console.log('apply 后棋盘:');
            this._debugPrintBoard();
            console.log('changed 格子:', [...changed]);
            console.log('drops 详情:');
            drops.forEach(d => {
                console.log(`  ${d.piece.id} 从 (${d.from.r},${d.from.c}) 到 (${d.to.r},${d.to.c})${d.isNew ? ' [新棋子]' : ''}`);
            });
            console.log('=== GravitySystem.apply() 结束 ===');
        }
        
        return { changed, drops };
    }

    // ← 新增：辅助方法
    _debugPrintBoard() {
        const board = this.game.board;
        const lines = [];
        for (let r = 0; r < board.rows; r++) {
            let line = `r${r}: `;
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                if (!p) {
                    line += '[空 ] ';
                } else {
                    // 用 id 的前 3 字符
                    const id = p.id.substring(0, 3).padEnd(3, ' ');
                    line += `[${id}] `;
                }
            }
            lines.push(line);
        }
        console.log(lines.join('\n'));
    }
    
    _applyColumn(c) {
        const changed = new Set();
        const drops = [];
        const board = this.game.board;
        
        // 1. 收集当前列所有"有效格子"里的棋子
        //    只收集 layout=1 的位置
        const pieces = [];
        for (let r = 0; r < board.rows; r++) {
            if (board.layout[r][c] !== 1) continue;   // ← 跳过无效格子
            const p = board.get(r, c);
            if (p) pieces.push({ piece: p, originalRow: r });
        }
        
        // 2. 收集所有"有效格子"的位置（从下到上）
        const validCells = [];
        for (let r = board.rows - 1; r >= 0; r--) {
            if (board.layout[r][c] !== 1) continue;
            validCells.push(r);
        }
        
        // 3. 从底部有效格开始，依次填棋子
        let pieceIdx = pieces.length - 1;
        
        for (const r of validCells) {
            if (pieceIdx >= 0) {
                // 有存量棋子 → 移动过去
                const { piece, originalRow } = pieces[pieceIdx];
                
                if (originalRow !== r) {
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
                // 需要新棋子 → 生成
                const newPiece = this.game.pieceFactory.random();
                if (!newPiece) {
                    console.error('PieceFactory.random() 返回 null');
                    continue;
                }
                
                board.set(r, c, newPiece);
                changed.add(posToKey(r, c));
                drops.push({
                    from: { r: r - board.rows - 1, c },
                    to: { r, c },
                    piece: newPiece,
                    isNew: true,
                    distance: board.rows + 1
                });
            }
        }
        
        return { changed, drops };
    }
}

window.GravitySystem = GravitySystem;