// ==================== 全局常量 ====================

// 存储键
const STORAGE_KEYS = {
    config: 'candy_config_v7',
    levels: 'candy_levels_v7',
    elements: 'candy_elements_v7',
    version: 'candy_version_v7'
};

const CONFIG_VERSION = '7.0.0';

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
    PIECE: 'piece',
    EFFECT: 'effect',           // 特效棋子（待重构，本质是 piece）
    OBSTACLE: 'obstacle',       // 棋子下方的障碍物
    OVERLAY: 'overlay',         // ← 新增：棋子上方的覆盖物（藤蔓）
    GENERATOR: 'generator',
    TARGET: 'target',
    DECORATION: 'decoration'
};

// ===== 渲染层 =====
const RENDER_LAYERS = {
    BOARD: 0,           // 底板
    TARGET: 10,         // 目标物（水果等）
    OBSTACLE: 20,       // 障碍物（冰、锁链，棋子下）
    PIECE: 30,          // 棋子（含特效棋子）
    EFFECT: 40,         // 棋子上层（覆盖在棋子上的视觉元素，如藤蔓）
    SELECTED: 45,       // 选中高亮
    OVERLAY: 50         // 弹层（覆盖在棋子上的元素，如冰块、锁链）
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

// ===== category → 渲染层 映射 =====
const CATEGORY_LAYERS = {
    decoration: RENDER_LAYERS.BOARD,
    target:     RENDER_LAYERS.TARGET,
    obstacle:   RENDER_LAYERS.OBSTACLE,
    piece:      RENDER_LAYERS.PIECE,
    effect:     RENDER_LAYERS.PIECE,      // 特效棋子本质是棋子
    overlay:    RENDER_LAYERS.EFFECT,     // 棋子上层
    generator:  RENDER_LAYERS.OBSTACLE
};

const EMPTY_CELL_VALUE = 'empty';

// 暴露到全局（供测试和其他文件访问）
window.DEFAULT_CONFIG = DEFAULT_CONFIG;
window.EMPTY_CELL_VALUE = EMPTY_CELL_VALUE;
window.SHAPES = SHAPES;
window.DIRECTIONS = DIRECTIONS;
window.ELEMENT_CATEGORIES = ELEMENT_CATEGORIES;
window.RENDER_LAYERS = RENDER_LAYERS;
window.ANIMATION = ANIMATION;
window.LIMITS = LIMITS;
window.STORAGE_KEYS = STORAGE_KEYS;
window.CONFIG_VERSION = CONFIG_VERSION;
window.CATEGORY_LAYERS = CATEGORY_LAYERS;