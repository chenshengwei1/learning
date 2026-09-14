// ==================== InputSystem 输入系统 ====================

class InputSystem {
    constructor(game) {
        this.game = game;
    }
    
    bindCell(cell, r, c) {
        let startX = null, startY = null, dragging = false;
        const threshold = this.game.config.dragThreshold || 15;
        const enableDrag = this.game.config.enableDrag !== false;
        
        cell.addEventListener('pointerdown', (e) => {
            if (this.game.isProcessing || this.game.isGameEnded) return;
            startX = e.clientX;
            startY = e.clientY;
            dragging = false;
            try { cell.setPointerCapture(e.pointerId); } catch {}
        });
        
        cell.addEventListener('pointermove', (e) => {
            if (startX === null || !enableDrag) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!dragging && Math.hypot(dx, dy) > threshold) {
                dragging = true;
                cell.classList.add('dragging');
            }
        });
        
        cell.addEventListener('pointerup', async (e) => {
            if (startX === null) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            if (dragging && enableDrag) {
                cell.classList.remove('dragging');
                let tr = r, tc = c;
                if (Math.abs(dx) > Math.abs(dy)) {
                    tc = c + (dx > 0 ? 1 : -1);
                } else {
                    tr = r + (dy > 0 ? 1 : -1);
                }
                startX = startY = null;
                dragging = false;
                
                if (!this.game.board.isInBounds(tr, tc)) {
                    this.game.selected = null;
                    this.game.renderSystem.renderAll();
                    return;
                }
                this.game.selected = null;
                await this.game.swap(r, c, tr, tc);
            } else {
                startX = startY = null;
                dragging = false;
                await this.game.handleCellClick(r, c);
            }
        });
    }
}

window.InputSystem = InputSystem;