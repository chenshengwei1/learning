// js/dev/console-tools.js
// ==================== 控制台测试工具 ====================

(function() {
    'use strict';
    
    function getGame() {
        return window.__gameEngine;
    }
    
    // ==================== 棋盘操作 ====================
    
    /**
     * 设置棋盘（只指定特定位置，其他随机）
     * 
     * @param {Array<[number, number, string]>} assignments - 形如 [[r, c, 'fox'], ...]
     * @param {Object} options - 可选
     *   - fill: 'random' | 'empty'，默认 'random'
     *   - avoidMatch: 随机填充时是否避免三连，默认 true
     * 
     * @example
     *   __t.setupBoard([
     *       [0, 0, 'fox'],
     *       [0, 1, 'fox'],
     *       [0, 3, 'cat'],
     *       [1, 3, 'fox'],
     *   ])
     */
    /**
     * 设置棋盘
     * 
     * 逻辑：
     * 1. 清空棋盘
     * 2. 先应用所有指定（原样保留，不检查三连）
     * 3. 再随机填充剩余空位（避免与已放置的冲突）
     * 
     * @param {Array<[number, number, string]>} assignments - [[r, c, 'fox'], ...]
     * @param {Object} options
     *   - fill: 'random' | 'empty'（默认 'random'）
     *   - avoidMatch: 随机填充时是否避免三连（默认 true）
     */
    function setupBoard(assignments = [], options = {}) {
        const game = getGame();
        const board = game.board;
        const { fill = 'random', avoidMatch = true } = options;
        
        // ========== 1. 清空棋盘 ==========
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                board.set(r, c, null);
            }
        }
        board.obstacles = [];
        board.targets = [];
        
        // ========== 2. 先应用所有指定 ==========
        const specified = new Set();
        const invalid = [];
        
        for (const [r, c, id] of assignments) {
            if (!board.isInBounds(r, c)) {
                invalid.push(`(${r},${c}) 越界`);
                continue;
            }
            if (board.layout[r][c] !== 1) {
                invalid.push(`(${r},${c}) 格子不存在`);
                continue;
            }
            
            const key = `${r},${c}`;
            
            if (!id || id === '.' || id === 'empty') {
                board.set(r, c, null);
                specified.add(key);
                continue;
            }
            
            const piece = game.pieceFactory.create(id);
            if (!piece) {
                invalid.push(`(${r},${c}) 未知棋子 "${id}"`);
                continue;
            }
            
            board.set(r, c, piece);
            specified.add(key);
        }
        
        if (invalid.length > 0) {
            console.warn('⚠️ 以下指定无效：');
            invalid.forEach(msg => console.warn(`   ${msg}`));
        }
        
        // ========== 3. 随机填充剩余空位 ==========
        if (fill === 'random') {
            for (let r = 0; r < board.rows; r++) {
                for (let c = 0; c < board.cols; c++) {
                    if (board.layout[r][c] !== 1) continue;
                    if (specified.has(`${r},${c}`)) continue;   // 已被指定
                    
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
        
        // ========== 4. 检查指定位置是否形成三连 ==========
        if (assignments.length > 0) {
            const conflicts = [];
            for (const key of specified) {
                const [r, c] = key.split(',').map(Number);
                const piece = board.get(r, c);
                if (!piece) continue;
                
                // 临时移除，看是否形成三连
                board.set(r, c, null);
                const wouldMatch = game._wouldMatch(board, r, c, piece);
                board.set(r, c, piece);
                
                if (wouldMatch) {
                    conflicts.push({ r, c, id: piece.id });
                }
            }
            
            if (conflicts.length > 0) {
                console.log(`⚠️ 以下指定位置本身形成三连（将原样保留）：`);
                conflicts.forEach(c => {
                    console.log(`   (${c.r},${c.c}) = ${c.id}`);
                });
                console.log(`   注意：reset() 时会触发 stabilize() 自动消除`);
            }
        }
        
        // ========== 5. 清缓存 + 重绘 ==========
        game.matchSystem.clearCache();
        game.renderSystem.renderAll();
        
        // ========== 6. 报告 ==========
        console.log(`✅ 棋盘已设置（${assignments.length} 处指定，其余${fill === 'random' ? '随机' : '空'}）`);
        printBoard();
        
        return game;
    }
    
    /**
     * 打印当前棋盘（带行列坐标）
     */
    function printBoard() {
        const game = getGame();
        const board = game.board;
        
        // 列头
        let header = '     ';
        for (let c = 0; c < board.cols; c++) {
            header += `c${c}    `;
        }
        console.log(header);
        
        // 字符反查
        const ID_TO_CHAR = {
            'fox': 'F', 'owl': 'O', 'cat': 'C', 'chick': 'H',
            'bear': 'B', 'frog': 'R', 'octopus': 'T',
            'line-horizontal': '↔', 'line-vertical': '↕',
            'bomb': '💣', 'square-effect': '▢', 'rainbow': '🌈',
        };
        
        for (let r = 0; r < board.rows; r++) {
            let line = `r${r}  `;
            for (let c = 0; c < board.cols; c++) {
                const p = board.get(r, c);
                const obs = board.getObstacleAt(r, c);
                
                let cell = '  ';
                if (p) {
                    cell = ID_TO_CHAR[p.id] || p.id.substring(0, 2);
                    if (p.effect) cell = '*';  // 特效标记
                }
                
                let label = `[${cell}]`;
                if (obs) label += `{${obs.element[0]}${obs.hp}}`;
                line += label.padEnd(6, ' ');
            }
            console.log(line);
        }
    }
    
    /**
     * 获取棋盘快照
     */
    function snapshot() {
        const game = getGame();
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
            comboCount: game.comboCount,
            mode: game.mode,
            isProcessing: game.isProcessing,
            isGameEnded: game.isGameEnded,
            obstacles: board.obstacles.map(o => ({ r: o.r, c: o.c, element: o.element, hp: o.hp })),
            targets: board.targets.map(t => ({ r: t.r, c: t.c, element: t.element, hp: t.hp })),
        };
    }
    
    /**
     * 对比两次快照
     */
    function diff(before, after) {
        const changes = [];
        for (let r = 0; r < before.grid.length; r++) {
            for (let c = 0; c < before.grid[r].length; c++) {
                const b = before.grid[r][c];
                const a = after.grid[r][c];
                const bKey = b ? `${b.id}${b.effect ? ':' + b.effect : ''}` : '空';
                const aKey = a ? `${a.id}${a.effect ? ':' + a.effect : ''}` : '空';
                if (bKey !== aKey) {
                    changes.push(`(${r},${c}): ${bKey} → ${aKey}`);
                }
            }
        }
        
        console.log(`\n📊 变化（${changes.length} 处）：`);
        if (changes.length === 0) {
            console.log('  （无变化）');
        } else {
            changes.forEach(c => console.log(`  ${c}`));
        }
        
        if (before.score !== after.score) {
            console.log(`💰 分数: ${before.score} → ${after.score} (+${after.score - before.score})`);
        }
        if (before.movesLeft !== after.movesLeft) {
            console.log(`👣 步数: ${before.movesLeft} → ${after.movesLeft}`);
        }
    }
    
    // ==================== 交换操作 ====================
    
    /**
     * 交换两个格子（自动等异步完成 + 前后对比）
     */
    async function swap(a, b, c, d) {
        const game = getGame();
        
        let r1, c1, r2, c2;
        if (Array.isArray(a)) {
            [r1, c1] = a;
            [r2, c2] = b;
        } else {
            r1 = a; c1 = b; r2 = c; c2 = d;
        }
        
        console.log(`\n========== [交换] (${r1},${c1}) ↔ (${r2},${c2}) ==========`);
        
        const p1 = game.board.get(r1, c1);
        const p2 = game.board.get(r2, c2);
        console.log(`  交换前：(${r1},${c1})=${p1?.id || '空'}  (${r2},${c2})=${p2?.id || '空'}`);
        
        const before = snapshot();
        
        await game.swap(r1, c1, r2, c2);
        
        // 等所有异步完成
        const start = Date.now();
        while (game.isProcessing && Date.now() - start < 5000) {
            await new Promise(r => setTimeout(r, 50));
        }
        
        const after = snapshot();
        diff(before, after);
        
        console.log(`\n========== [最终棋盘] ==========`);
        printBoard();

        // ← 新增：自动页面元素检测
        if (typeof __pageChecker !== 'undefined') {
            const result = __pageChecker.checkPageConsistency(getGame());
            if (!result.consistent) {
                console.warn(`  ⚠️ 页面元素不一致（${result.issues.length} 处）：`);
                result.issues.forEach(issue => console.warn(`     - ${issue}`));
            } else {
                console.log(`  ✅ 页面元素一致`);
            }
        }
        
        return { before, after };
    }
    
    // ==================== 特效设置 ====================
    
    /**
     * 给指定格子设置特效
     */
    function setEffect(r, c, effectName) {
        const game = getGame();
        const piece = game.board.get(r, c);
        if (!piece) {
            console.error(`❌ (${r},${c}) 没有棋子`);
            return;
        }
        piece.effect = effectName;
        game.renderSystem.renderAll();
        console.log(`✅ (${r},${c}) 的 ${piece.id} 设置为 ${effectName}`);
    }
    
    /**
     * 批量设置特效
     * 用法：__t.setEffects([[3, 3, 'line-horizontal'], [3, 4, 'bomb']])
     */
    function setEffects(list) {
        for (const [r, c, effect] of list) {
            setEffect(r, c, effect);
        }
    }
    
    // ==================== 障碍物/目标物 ====================
    
    function addIce(r, c, hp = 1) {
        const game = getGame();
        game.board.addObstacle({ element: 'ice', r, c, hp });
        game.renderSystem.renderAll();
        console.log(`✅ 添加冰 (${r},${c}) hp=${hp}`);
    }
    
    function addVine(r, c, hp = 2) {
        const game = getGame();
        game.board.addObstacle({ element: 'vine', r, c, hp });
        game.renderSystem.renderAll();
        console.log(`✅ 添加藤蔓 (${r},${c}) hp=${hp}`);
    }
    
    function addFruit(element, r, c, w = 1, h = 1) {
        const game = getGame();
        game.board.addTarget({ element, r, c, w, h, hp: 1 });
        game.renderSystem.renderAll();
        console.log(`✅ 添加目标物 ${element} (${r},${c}) ${w}x${h}`);
    }
    
    function clearObstacles() {
        const game = getGame();
        game.board.obstacles = [];
        game.renderSystem.renderAll();
        console.log('✅ 已清除所有障碍物');
    }
    
    function clearTargets() {
        const game = getGame();
        game.board.targets = [];
        game.renderSystem.renderAll();
        console.log('✅ 已清除所有目标物');
    }
    
    // ==================== 快捷方法 ====================
    
    /**
     * 全空棋盘（无棋子）
     */
    function setupEmptyBoard() {
        return setupBoard([], { fill: 'empty' });
    }
    
    /**
     * 清空所有障碍物、目标物、棋子
     */
    function reset_bak() {
        const game = getGame();
        for (let r = 0; r < game.board.rows; r++) {
            for (let c = 0; c < game.board.cols; c++) {
                game.board.set(r, c, null);
            }
        }
        game.board.obstacles = [];
        game.board.targets = [];
        game.renderSystem.renderAll();
        console.log('✅ 已重置棋盘');
    }

    /**
     * 重置游戏到指定关卡
     * 
     * @param {string|null} levelId - 关卡 id（如 'sandbox'、'level-001'）
     *                                null 或不传 → 用默认空棋盘（8x8 全 1 layout，无棋子）
     * @param {Object} options - 可选
     *   - mode: 'game' | 'admin'，默认 'game'
     *   - clearObstacles: 是否清障碍物（默认 true）
     *   - clearTargets: 是否清目标物（默认 true）
     * 
     * @example
     *   __t.reset('sandbox')                // 加载 sandbox 关卡
     *   __t.reset('level-002')              // 加载水果收集关卡
     *   __t.reset()                         // 重置到默认空棋盘
     *   __t.reset('sandbox', { mode: 'admin' })  // 加载沙盒但保持管理员模式
     */
    function reset(levelId = null, options = {}) {
        const game = getGame();
        const {
            mode = 'game',
            clearObstacles = true,
            clearTargets = true,
        } = options;
        
        // ========== 1. 切模式 ==========
        game.setMode(mode);
        
        // ========== 2. 重置游戏状态 ==========
        game.score = 0;
        game.movesLeft = game.config.totalMoves || 30;
        game.comboCount = 0;
        game.maxCombo = 0;
        game.elimCounts = {};
        game.collectedCounts = {};
        game.isGameEnded = false;
        game.isProcessing = false;
        game.selected = null;
        game.history = [];
        
        // ========== 3. 如果有指定关卡，加载它 ==========
        if (levelId) {
            const configLoader = game.configLoader;
            if (!configLoader) {
                console.error('❌ game.configLoader 未挂载');
                return game;
            }
            
            const level = configLoader.getLevel(levelId);
            if (!level) {
                console.error(`❌ 找不到关卡 "${levelId}"`);
                console.log('   可用关卡:', configLoader.getLevels().map(l => l.id).join(', '));
                return game;
            }
            
            console.log(`📦 加载关卡：${level.name} (${levelId})`);
            
            // 应用关卡配置
            const config = configLoader.levelToConfig(level);
            game.applyConfig(config);
            
            // applyConfig 会调 init()，init 会：
            // - 重置状态
            // - 创建棋盘（从 config 的 layout / pieces / obstacles / targets）
            // - 稳定化
            // - 渲染
            
            // 如果 init 后还需要额外处理，在这里加
        } else {
            // ========== 4. 无指定关卡，清空棋盘 ==========
            // 清棋子
            for (let r = 0; r < game.board.rows; r++) {
                for (let c = 0; c < game.board.cols; c++) {
                    game.board.set(r, c, null);
                }
            }
            // 清障碍物
            if (clearObstacles) game.board.obstacles = [];
            // 清目标物
            if (clearTargets) game.board.targets = [];
        }
        
        // ========== 5. 更新 HUD + 重绘 ==========
        game.updateHUD();
        game.renderSystem.renderAll();
        
        // ========== 6. 报告 ==========
        const levelName = levelId || '空棋盘';
        console.log(`✅ 已重置：${levelName}，模式=${game.mode}，分数=${game.score}，步数=${game.movesLeft}`);
        
        return game;
    }
    
    // ==================== 暴露到 window ====================
    
    window.__t = {
        // 棋盘
        setupBoard,
        setupEmptyBoard,
        reset,
        printBoard,
        snapshot,
        diff,
        
        // 交换
        swap,
        
        // 特效
        setEffect,
        setEffects,
        
        // 障碍物
        addIce,
        addVine,
        addFruit,
        clearObstacles,
        clearTargets,
        // ← 新增：手动页面元素检测
        checkPage() {
            if (typeof __pageChecker === 'undefined') {
                console.error('❌ __pageChecker 未加载（需要 test/page-checker.js）');
                return;
            }
            const result = __pageChecker.checkPageConsistency(getGame());
            __pageChecker.printCheckResult(result);
            return result;
        },
    };
    
    console.log('🧪 控制台工具已加载');
    console.log('   用法：__t.setupBoard([[r, c, id], ...])');
    console.log('   例如：__t.setupBoard([[0, 0, "fox"], [0, 1, "fox"]])');
})();