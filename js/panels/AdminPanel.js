/**
 * 管理员面板
 * 提供游戏管理功能
 */
class AdminPanel {
    constructor(configManager, scoreManager, gameEngine) {
        this.configManager = configManager;
        this.scoreManager = scoreManager;
        this.gameEngine = gameEngine;

        this.panel = null;
        this.closeBtn = null;
    }

    /**
     * 初始化
     */
    init() {
        this.panel = document.getElementById('admin-panel');
        this.closeBtn = document.getElementById('close-admin');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => this.open());
        }
    }

    /**
     * 打开面板
     */
    open() {
        this.panel.classList.remove('hidden');
    }

    /**
     * 关闭面板
     */
    close() {
        this.panel.classList.add('hidden');
    }

    /**
     * 重置游戏
     */
    resetGame() {
        this.scoreManager.reset();
        this.gameEngine.init();
    }
}
