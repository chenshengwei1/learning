// ==================== 主入口 ====================

(function() {
    'use strict';
    
    // 1. 加载配置
    const saveSystem = new SaveSystem();
    const savedConfig = saveSystem.loadConfig();
    const config = savedConfig 
        ? sanitizeConfig(savedConfig)
        : createDefaultConfig();
    
    // 2. 创建引擎
    const game = new GameEngine(config);
    window.__gameEngine = game;
    
    // 3. 注册规则
    registerAllRules(game.ruleEngine);
    
    // 4. 初始化渲染
    const boardEl = document.getElementById('board');
    if (boardEl) {
        game.renderSystem.init(boardEl);
    }
    
    // 5. 初始化 UI 面板
    game.initUI();
    
    // 6. 绑定全局按钮
    document.getElementById('restart-btn')?.addEventListener('click', () => {
        game.init();
    });
    
    document.getElementById('hint-btn')?.addEventListener('click', () => {
        game.showHint();
    });
    
    document.getElementById('mode-admin-btn')?.addEventListener('click', () => {
        game.setMode('admin');
    });
    
    document.getElementById('mode-game-btn')?.addEventListener('click', () => {
        game.setMode('game');
    });
    
    // 7. 启动游戏
    game.init();
    
    // 8. 默认管理员模式
    game.setMode('admin');
    
    console.log('🍬 糖果消消乐 v6 已启动');
    console.log('📐 棋盘:', game.config.rows, 'x', game.config.cols);
    console.log('🎯 匹配规则:', game.matchSystem.rules.map(r => r.constructor.name).join(', '));
    console.log('✨ 已注册特效:', game.ruleEngine.parser.getAllEffects().map(e => e.name).join(', '));
    console.log('🔧 已注册交换处理器:', Array.from(game.ruleEngine.parser.swapHandlers.keys()).join(', '));
    
    // ==================== 配置校验 ====================
    
    function sanitizeConfig(raw) {
        const cfg = { ...DEFAULT_CONFIG, ...raw };
        
        cfg.rows = Math.max(2, Math.min(20, Number(cfg.rows) || 10));
        cfg.cols = Math.max(2, Math.min(20, Number(cfg.cols) || 10));
        cfg.cellSize = Math.max(20, Math.min(100, Number(cfg.cellSize) || 60));
        cfg.gap = Math.max(0, Math.min(12, Number(cfg.gap) || 4));
        cfg.totalMoves = Math.max(1, Number(cfg.totalMoves) || 30);
        cfg.matchLength = Math.max(3, Math.min(6, Number(cfg.matchLength) || 3));
        cfg.baseScore = Math.max(1, Number(cfg.baseScore) || 10);
        cfg.targetScore = Math.max(0, Number(cfg.targetScore) || 50000);
        cfg.timeLimitSeconds = Math.max(10, Number(cfg.timeLimitSeconds) || 90);
        
        cfg.targetScoreEnabled = cfg.targetScoreEnabled !== false;
        cfg.requiredPieceEnabled = cfg.requiredPieceEnabled === true;
        cfg.enableTimeLimit = cfg.enableTimeLimit === true;
        cfg.enableSquare = cfg.enableSquare !== false;
        cfg.enableDiagonal = cfg.enableDiagonal === true;
        cfg.enableDrag = cfg.enableDrag !== false;
        cfg.comboMultiplier = cfg.comboMultiplier !== false;
        
        if (!Array.isArray(cfg.pieceTypes) || cfg.pieceTypes.length < 2) {
            cfg.pieceTypes = Utils.deepClone(DEFAULT_PIECE_TYPES);
        }
        
        return cfg;
    }
})();