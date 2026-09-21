// ==================== TimerSystem 计时系统 ====================

class TimerSystem {
    constructor(game) {
        this.game = game;
        this.timerId = null;
        this.timeLeft = 0;
        this.running = false;
        this.initialTime = 0;
    }
    
    start(seconds) {
        this.stop();
        if (!seconds || seconds <= 0) {
            this.timeLeft = 0;
            return;
        }
        
        this.timeLeft = seconds;
        this.initialTime = seconds;
        this.running = true;
        
        this.timerId = setInterval(() => {
            if (!this.running) return;
            this.timeLeft--;
            
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.stop();
                this.game.ruleRuntime?.emit('timer:expired', {});
            }
            
            this.game.ruleRuntime?.emit('timer:tick', { timeLeft: this.timeLeft });
            this.game.updateHUD();
        }, 1000);
    }
    
    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.running = false;
    }
    
    pause() {
        this.running = false;
    }
    
    resume() {
        if (this.timeLeft > 0) this.running = true;
    }
    
    reset(seconds) {
        this.stop();
        this.timeLeft = seconds || 0;
    }
}

window.TimerSystem = TimerSystem;