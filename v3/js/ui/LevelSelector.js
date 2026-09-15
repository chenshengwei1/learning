// ==================== LevelSelector ====================

class LevelSelector {
    constructor(game, configLoader) {
        this.game = game;
        this.configLoader = configLoader;
    }
    
    init() {
        this._renderList();
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
            
            // 关卡名 + 类型标签
            const nameWrap = document.createElement('div');
            nameWrap.className = 'level-name-wrap';
            
            const name = document.createElement('span');
            name.textContent = level.name;
            nameWrap.appendChild(name);
            
            const tag = document.createElement('span');
            tag.className = level.isBuiltin ? 'level-tag builtin' : 'level-tag custom';
            tag.textContent = level.isBuiltin ? '内置' : '自定义';
            nameWrap.appendChild(tag);
            
            row.appendChild(nameWrap);
            
            // 开始按钮
            const btn = document.createElement('button');
            btn.textContent = '开始';
            btn.addEventListener('click', () => {
                this.loadLevel(level.id);
            });
            row.appendChild(btn);
            
            // 自定义关卡：加删除按钮
            if (!level.isBuiltin) {
                const delBtn = document.createElement('button');
                delBtn.textContent = '🗑️';
                delBtn.className = 'danger';
                delBtn.title = '删除';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._deleteLevel(level);
                });
                row.appendChild(delBtn);
            }
            
            el.appendChild(row);
        });
    }
    
    /**
     * 加载关卡（带确认弹窗）
     */
    loadLevel(levelId) {
        const level = this.configLoader.getLevel(levelId);
        if (!level) return;
        
        // ← 确认弹窗：防止误点
        const confirmed = confirm(`确定加载关卡「${level.name}」吗？\n\n当前的编辑内容将丢失。`);
        if (!confirmed) return;
        
        const config = this.configLoader.levelToConfig(level);
        this.game.applyConfig(config);
        this.game.showMessage(`✅ 已加载：${level.name}`);
        
        this._renderList();
    }
    
    /**
     * 删除自定义关卡
     */
    _deleteLevel(level) {
        const confirmed = confirm(`确定删除关卡「${level.name}」吗？\n\n此操作不可恢复。`);
        if (!confirmed) return;
        
        const saveSystem = new SaveSystem();
        const levels = saveSystem.loadLevels().filter(l => l.id !== level.id);
        saveSystem.saveLevels(levels);
        
        // 刷新数据
        this.configLoader.refreshCustomLevels();
        this._renderList();
        
        this.game.showMessage(`🗑️ 已删除：${level.name}`);
    }
    
    /**
     * 刷新列表（外部调用）
     */
    refresh() {
        this._renderList();
    }
}

window.LevelSelector = LevelSelector;