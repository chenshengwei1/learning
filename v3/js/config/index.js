// ==================== 配置层入口 ====================

class ConfigLoader {
    constructor(registries) {
        this.registries = registries;
    }
    
    /**
     * 加载所有内置配置
     */
    loadAll() {
        this.loadElements();
        this.loadLevels();
        console.log('✅ 配置层加载完成');
        console.log('   元素:', this.registries.elements.getAll().length);
        console.log('   关卡:', this.getLevels().length);
    }
    
    /**
     * 加载元素
     */
    loadElements() {
        // 优先从 localStorage 加载（用户自定义）
        const saveSystem = new SaveSystem();
        const saved = saveSystem.loadElements();
        const elements = saved && Array.isArray(saved) && saved.length > 0
            ? saved
            : BUILTIN_ELEMENTS;
        
        for (const el of elements) {
            this.registries.elements.register(el);
        }
    }
    
    /**
     * 加载关卡
     */
    loadLevels() {
        // 优先从 localStorage 加载
        const saveSystem = new SaveSystem();
        const saved = saveSystem.loadLevels();
        const levels = saved && saved.length > 0 ? saved : BUILTIN_LEVELS;
        
        // 关卡不进注册表，单独存储
        this.levels = levels;
    }
    
    getLevels() {
        return this.levels || [];
    }
    
    getLevel(id) {
        return this.getLevels().find(l => l.id === id) || null;
    }
    
    /**
     * 将关卡配置转化为 GameEngine 的 config
     */
    levelToConfig(level) {
        if (!level) return { ...DEFAULT_CONFIG };
        
        const config = {
            // 基础配置
            rows: level.board?.rows || 8,
            cols: level.board?.cols || 8,
            cellSize: 60,
            gap: 4,
            
            // 关卡配置
            layout: level.board?.layout || null,
            pieces: level.pieces || null,
            targets: level.targets || [],
            obstacles: level.obstacles || [],
            goals: level.goals || [],
            
            // 步数 / 时间
            totalMoves: level.moves || 30,
            enableTimeLimit: level.config?.enableTimeLimit || false,
            timeLimitSeconds: level.config?.timeLimitSeconds || 90,
            
            // 匹配
            matchLength: level.config?.matchLength || 3,
            enableSquare: level.config?.enableSquare !== false,
            enableDiagonal: level.config?.enableDiagonal === true,
            enableDrag: level.config?.enableDrag !== false,
            
            // 计分
            baseScore: level.config?.baseScore || 10,
            comboMultiplier: level.config?.comboMultiplier !== false,
            gravitySpeed: level.config?.gravitySpeed ?? 1.0,
            
            // 元数据
            name: level.name || '未命名关卡',
            levelId: level.id
        };
        
        return config;
    }
}

window.ConfigLoader = ConfigLoader;
window.BUILTIN_ELEMENTS = BUILTIN_ELEMENTS;
window.BUILTIN_LEVELS = BUILTIN_LEVELS;
window.BUILTIN_CREATION_RULES = BUILTIN_CREATION_RULES;