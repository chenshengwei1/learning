/**
 * 配置管理器
 * 负责加载、保存和管理游戏配置
 */
class ConfigManager {
    constructor() {
        this.defaults = {
            boardSize: 8,
            pieceTypes: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'],
            soundEnabled: true,
            musicEnabled: true,
            difficulty: 'normal'
        };
        this.config = {};
    }

    /**
     * 加载配置
     */
    load() {
        const saved = Cache.get('game_config');
        if (saved) {
            this.config = { ...this.defaults, ...saved };
        } else {
            this.config = { ...this.defaults };
        }
        return this.config;
    }

    /**
     * 保存配置
     */
    save() {
        Cache.set('game_config', this.config);
    }

    /**
     * 获取配置项
     */
    get(key) {
        return this.config[key];
    }

    /**
     * 设置配置项
     */
    set(key, value) {
        this.config[key] = value;
        this.save();
    }

    /**
     * 重置配置
     */
    reset() {
        this.config = { ...this.defaults };
        this.save();
    }
}
