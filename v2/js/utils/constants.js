// ==================== 常量定义 ====================

const STORAGE_KEYS = {
    config: 'candy_crush_config_v6',
    levels: 'candy_crush_levels_v6',
    version: 'candy_crush_version'
};

const CONFIG_VERSION = '6.0.0';

// 形状类型
const SHAPE_TYPES = {
    LINE: 'line',
    SQUARE: 'square',
    TSHAPE: 'tshape',
    LSHAPE: 'lshape',
    CROSS: 'cross',
    BIG_T: 'bigT',
    COMPLEX: 'complex'
};

// 方向
const DIRECTIONS = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};

// 动作类型
const ACTION_TYPES = {
    REMOVE: 'remove',
    DAMAGE: 'damage',
    CONVERT: 'convert',
    SPAWN: 'spawn',
    TRIGGER: 'trigger',
    CUSTOM: 'custom'
};

// 属性层默认名称
const ATTR_NAMES = {
    ICE: 'ice',
    LOCKED: 'locked',
    FROZEN: 'frozen',
    WALL_TOP: 'wall_top',
    WALL_RIGHT: 'wall_right',
    WALL_BOTTOM: 'wall_bottom',
    WALL_LEFT: 'wall_left'
};

// 渲染层次
const RENDER_LAYERS = {
    BG: 0,
    PATTERN: 0.1,
    MAIN: 1,
    BORDER: 1.5,
    WALL: 2,
    ICE: 3,
    EFFECT: 3.5,
    STATE: 4
};

// 动画时长
const ANIMATION = {
    SWAP: 250,
    REMOVE: 300,
    EXPLODE: 400,
    GRAVITY: 400,          // ← 基准下落时长
    GRAVITY: 360,
    MESSAGE: 1600,
    HINT: 1500
};

// 保护上限
const LIMITS = {
    MAX_STABILIZE: 100,
    MAX_RANDOM: 50,
    MAX_CHAIN: 50,
    MAX_LEVELS: 20
};

// 默认棋子类型
const DEFAULT_PIECE_TYPES = [
    { id: 'apple',  code: 'A', char: '🍎', color: '#ff6b6b', pattern: 'dot',    patternColor: 'rgba(255,255,255,0.28)' },
    { id: 'grape',  code: 'B', char: '🍇', color: '#a855f7', pattern: 'stripe', patternColor: 'rgba(255,255,255,0.22)' },
    { id: 'orange', code: 'C', char: '🍊', color: '#fb923c', pattern: 'check',  patternColor: 'rgba(255,255,255,0.24)' },
    { id: 'lemon',  code: 'D', char: '🍋', color: '#facc15', pattern: 'spark',  patternColor: 'rgba(255,255,255,0.20)' },
    { id: 'straw',  code: 'E', char: '🍓', color: '#ec4899', pattern: 'dot',    patternColor: 'rgba(255,255,255,0.20)' },
    { id: 'water',  code: 'F', char: '🍉', color: '#34d399', pattern: 'waves',  patternColor: 'rgba(255,255,255,0.22)' }
];

// 默认配置
const DEFAULT_CONFIG = {
    rows: 10,
    cols: 10,
    cellSize: 60,
    gap: 4,
    totalMoves: 30,
    matchLength: 3,
    dragThreshold: 15,
    
    // 目标
    targetScoreEnabled: true,
    targetScore: 50000,
    requiredPieceEnabled: false,
    requiredPieceType: 'A',
    requiredPieceCount: 10,
    enableTimeLimit: false,
    timeLimitSeconds: 90,
    
    // 匹配
    enableSquare: true,
    enableDiagonal: false,
    enableDrag: true,
    
    // 计分
    baseScore: 10,
    comboMultiplier: true,
    
    // 初始棋盘
    initialBoard: null,
    
    // 棋子类型
    pieceTypes: DEFAULT_PIECE_TYPES,

     // 重力下落速度（1.0 = 正常，2.0 = 两倍速，0.5 = 半速）
    gravitySpeed: 1.0,
    
    // 元数据
    name: '自定义关卡',
    version: CONFIG_VERSION
};