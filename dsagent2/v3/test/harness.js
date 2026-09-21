// test/harness.js
// 测试脚手架：在 Node.js 或浏览器里加载所有模块

(function(global) {
    'use strict';
    
    const isNode = typeof module !== 'undefined' && module.exports;
    
    // ==================== 加载模块 ====================
    
    function loadModules() {
        if (isNode) {
            // Node.js 环境：用 vm 加载
            const fs = require('fs');
            const path = require('path');
            const vm = require('vm');
            
            const sandbox = {
                window: {},
                document: createMockDocument(),
                console,
                setTimeout, clearTimeout,
                setInterval, clearInterval,
                localStorage: createMockStorage(),
                Promise, Set, Map, Math, Date, JSON, Object, Array,
                String, Number, Boolean, parseInt, parseFloat,
                isNaN, isFinite, encodeURIComponent, decodeURIComponent,
            };
            sandbox.window = sandbox;
            sandbox.globalThis = sandbox;
            
            const MODULES = [
                'js/utils/constants.js',
                'js/utils/helpers.js',
                'js/utils/cache.js',
                'js/assets/svg-library.js',
                'js/engine/registries/ActionRegistry.js',
                'js/engine/registries/EventRegistry.js',
                'js/engine/registries/SelectorRegistry.js',
                'js/engine/registries/ConditionRegistry.js',
                'js/engine/registries/ElementRegistry.js',
                'js/engine/registries/GoalRegistry.js',
                'js/engine/registries/index.js',
                'js/engine/dsl/VariableResolver.js',
                'js/engine/dsl/ExpressionParser.js',
                'js/engine/dsl/ConfigValidator.js',
                'js/engine/runtime/EventBus.js',
                'js/engine/runtime/RuleRuntime.js',
                'js/core/Piece.js',
                'js/core/Board.js',
                'js/core/ShapeResult.js',
                'js/core/PieceFactory.js',
                'js/core/EventQueue.js',
                'js/rules/selectors.js',
                'js/rules/conditions.js',
                'js/rules/actions.js',
                'js/rules/events.js',
                'js/rules/goals.js',
                'js/rules/index.js',
                'js/systems/MatchSystem.js',
                'js/systems/GravitySystem.js',
                'js/systems/ScoreSystem.js',
                'js/systems/GoalSystem.js',
                'js/systems/TimerSystem.js',
                'js/systems/RenderSystem.js',
                'js/systems/InputSystem.js',
                'js/systems/SaveSystem.js',
                'js/core/GameEngine.js',
                'js/config/elements.js',
                'js/config/rules.js',
                'js/config/swapRules.js',
                'js/config/levels.js',
                'js/config/presets.js',
                'js/config/creationRules.js',
                'js/config/index.js',
            ];
            
            const context = vm.createContext(sandbox);
            const rootDir = path.join(__dirname, '..');
            
            for (const file of MODULES) {
                const code = fs.readFileSync(path.join(rootDir, file), 'utf8');
                vm.runInContext(code, context, { filename: file });
            }
            
            return sandbox;
        } else {
            // 浏览器环境：直接用 window
            return window;
        }
    }
    
    // ==================== 模拟 document（Node.js 用）====================
    
    function createMockDocument() {
        return {
            getElementById: () => null,
            createElement: () => createMockElement(),
            querySelectorAll: () => [],
            querySelector: () => null,
            addEventListener: () => {},
            removeEventListener: () => {},
            body: { appendChild: () => {} },
            head: { appendChild: () => {} },
        };
    }
    
    function createMockElement() {
        const el = {
            style: {},
            classList: {
                add: () => {}, remove: () => {}, toggle: () => {},
                contains: () => false,
            },
            dataset: {},
            children: [],
            appendChild: () => {},
            removeChild: () => {},
            replaceChild: () => {},
            remove: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            setPointerCapture: () => {},
            innerHTML: '',
            textContent: '',
        };
        return el;
    }
    
    function createMockStorage() {
        const data = {};
        return {
            getItem: (k) => data[k] || null,
            setItem: (k, v) => { data[k] = v; },
            removeItem: (k) => { delete data[k]; },
            clear: () => { for (const k in data) delete data[k]; },
        };
    }
    
    // ==================== 环境初始化 ====================
    
    const sandbox = loadModules();
    
    // ==================== 测试 API ====================
    
    /**
     * 创建隔离的测试游戏实例
     */
    function createTestGame(config = {}) {
        const { Registries, registerAllBuiltins, ConfigLoader, GameEngine, DEFAULT_CONFIG } = sandbox;
        
        const registries = new Registries();
        sandbox.__registries__ = registries;
        registerAllBuiltins(registries);
        
        const configLoader = new ConfigLoader(registries);
        configLoader.loadAll();
        
        const finalConfig = {
            ...DEFAULT_CONFIG,
            rows: 8, cols: 8,
            totalMoves: 30,
            ...config,
        };
        
        const game = new GameEngine(finalConfig, registries);
        game.configLoader = configLoader;
        
        // 屏蔽渲染
        game.renderSystem.renderAll = () => {};
        game.renderSystem.renderPartial = () => {};
        game.renderSystem.animateSwap = async () => {};
        game.renderSystem.animateRemove = async () => {};
        game.renderSystem.animateGravityDrop = async () => {};
        game.renderSystem.animateFall = async () => {};
        game.renderSystem.renderObstacleAt = () => {};
        game.renderSystem.renderTargetAt = () => {};
        
        // 屏蔽计时器
        game.timerSystem.start = () => {};
        game.timerSystem.stop = () => {};
        
        game.init();
        return game;
    }
    
    /**
     * 设置棋盘（指定位置 + 随机填充）
     */
    function setupBoard(game, assignments = [], options = {}) {
        const { fill = 'random', avoidMatch = true } = options;
        const board = game.board;
        
        // 清空
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                board.set(r, c, null);
            }
        }
        board.obstacles = [];
        board.targets = [];
        
        // 先应用指定
        const specified = new Set();
        for (const [r, c, id] of assignments) {
            if (!board.isInBounds(r, c)) continue;
            if (board.layout[r][c] !== 1) continue;
            specified.add(`${r},${c}`);
            
            if (!id || id === '.' || id === 'empty') continue;
            const piece = game.pieceFactory.create(id);
            if (piece) board.set(r, c, piece);
        }
        
        // 随机填充剩余
        if (fill === 'random') {
            for (let r = 0; r < board.rows; r++) {
                for (let c = 0; c < board.cols; c++) {
                    if (board.layout[r][c] !== 1) continue;
                    if (specified.has(`${r},${c}`)) continue;
                    
                    let piece, attempts = 0;
                    do {
                        piece = game.pieceFactory.random();
                        attempts++;
                        if (attempts > 50) break;
                    } while (avoidMatch && game._wouldMatch(board, r, c, piece));
                    
                    board.set(r, c, piece);
                }
            }
        }
        
        game.matchSystem.clearCache();
    }
    
    /**
     * 设置特效
     */
    function setEffect(game, r, c, effectName) {
        const piece = game.board.get(r, c);
        if (!piece) return false;
        piece.effect = effectName;
        return true;
    }
    
    /**
     * 执行交换
     */
    async function doSwap(game, r1, c1, r2, c2) {
        await game.swap(r1, c1, r2, c2);
        // 等异步流程完成
        const start = Date.now();
        while (game.isProcessing && Date.now() - start < 5000) {
            await new Promise(r => setTimeout(r, 20));
        }
    }
    
    /**
     * 获取棋盘快照
     */
    function snapshotBoard(game) {
        const board = game.board;
        const grid = [];
        for (let r = 0; r < board.rows; r++) {
            const row = [];
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                row.push(p ? { id: p.id, effect: p.effect || null } : null);
            }
            grid.push(row);
        }
        return {
            grid,
            score: game.score,
            movesLeft: game.movesLeft,
            mode: game.mode,
            isProcessing: game.isProcessing,
            isGameEnded: game.isGameEnded,
            obstacles: board.obstacles.map(o => ({ r: o.r, c: o.c, element: o.element, hp: o.hp })),
            targets: board.targets.map(t => ({ r: t.r, c: t.c, element: t.element, hp: t.hp })),
        };
    }
    
    // ==================== 导出 ====================
    
    const api = {
        sandbox,
        createTestGame,
        setupBoard,
        setEffect,
        doSwap,
        snapshotBoard,
    };
    
    if (isNode) {
        module.exports = api;
    } else {
        global.__testHarness = api;
    }
    
})(typeof globalThis !== 'undefined' ? globalThis : this);