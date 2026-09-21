// ==================== HUD ====================

class HUD {
    constructor(game) {
        this.game = game;
    }
    
    update() {
        const g = this.game;
        
        this._setText('score', g.score);
        this._setText('moves', g.movesLeft);
        this._setText('combo', g.comboCount);
        
        // 时间
        if (g.config.enableTimeLimit && g.mode === 'game') {
            this._setText('time-left', g.timerSystem.timeLeft);
        } else {
            this._setText('time-left', '∞');
        }
        
        // 目标进度
        this._renderGoals();
        
        // 警告样式
        this._toggleClass('moves', 'warning', g.movesLeft <= 5, true);
        this._toggleClass('time-left', 'warning',
            g.config.enableTimeLimit && g.timerSystem.timeLeft <= 10, true);
    }
    
    _renderGoals() {
        const el = document.getElementById('goals');
        if (!el) return;
        
        const progress = this.game.goalSystem.getProgress();
        if (!progress || progress.length === 0) {
            el.innerHTML = '';
            return;
        }
        
        el.innerHTML = progress.map(p => {
            let text = p.label;
            if (p.progress) {
                text += ` ${p.progress.current}/${p.progress.target}`;
            }
            const cls = p.achieved ? 'goal-item achieved' : 'goal-item';
            return `<div class="${cls}">${text}</div>`;
        }).join('');
    }
    
    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
    
    _toggleClass(id, className, condition, parent = false) {
        const el = document.getElementById(id);
        if (!el) return;
        const target = parent ? el.parentElement : el;
        if (target) target.classList.toggle(className, condition);
    }
}

window.HUD = HUD;