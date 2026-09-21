// ==================== 音效系统 ====================

class SoundSystem {
    constructor() {
        this.enabled = true;
        this.ctx = null;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch { }
    }
    
    play(type) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            const configs = {
                match: { freq: 523, duration: 0.12, vol: 0.15 },
                combo: { freq: 659, duration: 0.15, vol: 0.18 },
                explosion: { freq: 880, duration: 0.2, vol: 0.2 },
                fail: { freq: 300, duration: 0.15, vol: 0.12 },
                win: { freq: 784, duration: 0.25, vol: 0.2 }
            };
            
            const cfg = configs[type] || configs.match;
            osc.frequency.value = cfg.freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(cfg.vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + cfg.duration);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + cfg.duration);
        } catch { }
    }
}

// 文件末尾：
window.SoundSystem = SoundSystem;