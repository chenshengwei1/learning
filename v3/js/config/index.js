// ==================== 配置层入口 ====================

class ConfigLoader {
    constructor(registries) {
        this.registries = registries;
        this.builtinLevels = [];      // ← 内置关卡（模板）
        this.customLevels = [];       // ← localStorage 用户关卡
    }
    
    loadAll() {
        this.loadElements();
        this.loadLevels();
        console.log('✅ 配置层加载完成');
        console.log('   元素:', this.registries.elements.getAll().length);
        console.log('   内置关卡:', this.builtinLevels.length);
        console.log('   自定义关卡:', this.customLevels.length);
    }
    
    loadElements() {
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
     * 加载关卡：内置 + 自定义
     */
    loadLevels() {
        // 内置关卡：永远是 BUILTIN_LEVELS，标记 isBuiltin=true
        this.builtinLevels = BUILTIN_LEVELS.map(l => ({
            ...l,
            isBuiltin: true
        }));
        
        // 自定义关卡：从 localStorage 加载
        const saveSystem = new SaveSystem();
        const saved = saveSystem.loadLevels();
        this.customLevels = (Array.isArray(saved) ? saved : []).map(l => ({
            ...l,
            isBuiltin: false
        }));
    }
    
    /**
     * 获取所有关卡（内置优先，自定义在后）
     */
    getLevels() {
        return [...this.builtinLevels, ...this.customLevels];
    }
    
    /**
     * 获取单个关卡
     */
    getLevel(id) {
        return this.getLevels().find(l => l.id === id) || null;
    }
    
    /**
     * 刷新自定义关卡（保存/删除后调用）
     */
    refreshCustomLevels() {
        const saveSystem = new SaveSystem();
        const saved = saveSystem.loadLevels();
        this.customLevels = (Array.isArray(saved) ? saved : []).map(l => ({
            ...l,
            isBuiltin: false
        }));
    }
    
    /**
     * 将关卡配置转化为 GameEngine 的 config
     */
    levelToConfig(level) {
        if (!level) return { ...DEFAULT_CONFIG };
        
        const config = {
            rows: level.board?.rows || 8,
            cols: level.board?.cols || 8,
            cellSize: 60,
            gap: 4,
            
            layout: level.board?.layout || null,
            pieces: level.pieces || null,
            targets: level.targets || [],
            obstacles: level.obstacles || [],
            goals: level.goals || [],
            
            totalMoves: level.moves || 30,
            enableTimeLimit: level.config?.enableTimeLimit || false,
            timeLimitSeconds: level.config?.timeLimitSeconds || 90,
            
            matchLength: level.config?.matchLength || 3,
            enableSquare: level.config?.enableSquare !== false,
            enableDiagonal: level.config?.enableDiagonal === true,
            enableDrag: level.config?.enableDrag !== false,
            
            baseScore: level.config?.baseScore || 10,
            comboMultiplier: level.config?.comboMultiplier !== false,
            gravitySpeed: level.config?.gravitySpeed ?? 1.0,
            
            name: level.name || '未命名关卡',
            levelId: level.id,
            isBuiltin: level.isBuiltin === true
        };
        
        return config;
    }
}

window.ConfigLoader = ConfigLoader;
window.BUILTIN_ELEMENTS = BUILTIN_ELEMENTS;
window.BUILTIN_LEVELS = BUILTIN_LEVELS;
window.BUILTIN_CREATION_RULES = BUILTIN_CREATION_RULES;