// ==================== InputSystem 输入系统 ====================

class InputSystem {
    constructor(game) {
        this.game = game;
        this.isBoxSelecting = false;
        this.selectionStart = null;
        this.selectionBoxEl = null;
        this._globalBound = false;
    }
    
    bindCell(cell, r, c) {
        let startX = null, startY = null, dragging = false;
        const threshold = this.game.config.dragThreshold || 15;
        const enableDrag = this.game.config.enableDrag !== false;
        
        cell.addEventListener('pointerdown', (e) => {
            if (this.game.isProcessing || this.game.isGameEnded) return;
            
            // ← 新增：管理员 + 多选模式，且非 Ctrl 点击 → 开始框选
            if (this.game.mode === 'admin' && this.game.editorMode === 'multi' && !e.ctrlKey && !e.metaKey) {
                this._startBoxSelect(e);
                return;
            }
            
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
                await this.game.handleCellClick(r, c, e.ctrlKey || e.metaKey);
            }
        });
    }
    
    /**
     * 开始框选
     */
    _startBoxSelect(e) {
        this.isBoxSelecting = true;
        
        const boardEl = document.getElementById('board');
        if (!boardEl) return;
        
        // 创建或复用选择框
        if (!this.selectionBoxEl) {
            this.selectionBoxEl = document.createElement('div');
            this.selectionBoxEl.id = 'selection-box';
            boardEl.appendChild(this.selectionBoxEl);
        }
        
        const boardRect = boardEl.getBoundingClientRect();
        this.selectionStart = {
            x: e.clientX - boardRect.left,
            y: e.clientY - boardRect.top
        };
        
        this.selectionBoxEl.style.left = `${this.selectionStart.x}px`;
        this.selectionBoxEl.style.top = `${this.selectionStart.y}px`;
        this.selectionBoxEl.style.width = '0px';
        this.selectionBoxEl.style.height = '0px';
        this.selectionBoxEl.classList.add('active');
        
        // 绑定全局事件
        if (!this._globalBound) {
            this._globalBound = true;
            
            document.addEventListener('pointermove', (ev) => this._onBoxSelectMove(ev));
            document.addEventListener('pointerup', (ev) => this._onBoxSelectEnd(ev));
        }
    }
    
    _onBoxSelectMove(e) {
        if (!this.isBoxSelecting || !this.selectionBoxEl) return;
        
        const boardEl = document.getElementById('board');
        const boardRect = boardEl.getBoundingClientRect();
        
        const curX = e.clientX - boardRect.left;
        const curY = e.clientY - boardRect.top;
        
        const x = Math.min(this.selectionStart.x, curX);
        const y = Math.min(this.selectionStart.y, curY);
        const w = Math.abs(curX - this.selectionStart.x);
        const h = Math.abs(curY - this.selectionStart.y);
        
        this.selectionBoxEl.style.left = `${x}px`;
        this.selectionBoxEl.style.top = `${y}px`;
        this.selectionBoxEl.style.width = `${w}px`;
        this.selectionBoxEl.style.height = `${h}px`;
    }
    
    _onBoxSelectEnd(e) {
        if (!this.isBoxSelecting) return;
        this.isBoxSelecting = false;
        
        const boardEl = document.getElementById('board');
        const boardRect = boardEl.getBoundingClientRect();
        
        const endX = e.clientX - boardRect.left;
        const endY = e.clientY - boardRect.top;
        
        const x1 = Math.min(this.selectionStart.x, endX);
        const y1 = Math.min(this.selectionStart.y, endY);
        const x2 = Math.max(this.selectionStart.x, endX);
        const y2 = Math.max(this.selectionStart.y, endY);
        
        // 隐藏选择框
        this.selectionBoxEl.classList.remove('active');
        
        // 计算覆盖的格子
        const { cellSize, gap } = this.game.config;
        const unit = cellSize + gap;
        
        const cellsToSelect = new Set();
        for (let r = 0; r < this.game.board.rows; r++) {
            for (let c = 0; c < this.game.board.cols; c++) {
                const cx1 = c * unit;
                const cy1 = r * unit;
                const cx2 = cx1 + cellSize;
                const cy2 = cy1 + cellSize;
                
                // 矩形相交判断
                if (cx1 < x2 && cx2 > x1 && cy1 < y2 && cy2 > y1) {
                    cellsToSelect.add(posToKey(r, c));
                }
            }
        }
        
        // 更新选中状态
        if (cellsToSelect.size > 0) {
            this.game.selectedCells = cellsToSelect;
            this.game.selected = keyToPos([...cellsToSelect][0]);
            this.game.renderSystem.renderAll();
            
            // 打开编辑器
            if (this.game.adminPanel) {
                this.game.adminPanel.showCellEditorForMultiple([...cellsToSelect]);
            }
        }
        
        this.selectionStart = null;
    }
}

window.InputSystem = InputSystem;