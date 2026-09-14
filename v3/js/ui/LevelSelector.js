// ==================== LevelSelector ====================

class LevelSelector {
    constructor(game, configLoader) {
        this.game = game;
        this.configLoader = configLoader;
    }
    
    init() {
        this._renderList();
        this._bindEvents();
    }
    
    _renderList() {
        const el = document.getElementById('level-list');
        if (!el) return;
        
        const levels = this.configLoader.getLevels();
        if (!levels.length) {
            el.innerHTML = '<div class="level-pill"><span>暂无关卡</span></div>';
            return;
        }
        
        el.innerHTML = '';
        levels.forEach(level => {
            const row = document.createElement('div');
            row.className = 'level-pill';
            if (level.id === this.game.config.levelId) {
                row.classList.add('active');
            }
            
            const name = document.createElement('span');
            name.textContent = level.name;
            row.appendChild(name);
            
            const btn = document.createElement('button');
            btn.textContent = '开始';
            btn.addEventListener('click', () => {
                this.loadLevel(level.id);
            });
            row.appendChild(btn);
            
            el.appendChild(row);
        });
    }
    
    loadLevel(levelId) {
        const level = this.configLoader.getLevel(levelId);
        if (!level) return;
        
        const config = this.configLoader.levelToConfig(level);
        config.levelId = levelId;   // ← 新增：确保 levelId 同步
        this.game.applyConfig(config);
        this.game.setMode('game');
        this.game.showMessage(`🎮 开始：${level.name}`);
        
        this._renderList();
    }
    
    _bindEvents() {
        document.getElementById('level-selector-btn')?.addEventListener('click', () => {
            const panel = document.getElementById('level-panel');
            if (panel) panel.classList.toggle('hidden');
        });
    }
}

window.LevelSelector = LevelSelector;