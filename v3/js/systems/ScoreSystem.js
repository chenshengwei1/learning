// ==================== ScoreSystem 计分系统 ====================

class ScoreSystem {
    constructor(config) {
        this.updateConfig(config);
    }
    
    updateConfig(config) {
        this.baseScore = config.baseScore || 10;
        this.comboMultiplier = config.comboMultiplier !== false;
    }
    
    calculate(matchCount, comboCount = 1, extra = {}) {
        let score = matchCount * this.baseScore;
        
        if (this.comboMultiplier && comboCount > 1) {
            score *= comboCount;
        }
        
        if (extra.special) score *= 2;
        if (extra.bonus) score += extra.bonus;
        
        return Math.round(score);
    }
}

window.ScoreSystem = ScoreSystem;