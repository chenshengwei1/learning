// ==================== 预设配置 ====================

const PRESET_CONFIGS = {
    
    classic: {
        name: '经典模式',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 30, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: false,
            baseScore: 10, comboMultiplier: true,
            gravitySpeed: 1.0
        }
    },
    
    timed: {
        name: '限时挑战',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 999, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: true, timeLimitSeconds: 60,
            baseScore: 15, comboMultiplier: true,
            gravitySpeed: 1.0
        }
    },
    
    relaxed: {
        name: '休闲模式',
        config: {
            rows: 8, cols: 8, cellSize: 70, gap: 6,
            totalMoves: 50, matchLength: 3,
            enableSquare: true, enableDiagonal: true, enableDrag: true,
            enableTimeLimit: false,
            baseScore: 20, comboMultiplier: true,
            gravitySpeed: 0.7
        }
    },
    
    expert: {
        name: '专家模式',
        config: {
            rows: 10, cols: 10, cellSize: 55, gap: 3,
            totalMoves: 20, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: false,
            baseScore: 15, comboMultiplier: true,
            gravitySpeed: 1.5
        }
    }
};