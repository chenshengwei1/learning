// ==================== 内置动作 ====================

function registerBuiltinActions(registries) {
    const A = registries.actions;
    
    // ===== 消除 =====
    A.register('remove', {
        meta: {
            label: '消除',
            description: '移除目标位置的棋子',
            category: '基础',
            params: [
                { name: 'targets', label: '目标', type: 'selector', required: true }
            ]
        },
        execute: async (game, action, context) => {
            const targets = resolveSelectorSafe(game, action.targets, context);
            if (targets.size === 0) return;
            
            await game.removePieces(targets, context);
        }
    });
    
    // ===== 伤害 =====
    A.register('damage', {
        meta: {
            label: '伤害',
            description: '对目标位置的属性（HP）造成伤害',
            category: '基础',
            params: [
                { name: 'targets', label: '目标', type: 'selector', required: true },
                { name: 'amount', label: '数值', type: 'number', default: 1, min: 1 },
                {
                    name: 'layer',
                    label: '作用层',
                    type: 'enum',
                    options: [
                        { value: 'obstacle', label: '障碍物' },
                        { value: 'target', label: '目标物' },
                        { value: 'overlay', label: '覆盖物' },        // ← 新增
                        { value: ELEMENT_CATEGORIES.PIECE, label: '棋子' }
                    ],
                    default: 'obstacle'
                }
            ]
        },
        execute: async (game, action, context) => {
            const targets = resolveSelectorSafe(game, action.targets, context);
            const layer = action.layer || 'obstacle';
            const amount = action.amount || 1;
            
            console.log(`[damage] layer=${layer} amount=${amount} targets=${[...targets]}`);
            
            for (const key of targets) {
                const { r, c } = keyToPos(key);

                // ===== piece 层：改 attrs.hp =====
                if (layer === ELEMENT_CATEGORIES.PIECE) {
                    const piece = game.board.get(r, c);
                    if (piece) {
                        piece.attrs.hp = (piece.attrs.hp || 0) - amount;
                        game.renderSystem.renderPartial(new Set([key]));
                    }
                    continue;
                }
                
                // ===== target 层：保留"冰遮挡"检查 =====
                if (layer === 'target') {
                    const target = game.board.getTargetAt(r, c);
                    if (!target) {
                        console.log(`[damage][target] (${r},${c}) 无目标物`);
                        continue;
                    }
                    const hasObstacle = checkTargetHasObstacle(game.board, target);
                    if (hasObstacle) {
                        console.log(`[damage][target] (${r},${c}) 目标物 ${target.element} 上还有冰，跳过`);
                        continue;
                    }
                    console.log(`[damage][target] (${r},${c}) 前: ${target.element} hp=${target.hp}`);
                    game.board.damageTargetAt(r, c, amount);
                    game.renderSystem.renderTargetAt(r, c);
                    const after = game.board.getTargetAt(r, c);
                    console.log(`[damage][target] (${r},${c}) 后:`, after ? `${after.element} hp=${after.hp}` : 'null');
                    continue;
                }

                // 通用实体层
                console.log('[DAMAGE-DEBUG] layer=', layer, 'r=', r, 'c=', c);
                console.log('[DAMAGE-DEBUG] board.overlays=', game.board.overlays);
                console.log('[DAMAGE-DEBUG] _getLayerArray(overlay)=', game.board._getLayerArray('overlay'));
                console.log('[DAMAGE-DEBUG] getAt=', game.board.getAt(layer, r, c));
                console.log('[DAMAGE-DEBUG] getOverlayAt=', game.board.getOverlayAt(r, c));
                
                // ===== 通用实体层：obstacle / overlay / 未来任何实体层 =====
                const before = game.board.getAt(layer, r, c);
                console.log(`[damage][entity] (${r},${c}) 前:`, before ? `${before.element} hp=${before.hp}` : 'null');
                
                const result = game.board.damageAt(layer, r, c, amount);
                game.renderSystem.renderLayerAt(layer, r, c);
                
                const after = game.board.getAt(layer, r, c);
                console.log(`[damage][entity] (${r},${c}) 后:`, after ? `${after.element} hp=${after.hp}` : 'null');
                
                if (result.removed && result.entity) {
                    console.log(`[damage][${layer}] (${r},${c}) 实体被移除，触发 ${layer}:cleared`);
                    await game.ruleRuntime.emit(`${layer}:cleared`, {
                        r, c,
                        entity: result.entity,
                        element: result.entity.element,
                        obstacle: result.entity
                    });
                }
            }
        }
    });
    
    // ===== 转化 =====
    A.register('convert', {
        meta: {
            label: '转化',
            description: '把目标位置的棋子变成另一种元素',
            category: '基础',
            params: [
                { name: 'targets', label: '目标', type: 'selector', required: true },
                { name: 'to', label: '变成', type: 'elementRef', required: true }
            ]
        },
        execute: async (game, action, context) => {
            const targets = resolveSelectorSafe(game, action.targets, context);
            const elementId = action.to;
            
            for (const key of targets) {
                const { r, c } = keyToPos(key);
                const newPiece = game.pieceFactory.create(elementId);
                if (newPiece) {
                    game.board.set(r, c, newPiece);
                }
            }
        }
    });
    
    // ===== 生成 =====
    A.register('spawn', {
        meta: {
            label: '生成',
            description: '在目标位置生成新元素',
            category: '基础',
            params: [
                { name: 'targets', label: '位置', type: 'selector', required: true },
                { name: 'element', label: '元素', type: 'elementRef', required: true },
                {
                    name: 'skipIfOccupied',
                    label: '跳过已占用',
                    type: 'boolean',
                    default: true
                }
            ]
        },
        execute: async (game, action, context) => {
            const targets = resolveSelectorSafe(game, action.targets, context);
            const elementId = action.element;
            const skipIfOccupied = action.skipIfOccupied !== false;
            
            for (const key of targets) {
                const { r, c } = keyToPos(key);
                if (skipIfOccupied && !game.board.isEmpty(r, c)) continue;
                
                const newPiece = game.pieceFactory.create(elementId);
                if (newPiece) {
                    game.board.set(r, c, newPiece);
                    await game.ruleRuntime?.emit('piece:created', {
                        r, c, piece: newPiece
                    });
                }
            }
        }
    });
    
    // ===== 触发 =====
    A.register('trigger', {
        meta: {
            label: '触发',
            description: '触发目标位置棋子的特效',
            category: '基础',
            params: [
                { name: 'targets', label: '目标', type: 'selector', required: true }
            ]
        },
        execute: async (game, action, context) => {
            const targets = resolveSelectorSafe(game, action.targets, context);
            
            for (const key of targets) {
                const { r, c } = keyToPos(key);
                const piece = game.board.get(r, c);
                if (piece?.effect) {
                    await game.triggerEffect(r, c, piece);
                }
            }
        }
    });
    
    // ===== 等待 =====
    A.register('wait', {
        meta: {
            label: '等待',
            description: '暂停一段时间',
            category: '控制',
            params: [
                { name: 'ms', label: '毫秒', type: 'number', default: 200, min: 0 }
            ]
        },
        execute: async (game, action) => {
            await sleep(action.ms || 200);
        }
    });
    
    // ===== 收集 =====
    A.register('collect', {
        meta: {
            label: '收集',
            description: '收集目标位置的目标物',
            category: '目标',
            params: [
                { name: 'targets', label: '目标', type: 'selector', required: true }
            ]
        },
        execute: async (game, action, context) => {
            const targets = resolveSelectorSafe(game, action.targets, context);
            
            for (const key of targets) {
                const { r, c } = keyToPos(key);
                const target = game.board.getTargetAt(r, c);
                if (target) {
                    game.board.removeTarget(target);
                    game.collectedCount = (game.collectedCount || 0) + 1;
                    await game.ruleRuntime?.emit('target:collected', {
                        r, c, target
                    });
                }
            }
        }
    });
    
    // ===== 计分 =====
    A.register('addScore', {
        meta: {
            label: '加分数',
            description: '给玩家加分',
            category: '基础',
            params: [
                { name: 'amount', label: '数值', type: 'number', default: 10, min: 0 }
            ]
        },
        execute: async (game, action) => {
            game.score += action.amount || 0;
            game.updateHUD();
        }
    });
    
    // ===== 计分（按目标数量）=====
    A.register('scorePerTarget', {
        meta: {
            label: '按目标计分',
            description: '每消除一个目标加 N 分',
            category: '基础',
            params: [
                { name: 'targets', label: '目标', type: 'selector', required: true },
                { name: 'perUnit', label: '每个分数', type: 'number', default: 10 }
            ]
        },
        execute: async (game, action, context) => {
            const targets = resolveSelectorSafe(game, action.targets, context);
            game.score += targets.size * (action.perUnit || 10);
            game.updateHUD();
        }
    });
    
    // ===== 条件分支 =====
    A.register('if', {
        meta: {
            label: '条件判断',
            description: '满足条件时执行 A，否则执行 B',
            category: '控制',
            params: [
                { name: 'condition', label: '条件', type: 'condition', required: true },
                { name: 'then', label: '满足时', type: 'actionList', required: true },
                { name: 'else', label: '不满足时', type: 'actionList', default: [] }
            ]
        },
        execute: async (game, action, context) => {
            const parser = window.__expressionParser__;
            if (!parser) return;
            
            const passed = parser.matchCondition(action.condition, context);
            const actions = passed ? action.then : action.else;
            
            if (Array.isArray(actions)) {
                for (const subAction of actions) {
                    const parsed = parser.parseAction(subAction);
                    await parser.executeAction(parsed, game, context);
                }
            }
        }
    });
    
    // ===== 循环 =====
    A.register('repeat', {
        meta: {
            label: '循环执行',
            description: '重复执行 N 次',
            category: '控制',
            params: [
                { name: 'times', label: '次数', type: 'number', default: 1, min: 1, max: 100 },
                { name: 'actions', label: '动作', type: 'actionList', required: true }
            ]
        },
        execute: async (game, action, context) => {
            const parser = window.__expressionParser__;
            if (!parser) return;
            
            const times = action.times || 1;
            for (let i = 0; i < times; i++) {
                for (const subAction of action.actions || []) {
                    const parsed = parser.parseAction(subAction);
                    await parser.executeAction(parsed, game, { ...context, $iteration: i });
                }
            }
        }
    });
    
    // ===== 随机选择分支 =====
    A.register('randomPick', {
        meta: {
            label: '随机选一个',
            description: '从多个选项中随机选一个执行',
            category: '控制',
            params: [
                { name: 'options', label: '选项', type: 'actionList', required: true }
            ]
        },
        execute: async (game, action, context) => {
            const parser = window.__expressionParser__;
            if (!parser) return;
            
            const options = action.options || [];
            if (options.length === 0) return;
            
            const rng = game?.rng;
            const idx = rng ? rng.nextInt(options.length) : Math.floor(Math.random() * options.length);
            const pick = options[idx];

            const parsed = parser.parseAction(pick);
            await parser.executeAction(parsed, game, context);
        }
    });
    
    // ===== 设置变量 =====
    A.register('setVar', {
        meta: {
            label: '设置变量',
            description: '设置一个变量值',
            category: '控制',
            params: [
                { name: 'name', label: '变量名', type: 'string', required: true },
                { name: 'value', label: '值', type: 'any', required: true }
            ]
        },
        execute: async (game, action, context) => {
            context[action.name] = action.value;
        }
    });
    
    // ===== 记录日志（调试用）=====
    A.register('log', {
        meta: {
            label: '日志',
            description: '输出调试日志',
            category: '调试',
            params: [
                { name: 'message', label: '信息', type: 'string', required: true }
            ]
        },
        execute: async (game, action, context) => {
            console.log('[RuleLog]', action.message, context);
        }
    });
    
    // ===== 更新 HUD =====
    A.register('updateHUD', {
        meta: {
            label: '刷新界面',
            description: '强制刷新分数、步数等显示',
            category: 'UI',
            params: []
        },
        execute: async (game) => {
            game.updateHUD();
        }
    });
}

/**
 * 检查目标物覆盖范围内是否还有障碍物
 */
function checkTargetHasObstacle(board, target) {
    if (!target.cells) return false;
    for (const { r, c } of target.cells) {
        if (board.getObstacleAt(r, c)) return true;
    }
    return false;
}

// ==================== 辅助函数 ====================

function resolveSelectorSafe(game, selectorConfig, context) {
    const parser = window.__expressionParser__;
    if (!parser) {
        console.warn('ExpressionParser 未初始化');
        return new Set();
    }
    return parser.resolveSelector(selectorConfig, game.board, context);
}