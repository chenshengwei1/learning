// ==================== GoalSystem 目标系统 ====================

class GoalSystem {
    constructor(game) {
        this.game = game;
        this.goals = [];
    }
    
    register(goal) {
        this.goals.push(goal);
        return this;
    }
    
    clear() {
        this.goals = [];
    }
    
    check() {
        const achieved = [];
        const failed = [];
        
        for (const goal of this.goals) {
            if (!goal.enabled(this.game)) continue;
            
            if (goal.isAchieved(this.game)) {
                achieved.push(goal);
            } else if (goal.isFailed && goal.isFailed(this.game)) {
                failed.push(goal);
            }
        }
        
        if (achieved.length > 0) {
            return { status: 'win', achieved, failed };
        }
        if (failed.length > 0) {
            return { status: 'lose', achieved, failed };
        }
        return { status: 'continue', achieved, failed };
    }
    
    getProgress() {
        return this.goals.map(g => ({
            name: g.name,
            enabled: g.enabled(this.game),
            progress: g.getProgress(this.game)
        }));
    }
}

// ===== 内置目标 =====

class ScoreGoal {
    constructor() {
        this.name = '分数目标';
    }
    
    enabled(game) {
        return game.config.targetScoreEnabled !== false;
    }
    
    isAchieved(game) {
        return game.score >= game.config.targetScore;
    }
    
    getProgress(game) {
        return {
            current: game.score,
            target: game.config.targetScore
        };
    }
}

class EliminateGoal {
    constructor() {
        this.name = '消除目标';
    }
    
    enabled(game) {
        return game.config.requiredPieceEnabled === true;
    }
    
    isAchieved(game) {
        const type = game.config.requiredPieceType;
        const count = game.config.requiredPieceCount;
        return (game.elimCounts[type] || 0) >= count;
    }
    
    getProgress(game) {
        const type = game.config.requiredPieceType;
        return {
            type,
            current: game.elimCounts[type] || 0,
            target: game.config.requiredPieceCount
        };
    }
}

class MovesGoal {
    constructor() {
        this.name = '步数目标';
    }
    
    enabled() {
        return true;
    }
    
    isAchieved() {
        return false;
    }
    
    isFailed(game) {
        return game.movesLeft <= 0;
    }
    
    getProgress(game) {
        return {
            current: game.movesLeft,
            target: game.config.totalMoves
        };
    }
}

class TimeGoal {
    constructor() {
        this.name = '时间目标';
    }
    
    enabled(game) {
        return game.config.enableTimeLimit === true;
    }
    
    isAchieved() {
        return false;
    }
    
    isFailed(game) {
        return game.timeLeft <= 0;
    }
    
    getProgress(game) {
        return {
            current: game.timeLeft,
            target: game.config.timeLimitSeconds
        };
    }
}

window.GoalSystem = GoalSystem;
window.ScoreGoal = ScoreGoal;
window.EliminateGoal = EliminateGoal;
window.MovesGoal = MovesGoal;
window.TimeGoal = TimeGoal;