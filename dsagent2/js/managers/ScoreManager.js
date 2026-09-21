// ==================== 分数系统 ====================

class ScoreSystem {
    constructor(cfg) { 
        this.baseScore = cfg.baseScore || 10; 
        this.comboMultiplier = cfg.comboMultiplier !== false; 
    }
    
    calculate(matchCount, comboCount, extra = {}) {
        let score = matchCount * this.baseScore * (this.comboMultiplier ? comboCount : 1);
        if (extra.bonus) score += extra.bonus; 
        if (extra.special) score *= 2; 
        return Math.round(score);
    }
}

// 文件末尾：
window.ScoreSystem = ScoreSystem;