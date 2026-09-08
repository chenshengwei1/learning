/**
 * 音效系统
 * 负责管理游戏音效和背景音乐
 */
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.musicEnabled = true;
    }

    /**
     * 加载音效
     */
    load() {
        // 初始化音效（这里使用 Web Audio API 或简单的音频元素）
        this.sounds['match'] = this.createSound('match');
        this.sounds['swap'] = this.createSound('swap');
        this.sounds['click'] = this.createSound('click');
    }

    /**
     * 创建音效
     */
    createSound(name) {
        // 实际项目中可以加载音频文件
        // 这里返回一个占位函数
        return {
            play: () => {
                if (this.enabled) {
                    console.log(`[Sound] Playing: ${name}`);
                }
            }
        };
    }

    /**
     * 播放音效
     */
    play(name) {
        if (this.sounds[name]) {
            this.sounds[name].play();
        }
    }

    /**
     * 切换音效开关
     */
    toggleSound(enabled) {
        this.enabled = enabled;
    }

    /**
     * 切换音乐开关
     */
    toggleMusic(enabled) {
        this.musicEnabled = enabled;
    }
}
