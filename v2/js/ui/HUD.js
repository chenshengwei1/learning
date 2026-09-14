// ==================== HUD 界面管理器 ====================

class HUD {
    constructor(game) {
        this.game = game;
    }
    
    update() {
        const g = this.game;
        
        this._setText('score', g.score);
        this._setText('moves', g.movesLeft);
        this._setText('combo', g.comboCount);
        
        // 目标
        let targetText = '';
        if (g.config.targetScoreEnabled !== false) {
            targetText = String(g.config.targetScore);
        } else {
            targetText = '—';
        }
        if (g.config.requiredPieceEnabled) {
            const type = g.config.requiredPieceType;
            const cur = g.elimCounts[type] || 0;
            const tgt = g.config.requiredPieceCount;
            targetText += ` · ${type}×${tgt}[${cur}]`;
        }
        this._setText('target-score', targetText);
        
        // 时间
        if (g.config.enableTimeLimit && g.mode === 'game') {
            this._setText('time-left', g.timerSystem.timeLeft);
        } else {
            this._setText('time-left', '∞');
        }
        
        // 警告样式
        this._toggleClass('moves', 'warning', g.movesLeft <= 5, true);
        this._toggleClass('time-left', 'warning', 
            g.config.enableTimeLimit && g.timerSystem.timeLeft <= 10, true);
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