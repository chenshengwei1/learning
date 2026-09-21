// ==================== GoalSystem 目标系统 ====================

class GoalSystem {
    constructor(game, registries) {
        this.game = game;
        this.registries = registries;
        this.goals = [];       // 当前关卡的目标配置
        this.initialSnapshot = null;
    }
    
    /**
     * 设置关卡目标
     */
    setGoals(goals) {
        this.goals = goals || [];
        // 记录初始快照
        this.initialSnapshot = {
            targetCount: this.game.board.targets.length,
            score: this.game.score,
            moves: this.game.movesLeft,
            time: this.game.timeLeft
        };
    }
    
    /**
     * 检查所有目标
     * @returns { status: 'win' | 'lose' | 'continue', goals: [...] }
     */
    check() {
        const results = this.goals.map(goal => this._checkGoal(goal));
        
        const achieved = results.filter(r => r.achieved);
        const failed = results.filter(r => r.failed);
        
        // 任一目标达成 → 胜利
        if (achieved.length > 0) {
            return { status: 'win', achieved, failed, results };
        }
        
        // 失败条件（步数/时间耗尽）
        const hasFailCondition = failed.length > 0;
        if (hasFailCondition) {
            return { status: 'lose', achieved, failed, results };
        }
        
        return { status: 'continue', achieved, failed, results };
    }
    
    _checkGoal(goal) {
        const def = this.registries.goals.get(goal.type);
        if (!def) {
            return { goal, achieved: false, failed: false };
        }
        
        const achieved = def.check(this.game, goal);
        const progress = def.progress ? def.progress(this.game, goal) : null;
        
        return {
            goal,
            achieved,
            failed: false,
            progress,
            label: def.meta?.label || goal.type
        };
    }
    
    /**
     * 获取所有目标的进度（用于 HUD 显示）
     */
    getProgress() {
        return this.goals.map(goal => {
            const def = this.registries.goals.get(goal.type);
            if (!def) return null;
            return {
                type: goal.type,
                label: def.meta?.label || goal.type,
                progress: def.progress ? def.progress(this.game, goal) : null,
                achieved: def.check(this.game, goal)
            };
        }).filter(Boolean);
    }
}

window.GoalSystem = GoalSystem;