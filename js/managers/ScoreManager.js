/**
 * 分数系统
 * 负责游戏分数的计算和显示
 */
class ScoreManager {
    constructor() {
        this.score = 0;
        this.highScore = 0;
        this.element = null;
    }

    /**
     * 初始化
     */
    init() {
        this.element = document.getElementById('score-display');
        this.highScore = parseInt(Cache.get('high_score')) || 0;
        this.updateDisplay();
    }

    /**
     * 添加分数
     */
    addScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            Cache.set('high_score', this.highScore);
        }
        this.updateDisplay();
    }

    /**
     * 重置分数
     */
    reset() {
        this.score = 0;
        this.updateDisplay();
    }

    /**
     * 更新显示
     */
    updateDisplay() {
        if (this.element) {
            this.element.textContent = `得分: ${this.score} | 最高: ${this.highScore}`;
        }
    }

    /**
     * 获取当前分数
     */
    getScore() {
        return this.score;
    }

    /**
     * 获取最高分数
     */
    getHighScore() {
        return this.highScore;
    }
}
