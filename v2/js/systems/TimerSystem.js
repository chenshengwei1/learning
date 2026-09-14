// ==================== TimerSystem 计时系统 ====================

class TimerSystem {
    constructor(game) {
        this.game = game;
        this.timerId = null;
        this.timeLeft = 0;
        this.running = false;
    }
    
    start(seconds) {
        this.stop();
        if (!seconds || seconds <= 0) {
            this.timeLeft = 0;
            return;
        }
        this.timeLeft = seconds;
        this.running = true;
        
        this.timerId = setInterval(() => {
            if (!this.running) return;
            this.timeLeft--;
            
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.stop();
                this.game.eventBus.emit('timer:expired', {});
            }
            
            this.game.eventBus.emit('timer:tick', { timeLeft: this.timeLeft });
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