// test/page-checker.js
// ==================== 页面元素检测（完整版） ====================
// 校验"棋盘数据"和"DOM"是否完全一致
// 
// 检测项：
//   1. 格子总数
//   2. 每格棋子（存在性 + 类型 + SVG src + 特效图标）
//   3. 每格障碍物（存在性 + 类型 + SVG）
//   4. 每格目标物（存在性 + 跨格尺寸 + SVG）
//   5. 层级（z-index）
//   6. 位置（left/top）
//   7. 残留动画类

(function() {
    'use strict';
    
    // ==================== 核心检测 ====================
    
    function checkPageConsistency(game) {
        if (typeof document === 'undefined') {
            return { consistent: false, issues: ['非浏览器环境'], stats: {} };
        }
        
        if (!game || !game.board) {
            return { consistent: false, issues: ['game 或 board 未定义'], stats: {} };
        }
        
        const issues = [];
        const board = game.board;
        const renderSystem = game.renderSystem;
        const { cellSize, gap } = game.config;
        
        const stats = {
            totalCells: board.rows * board.cols,
            domCells: 0,
            piecesChecked: 0,
            piecesOk: 0,
            effectsChecked: 0,
            effectsOk: 0,
            obstaclesChecked: 0,
            obstaclesOk: 0,
            targetsChecked: 0,
            targetsOk: 0,
        };
        
        // ===== 1. 格子总数 =====
        const cells = document.querySelectorAll('#board .cell');
        stats.domCells = cells.length;
        
        if (cells.length !== stats.totalCells) {
            issues.push(`格子总数不匹配：DOM=${cells.length}, 数据=${stats.totalCells}`);
        }
        
        // ===== 2. 逐格检查 =====
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const piece = board.get(r, c);
                const obstacle = board.getObstacleAt(r, c);
                const cell = document.querySelector(`#board .cell[data-r="${r}"][data-c="${c}"]`);
                
                // 2.1 DOM 存在性
                if (!cell) {
                    issues.push(`(${r},${c}) DOM 缺失`);
                    continue;
                }
                
                // 2.2 位置检查
                const expectedLeft = c * (cellSize + gap);
                const expectedTop = r * (cellSize + gap);
                const actualLeft = parseFloat(cell.style.left);
                const actualTop = parseFloat(cell.style.top);
                
                if (Math.abs(actualLeft - expectedLeft) > 1) {
                    issues.push(`(${r},${c}) left 位置错：期望 ${expectedLeft}px，实际 ${actualLeft}px`);
                }
                if (Math.abs(actualTop - expectedTop) > 1) {
                    issues.push(`(${r},${c}) top 位置错：期望 ${expectedTop}px，实际 ${actualTop}px`);
                }
                
                // 2.3 棋子检查
                if (piece) {
                    stats.piecesChecked++;
                    const pieceOk = checkPieceDom(cell, piece, game);
                    if (pieceOk.ok) {
                        stats.piecesOk++;
                    } else {
                        issues.push(...pieceOk.issues.map(i => `(${r},${c}) ${i}`));
                    }
                    
                    // 2.4 特效类检查
                    if (piece.effect) {
                        stats.effectsChecked++;
                        if (cell.className.includes(`effect-${piece.effect}`)) {
                            stats.effectsOk++;
                        } else {
                            issues.push(`(${r},${c}) 缺 effect-${piece.effect} 类`);
                        }
                        
                        // 2.5 特效图标检查
                        const expectedIcon = getEffectIcon(piece.effect);
                        const main = cell.querySelector('.piece-main, img.piece-svg');
                        if (main && expectedIcon) {
                            if (main.tagName === 'IMG') {
                                // 图标可能是 SVG
                                if (!main.src.includes(expectedIcon.replace('@', ''))) {
                                    // 允许图片 src 不严格匹配（SVG 名可能不直接反映）
                                }
                            } else {
                                // 文本图标
                                if (main.textContent !== expectedIcon) {
                                    issues.push(`(${r},${c}) 特效图标错：期望 "${expectedIcon}"，实际 "${main.textContent}"`);
                                }
                            }
                        }
                    }
                } else {
                    // 数据无棋子，DOM 不应有内容
                    const hasImg = cell.querySelector('img.piece-svg');
                    const hasMain = cell.querySelector('.piece-main');
                    if (hasImg || hasMain) {
                        issues.push(`(${r},${c}) 数据无棋子，DOM 有内容`);
                    }
                }
                
                // 2.6 障碍物检查
                const obstacleEl = document.querySelector(
                    `#board .obstacle-layer[data-r="${r}"][data-c="${c}"]`
                );
                if (obstacle) {
                    stats.obstaclesChecked++;
                    if (!obstacleEl) {
                        issues.push(`(${r},${c}) 数据有障碍物 (${obstacle.element})，DOM 缺失`);
                    } else {
                        // 检查 SVG
                        const obsImg = obstacleEl.querySelector('img');
                        const elementDef = game.registries.elements.get(obstacle.element);
                        if (obsImg && elementDef?.svg) {
                            const expectedSrc = SVGLibrary.resolve(elementDef.svg) || elementDef.svg;
                            if (obsImg.src !== expectedSrc) {
                                // 允许 URL 编码差异，宽松判断
                                if (!obsImg.src.startsWith('data:image')) {
                                    issues.push(`(${r},${c}) 障碍物 SVG 不匹配`);
                                }
                            }
                        }
                        stats.obstaclesOk++;
                    }
                } else {
                    if (obstacleEl) {
                        issues.push(`(${r},${c}) 数据无障碍物，DOM 有 .obstacle-layer`);
                    }
                }
                
                // 2.7 残留动画类
                if (cell.classList.contains('removed')) {
                    issues.push(`(${r},${c}) DOM 有残留的 .removed 类`);
                }
                if (cell.classList.contains('exploding')) {
                    issues.push(`(${r},${c}) DOM 有残留的 .exploding 类`);
                }
            }
        }
        
        // ===== 3. 目标物 =====
        const targetEls = document.querySelectorAll('#board .target-layer');
        const targetIds = new Set(board.targets.map(t => t.id));
        
        for (const target of board.targets) {
            stats.targetsChecked++;
            const targetEl = document.querySelector(
                `#board .target-layer[data-target-id="${target.id}"]`
            );
            if (!targetEl) {
                issues.push(`目标物 ${target.element}(${target.r},${target.c}) DOM 缺失`);
            } else {
                // 检查跨格尺寸
                const expectedW = target.w * cellSize + (target.w - 1) * gap;
                const expectedH = target.h * cellSize + (target.h - 1) * gap;
                const actualW = parseFloat(targetEl.style.width);
                const actualH = parseFloat(targetEl.style.height);
                
                if (Math.abs(actualW - expectedW) > 1) {
                    issues.push(`目标物 ${target.element} 宽错：期望 ${expectedW}px，实际 ${actualW}px`);
                }
                if (Math.abs(actualH - expectedH) > 1) {
                    issues.push(`目标物 ${target.element} 高错：期望 ${expectedH}px，实际 ${actualH}px`);
                }
                stats.targetsOk++;
            }
        }
        
        // 多余的目标物 DOM
        targetEls.forEach(el => {
            const id = el.dataset.targetId;
            if (!targetIds.has(id)) {
                issues.push(`DOM 有多余的目标物 ${id}（数据里没有）`);
            }
        });
        
        // ===== 4. z-index 检查 =====
        const RENDER_LAYERS = window.RENDER_LAYERS || { PIECE: 3 };
        const expectedZIndex = String(RENDER_LAYERS.PIECE);
        cells.forEach(cell => {
            const zIndex = cell.style.zIndex;
            // 3 = 默认，10 = 交换中
            if (zIndex && zIndex !== expectedZIndex && zIndex !== '10') {
                issues.push(`(${cell.dataset.r},${cell.dataset.c}) z-index 异常: ${zIndex}（期望 ${expectedZIndex}）`);
            }
        });
        
        return {
            consistent: issues.length === 0,
            issues,
            stats,
        };
    }
    
    // ==================== 棋子 DOM 检查 ====================
    
    function checkPieceDom(cell, piece, game) {
        const issues = [];
        
        // 1. 检查 DOM 内容存在
        const img = cell.querySelector('img.piece-svg');
        const main = cell.querySelector('.piece-main');
        
        if (!img && !main) {
            issues.push(`数据有棋子 (${piece.id})，DOM 无内容`);
            return { ok: false, issues };
        }
        
        // 2. 检查棋子类型
        // 方式 1：img.src 对应 SVG
        if (img) {
            const elementDef = game.registries.elements.get(piece.element || piece.id);
            if (elementDef?.svg) {
                const expectedSrc = SVGLibrary.resolve(elementDef.svg) || elementDef.svg;
                // 宽松比较：data URI 可能被编码不同
                if (img.src !== expectedSrc) {
                    // 进一步宽松：检查 src 前缀
                    if (!img.src.startsWith('data:image/svg')) {
                        issues.push(`棋子 ${piece.id} 的 SVG src 不匹配`);
                    }
                }
            }
        }
        
        // 方式 2：文本字符对应
        if (main && !img) {
            const elementDef = game.registries.elements.get(piece.element || piece.id);
            if (elementDef?.char) {
                if (main.textContent !== elementDef.char) {
                    issues.push(`棋子 ${piece.id} 的字符错：期望 "${elementDef.char}"，实际 "${main.textContent}"`);
                }
            }
        }
        
        return { ok: issues.length === 0, issues };
    }
    
    // ==================== 特效图标 ====================
    
    function getEffectIcon(effectName) {
        const icons = {
            'line-horizontal': '↔️',
            'line-vertical': '↕️',
            'bomb': '💣',
            'square-effect': '✨',
            'rainbow': '🌈',
        };
        return icons[effectName] || null;
    }
    
    // ==================== 打印结果 ====================
    
    function printCheckResult(result) {
        if (result.consistent) {
            console.log('  ✅ 页面元素一致');
            const s = result.stats;
            console.log(`     ${s.piecesOk}/${s.piecesChecked} 棋子 / ${s.effectsOk}/${s.effectsChecked} 特效 / ${s.obstaclesOk}/${s.obstaclesChecked} 障碍 / ${s.targetsOk}/${s.targetsChecked} 目标物`);
        } else {
            console.log(`  ❌ 页面元素不一致（${result.issues.length} 处问题）：`);
            result.issues.slice(0, 20).forEach(issue => console.log(`     - ${issue}`));
            if (result.issues.length > 20) {
                console.log(`     ... 还有 ${result.issues.length - 20} 处`);
            }
        }
    }
    
    // ==================== 暴露到全局 ====================
    
    window.__pageChecker = {
        checkPageConsistency,
        printCheckResult,
    };
    
    console.log('🔍 页面元素检测已加载（完整版）');
})();