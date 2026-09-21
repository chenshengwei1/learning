// ==================== 元素库 ====================

const BUILTIN_ELEMENTS = [
    
    // ===== 普通棋子（动物）=====
    { id: 'fox',     name: '狐狸',   category: ELEMENT_CATEGORIES.PIECE, svg: '@fox',     color: '#e63946', properties: {
        matchable: true,
        createable: true
    }, type:'base' },
    { id: 'owl',     name: '猫头鹰', category: ELEMENT_CATEGORIES.PIECE, svg: '@owl',     color: '#a855f7', properties: {
        matchable: true,
        createable: true
    }, type:'base' },
    { id: 'cat',     name: '猫',     category: ELEMENT_CATEGORIES.PIECE, svg: '@cat',     color: '#60a5fa', properties: {
        matchable: true,
        createable: true
    }, type:'base' },
    { id: 'chick',   name: '小鸡',   category: ELEMENT_CATEGORIES.PIECE, svg: '@chick',   color: '#fbbf24', properties: {
        matchable: true,
        createable: true
    } },
    { id: 'bear',    name: '熊',     category: ELEMENT_CATEGORIES.PIECE, svg: '@bear',    color: '#a16207', properties: {
        matchable: true,
        createable: true
    } , type:'base'},
    { id: 'frog',    name: '青蛙',   category: ELEMENT_CATEGORIES.PIECE, svg: '@frog',    color: '#22c55e', properties: {
        matchable: true,
        createable: true
    }, type:'base' },
    { id: 'octopus', name: '章鱼',   category: ELEMENT_CATEGORIES.PIECE, svg: '@octopus', color: '#ec4899', properties: {
        movable: false
    } },
    
    // ===== 目标物（水果）=====
    { id: 'watermelon', name: '西瓜', category: 'target', svg: '@watermelon', color: '#ef4444', properties: { hp: 1 } ,
        events: [{
            event: 'onObstacleCleared',   // ← 新增
            actions: [{
                type: 'damage',
                targets: { type: 'cell', r: '$r', c: '$c' },
                amount: 1,
                layer: 'target'
            }]
        }]},
    { id: 'grape',      name: '葡萄', category: 'target', svg: '@grape',      color: '#a855f7', properties: { hp: 1 } ,
        events: [{
            event: 'onObstacleCleared',   // ← 新增
            actions: [{
                type: 'damage',
                targets: { type: 'cell', r: '$r', c: '$c' },
                amount: 1,
                layer: 'target'
            }]
        }]},
    { id: 'lemon',      name: '柠檬', category: 'target', svg: '@lemon',      color: '#eab308', properties: { hp: 1 } ,
        events: [{
            event: 'onObstacleCleared',   // ← 新增
            actions: [{
                type: 'damage',
                targets: { type: 'cell', r: '$r', c: '$c' },
                amount: 1,
                layer: 'target'
            }]
        }]},
    { id: 'orange',     name: '橙子', category: 'target', svg: '@orange',     color: '#ea580c', properties: { hp: 1 } ,
        events: [{
            event: 'onObstacleCleared',   // ← 新增
            actions: [{
                type: 'damage',
                targets: { type: 'cell', r: '$r', c: '$c' },
                amount: 1,
                layer: 'target'
            }]
        }]},
    { id: 'strawberry', name: '草莓', category: 'target', svg: '@strawberry', color: '#e11d48', properties: { hp: 1 } ,
        events: [{
            event: 'onObstacleCleared',   // ← 新增
            actions: [{
                type: 'damage',
                targets: { type: 'cell', r: '$r', c: '$c' },
                amount: 1,
                layer: 'target'
            }]
        }]},
    
    // ===== 障碍物 =====
    {
        id: 'ice',
        name: '冰',
        category: 'obstacle',
        svg: '@ice-1',
        visualResolver: {
            by: 'hp',
            map: { '1': '@ice-1', '2': '@ice-2', '3': '@ice-3' }
        },
        properties: { hp: 3 },
        events: [{
            event: 'onCellCleared',   // ← 从 onAdjacent 改为 onCellCleared
            actions: [{
                type: 'damage',
                targets: { type: 'cell', r: '$r', c: '$c' },
                amount: 1,
                layer: 'obstacle'
            }]
        }]
    },
    {
        id: 'vine',
        name: '藤蔓',
        category: 'overlay',           // ← obstacle 改 overlay
        svg: '@vine',
        properties: {
            hp: 3,                     // ← 2 改 3
            hpMode: 'whole',
            blocksMovement: true       // ← 新增
        },
        events: [{
            event: 'onAdjacent',
            when: { direction: 'cross', source: 'match' },
            actions: [{
                type: 'damage',
                targets: { type: 'cell', r: '$r', c: '$c' },
                amount: 1,
                layer: 'overlay'       // ← obstacle 改 overlay
            }]
        }]
    },
    {
        id: 'chain',
        name: '锁链',
        category: 'obstacle',
        svg: '@chain',
        properties: { hp: 1 },
        events: [{
            event: 'onAdjacent',
            when: { direction: 'cross', source: 'any' },
            actions: [{ type: 'damage', targets: { type: 'cell', r: '$r', c: '$c' }, amount: 1, layer: 'obstacle' }]
        }]
    },
    
    // ===== 特效 =====
    {
        id: 'line-horizontal',
        name: '直线特效（水平）',
        category: ELEMENT_CATEGORIES.PIECE,
        svg: null,
        char: '↔️',
        color: '#3b82f6',
        direction: 'horizontal',
        properties: {},
        events: [{
            event: 'onRemove',
            actions: [{
                type: 'remove',
                targets: [{ type: 'row', r: '$r' }]
            }]
        }]
    },
    {
        id: 'line-vertical',
        name: '直线特效（垂直）',
        category: ELEMENT_CATEGORIES.PIECE,
        svg: null,
        char: '↕️',
        color: '#3b82f6',
        direction: 'vertical',
        properties: {},
        events: [{
            event: 'onRemove',
            actions: [{
                type: 'remove',
                targets: [{ type: 'col', c: '$c' }]
            }]
        }]
    },
    {
        id: 'bomb',
        name: '爆炸特效',
        category: ELEMENT_CATEGORIES.PIECE,
        svg: null,
        char: '💣',
        color: '#f97316',
        properties: {},
        events: [{
            event: 'onRemove',
            actions: [{
                type: 'remove',
                targets: { type: 'area', r: '$r', c: '$c', radius: 1, diagonal: false }
            }]
        }]
    },
    {
        id: 'square-effect',
        name: '田字特效',
        category: ELEMENT_CATEGORIES.PIECE,
        svg: null,
        char: '✨',
        color: '#facc15',
        properties: {},
        events: [{
            event: 'onRemove',
            actions: [{
                type: 'remove',
                targets: { type: 'area', r: '$r', c: '$c', radius: 1, diagonal: false }
            }]
        }]
    },
    {
        id: 'rainbow',
        name: '彩虹特效（纯色）',
        category: ELEMENT_CATEGORIES.PIECE,
        svg: null,           // 动态取原动物的 svg
        char: '🌈',
        color: '#ec4899',
        properties: {},
        events: [{
            event: 'onRemove',
            actions: [{ type: 'remove', targets: { type: 'all' } }]
        }]
    },
    {
        id: 'rainbow-plus',
        name: '彩虹特效（延伸）',
        category: ELEMENT_CATEGORIES.PIECE,
        svg: '@rainbow-bird',   // 固定用彩虹鸟
        char: '🌈',
        color: '#ec4899',
        properties: {},
        events: [{
            event: 'onRemove',
            actions: [{ type: 'remove', targets: { type: 'all' } }]
        }]
    },
    
    // ===== 空 =====
    {
        id: 'empty',
        name: '空',
        category: 'decoration',   // ← 从 ELEMENT_CATEGORIES.PIECE 改为 'decoration'
        svg: null,
        char: '',
        color: 'transparent',
        properties: {}
    }
];