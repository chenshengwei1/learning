// ==================== 特效合成规则 ====================

/**
 * 特效合成规则
 * 
 * 当匹配形状满足条件时，在指定位置生成指定特效
 * 
 * 规则格式：
 * {
 *   id: '规则名',
 *   when: { shape: 'xxx', length: N },   // 条件
 *   create: 'effect-id',                  // 生成什么特效
 *   place: 'middle' | 'intersection',     // 生成位置
 *   preserve: ['direction', 'color']      // 传递什么属性
 * }
 */
const BUILTIN_CREATION_RULES = [
    
    // ===== 直线 4 连（水平）→ 水平直线特效 =====
    {
        id: 'line4-horizontal',
        when: { shape: 'line', length: 4, direction: 'horizontal' },
        create: 'line-horizontal',
        place: 'middle',
        preserve: ['color']
    },
    
    // ===== 直线 4 连（垂直）→ 垂直直线特效 =====
    {
        id: 'line4-vertical',
        when: { shape: 'line', length: 4, direction: 'vertical' },
        create: 'line-vertical',
        place: 'middle',
        preserve: ['color']
    },
    
    // ===== 直线 5 连及以上 → 彩虹特效 =====
    {
        id: 'line5',
        when: { shape: 'line', minLength: 5 },
        create: 'rainbow',
        place: 'middle',
        preserve: []
    },
    
    // ===== 田字 → 田字特效 =====
    {
        id: 'square',
        when: { shape: 'square', length: 4 },
        create: 'square-effect',
        place: 'middle',
        preserve: ['color']
    },
    
    // ===== T 形 / L 形 5 连 → 爆炸特效 =====
    {
        id: 'tshape',
        when: { shape: 'tshape' },
        create: 'bomb',
        place: 'intersection',
        preserve: ['color']
    },
    {
        id: 'lshape',
        when: { shape: 'lshape' },
        create: 'bomb',
        place: 'intersection',
        preserve: ['color']
    },
    
    // ===== 十字架 5 连及以上 → 彩虹特效 =====
        // ===== 大 T → 彩色小鸟 =====
    {
        id: 'bigT',
        when: { shape: 'bigT' },
        create: 'rainbow-plus',
        place: 'intersection',
        preserve: []
    },
        // ===== 直线 5 连及以上 → 彩虹特效（纯色） =====
    {
        id: 'line5',
        when: { shape: 'line', minLength: 5 },
        create: 'rainbow',
        place: 'middle',
        preserve: ['color']    // ← 加这行
    },
];

/**
 * 该函数会在引擎初始化时调用，将规则转化为可执行的回调
 */
function applyCreationRules(game) {
    // 挂载到 game 上，供 GameEngine.processMatches 调用
    game._creationRules = BUILTIN_CREATION_RULES;
}