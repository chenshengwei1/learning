// ==================== 主入口 ====================

(function() {
    'use strict';
    
    // 1. 创建注册表
    const registries = new Registries();
    window.__registries__ = registries;
    
    // 2. 注册内置词表
    registerAllBuiltins(registries);
    
    // 3. 加载配置（元素 + 关卡）
    const configLoader = new ConfigLoader(registries);
    configLoader.loadAll();
    
    // 4. 创建表达式解析器（挂到全局，供 DSL 使用）
    const expressionParser = new ExpressionParser(registries);
    window.__expressionParser__ = expressionParser;
    
    // 5. 确定初始配置
    const saveSystem = new SaveSystem();
    const savedConfig = saveSystem.loadConfig();
    const defaultLevel = configLoader.getLevel('level-002');  // 默认水果收集
    const initialConfig = savedConfig || configLoader.levelToConfig(defaultLevel);
    
    // 6. 创建游戏引擎
    const game = new GameEngine(initialConfig, registries);
    game.configLoader = configLoader;   // ← 新增：挂载 ConfigLoader
    window.__gameEngine = game;
    
    // 7. 初始化渲染
    const boardEl = document.getElementById('board');
    if (boardEl) game.renderSystem.init(boardEl);
    
    // 8. 创建 UI 组件
    const hud = new HUD(game);
    game.hud = hud;
    
    const adminPanel = new AdminPanel(game);
    adminPanel.init();
    game.adminPanel = adminPanel;
    
    const levelSelector = new LevelSelector(game, configLoader);
    levelSelector.init();
    game.levelSelector = levelSelector;   // ← 新增：挂载
    
    const elementEditor = new ElementEditor(game);
    elementEditor.init();
    
    const elementList = new ElementList(game, elementEditor);
    elementList.init();
    game.elementList = elementList;
    
    // 9. 重写 updateHUD
    const originalUpdateHUD = game.updateHUD.bind(game);
    game.updateHUD = () => {
        originalUpdateHUD();
        hud.update();
    };
    
    // 10. 绑定全局按钮
    document.getElementById('restart-btn')?.addEventListener('click', () => game.init());
    document.getElementById('hint-btn')?.addEventListener('click', () => game.showHint());
    document.getElementById('mode-admin-btn')?.addEventListener('click', () => game.setMode('admin'));
    document.getElementById('mode-game-btn')?.addEventListener('click', () => game.setMode('game'));
    
    // 11. 启动游戏
    game.init();
    game.setMode('admin');
    
    console.log('🍬 糖果消消乐 v8 已启动');
    console.log('   棋盘:', game.config.rows, 'x', game.config.cols);
    console.log('   元素:', registries.elements.getAll().length);
    console.log('   关卡:', configLoader.getLevels().length);
    console.log('   动作:', registries.actions.getAllMeta().length);
    console.log('   事件:', registries.events.getAllMeta().length);
    console.log('   选择器:', registries.selectors.getAllMeta().length);
    console.log('   条件:', registries.conditions.getAllMeta().length);
    console.log('   目标:', registries.goals.getAllMeta().length);

    window.__DEBUG_TRACE__ = false;
    window.__DEBUG_MATCH__ = false;
    window.__DEBUG_GRAVITY__ = false;
})();