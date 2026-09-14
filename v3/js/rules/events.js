// ==================== 内置事件 ====================

function registerBuiltinEvents(registries) {
    const E = registries.events;
    
    // ===== 匹配完成 =====
    E.register('onMatch', {
        meta: {
            label: '匹配时',
            description: '当棋盘上形成匹配时',
            category: '匹配',
            params: [
                {
                    name: 'shapes',
                    label: '形状类型',
                    type: 'multiEnum',
                    options: [
                        { value: 'line', label: '直线' },
                        { value: 'square', label: '田字' },
                        { value: 'tshape', label: 'T形' },
                        { value: 'lshape', label: 'L形' },
                        { value: 'cross', label: '十字架' },
                        { value: 'bigT', label: '大T' }
                    ],
                    default: null
                }
            ]
        },
        match: (config, event) => {
            return event.type === 'match:done';
        }
    });
    
    // ===== 棋子被消除 =====
    E.register('onRemove', {
        meta: {
            label: '被消除时',
            description: '当棋子被消除时',
            category: '棋子',
            params: []
        },
        match: (config, event) => {
            return event.type === 'piece:removed';
        }
    });
    
    // ===== 棋子被交换 =====
    E.register('onSwap', {
        meta: {
            label: '交换时',
            description: '当两个棋子交换时',
            category: '棋子',
            params: [
                { name: 'with', label: '与某元素交换', type: 'elementRef', default: null }
            ]
        },
        match: (config, event) => {
            return event.type === 'piece:swapped';
        }
    });
    
    // ===== 相邻消除 =====
    E.register('onAdjacent', {
        meta: {
            label: '相邻消除时',
            description: '当相邻的棋子被消除时',
            category: '障碍',
            params: [
                {
                    name: 'direction',
                    label: '方向',
                    type: 'enum',
                    options: [
                        { value: 'cross', label: '上下左右' },
                        { value: 'diagonal', label: '斜角' },
                        { value: 'all', label: '全部方向' }
                    ],
                    default: 'cross'
                },
                {
                    name: 'source',
                    label: '来源',
                    type: 'enum',
                    options: [
                        { value: 'match', label: '普通匹配' },
                        { value: 'effect', label: '特效爆炸' },
                        { value: 'any', label: '任意' }
                    ],
                    default: 'any'
                }
            ]
        },
        match: (config, event) => {
            return event.type === 'adjacent:match';
        }
    });
    
    // ===== 回合结束 =====
    E.register('onTurn', {
        meta: {
            label: '回合结束时',
            description: '每个回合结束时触发',
            category: '回合',
            params: [
                { name: 'every', label: '每 N 回合', type: 'number', default: 1, min: 1 }
            ]
        },
        match: (config, event) => {
            return event.type === 'turn:end';
        }
    });
    
    // ===== 落地 =====
    E.register('onLand', {
        meta: {
            label: '棋子落地时',
            description: '当棋子从上方落下并停止时',
            category: '棋子',
            params: []
        },
        match: (config, event) => {
            return event.type === 'piece:landed';
        }
    });
    
    // ===== 特效生成 =====
    E.register('onCreate', {
        meta: {
            label: '特效生成时',
            description: '当特效棋子被生成时',
            category: '特效',
            params: []
        },
        match: (config, event) => {
            return event.type === 'effect:created';
        }
    });
    
    // ===== 连锁触发 =====
    E.register('onChain', {
        meta: {
            label: '连锁触发时',
            description: '当发生连锁反应时',
            category: '特效',
            params: []
        },
        match: (config, event) => {
            return event.type === 'chain:triggered';
        }
    });

    // 新增：
    E.register('onCellCleared', {
        meta: {
            label: '所在格棋子被消除时',
            description: '自己所在格的棋子被消除时触发',
            category: '障碍',
            params: []
        },
        match: (config, event) => event.type === 'cell:cleared'
    });

    E.register('onAnyMatch', {
        meta: {
            label: '任意匹配发生时',
            description: '棋盘上任意位置发生匹配时触发',
            category: '障碍',
            params: []
        },
        match: (config, event) => event.type === 'any:match'
    });

    E.register('onObstacleCleared', {
        meta: {
            label: '障碍物被消除时',
            description: '同格的障碍物被消除时触发',
            category: '目标',
            params: []
        },
        match: (config, event) => event.type === 'obstacle:cleared'
    });
    
    // ===== 游戏开始 =====
    E.register('onGameStart', {
        meta: {
            label: '游戏开始时',
            description: '游戏初始化完成后触发',
            category: '游戏',
            params: []
        },
        match: (config, event) => {
            return event.type === 'game:start';
        }
    });
    
    // ===== 游戏结束 =====
    E.register('onGameEnd', {
        meta: {
            label: '游戏结束时',
            description: '游戏胜利或失败时触发',
            category: '游戏',
            params: []
        },
        match: (config, event) => {
            return event.type === 'game:end';
        }
    });
}