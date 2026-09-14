// ==================== 常量定义 ====================

 const EMPTY_CELL_VALUE = 'empty';
 const BLANK_PIECE_TYPE = 'blank';
 const BLANK_PIECE_CODE = 'Z';
 const DEFAULT_TYPE_CODES = { apple: 'A', grape: 'B', orange: 'C', lemon: 'D', straw: 'E', water: 'F' };
 const WALL_SIDES = ['top', 'right', 'bottom', 'left'];
 const WALL_HP_MAP = { none: 0, low: 1, medium: 2, high: 3 };
 const EMPTY_TOKENS = new Set(['-', '_', '.', 'empty', 'null', 'none']);
 const STATE_TOKENS = new Set(['locked', 'frozen', 'bomb']);

// 性能与稳定性常量
 const MAX_STABILIZE_ATTEMPTS = 100;
 const MAX_RANDOM_ATTEMPTS = 50;
 const FROZEN_CHANCE = 0.12;
 const MAX_LEVELS_STORED = 20;
 const HINT_DISPLAY_DURATION = 1500;
 const MESSAGE_DISPLAY_DURATION = 1600;
 const SWAP_ANIMATION_DURATION = 250;
 const REMOVE_ANIMATION_DURATION = 300;
 const EXPLOSION_ANIMATION_DURATION = 400;
 const GRAVITY_ANIMATION_DURATION = 360;

 const DEFAULT_PIECE_UI = {
    background: { opacity: 0.35, priority: 0 },
    type: { fontSize: 0.55, priority: 1 },
    walls: { priority: 2, color: '#facc15' },
    ices: { priority: 3, color: 'rgba(190,235,255,0.42)' },
    frozen: { priority: 3, color: 'rgba(255,200,0,0.5)' },
};

 const CONFIG_KEY = 'candy_crush_config_v5';
 const LEVELS_KEY = 'candy_crush_levels_v5';

 const DEFAULT_CONFIG = {
    rows: 10, cols: 10, cellSize: 60, gap: 4, totalMoves: 30, matchLength: 3, dragThreshold: 15,
    enableTimeLimit: false, timeLimitSeconds: 90,
    targetScore: 50000, targetScoreEnabled: true,
    requiredPieceType: 'A', requiredPieceCount: 10, requiredPieceEnabled: false,
    initialBoard: null,
    enableSquare: true, enableDiagonal: false, enableDrag: true,
    explodeRules: { 4: 'cross', 5: 'screen', 6: 'blast:2' },
    baseScore: 10, comboMultiplier: true,
    pieceTypes: [
        { id: 'apple', code: 'A', char: '🍎', color: '#ff6b6b', background: '#ff6b6b', pattern: 'dot', patternColor: 'rgba(255,255,255,0.28)', pieceColor: '#fff7f7', pieceUI: { type: { options: [{ value: 'A', label: 'apple' }] } }, walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
        { id: 'grape', code: 'B', char: '🍇', color: '#a855f7', background: '#a855f7', pattern: 'stripe', patternColor: 'rgba(255,255,255,0.22)', pieceColor: '#ffffff', pieceUI: { type: { options: [{ value: 'B', label: 'grape' }] } }, walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
        { id: 'orange', code: 'C', char: '🍊', color: '#fb923c', background: '#fb923c', pattern: 'check', patternColor: 'rgba(255,255,255,0.24)', pieceColor: '#fffaf1', pieceUI: { type: { options: [{ value: 'C', label: 'orange' }] } }, walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
        { id: 'lemon', code: 'D', char: '🍋', color: '#facc15', background: '#facc15', pattern: 'spark', patternColor: 'rgba(255,255,255,0.20)', pieceColor: '#fffef3', pieceUI: { type: { options: [{ value: 'D', label: 'lemon' }] } }, walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
        { id: 'straw', code: 'E', char: '🍓', color: '#ec4899', background: '#ec4899', pattern: 'dot', patternColor: 'rgba(255,255,255,0.20)', pieceColor: '#fff4f8', pieceUI: { type: { options: [{ value: 'E', label: 'straw' }] } }, walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
        { id: 'water', code: 'F', char: '🍉', color: '#34d399', background: '#34d399', pattern: 'waves', patternColor: 'rgba(255,255,255,0.22)', pieceColor: '#f0fff7', pieceUI: { type: { options: [{ value: 'F', label: 'water' }] } }, walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
        { id: BLANK_PIECE_TYPE, code: BLANK_PIECE_CODE, isPiece: true, char: '', color: 'transparent', background: 'transparent', pattern: 'transparent', patternColor: 'transparent', pieceColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)', walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
        { id: EMPTY_CELL_VALUE, code: '-', isPiece: false, char: '', color: 'transparent', background: 'transparent', pattern: 'transparent', patternColor: 'transparent', pieceColor: 'transparent', borderColor: 'transparent', walls: { top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' }, left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' } } },
    ],
};

 const PRESET_CONFIGS = {
    classic: {
        name: '经典模式',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 30, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: false, timeLimitSeconds: 90,
            targetScore: 50000, targetScoreEnabled: true,
            baseScore: 10, comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen' }
        }
    },
    timed: {
        name: '限时挑战',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 999, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: true, timeLimitSeconds: 60,
            targetScore: 30000, targetScoreEnabled: true,
            baseScore: 15, comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen' }
        }
    },
    challenge: {
        name: '挑战关卡',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 20, matchLength: 3,
            enableSquare: true, enableDiagonal: true, enableDrag: true,
            enableTimeLimit: false, timeLimitSeconds: 90,
            targetScore: 80000, targetScoreEnabled: true,
            baseScore: 20, comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen', 6: 'blast:3' }
        }
    },
    wall: {
        name: '围墙模式',
        config: {
            rows: 8, cols: 8, cellSize: 60, gap: 4,
            totalMoves: 25, matchLength: 3,
            enableSquare: true, enableDiagonal: false, enableDrag: true,
            enableTimeLimit: false, timeLimitSeconds: 90,
            targetScore: 60000, targetScoreEnabled: true,
            baseScore: 15, comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen' }
        }
    }
};

 function _makeDefaultWalls() {
    const w = {};
    for (const s of WALL_SIDES) w[s] = { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' };
    return w;
}

// js/utils/constants.js 末尾添加
Object.assign(window, {
    EMPTY_CELL_VALUE,
    BLANK_PIECE_TYPE,
    BLANK_PIECE_CODE,
    DEFAULT_TYPE_CODES,
    WALL_SIDES,
    WALL_HP_MAP,
    EMPTY_TOKENS,
    STATE_TOKENS,
    MAX_STABILIZE_ATTEMPTS,
    MAX_RANDOM_ATTEMPTS,
    FROZEN_CHANCE,
    MAX_LEVELS_STORED,
    HINT_DISPLAY_DURATION,
    MESSAGE_DISPLAY_DURATION,
    SWAP_ANIMATION_DURATION,
    REMOVE_ANIMATION_DURATION,
    EXPLOSION_ANIMATION_DURATION,
    GRAVITY_ANIMATION_DURATION,
    DEFAULT_PIECE_UI,
    CONFIG_KEY,
    LEVELS_KEY,
    DEFAULT_CONFIG,
    PRESET_CONFIGS,
    _makeDefaultWalls
});