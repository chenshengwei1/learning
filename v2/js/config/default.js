// ==================== 默认配置 ====================

function createDefaultConfig() {
    return Utils.deepClone(DEFAULT_CONFIG);
}

// 预设配置
const PRESET_CONFIGS = {
    classic: {
        name: '经典模式',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 30, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: false, timeLimitSeconds: 90,
            targetScoreEnabled: true, targetScore: 50000,
            baseScore: 10, comboMultiplier: true
        }
    },
    timed: {
        name: '限时挑战',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 999, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: true, timeLimitSeconds: 60,
            targetScoreEnabled: true, targetScore: 30000,
            baseScore: 15, comboMultiplier: true
        }
    },
    challenge: {
        name: '挑战关卡',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 20, matchLength: 3,
            enableSquare: true, enableDiagonal: true, enableDrag: true,
            enableTimeLimit: false, timeLimitSeconds: 90,
            targetScoreEnabled: true, targetScore: 80000,
            baseScore: 20, comboMultiplier: true
        }
    }
};