/**
 * 设置面板
 * 提供游戏设置功能
 */
class SettingsPanel {
    constructor(configManager, soundManager) {
        this.configManager = configManager;
        this.soundManager = soundManager;

        this.panel = null;
        this.closeBtn = null;
    }

    /**
     * 初始化
     */
    init() {
        this.panel = document.getElementById('settings-panel');
        this.closeBtn = document.getElementById('close-settings');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.open());
        }

        this.renderSettings();
    }

    /**
     * 渲染设置项
     */
    renderSettings() {
        // 音效设置
        const soundToggle = document.createElement('div');
        soundToggle.innerHTML = `
            <label>
                <input type="checkbox" id="sound-toggle" ${this.configManager.get('soundEnabled') ? 'checked' : ''}>
                音效
            </label>
        `;
        this.panel.appendChild(soundToggle);

        soundToggle.querySelector('input').addEventListener('change', (e) => {
            this.configManager.set('soundEnabled', e.target.checked);
            this.soundManager.toggleSound(e.target.checked);
        });

        // 难度设置
        const difficultySelect = document.createElement('div');
        difficultySelect.innerHTML = `
            <label>
                难度:
                <select id="difficulty-select">
                    <option value="easy">简单</option>
                    <option value="normal" selected>普通</option>
                    <option value="hard">困难</option>
                </select>
            </label>
        `;
        this.panel.appendChild(difficultySelect);

        difficultySelect.querySelector('select').addEventListener('change', (e) => {
            this.configManager.set('difficulty', e.target.value);
        });
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
}
