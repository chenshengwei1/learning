/**
 * 棋子类
 * 表示棋盘上的单个棋子
 */
class Piece {
    constructor(row, col, type) {
        this.row = row;
        this.col = col;
        this.type = type;
        this.element = null;
        this.isHighlighted = false;
    }

    /**
     * 创建DOM元素
     */
    createElement(cellSize) {
        const element = document.createElement('div');
        element.className = `piece piece-${this.type}`;
        element.style.width = `${cellSize - 4}px`;
        element.style.height = `${cellSize - 4}px`;
        element.style.background = this.getTypeColor(this.type);
        element.style.borderRadius = '50%';
        this.element = element;
        return element;
    }

    /**
     * 获取棋子颜色
     */
    getTypeColor(type) {
        const colors = {
            'red': '#e74c3c',
            'blue': '#3498db',
            'green': '#2ecc71',
            'yellow': '#f1c40f',
            'purple': '#9b59b6',
            'orange': '#e67e22'
        };
        return colors[type] || '#95a5a6';
    }

    /**
     * 高亮棋子
     */
    highlight() {
        if (this.element && !this.isHighlighted) {
            this.element.style.boxShadow = '0 0 10px 3px #fff';
            this.element.style.transform = 'scale(1.1)';
            this.isHighlighted = true;
        }
    }

    /**
     * 取消高亮
     */
    unhighlight() {
        if (this.element && this.isHighlighted) {
            this.element.style.boxShadow = '';
            this.element.style.transform = '';
            this.isHighlighted = false;
        }
    }

    /**
     * 更新位置
     */
    updatePosition(row, col) {
        this.row = row;
        this.col = col;
        if (this.element) {
            this.element.dataset.row = row;
            this.element.dataset.col = col;
        }
    }
}
