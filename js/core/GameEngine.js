/**
 * 核心游戏引擎
 * 负责棋盘管理、棋子操作、动画控制
 */
class GameEngine {
    constructor(options) {
        this.boardSize = options.boardSize || 8;
        this.pieceTypes = options.pieceTypes || [];
        this.scoreManager = options.scoreManager;
        this.soundManager = options.soundManager;

        this.board = [];
        this.selectedPiece = null;
        this.isAnimating = false;
        this.gameOver = false;

        this.boardElement = document.getElementById('game-board');
        this.scoreElement = document.getElementById('score-display');
    }

    /**
     * 初始化游戏
     */
    init() {
        this.createBoard();
        this.renderBoard();
        this.bindEvents();
    }

    /**
     * 创建棋盘数据
     */
    createBoard() {
        this.board = [];
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = this.createRandomPiece(row, col);
            }
        }
        // 消除初始匹配
        this.removeInitialMatches();
    }

    /**
     * 创建随机棋子
     */
    createRandomPiece(row, col) {
        const type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        return new Piece(row, col, type);
    }

    /**
     * 移除初始匹配
     */
    removeInitialMatches() {
        let matches = MatchRules.findMatches(this.board);
        while (matches.length > 0) {
            matches.forEach(match => {
                match.positions.forEach(({ row, col }) => {
                    this.board[row][col] = this.createRandomPiece(row, col);
                });
            });
            matches = MatchRules.findMatches(this.board);
        }
    }

    /**
     * 渲染棋盘
     */
    renderBoard() {
        this.boardElement.innerHTML = '';
        const cellSize = this.boardElement.offsetWidth / this.boardSize;

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = piece.createElement(cellSize);
                    pieceElement.dataset.row = row;
                    pieceElement.dataset.col = col;
                    this.boardElement.appendChild(pieceElement);
                }
            }
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        this.boardElement.addEventListener('click', (e) => {
            if (this.isAnimating || this.gameOver) return;

            const pieceElement = e.target.closest('.piece');
            if (!pieceElement) return;

            const row = parseInt(pieceElement.dataset.row);
            const col = parseInt(pieceElement.dataset.col);
            this.onPieceClick(row, col);
        });
    }

    /**
     * 棋子点击处理
     */
    onPieceClick(row, col) {
        if (!this.selectedPiece) {
            this.selectedPiece = { row, col };
            this.highlightPiece(row, col);
        } else {
            const prevRow = this.selectedPiece.row;
            const prevCol = this.selectedPiece.col;

            // 检查是否相邻
            if (this.isAdjacent(prevRow, prevCol, row, col)) {
                this.swapPieces(prevRow, prevCol, row, col);
            }

            this.clearHighlight();
            this.selectedPiece = null;
        }
    }

    /**
     * 检查是否相邻
     */
    isAdjacent(row1, col1, row2, col2) {
        return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
               (Math.abs(col1 - col2) === 1 && row1 === row2);
    }

    /**
     * 交换棋子
     */
    async swapPieces(row1, col1, row2, col2) {
        this.isAnimating = true;

        // 交换数据
        [this.board[row1][col1], this.board[row2][col2]] =
        [this.board[row2][col2], this.board[row1][col1]];

        this.renderBoard();
        await this.waitForAnimation();

        // 检查匹配
        const matches = MatchRules.findMatches(this.board);
        if (matches.length > 0) {
            await this.processMatches(matches);
        } else {
            // 交换回来
            [this.board[row1][col1], this.board[row2][col2]] =
            [this.board[row2][col2], this.board[row1][col1]];
            this.renderBoard();
            this.soundManager.play('swap');
        }

        this.isAnimating = false;
    }

    /**
     * 处理匹配
     */
    async processMatches(matches) {
        this.soundManager.play('match');

        // 计算分数
        let score = 0;
        matches.forEach(match => {
            score += match.positions.length * 10;
        });
        this.scoreManager.addScore(score);

        // 消除棋子
        const uniquePositions = new Set();
        matches.forEach(match => {
            match.positions.forEach(pos => {
                uniquePositions.add(`${pos.row},${pos.col}`);
            });
        });

        uniquePositions.forEach(key => {
            const [row, col] = key.split(',').map(Number);
            this.board[row][col] = null;
        });

        this.renderBoard();
        await this.waitForAnimation();

        // 下落填充
        await this.applyGravity();

        // 继续检查匹配
        const newMatches = MatchRules.findMatches(this.board);
        if (newMatches.length > 0) {
            await this.processMatches(newMatches);
        }
    }

    /**
     * 重力下落
     */
    async applyGravity() {
        for (let col = 0; col < this.boardSize; col++) {
            let emptyRow = this.boardSize - 1;
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    if (row !== emptyRow) {
                        this.board[emptyRow][col] = this.board[row][col];
                        this.board[row][col] = null;
                        if (this.board[emptyRow][col]) {
                            this.board[emptyRow][col].row = emptyRow;
                        }
                    }
                    emptyRow--;
                }
            }
            // 填充新棋子
            for (let row = emptyRow; row >= 0; row--) {
                this.board[row][col] = this.createRandomPiece(row, col);
            }
        }
        this.renderBoard();
        await this.waitForAnimation();
    }

    /**
     * 高亮棋子
     */
    highlightPiece(row, col) {
        const piece = this.board[row][col];
        if (piece) {
            piece.highlight();
        }
    }

    /**
     * 清除高亮
     */
    clearHighlight() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    piece.unhighlight();
                }
            }
        }
    }

    /**
     * 等待动画完成
     */
    waitForAnimation() {
        return new Promise(resolve => {
            setTimeout(resolve, 300);
        });
    }
}
