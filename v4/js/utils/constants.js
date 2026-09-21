// ==================== 全局常量 ====================

// 存储键
const STORAGE_KEYS = {
    config: 'candy_config_v8',
    levels: 'candy_levels_v8',
    elements: 'candy_elements_v8',
    version: 'candy_version_v8'
};

const CONFIG_VERSION = '8.0.0';

// ===== 形状类型 =====
const SHAPES = {
    LINE: 'line',
    SQUARE: 'square',
    T_SHAPE: 'tshape',
    L_SHAPE: 'lshape',
    CROSS: 'cross',
    BIG_T: 'bigT',
    COMPLEX: 'complex'
};

// ===== 方向 =====
const DIRECTIONS = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};

// ===== 元素类型（元数据的 category）=====
const ELEMENT_CATEGORIES = {
    PIECE: 'piece',         // 普通棋子
    EFFECT: 'effect',       // 特效
    OBSTACLE: 'obstacle',   // 障碍物
    GENERATOR: 'generator', // 生成器
    TARGET: 'target',       // 目标物
    DECORATION: 'decoration' // 装饰
};

// ===== 渲染层 =====
const RENDER_LAYERS = {
    BOARD: 0,           // 底板
    TARGET: 1,          // 目标物（水果等）
    OBSTACLE: 2,        // 障碍物（冰、藤蔓等）
    PIECE: 3,           // 棋子
    EFFECT: 4,          // 特效覆盖层
    OVERLAY: 5          // 弹层
};

// ===== 动画时长（默认）=====
const ANIMATION = {
    SWAP: 250,
    REMOVE: 300,
    EXPLODE: 400,
    GRAVITY_BASE: 400,
    MESSAGE: 1600,
    HINT: 1500
};

// ===== 保护上限 =====
const LIMITS = {
    MAX_STABILIZE: 100,
    MAX_RANDOM: 50,
    MAX_CHAIN: 50,
    MAX_LEVELS: 500
};

// ===== 默认棋盘配置 =====
const DEFAULT_CONFIG = {
    rows: 8,
    cols: 8,
    cellSize: 60,
    gap: 4,
    totalMoves: 30,
    matchLength: 3,
    dragThreshold: 15,
    gravitySpeed: 1.0,
    
    // 匹配
    enableSquare: true,
    enableDiagonal: false,
    enableDrag: true,
    
    // 计分
    baseScore: 10,
    comboMultiplier: true,
    
    // 元数据
    name: '自定义关卡',
    version: CONFIG_VERSION
};