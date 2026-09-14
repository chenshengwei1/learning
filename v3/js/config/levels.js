// ==================== 关卡库 ====================

const BUILTIN_LEVELS = [
    
    // ============================================================
    // 关卡 1：基础三消（无目标物）
    // ============================================================
    {
        id: 'level-001',
        name: '教学关卡',
        description: '熟悉基本三消',
        board: {
            rows: 8,
            cols: 8,
            layout: [
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1]
            ]
        },
        pieces: null,  // 随机填充
        targets: [],
        obstacles: [],
        goals: [
            { type: 'score', value: 5000 }
        ],
        moves: 30,
        config: {
            matchLength: 3,
            enableSquare: true
        }
    },
    
    // ============================================================
    // 关卡 2：收集水果（经典）
    // ============================================================
    {
        id: 'level-002',
        name: '水果收集',
        description: '消除冰块，收集所有水果',
        board: {
            rows: 8,
            cols: 8,
            layout: [
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1]
            ]
        },
        pieces: null,
        targets: [
            // 2×2 西瓜
            { element: 'watermelon', r: 0, c: 0, w: 2, h: 2, hp: 1 },
            // 2×2 葡萄
            { element: 'grape', r: 0, c: 6, w: 2, h: 2, hp: 1 },
            // 2×2 柠檬
            { element: 'lemon', r: 6, c: 0, w: 2, h: 2, hp: 1 },
            // 2×2 橙子
            { element: 'orange', r: 6, c: 6, w: 2, h: 2, hp: 1 }
        ],
        obstacles: [
            // 覆盖在水果上的冰
            { element: 'ice', r: 0, c: 0, hp: 1 },
            { element: 'ice', r: 0, c: 1, hp: 1 },
            { element: 'ice', r: 1, c: 0, hp: 1 },
            { element: 'ice', r: 1, c: 1, hp: 1 },
            
            { element: 'ice', r: 0, c: 6, hp: 2 },
            { element: 'ice', r: 0, c: 7, hp: 1 },
            { element: 'ice', r: 1, c: 6, hp: 2 },
            { element: 'ice', r: 1, c: 7, hp: 1 },
            
            { element: 'ice', r: 6, c: 0, hp: 1 },
            { element: 'ice', r: 6, c: 1, hp: 2 },
            { element: 'ice', r: 7, c: 0, hp: 1 },
            { element: 'ice', r: 7, c: 1, hp: 2 },
            
            { element: 'ice', r: 6, c: 6, hp: 2 },
            { element: 'ice', r: 6, c: 7, hp: 1 },
            { element: 'ice', r: 7, c: 6, hp: 2 },
            { element: 'ice', r: 7, c: 7, hp: 1 },
            
            // 中间藤蔓
            { element: 'vine', r: 3, c: 3, hp: 2 },
            { element: 'vine', r: 3, c: 4, hp: 2 },
            { element: 'vine', r: 4, c: 3, hp: 2 },
            { element: 'vine', r: 4, c: 4, hp: 2 }
        ],
        goals: [
            { type: 'collectAll' }
        ],
        moves: 25,
        config: {
            matchLength: 3,
            enableSquare: true
        }
    },
    
    // ============================================================
    // 关卡 3：消除指定棋子
    // ============================================================
    {
        id: 'level-003',
        name: '捕猎狐狸',
        description: '消除 30 只狐狸',
        board: {
            rows: 8,
            cols: 8,
            layout: [
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1]
            ]
        },
        pieces: null,
        targets: [],
        obstacles: [],
        goals: [
            { type: 'eliminate', element: 'fox', count: 30 }
        ],
        moves: 20,
        config: {
            matchLength: 3,
            enableSquare: true
        }
    },
    
    // ============================================================
    // 关卡 4：限时挑战
    // ============================================================
    {
        id: 'level-004',
        name: '限时挑战',
        description: '60 秒内达到 10000 分',
        board: {
            rows: 8,
            cols: 8,
            layout: [
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1]
            ]
        },
        pieces: null,
        targets: [],
        obstacles: [],
        goals: [
            { type: 'score', value: 10000 }
        ],
        moves: 999,
        config: {
            matchLength: 3,
            enableSquare: true,
            enableTimeLimit: true,
            timeLimitSeconds: 60
        }
    },
    
    // ============================================================
    // 关卡 5：固定棋盘（演示）
    // ============================================================
    {
        id: 'level-005',
        name: '固定布局',
        description: '测试固定棋盘',
        board: {
            rows: 6,
            cols: 6,
            layout: [
                [0, 1, 1, 1, 1, 0],
                [1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1],
                [0, 1, 1, 1, 1, 0]
            ]
        },
        pieces: [
            ['fox', 'owl', 'cat', 'chick', null, null],
            ['owl', 'cat', 'chick', 'bear', 'frog', 'octopus'],
            ['cat', 'chick', 'bear', 'frog', 'octopus', 'fox'],
            ['chick', 'bear', 'frog', 'octopus', 'fox', 'owl'],
            ['bear', 'frog', 'octopus', 'fox', 'owl', 'cat'],
            [null, 'octopus', 'fox', 'owl', 'cat', null]
        ],
        targets: [],
        obstacles: [],
        goals: [
            { type: 'score', value: 3000 }
        ],
        moves: 15,
        config: {
            matchLength: 3,
            enableSquare: true
        }
    }
];