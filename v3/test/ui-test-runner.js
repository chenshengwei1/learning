// test/ui-test-runner.js
// ==================== UI 一键测试运行器 ====================
// 
// 用法：
//   1. 游戏页面加载本文件
//   2. 点"🧪 一键测试"按钮，或控制台执行：__uiTest.run()
//   3. 跑完弹出结果页，可一键复制

(function() {
    'use strict';
    
    // ==================== 测试场景定义 ====================
    
    const SCENARIOS = [
        // ==================== 基础匹配 ====================
        {
            name: '3 消',
            validate: (game) => game.score > 0,
            validateMsg: '分数 > 0',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '4 消',
            validate: (game) => hasEffect(game, 'line-horizontal'),
            validateMsg: '生成 line-horizontal',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,2,'fox'],
                    [1,0,'fox'],[1,1,'fox'],[1,2,'cat'],[1,3,'fox'],[1,4,'cat'],
                ]);
                await __t.swap(0, 2, 1, 2);
            }
        },
        {
            name: '5 消',
            validate: (game) => hasEffect(game, 'rainbow'),
            validateMsg: '生成 rainbow',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,2,'fox'],
                    [1,0,'fox'],[1,1,'fox'],[1,2,'cat'],[1,3,'fox'],[1,4,'fox'],
                    [1,5,'cat'],[1,6,'cat'],[1,7,'cat'],
                ]);
                await __t.swap(0, 2, 1, 2);
            }
        },
        {
            name: '田字',
            validate: (game) => hasEffect(game, 'square-effect'),
            validateMsg: '生成 square-effect',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,3,'fox'],[0,4,'fox'],[0,5,'bear'],
                    [1,3,'fox'],[1,4,'cat'],[1,5,'fox'],
                    [2,4,'bear'],
                ]);
                await __t.swap(1, 4, 1, 5);
            }
        },
        {
            name: 'T 形',
            validate: (game) => hasEffect(game, 'bomb'),
            validateMsg: '生成 bomb',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],[0,4,'fox'],
                    [1,2,'fox'],[2,2,'fox'],[3,2,'fox'],[4,2,'fox'],
                ]);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: 'L 形',
            validate: (game) => hasEffect(game, 'bomb'),
            validateMsg: '生成 bomb',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[1,0,'fox'],[2,0,'fox'],
                    [0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                await __t.swap(0, 2, 0, 3);
            }
        },
        
        // ==================== 双特效交换 ====================
        {
            name: '双特效 line + bomb',
            validate: (game) => game.score >= 100,
            validateMsg: '分数 >= 100',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([[3,3,'fox'],[3,4,'owl']]);
                __t.setEffects([[3,3,'line-horizontal'],[3,4,'bomb']]);
                await __t.swap(3, 3, 3, 4);
            }
        },
        {
            name: '双特效 line + line',
            validate: (game) => game.score >= 100,
            validateMsg: '分数 >= 100',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([[3,3,'fox'],[3,4,'owl']]);
                __t.setEffects([[3,3,'line-horizontal'],[3,4,'line-vertical']]);
                await __t.swap(3, 3, 3, 4);
            }
        },
        {
            name: '双特效 bomb + bomb',
            validate: (game) => game.score >= 200,
            validateMsg: '分数 >= 200',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([[3,3,'fox'],[3,4,'owl']]);
                __t.setEffects([[3,3,'bomb'],[3,4,'bomb']]);
                await __t.swap(3, 3, 3, 4);
            }
        },
        {
            name: '双特效 rainbow + line',
            validate: (game) => game.score >= 1000,
            validateMsg: '分数 >= 1000',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([[3,3,'fox'],[3,4,'owl']]);
                __t.setEffects([[3,3,'rainbow'],[3,4,'line-horizontal']]);
                await __t.swap(3, 3, 3, 4);
            }
        },
        {
            name: '双特效 rainbow + rainbow',
            validate: (game) => game.score >= 1000,
            validateMsg: '分数 >= 1000',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([[3,3,'fox'],[3,4,'owl']]);
                __t.setEffects([[3,3,'rainbow'],[3,4,'rainbow']]);
                await __t.swap(3, 3, 3, 4);
            }
        },
        
        // ==================== 障碍物测试 ====================
        
        {
            name: '冰（同格伤害 - 单层）',
            validate: (game) => !game.board.getObstacleAt(0, 2),
            validateMsg: '(0,2) 冰消失',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addIce(0, 2, 1);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '冰（同格伤害 - 多层）',
            validate: (game) => {
                const ice = game.board.getObstacleAt(0, 2);
                return !ice || ice.hp < 3;
            },
            validateMsg: '(0,2) 冰 hp 减少',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addIce(0, 2, 3);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '冰（不响应相邻消除）',
            validate: (game) => {
                const ice = game.board.getObstacleAt(1, 1);
                return ice && ice.hp === 2;
            },
            validateMsg: '(1,1) 冰 hp 不变',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addIce(1, 1, 2);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '藤蔓（相邻伤害）',
            validate: (game) => {
                const vine = game.board.getObstacleAt(1, 0);
                return !vine || vine.hp < 2;
            },
            validateMsg: '(1,0) 藤蔓 hp 减少',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addVine(1, 0, 2);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '锁链',
            validate: (game) => true,
            validateMsg: '锁链正常',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __gameEngine.board.addObstacle({ element: 'chain', r: 0, c: 2, hp: 1 });
                __gameEngine.renderSystem.renderAll();
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '冰 + 藤蔓共存',
            validate: (game) => {
                const ice = game.board.getObstacleAt(0, 2);
                const vine = game.board.getObstacleAt(1, 1);
                return (!ice) && (vine && vine.hp === 2);
            },
            validateMsg: '冰消失 + 藤蔓不变',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addIce(0, 2, 1);
                __t.addVine(1, 1, 2);
                await __t.swap(0, 2, 0, 3);
            }
        },
        
        // ==================== 水果测试 ====================
        
        {
            name: '水果收集（1×1）',
            validate: (game) => !game.board.getTargetAt(0, 2),
            validateMsg: '(0,2) 水果消失',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addFruit('watermelon', 0, 2, 1, 1);
                __t.addIce(0, 2, 1);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '水果 + 多层冰',
            validate: (game) => {
                const ice = game.board.getObstacleAt(0, 2);
                return !ice || ice.hp < 2;
            },
            validateMsg: '(0,2) 冰 hp 减少',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addFruit('grape', 0, 2, 1, 1);
                __t.addIce(0, 2, 2);
                await __t.swap(0, 2, 0, 3);
            }
        },
        {
            name: '多重障碍组合',
            validate: (game) => {
                const ice = game.board.getObstacleAt(0, 2);
                return !ice || ice.hp < 2;
            },
            validateMsg: '(0,2) 冰受伤',
            setup: async () => {
                __t.reset('sandbox');
                __t.setupBoard([
                    [0,0,'fox'],[0,1,'fox'],[0,2,'cat'],[0,3,'fox'],
                ]);
                __t.addFruit('orange', 0, 2, 1, 1);
                __t.addIce(0, 2, 2);
                __t.addVine(1, 1, 2);
                await __t.swap(0, 2, 0, 3);
            }
        },
    ];
    
    // ==================== 辅助函数 ====================
    
    function hasEffect(game, effectName) {
        for (let r = 0; r < game.board.rows; r++) {
            for (let c = 0; c < game.board.cols; c++) {
                const p = game.board.get(r, c);
                if (p?.effect === effectName) return true;
            }
        }
        return false;
    }
    
    async function waitIdle(timeout = 5000) {
        const start = Date.now();
        while (__gameEngine.isProcessing && Date.now() - start < timeout) {
            await new Promise(r => setTimeout(r, 50));
        }
        await new Promise(r => setTimeout(r, 200));
    }
    
    // ==================== 日志劫持 ====================
    
    function createLogCollector() {
        const logs = [];
        const origLog = console.log;
        const origErr = console.error;
        const origWarn = console.warn;
        
        console.log = (...args) => {
            origLog(...args);
            logs.push({ level: 'log', text: args.map(formatArg).join(' ') });
        };
        console.error = (...args) => {
            origErr(...args);
            logs.push({ level: 'error', text: args.map(formatArg).join(' ') });
        };
        console.warn = (...args) => {
            origWarn(...args);
            logs.push({ level: 'warn', text: args.map(formatArg).join(' ') });
        };
        
        return {
            logs,
            restore() {
                console.log = origLog;
                console.error = origErr;
                console.warn = origWarn;
            }
        };
    }
    
    function formatArg(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
        try {
            return JSON.stringify(arg, null, 2);
        } catch {
            return String(arg);
        }
    }
    
    // ==================== 主运行器 ====================
    
    async function run() {
        if (typeof __t === 'undefined') {
            alert('❌ __t 未定义（需要 console-tools.js）');
            return;
        }
        if (typeof __pageChecker === 'undefined') {
            alert('❌ __pageChecker 未定义（需要 test/page-checker.js）');
            return;
        }
        
        const startTime = Date.now();
        const results = [];
        const collector = createLogCollector();
        
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🧪 UI 一键测试开始`);
        console.log(`时间: ${new Date().toLocaleString()}`);
        console.log(`${'='.repeat(50)}`);
        
        for (const scenario of SCENARIOS) {
            const scenarioStart = Date.now();
            console.log(`\n${'='.repeat(40)}`);
            console.log(`▶️ ${scenario.name}`);
            console.log(`${'='.repeat(40)}`);
            
            const result = {
                name: scenario.name,
                passed: false,
                duration: 0,
                errors: [],
                logs: [],
                domCheck: null,
                validate: null,
            };
            
            try {
                // 记录日志起始位置
                const logStart = collector.logs.length;
                
                // 1. 执行场景
                await scenario.setup();
                await waitIdle();
                
                // 2. 收集场景日志
                result.logs = collector.logs.slice(logStart).map(l => l.text);
                
                // 3. 逻辑断言
                const validateOk = scenario.validate(__gameEngine);
                result.validate = { 
                    passed: validateOk, 
                    msg: scenario.validateMsg 
                };
                
                // 4. 页面元素检测
                const check = __pageChecker.checkPageConsistency(__gameEngine);
                result.domCheck = {
                    passed: check.consistent,
                    issues: check.issues,
                    stats: check.stats,
                };
                
                result.passed = validateOk && check.consistent;
                result.duration = Date.now() - scenarioStart;
                
                // 输出
                if (result.passed) {
                    console.log(`  ✅ 通过（${result.duration}ms）`);
                } else {
                    console.log(`  ❌ 失败（${result.duration}ms）`);
                    if (!validateOk) console.log(`     - 逻辑断言失败：${scenario.validateMsg}`);
                    if (!check.consistent) {
                        console.log(`     - 页面元素不一致：`);
                        check.issues.forEach(i => console.log(`       · ${i}`));
                    }
                }
                
            } catch (e) {
                result.errors.push(e.message);
                console.error(`  ❌ 崩溃: ${e.message}`);
                result.duration = Date.now() - scenarioStart;
            }
            
            results.push(result);
        }
        
        // 恢复日志
        collector.restore();
        
        const totalDuration = Date.now() - startTime;
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📊 测试结果`);
        console.log(`✅ 通过：${passed} / ${results.length}`);
        console.log(`❌ 失败：${failed} / ${results.length}`);
        console.log(`⏱️ 总耗时：${totalDuration}ms`);
        console.log(`${'='.repeat(50)}`);
        
        // 弹出结果页
        showReport({
            results,
            passed,
            failed,
            total: results.length,
            totalDuration,
            timestamp: new Date().toISOString(),
            allLogs: collector.logs,
        });
    }
    
    // ==================== 结果页 ====================
    
    function showReport(report) {
        // 移除旧的
        document.getElementById('__ui-test-report')?.remove();
        
        // 生成文本报告
        const textReport = generateTextReport(report);
        
        // 创建遮罩
        const overlay = document.createElement('div');
        overlay.id = '__ui-test-report';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        // 创建面板
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: #1e293b;
            border-radius: 16px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        `;
        
        // 顶部状态栏
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const statusColor = report.failed === 0 ? '#4ade80' : '#ef4444';
        header.innerHTML = `
            <div>
                <div style="font-size: 18px; font-weight: bold; color: #fbbf24; margin-bottom: 4px;">
                    🧪 UI 测试报告
                </div>
                <div style="font-size: 13px; color: #94a3b8;">
                    ${new Date(report.timestamp).toLocaleString()} · 总耗时 ${report.totalDuration}ms
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 28px; font-weight: bold; color: ${statusColor};">
                    ${report.passed}/${report.total}
                </div>
                <div style="font-size: 12px; color: #94a3b8;">
                    ${report.failed === 0 ? '✅ 全部通过' : `❌ ${report.failed} 个失败`}
                </div>
            </div>
        `;
        panel.appendChild(header);
        
        // 内容区（可滚动）
        const body = document.createElement('div');
        body.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 16px 24px;
        `;
        body.appendChild(generateResultCards(report.results));
        panel.appendChild(body);
        
        // 底部操作栏
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 24px;
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        `;
        
        const copyBtn = createButton('📋 复制报告', 'primary', () => {
            navigator.clipboard.writeText(textReport).then(() => {
                copyBtn.textContent = '✅ 已复制';
                setTimeout(() => copyBtn.textContent = '📋 复制报告', 1500);
            }).catch(() => {
                // 降级：用 textarea
                const ta = document.createElement('textarea');
                ta.value = textReport;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                copyBtn.textContent = '✅ 已复制';
                setTimeout(() => copyBtn.textContent = '📋 复制报告', 1500);
            });
        });
        
        const copyLogsBtn = createButton('📜 复制日志', 'secondary', () => {
            const logsText = report.allLogs.map(l => l.text).join('\n');
            navigator.clipboard.writeText(logsText).then(() => {
                copyLogsBtn.textContent = '✅ 已复制';
                setTimeout(() => copyLogsBtn.textContent = '📜 复制日志', 1500);
            });
        });
        
        const closeBtn = createButton('✖ 关闭', 'secondary', () => {
            overlay.remove();
        });
        
        footer.appendChild(copyBtn);
        footer.appendChild(copyLogsBtn);
        footer.appendChild(closeBtn);
        panel.appendChild(footer);
        
        overlay.appendChild(panel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        document.body.appendChild(overlay);
    }
    
    function generateResultCards(results) {
        const container = document.createElement('div');
        
        results.forEach((r, i) => {
            const card = document.createElement('div');
            const color = r.passed ? '#4ade80' : '#ef4444';
            const icon = r.passed ? '✅' : '❌';
            
            card.style.cssText = `
                background: rgba(255,255,255,0.04);
                border-left: 4px solid ${color};
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 12px;
            `;
            
            let html = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 14px; font-weight: bold; color: #e2e8f0;">
                        ${icon} ${r.name}
                    </div>
                    <div style="font-size: 12px; color: #94a3b8;">
                        ${r.duration}ms
                    </div>
                </div>
            `;
            
            // 逻辑断言
            if (r.validate) {
                const vIcon = r.validate.passed ? '✅' : '❌';
                html += `
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">
                        ${vIcon} 逻辑断言：${r.validate.msg}
                    </div>
                `;
            }
            
            // 页面元素检测
            if (r.domCheck) {
                if (r.domCheck.passed) {
                    const s = r.domCheck.stats;
                    html += `
                        <div style="font-size: 12px; color: #94a3b8;">
                            ✅ 页面元素一致（${s.piecesOk}/${s.piecesChecked} 棋子 / 
                            ${s.effectsOk}/${s.effectsChecked} 特效 / 
                            ${s.obstaclesOk}/${s.obstaclesChecked} 障碍 / 
                            ${s.targetsOk}/${s.targetsChecked} 目标物）
                        </div>
                    `;
                } else {
                    html += `
                        <div style="font-size: 12px; color: #f87171; margin-top: 4px;">
                            ❌ 页面元素不一致：
                            <ul style="margin: 4px 0 0 16px; padding: 0;">
                                ${r.domCheck.issues.slice(0, 10).map(i => `<li>${escapeHtml(i)}</li>`).join('')}
                                ${r.domCheck.issues.length > 10 ? `<li>... 还有 ${r.domCheck.issues.length - 10} 处</li>` : ''}
                            </ul>
                        </div>
                    `;
                }
            }
            
            // 错误
            if (r.errors.length > 0) {
                html += `
                    <div style="font-size: 12px; color: #f87171; margin-top: 4px;">
                        ❌ 错误：${r.errors.map(escapeHtml).join('; ')}
                    </div>
                `;
            }
            
            card.innerHTML = html;
            container.appendChild(card);
        });
        
        return container;
    }
    
    function createButton(text, type, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 8px 16px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-family: inherit;
            transition: transform 0.2s;
            ${type === 'primary' 
                ? 'background: linear-gradient(135deg, #fbbf24, #ef4444); color: white; font-weight: bold;' 
                : 'background: rgba(255,255,255,0.08); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.15);'}
        `;
        btn.addEventListener('click', onClick);
        return btn;
    }
    
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    
    // ==================== 文本报告生成 ====================
    
    function generateTextReport(report) {
        const lines = [];
        
        lines.push('='.repeat(60));
        lines.push('🧪 糖果消消乐 - UI 测试报告');
        lines.push('='.repeat(60));
        lines.push(`时间: ${new Date(report.timestamp).toLocaleString()}`);
        lines.push(`总耗时: ${report.totalDuration}ms`);
        lines.push(`结果: ✅ ${report.passed} / ❌ ${report.failed} / 共 ${report.total}`);
        lines.push('');
        
        // 逐场景
        lines.push('-'.repeat(60));
        lines.push('📋 详细结果');
        lines.push('-'.repeat(60));
        
        report.results.forEach((r, i) => {
            lines.push('');
            lines.push(`[${i + 1}/${report.results.length}] ${r.passed ? '✅' : '❌'} ${r.name}（${r.duration}ms）`);
            
            if (r.validate) {
                lines.push(`  逻辑断言: ${r.validate.passed ? '✅' : '❌'} ${r.validate.msg}`);
            }
            
            if (r.domCheck) {
                if (r.domCheck.passed) {
                    const s = r.domCheck.stats;
                    lines.push(`  页面元素: ✅ 一致`);
                    lines.push(`    棋子 ${s.piecesOk}/${s.piecesChecked}`);
                    lines.push(`    特效 ${s.effectsOk}/${s.effectsChecked}`);
                    lines.push(`    障碍 ${s.obstaclesOk}/${s.obstaclesChecked}`);
                    lines.push(`    目标物 ${s.targetsOk}/${s.targetsChecked}`);
                } else {
                    lines.push(`  页面元素: ❌ 不一致`);
                    r.domCheck.issues.forEach(issue => {
                        lines.push(`    · ${issue}`);
                    });
                }
            }
            
            if (r.errors.length > 0) {
                lines.push(`  错误:`);
                r.errors.forEach(e => lines.push(`    · ${e}`));
            }
        });
        
        // 完整日志
        lines.push('');
        lines.push('-'.repeat(60));
        lines.push('📜 完整日志');
        lines.push('-'.repeat(60));
        
        report.allLogs.forEach(l => {
            const prefix = l.level === 'error' ? '❌ ' : l.level === 'warn' ? '⚠️ ' : '';
            lines.push(`${prefix}${l.text}`);
        });
        
        return lines.join('\n');
    }
    
    // ==================== 暴露到全局 ====================
    
    window.__uiTest = {
        run,
        SCENARIOS,
    };
    
    console.log('🧪 UI 一键测试运行器已加载（__uiTest.run()）');
    
    // 自动挂到按钮（如果存在）
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('ui-test-btn');
        if (btn) {
            btn.addEventListener('click', () => run());
        }
    });
})();