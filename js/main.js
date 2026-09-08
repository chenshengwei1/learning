/**
 * 主入口文件
 * 负责初始化游戏和各个模块
 */
(function () {
    'use strict';

    /**
     * 初始化游戏
     */
    function initGame() {
        // 初始化配置管理器
        const configManager = new ConfigManager();
        configManager.load();

        // 初始化音效管理器
        const soundManager = new SoundManager();
        soundManager.load();

        // 初始化分数管理器
        const scoreManager = new ScoreManager();
        scoreManager.init();

        // 初始化游戏引擎
        const gameEngine = new GameEngine({
            boardSize: CONSTANTS.BOARD_SIZE,
            pieceTypes: CONSTANTS.PIECE_TYPES,
            scoreManager: scoreManager,
            soundManager: soundManager
        });
        gameEngine.init();

        // 初始化设置面板
        const settingsPanel = new SettingsPanel(configManager, soundManager);
        settingsPanel.init();

        // 初始化管理员面板
        const adminPanel = new AdminPanel(configManager, scoreManager, gameEngine);
        adminPanel.init();

        console.log('游戏初始化完成');
    }

    // 页面加载完成后初始化游戏
    document.addEventListener('DOMContentLoaded', initGame);
})();
