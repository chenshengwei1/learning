/* ================================================================
 *  🍬 糖果消消乐 v5 - 规则引擎架构
 *  设计模式：策略模式 + 工厂模式 + 观察者模式
 *  核心模块：
 *    - Piece System: 棋子多层属性（基础类型/颜色/边框/状态）
 *    - Match Engine: 可插拔的消除规则（直线/斜线/田字/爆炸）
 *    - Score System: 可配置的计分规则
 * ================================================================ */

/* ==================== 一、配置系统 ==================== */

const EMPTY_CELL_VALUE = 'empty';
const BLANK_PIECE_TYPE = 'blank';
const BLANK_PIECE_CODE = 'Z';
const DEFAULT_TYPE_CODES = {
    apple: 'A',
    grape: 'B',
    orange: 'C',
    lemon: 'D',
    straw: 'E',
    water: 'F',
};

const DEFAULT_PIECE_UI = {
    background: { opacity: 0.35, priority: 0 },
    type: { fontSize: 0.55, priority: 1 },
    walls: { priority: 2, color: '#facc15' },
    ices: { priority: 3, color: 'rgba(190, 235, 255, 0.42)' },
    frozen: { priority: 3, color: 'rgba(255, 200, 0, 0.5)' },
};

const DEFAULT_CONFIG = {
    // 棋盘
    rows: 10,
    cols: 10,
    cellSize: 60,
    gap: 4,

    // 棋子配置：名称:显示字符:背景色
    // 可扩展字段：background、pattern、pieceColor、patternColor、walls
    pieceTypes: [
        {
            id: 'apple',
            code: 'A',
            char: '🍎',
            color: '#ff6b6b',
            background: '#ff6b6b',
            pattern: 'dot',
            patternColor: 'rgba(255,255,255,0.28)',
            pieceColor: '#fff7f7',
            pieceUI: { type: { options: [{ value: 'A', label: 'apple' }] } },
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
        {
            id: 'grape',
            code: 'B',
            char: '🍇',
            color: '#a855f7',
            background: '#a855f7',
            pattern: 'stripe',
            patternColor: 'rgba(255,255,255,0.22)',
            pieceColor: '#ffffff',
            pieceUI: { type: { options: [{ value: 'B', label: 'grape' }] } },
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
        {
            id: 'orange',
            code: 'C',
            char: '🍊',
            color: '#fb923c',
            background: '#fb923c',
            pattern: 'check',
            patternColor: 'rgba(255,255,255,0.24)',
            pieceColor: '#fffaf1',
            pieceUI: { type: { options: [{ value: 'C', label: 'orange' }] } },
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
        {
            id: 'lemon',
            code: 'D',
            char: '🍋',
            color: '#facc15',
            background: '#facc15',
            pattern: 'spark',
            patternColor: 'rgba(255,255,255,0.2)',
            pieceColor: '#fffef3',
            pieceUI: { type: { options: [{ value: 'D', label: 'lemon' }] } },
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
        {
            id: 'straw',
            code: 'E',
            char: '🍓',
            color: '#ec4899',
            background: '#ec4899',
            pattern: 'dot',
            patternColor: 'rgba(255,255,255,0.2)',
            pieceColor: '#fff4f8',
            pieceUI: { type: { options: [{ value: 'E', label: 'straw' }] } },
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
        {
            id: 'water',
            code: 'F',
            char: '🍉',
            color: '#34d399',
            background: '#34d399',
            pattern: 'waves',
            patternColor: 'rgba(255,255,255,0.22)',
            pieceColor: '#f0fff7',
            pieceUI: { type: { options: [{ value: 'F', label: 'water' }] } },
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
        {
            id: BLANK_PIECE_TYPE,
            code: BLANK_PIECE_CODE,
            isPiece: true,
            char: '',
            color: 'transparent',
            background: 'transparent',
            pattern: 'transparent',
            patternColor: 'transparent',
            pieceColor: 'transparent',
            borderColor: 'rgba(255,255,255,0.3)',
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
        {
            id: EMPTY_CELL_VALUE,
            code: '-',
            isPiece: false,
            char: '',
            color: 'transparent',
            background: 'transparent',
            pattern: 'transparent',
            patternColor: 'transparent',
            pieceColor: 'transparent',
            borderColor: 'transparent',
            walls: {
                top: { enabled: false, hp: 0, color: '#ffffff' },
                right: { enabled: false, hp: 0, color: '#ffffff' },
                bottom: { enabled: false, hp: 0, color: '#ffffff' },
                left: { enabled: false, hp: 0, color: '#ffffff' },
            },
        },
    ],

    // 游戏规则
    totalMoves: 30,
    matchLength: 3,
    dragThreshold: 15,
    enableTimeLimit: false,
    timeLimitSeconds: 90,
    targetScore: 50000,
    targetScoreEnabled: true,
    requiredPieceType: 'A',
    requiredPieceCount: 10,
    requiredPieceEnabled: false,
    initialBoard: null,

    // 消除规则开关
    enableSquare: true, // 田字形
    enableDiagonal: false, // 斜线
    enableDrag: true, // 拖拽交换

    // 爆炸规则：消除数量 → 爆炸类型
    // 支持: 'cross'(十字), 'screen'(全屏), 'blast:半径'(范围爆炸)
    explodeRules: {
        4: 'cross',
        5: 'screen',
        6: 'blast:2',
    },

    // 计分
    baseScore: 10,
    comboMultiplier: true,
};

const CONFIG_KEY = 'candy_crush_config_v5';
const LEVELS_KEY = 'candy_crush_levels_v5';

function syncTileGroups() {
    document.querySelectorAll('.tile-group').forEach((group) => {
        const selectEl = group.previousElementSibling;
        if (!selectEl || !selectEl.tagName || selectEl.tagName.toLowerCase() !== 'select') return;
        const value = String(selectEl.value ?? '');
        group.querySelectorAll('.option-tile').forEach((tile) => {
            tile.classList.toggle('selected', String(tile.dataset.value) === value);
        });
    });
}

function buildTileOptions(selectEl, options, selectedValue, onSelect) {
    const container = selectEl?.nextElementSibling;
    if (!container || !container.classList || !container.classList.contains('tile-group')) return;
    container.innerHTML = '';
    const value = String(selectedValue ?? selectEl.value ?? '');
    options.forEach((option) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-tile';
        btn.textContent = option.label;
        btn.title = option.title || option.label;
        btn.dataset.value = String(option.value);
        if (String(option.value) === value) btn.classList.add('selected');
        btn.addEventListener('click', () => {
            selectEl.value = option.value;
            onSelect?.(option.value);
            syncTileGroups();
        });
        container.appendChild(btn);
    });
    syncTileGroups();
}

function getPieceTypeCodeById(idOrCode, pieceTypes) {
    if (!idOrCode) return null;
    const match = (pieceTypes || []).find(
        (type) =>
            type &&
            (type.id === idOrCode ||
                type.code === idOrCode ||
                DEFAULT_TYPE_CODES[type.id] === idOrCode),
    );
    return match ? match.code || match.id : idOrCode;
}

function getPieceTypeUIOption(type) {
    const code = type.code || DEFAULT_TYPE_CODES[type.id] || type.id;
    const options = type.pieceUI?.type?.options;
    const configured = Array.isArray(options)
        ? options.find(
              (option) =>
                  String(option.value) === String(code) || String(option.value) === String(type.id),
          )
        : null;
    return {
        value: code,
        label:
            configured?.label ||
            (type.id === BLANK_PIECE_TYPE ? '空白棋子' : type.label || type.id),
    };
}

function isTransparentColor(value) {
    return !value || String(value).trim().toLowerCase() === 'transparent';
}

function toCssHex(value, fallback = '#888888') {
    if (isTransparentColor(value)) return fallback;
    const m = String(value).trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(m)) {
        if (m.length === 4) {
            return '#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3];
        }
        return m;
    }
    const rgb = m.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (rgb) {
        const to2 = (n) =>
            Math.max(0, Math.min(255, Math.round(Number(n))))
                .toString(16)
                .padStart(2, '0');
        return '#' + to2(rgb[1]) + to2(rgb[2]) + to2(rgb[3]);
    }
    return fallback;
}

function hexLuminance(hex) {
    const m = String(hex || '').replace('#', '');
    const full =
        m.length === 3
            ? m
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : m;
    const n = parseInt(full || '888888', 16);
    const r = (n >> 16) & 255,
        g = (n >> 8) & 255,
        b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// background 层的图案对比色：深底用白、浅底用黑，与“类型层”完全无关。
function contrastPatternColor(bgValue) {
    if (isTransparentColor(bgValue)) return 'rgba(255,255,255,0.7)';
    return hexLuminance(toCssHex(bgValue, '#888888')) > 0.55
        ? 'rgba(0,0,0,0.55)'
        : 'rgba(255,255,255,0.7)';
}

function updateLevelList() {
    const levelList = document.getElementById('admin-level-list');
    if (!levelList) return;
    try {
        const levels = JSON.parse(localStorage.getItem(LEVELS_KEY) || '[]');
        if (!Array.isArray(levels) || levels.length === 0) {
            levelList.innerHTML = '<div class="level-pill"><span>暂无保存关卡</span></div>';
            return;
        }
        levelList.innerHTML = '';
        levels.forEach((level) => {
            const row = document.createElement('div');
            row.className = 'level-pill';
            row.innerHTML = `<span>${(level && level.name) || '未命名关卡'}</span>`;
            const loadBtn = document.createElement('button');
            loadBtn.type = 'button';
            loadBtn.textContent = '加载';
            loadBtn.addEventListener('click', () => {
                if (level && level.config) {
                    const safeCfg = sanitizeConfig(level.config);
                    window.__gameEngine?.applyConfig(safeCfg);
                    window.__gameEngine?.init();
                    window.__gameEngine?.setMode('admin');
                    window.__gameEngine?.showMessage(
                        `✅ 已加载关卡：${safeCfg.name || level.name || '未命名关卡'}`,
                    );
                }
            });
            row.appendChild(loadBtn);
            levelList.appendChild(row);
        });
    } catch (err) {
        levelList.innerHTML = '<div class="level-pill"><span>关卡列表不可用</span></div>';
    }
}

function readAdminRuleForm() {
    const get = (id, fallback = '') => {
        const el = document.getElementById(id);
        return el ? (el.value ?? fallback) : fallback;
    };
    const totalMoves = Number(get('admin-total-moves', '30'));
    const requiredPieceType = get('admin-required-piece-type', 'A');
    const requiredPieceCount = Number(get('admin-required-piece-count', '10'));
    const requiredPieceEnabled =
        document.getElementById('admin-required-piece-enabled')?.checked ?? false;
    const targetScore = Number(get('admin-target-score', '50000'));
    const targetScoreEnabled =
        document.getElementById('admin-target-score-enabled')?.checked ?? true;
    const enableTimeLimit = document.getElementById('admin-enable-time-limit')?.checked ?? false;
    const timeLimitSeconds = Number(get('admin-time-limit-seconds', '90'));
    const levelName = document.getElementById('admin-level-name')?.value?.trim() || '';

    return {
        targetScoreEnabled,
        targetScore: Number.isFinite(targetScore) ? Math.max(0, targetScore) : 50000,
        enableTimeLimit,
        timeLimitSeconds: Number.isFinite(timeLimitSeconds) ? Math.max(10, timeLimitSeconds) : 90,
        totalMoves: Number.isFinite(totalMoves) ? Math.max(1, totalMoves) : 30,
        requiredPieceEnabled,
        requiredPieceType,
        requiredPieceCount: Number.isFinite(requiredPieceCount)
            ? Math.max(0, requiredPieceCount)
            : 10,
        levelName,
    };
}

function splitPieceTypeEntries(raw) {
    if (!raw) return [];
    const items = [];
    let current = '';
    let parenDepth = 0;

    const finalizeCurrent = () => {
        const trimmed = current.trim();
        if (trimmed) items.push(trimmed);
        current = '';
    };

    for (const ch of String(raw)) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

        if ((ch === ';' || ch === '\n') && parenDepth === 0) {
            finalizeCurrent();
            continue;
        }

        if (ch === ',' && parenDepth === 0) {
            const candidate = current.trim();
            const hasColorAssignment = candidate.includes(':');
            const beforeColon = candidate.slice(0, candidate.indexOf(':')).trim();
            const afterColon = candidate.slice(candidate.indexOf(':') + 1).trim();
            if (hasColorAssignment && beforeColon && afterColon) {
                finalizeCurrent();
                continue;
            }
        }

        current += ch;
    }

    finalizeCurrent();
    return items.filter(Boolean);
}

function parsePieceTypeEntry(entry, fallbackId = 'piece') {
    const trimmed = String(entry || '').trim();
    if (!trimmed) return null;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex <= 0) {
        const safeId = (trimmed || fallbackId).trim() || fallbackId;
        return {
            id: safeId,
            char: safeId,
            color: '#888',
            background: '#888',
            pattern: 'dot',
            patternColor: 'rgba(255,255,255,0.22)',
            pieceColor: '#ffffff',
            borderColor: 'rgba(255,255,255,0.3)',
            walls: {},
        };
    }

    const id = trimmed.slice(0, colonIndex).trim() || fallbackId;
    const tail = trimmed.slice(colonIndex + 1).trim();
    const [colorPart, ...optionParts] = tail.split('|');
    const options = optionParts.join('|');
    const optionMap = {};

    for (const segment of options ? options.split('|') : []) {
        const idx = segment.indexOf('=');
        if (idx === -1) continue;
        const name = segment.slice(0, idx).trim();
        const value = segment.slice(idx + 1).trim();
        if (name) optionMap[name] = value;
    }

    const walls = {};
    for (const side of ['top', 'right', 'bottom', 'left']) {
        const cap = side[0].toUpperCase() + side.slice(1);
        const rawEnabled = optionMap[`wall${cap}`] ?? optionMap[`wall${cap}Enabled`];
        const hpValue = optionMap[`wall${cap}Hp`] ?? optionMap[`wall${cap}Value`] ?? 0;
        const colorValue = optionMap[`wall${cap}Color`] || 'rgba(255,255,255,0.9)';
        walls[side] = {
            enabled:
                String(rawEnabled ?? 'false')
                    .trim()
                    .toLowerCase() === 'true' || rawEnabled === true,
            hp: Number(hpValue || 0),
            maxHp: Number(hpValue || 0),
            color: colorValue,
        };
    }

    const safeColor = (colorPart || '#888').trim();

    let charOption = '';
    if (optionMap.char) {
        try {
            charOption = decodeURIComponent(optionMap.char);
        } catch (_) {
            charOption = optionMap.char;
        }
    }
    const safeChar =
        charOption && !charOption.includes('(') && !charOption.includes(',')
            ? charOption.trim()
            : id;

    let codeOption = '';
    if (optionMap.code) {
        try {
            codeOption = decodeURIComponent(optionMap.code);
        } catch (_) {
            codeOption = optionMap.code;
        }
    }

    let typeOptions = null;
    if (optionMap.typeOptions) {
        try {
            typeOptions = JSON.parse(decodeURIComponent(optionMap.typeOptions));
        } catch (_) {
            typeOptions = null;
        }
    }

    const resolvedCode =
        id === BLANK_PIECE_TYPE
            ? BLANK_PIECE_CODE
            : id === EMPTY_CELL_VALUE
              ? '-'
              : codeOption && codeOption !== id
                ? codeOption
                : id;

    return {
        id,
        code: resolvedCode,
        isPiece: id !== EMPTY_CELL_VALUE,
        char: safeChar,
        color: safeColor,
        background: safeColor,
        pattern: optionMap.pattern || 'dot',
        patternColor: optionMap.patternColor || 'rgba(255,255,255,0.22)',
        pieceColor: optionMap.pieceColor || '#ffffff',
        borderColor: optionMap.borderColor || 'rgba(255,255,255,0.3)',
        pieceUI: typeOptions ? { type: { options: typeOptions } } : {},
        walls,
    };
}

function normalizePieceTypes(value) {
    if (!value) return [...DEFAULT_CONFIG.pieceTypes];
    if (Array.isArray(value)) {
        const result = value
            .map((entry, index) => {
                if (entry && typeof entry === 'object' && entry.id) return entry;
                return parsePieceTypeEntry(entry, `piece${index + 1}`);
            })
            .filter(Boolean);
        if (!result.some((entry) => entry.id === BLANK_PIECE_TYPE))
            result.push({
                ...DEFAULT_CONFIG.pieceTypes.find((entry) => entry.id === BLANK_PIECE_TYPE),
            });
        if (!result.some((entry) => entry.id === EMPTY_CELL_VALUE))
            result.push({
                ...DEFAULT_CONFIG.pieceTypes.find((entry) => entry.id === EMPTY_CELL_VALUE),
            });
        return result;
    }
    if (typeof value === 'string') {
        const result = splitPieceTypeEntries(value)
            .map((entry, index) => parsePieceTypeEntry(entry, `piece${index + 1}`))
            .filter(Boolean);
        if (!result.some((entry) => entry.id === BLANK_PIECE_TYPE))
            result.push({
                ...DEFAULT_CONFIG.pieceTypes.find((entry) => entry.id === BLANK_PIECE_TYPE),
            });
        if (!result.some((entry) => entry.id === EMPTY_CELL_VALUE))
            result.push({
                ...DEFAULT_CONFIG.pieceTypes.find((entry) => entry.id === EMPTY_CELL_VALUE),
            });
        return result;
    }
    return [...DEFAULT_CONFIG.pieceTypes];
}

function sanitizeWallConfig(walls) {
    const defaultWalls = {
        top: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' },
        right: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' },
        bottom: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' },
        left: { enabled: false, hp: 0, maxHp: 0, color: '#ffffff' },
    };

    const result = { ...defaultWalls };
    const source = walls && typeof walls === 'object' ? walls : {};
    for (const side of ['top', 'right', 'bottom', 'left']) {
        const raw = source[side] || {};
        const hp = Number(raw.hp ?? raw.maxHp ?? 0);
        result[side] = {
            enabled: Boolean(raw.enabled) && hp > 0,
            hp: Number.isFinite(hp) ? Math.max(0, hp) : 0,
            maxHp: Number.isFinite(Number(raw.maxHp ?? hp))
                ? Math.max(0, Number(raw.maxHp ?? hp))
                : Math.max(0, hp),
            color: typeof raw.color === 'string' ? raw.color : '#ffffff',
        };
    }
    return result;
}

function sanitizeConfig(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
    }

    const fallback = { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
    const safe = { ...fallback, ...raw };

    safe.rows = Number.isFinite(Number(raw.rows))
        ? Math.max(2, Math.min(20, Number(raw.rows)))
        : fallback.rows;
    safe.cols = Number.isFinite(Number(raw.cols))
        ? Math.max(2, Math.min(20, Number(raw.cols)))
        : fallback.cols;
    safe.cellSize = Number.isFinite(Number(raw.cellSize))
        ? Math.max(20, Math.min(100, Number(raw.cellSize)))
        : fallback.cellSize;
    safe.gap = Number.isFinite(Number(raw.gap))
        ? Math.max(0, Math.min(12, Number(raw.gap)))
        : fallback.gap;
    safe.totalMoves = Number.isFinite(Number(raw.totalMoves))
        ? Math.max(1, Number(raw.totalMoves))
        : fallback.totalMoves;
    safe.matchLength = Number.isFinite(Number(raw.matchLength))
        ? Math.max(3, Math.min(6, Number(raw.matchLength)))
        : fallback.matchLength;
    safe.timeLimitSeconds = Number.isFinite(Number(raw.timeLimitSeconds))
        ? Math.max(10, Number(raw.timeLimitSeconds))
        : fallback.timeLimitSeconds;
    safe.baseScore = Number.isFinite(Number(raw.baseScore))
        ? Math.max(1, Number(raw.baseScore))
        : fallback.baseScore;
    safe.enableTimeLimit = raw.enableTimeLimit === true;
    safe.targetScore = Number.isFinite(Number(raw.targetScore))
        ? Math.max(0, Number(raw.targetScore))
        : 50000;
    safe.targetScoreEnabled = raw.targetScoreEnabled !== false;
    safe.requiredPieceEnabled = raw.requiredPieceEnabled === true;
    safe.requiredPieceType =
        typeof raw.requiredPieceType === 'string' && raw.requiredPieceType.trim()
            ? raw.requiredPieceType.trim()
            : 'A';
    safe.requiredPieceCount = Number.isFinite(Number(raw.requiredPieceCount))
        ? Math.max(0, Number(raw.requiredPieceCount))
        : 10;
    safe.enableSquare = Boolean(raw.enableSquare);
    safe.enableDiagonal = Boolean(raw.enableDiagonal);
    safe.enableDrag = raw.enableDrag !== false;
    safe.comboMultiplier = raw.comboMultiplier !== false;

    const normalizedPieces = normalizePieceTypes(raw.pieceTypes || fallback.pieceTypes);
    if (normalizedPieces.length >= 2) {
        safe.pieceTypes = normalizedPieces.map((piece) => {
            const normalized = { ...piece };
            normalized.id = String(normalized.id || 'piece');
            normalized.isPiece =
                normalized.id === EMPTY_CELL_VALUE ? false : normalized.isPiece !== false;
            normalized.code = String(
                DEFAULT_TYPE_CODES[normalized.id] &&
                    (!normalized.code || normalized.code === normalized.id)
                    ? DEFAULT_TYPE_CODES[normalized.id]
                    : normalized.code ||
                          (normalized.id === BLANK_PIECE_TYPE ? BLANK_PIECE_CODE : normalized.id),
            );
            normalized.char =
                normalized.id === BLANK_PIECE_TYPE
                    ? ''
                    : normalized.id === EMPTY_CELL_VALUE
                      ? ''
                      : typeof normalized.char === 'string' && normalized.char
                        ? normalized.char
                        : normalized.id;
            normalized.color =
                typeof normalized.color === 'string' && normalized.color
                    ? normalized.color
                    : '#888';
            normalized.background =
                typeof normalized.background === 'string' && normalized.background
                    ? normalized.background
                    : normalized.color;
            normalized.pattern =
                typeof normalized.pattern === 'string' ? normalized.pattern : 'dot';
            normalized.patternColor =
                typeof normalized.patternColor === 'string'
                    ? normalized.patternColor
                    : 'rgba(255,255,255,0.22)';
            normalized.pieceColor =
                typeof normalized.pieceColor === 'string' ? normalized.pieceColor : '#ffffff';
            normalized.borderColor =
                typeof normalized.borderColor === 'string'
                    ? normalized.borderColor
                    : 'rgba(255,255,255,0.3)';
            normalized.pieceUI =
                normalized.pieceUI && typeof normalized.pieceUI === 'object'
                    ? normalized.pieceUI
                    : {};
            normalized.pieceUI.type =
                normalized.pieceUI.type && typeof normalized.pieceUI.type === 'object'
                    ? normalized.pieceUI.type
                    : {};
            normalized.pieceUI.type.options = Array.isArray(normalized.pieceUI.type.options)
                ? normalized.pieceUI.type.options.map((option) => ({
                      ...option,
                      value: option.value === normalized.id ? normalized.code : option.value,
                  }))
                : [
                      {
                          value: normalized.code,
                          label:
                              normalized.id === BLANK_PIECE_TYPE
                                  ? '空白棋子'
                                  : normalized.label || normalized.id,
                      },
                  ];
            normalized.walls = sanitizeWallConfig(normalized.walls || {});
            return normalized;
        });
    } else {
        safe.pieceTypes = [...fallback.pieceTypes];
    }

    if (raw.explodeRules && typeof raw.explodeRules === 'object') {
        safe.explodeRules = { ...fallback.explodeRules, ...raw.explodeRules };
    } else {
        safe.explodeRules = { ...fallback.explodeRules };
    }

    if (Array.isArray(raw.initialBoard)) {
        safe.initialBoard = raw.initialBoard.map((row) =>
            Array.isArray(row)
                ? row.map((cell) => {
                      if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
                          return JSON.parse(JSON.stringify(cell));
                      }
                      return String(cell ?? '');
                  })
                : [],
        );
    } else if (raw.initialBoard === null || raw.initialBoard === undefined) {
        safe.initialBoard = null;
    } else {
        safe.initialBoard = null;
    }

    return safe;
}

const PRESET_CONFIGS = {
    classic: {
        label: '经典模式',
        config: {
            rows: 10,
            cols: 10,
            cellSize: 60,
            totalMoves: 30,
            matchLength: 3,
            enableSquare: true,
            enableDiagonal: false,
            enableDrag: true,
            enableTimeLimit: true,
            timeLimitSeconds: 90,
            baseScore: 10,
            comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen', 6: 'blast:2' },
            gap: 4,
            initialBoard: null,
        },
    },
    timed: {
        label: '限时挑战',
        config: {
            rows: 9,
            cols: 9,
            cellSize: 58,
            totalMoves: 25,
            matchLength: 3,
            enableSquare: false,
            enableDiagonal: true,
            enableDrag: true,
            enableTimeLimit: true,
            timeLimitSeconds: 60,
            baseScore: 12,
            comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen', 6: 'blast:2' },
            gap: 4,
            initialBoard: null,
        },
    },
    challenge: {
        label: '挑战关卡',
        config: {
            rows: 8,
            cols: 8,
            cellSize: 60,
            totalMoves: 18,
            matchLength: 4,
            enableSquare: true,
            enableDiagonal: true,
            enableDrag: true,
            enableTimeLimit: false,
            timeLimitSeconds: 120,
            baseScore: 14,
            comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen', 6: 'blast:2' },
            gap: 4,
            initialBoard: [
                ['apple|frozen', 'grape', 'orange', 'lemon', 'straw', 'water', 'apple', 'grape'],
                ['orange', 'apple', 'grape|bomb', 'empty', 'orange', 'apple', 'grape', 'lemon'],
                ['grape', 'orange|locked', 'apple', 'grape', 'water', 'empty', 'orange', 'apple'],
                ['lemon', 'water', 'apple', 'orange', 'grape', 'apple', 'lemon', 'straw'],
                ['water', 'grape', 'lemon', 'grape|frozen', 'apple', 'orange', 'empty', 'grape'],
                ['apple', 'orange', 'empty', 'water', 'grape', 'apple', 'lemon', 'orange'],
                ['grape', 'apple', 'orange', 'lemon', 'water', 'grape', 'apple', 'straw'],
                ['orange', 'grape|bomb', 'apple', 'water', 'lemon', 'orange', 'grape', 'apple'],
            ],
        },
    },
    wall: {
        label: '围墙模式',
        config: {
            rows: 8,
            cols: 8,
            cellSize: 62,
            totalMoves: 20,
            matchLength: 3,
            enableSquare: true,
            enableDiagonal: false,
            enableDrag: true,
            enableTimeLimit: true,
            timeLimitSeconds: 120,
            baseScore: 12,
            comboMultiplier: true,
            explodeRules: { 4: 'cross', 5: 'screen', 6: 'blast:2' },
            gap: 4,
            pieceTypes: [
                {
                    id: 'apple',
                    char: '🍎',
                    color: '#ff6b6b',
                    background: '#ff6b6b',
                    pattern: 'dot',
                    patternColor: 'rgba(255,255,255,0.28)',
                    pieceColor: '#fff7f7',
                    walls: {
                        top: { enabled: true, hp: 2, color: '#ffffff' },
                        right: { enabled: false, hp: 0, color: '#ffffff' },
                        bottom: { enabled: true, hp: 2, color: '#ffffff' },
                        left: { enabled: false, hp: 0, color: '#ffffff' },
                    },
                },
                {
                    id: 'grape',
                    char: '🍇',
                    color: '#a855f7',
                    background: '#a855f7',
                    pattern: 'stripe',
                    patternColor: 'rgba(255,255,255,0.22)',
                    pieceColor: '#ffffff',
                    walls: {
                        top: { enabled: false, hp: 0, color: '#ffffff' },
                        right: { enabled: true, hp: 3, color: '#ffffff' },
                        bottom: { enabled: false, hp: 0, color: '#ffffff' },
                        left: { enabled: true, hp: 3, color: '#ffffff' },
                    },
                },
                {
                    id: 'orange',
                    char: '🍊',
                    color: '#fb923c',
                    background: '#fb923c',
                    pattern: 'check',
                    patternColor: 'rgba(255,255,255,0.24)',
                    pieceColor: '#fffaf1',
                    walls: {
                        top: { enabled: false, hp: 0, color: '#ffffff' },
                        right: { enabled: true, hp: 2, color: '#ffffff' },
                        bottom: { enabled: true, hp: 2, color: '#ffffff' },
                        left: { enabled: false, hp: 0, color: '#ffffff' },
                    },
                },
                {
                    id: 'lemon',
                    char: '🍋',
                    color: '#facc15',
                    background: '#facc15',
                    pattern: 'spark',
                    patternColor: 'rgba(255,255,255,0.2)',
                    pieceColor: '#fffef3',
                    walls: {
                        top: { enabled: true, hp: 2, color: '#ffffff' },
                        right: { enabled: false, hp: 0, color: '#ffffff' },
                        bottom: { enabled: false, hp: 0, color: '#ffffff' },
                        left: { enabled: true, hp: 2, color: '#ffffff' },
                    },
                },
                {
                    id: 'straw',
                    char: '🍓',
                    color: '#ec4899',
                    background: '#ec4899',
                    pattern: 'dot',
                    patternColor: 'rgba(255,255,255,0.2)',
                    pieceColor: '#fff4f8',
                    walls: {
                        top: { enabled: false, hp: 0, color: '#ffffff' },
                        right: { enabled: true, hp: 2, color: '#ffffff' },
                        bottom: { enabled: false, hp: 0, color: '#ffffff' },
                        left: { enabled: false, hp: 0, color: '#ffffff' },
                    },
                },
                {
                    id: 'water',
                    char: '🍉',
                    color: '#34d399',
                    background: '#34d399',
                    pattern: 'waves',
                    patternColor: 'rgba(255,255,255,0.22)',
                    pieceColor: '#f0fff7',
                    walls: {
                        top: { enabled: true, hp: 3, color: '#ffffff' },
                        right: { enabled: false, hp: 0, color: '#ffffff' },
                        bottom: { enabled: true, hp: 3, color: '#ffffff' },
                        left: { enabled: false, hp: 0, color: '#ffffff' },
                    },
                },
            ],
            initialBoard: null,
        },
    },
};

/* ==================== 二、棋子系统 ==================== */

/**
 * Piece 类 - 棋子多层属性
 * 层级结构：
 *   Layer 1: 背景色 (bg) - 棋子底色
 *   Layer 2: 主体 (main) - 显示字符/图标
 *   Layer 3: 边框 (border) - 边框样式
 *   Layer 4: 状态 (state) - 锁定/冰冻/炸弹等特殊状态
 */
class Piece {
    constructor(typeId, color, char, definition = {}) {
        this.id = definition.id || typeId;
        this.local = { x: Number(definition.x || 0), y: Number(definition.y || 0) };
        this.background = {
            type: definition.background || color || '#888',
            pattern: definition.pattern || 'solid',
            patternColor: definition.patternColor || 'rgba(255,255,255,0.22)',
            priority: Number(definition.backgroundPriority ?? 0),
        };
        this.type = {
            value: definition.code || typeId,
            priority: Number(definition.typePriority ?? 1),
        };
        this.isPiece = definition.isPiece !== false;
        this.walls = this._normalizeWalls(definition.walls || {});
        this.walls.priority = Number(definition.wallsPriority ?? 2);
        this.ices = {
            level: Math.max(0, Math.min(6, Number(definition.iceLevel || 0))),
            priority: Number(definition.icesPriority ?? 3),
        };
        this.frozen = {
            value: Math.max(0, Math.min(3, Number(definition.frozenValue || 0))),
            priority: Number(definition.frozenPriority ?? 3),
        };
        this.pieceUI = {
            ...DEFAULT_PIECE_UI,
            ...(definition.pieceUI || {}),
            background: {
                ...DEFAULT_PIECE_UI.background,
                ...(definition.pieceUI?.background || {}),
            },
            type: { ...DEFAULT_PIECE_UI.type, ...(definition.pieceUI?.type || {}) },
            walls: { ...DEFAULT_PIECE_UI.walls, ...(definition.pieceUI?.walls || {}) },
            ices: { ...DEFAULT_PIECE_UI.ices, ...(definition.pieceUI?.ices || {}) },
            frozen: { ...DEFAULT_PIECE_UI.frozen, ...(definition.pieceUI?.frozen || {}) },
        };

        Object.defineProperties(this, {
            typeId: {
                get: () => this.id,
                set: (value) => {
                    this.id = value;
                },
            },
            color: {
                get: () => this.background.type,
                set: (value) => {
                    this.background.type = value;
                },
            },
            backgroundColor: {
                get: () => this.background.type,
                set: (value) => {
                    this.background.type = value;
                },
            },
            pattern: {
                get: () => this.background.pattern,
                set: (value) => {
                    this.background.pattern = value;
                },
            },
            patternColor: {
                get: () => this.background.patternColor,
                set: (value) => {
                    this.background.patternColor = value;
                },
            },
            char: {
                get: () => this._char,
                set: (value) => {
                    this._char = value;
                },
            },
        });
        this._char = char;
        this.pieceColor = definition.pieceColor || '#ffffff';
        this.borderColor = definition.borderColor || 'rgba(255,255,255,0.3)';
        this.borderWidth = definition.borderWidth || 2;

        // 特殊状态（可叠加）
        this.states = new Set(); // 'locked', 'frozen', 'bomb', 'star'
        this.stateData = {}; // 状态附加数据

        // 额外属性（用于扩展）
        this.metadata = {};

        // 多层行为状态保留在 piece，显示规则保留在 pieceUI。
    }

    _normalizeWalls(rawWalls = {}) {
        const sides = ['top', 'right', 'bottom', 'left'];
        const result = {};
        for (const side of sides) {
            const raw = rawWalls[side] || {};
            result[side] = {
                enabled: Boolean(raw.enabled),
                hp: Number(raw.hp || 0),
                maxHp: Number(raw.maxHp || raw.hp || 0),
                color: raw.color || 'rgba(255,255,255,0.9)',
            };
        }
        result.priority = Number(rawWalls.priority ?? 2);
        return result;
    }

    setWall(side, options = {}) {
        if (!this.walls[side]) return false;
        this.walls[side].enabled = Boolean(options.enabled ?? true);
        this.walls[side].hp = Number(options.hp ?? this.walls[side].hp ?? 0);
        this.walls[side].maxHp = Number(
            options.maxHp ?? this.walls[side].maxHp ?? this.walls[side].hp ?? 0,
        );
        this.walls[side].color = options.color || this.walls[side].color || 'rgba(255,255,255,0.9)';
        return true;
    }

    damageWall(side, amount = 1) {
        if (!this.walls[side] || !this.walls[side].enabled) return false;
        this.walls[side].hp = Math.max(0, Number(this.walls[side].hp || 0) - amount);
        if (this.walls[side].hp <= 0) {
            this.walls[side].enabled = false;
            this.walls[side].hp = 0;
        }
        return true;
    }

    getActiveWallSides() {
        return Object.entries(this.walls)
            .filter(([_, value]) => value && value.enabled && value.hp > 0)
            .map(([side]) => side);
    }

    // 添加状态
    addState(state, data = null) {
        this.states.add(state);
        if (state === 'frozen')
            this.frozen.value = Math.max(1, Number(data?.level || this.frozen.value || 1));
        if (data !== null) this.stateData[state] = data;
        return this;
    }

    // 移除状态
    removeState(state) {
        this.states.delete(state);
        if (state === 'frozen') this.frozen.value = 0;
        delete this.stateData[state];
        return this;
    }

    // 检查是否有某状态
    hasState(state) {
        return this.states.has(state);
    }

    // 克隆
    clone() {
        const p = new Piece(this.typeId, this.color, this.char, {
            code: this.type.value,
            isPiece: this.isPiece,
            background: this.background.type,
            pattern: this.pattern,
            patternColor: this.patternColor,
            pieceColor: this.pieceColor,
            borderColor: this.borderColor,
            borderWidth: this.borderWidth,
            walls: JSON.parse(JSON.stringify(this.walls)),
            iceLevel: this.ices.level,
            frozenValue: this.frozen.value,
            pieceUI: JSON.parse(JSON.stringify(this.pieceUI)),
        });
        p.borderColor = this.borderColor;
        p.borderWidth = this.borderWidth;
        this.states.forEach((s) => p.states.add(s));
        p.stateData = { ...this.stateData };
        p.metadata = { ...this.metadata };
        return p;
    }

    // 是否可交换（被锁定/冰冻则不可交换）
    isSwappable() {
        return !this.hasState('locked') && !this.hasState('frozen');
    }

    // 是否可消除
    isRemovable() {
        return !this.hasState('locked');
    }

    // 渲染为 DOM 结构
    render(cellEl, cellSize, opts = {}) {
        // 清空
        cellEl.innerHTML = '';
        cellEl.style.position = 'relative';
        const skipWallSides = (opts && opts.skipWallSides) || new Set();

        // Layer 1: 底色层
        const bg = document.createElement('div');
        bg.className = 'piece-bg';
        bg.style.background = this.background.type;
        bg.style.opacity = String(this.pieceUI.background.opacity);
        bg.style.zIndex = String(this.pieceUI.background.priority);
        cellEl.appendChild(bg);

        // Layer 2: 图案层（可配置）
        const pattern = document.createElement('div');
        pattern.className = 'piece-pattern';
        pattern.dataset.pattern = this.background.pattern || 'solid';
        const rawPatternColor = this.background.patternColor;
        const hasVisiblePatternColor =
            typeof rawPatternColor === 'string' &&
            rawPatternColor &&
            rawPatternColor.toLowerCase() !== 'transparent';
        const patternColor = hasVisiblePatternColor
            ? rawPatternColor
            : contrastPatternColor(this.background.type);
        pattern.style.background = this._buildPatternBackground(
            this.background.pattern,
            patternColor,
        );
        pattern.style.zIndex = String(this.pieceUI.background.priority + 0.1);
        cellEl.appendChild(pattern);

        // Layer 3: 主体
        const main = document.createElement('div');
        main.className = 'piece-main';
        main.textContent = this.char;
        main.style.color = this.pieceColor || '#fff';
        main.style.fontSize = `${cellSize * Number(this.pieceUI.type.fontSize || 0.55)}px`;
        main.style.zIndex = String(this.pieceUI.type.priority);
        cellEl.appendChild(main);

        // Layer 4: 边框
        const border = document.createElement('div');
        border.className = 'piece-border';
        border.style.border = `${this.borderWidth}px solid ${this.borderColor}`;
        cellEl.appendChild(border);

        // Layer 5: 围墙层（贴边整条边框，粗细统一 4px；低=点线/中=虚线/高=实线）
        for (const side of ['top', 'right', 'bottom', 'left']) {
            const wall = this.walls?.[side];
            if (!wall || !wall.enabled || wall.hp <= 0) continue;
            if (skipWallSides.has(side)) continue;
            const wallEl = document.createElement('div');
            wallEl.className = `piece-wall wall-${side}`;
            const wallColor = this.pieceUI.walls.color || '#facc15';
            const wallStrength = wall.hp >= 3 ? 'high' : wall.hp >= 2 ? 'medium' : 'low';
            const styleMap = { low: 'dotted', medium: 'dashed', high: 'solid' };
            const cap = side[0].toUpperCase() + side.slice(1);
            wallEl.style.borderColor = wallColor;
            wallEl.style[`border${cap}Width`] = '4px';
            wallEl.style[`border${cap}Style`] = styleMap[wallStrength];
            wallEl.style.zIndex = String(this.pieceUI.walls.priority);
            wallEl.title = `${side} wall hp:${wall.hp}`;
            cellEl.appendChild(wallEl);
        }

        if (this.ices.level > 0) {
            const ice = document.createElement('div');
            ice.className = 'piece-ice-layer';
            ice.textContent = this.ices.level > 1 ? String(this.ices.level) : '';
            ice.style.background = this.pieceUI.ices.color;
            ice.style.opacity = String(Math.min(0.85, 0.22 + this.ices.level * 0.1));
            ice.style.zIndex = String(this.pieceUI.ices.priority);
            cellEl.appendChild(ice);
        }

        // Layer 6: 状态叠加层
        if (this.hasState('locked')) {
            const lock = document.createElement('div');
            lock.className = 'piece-locked';
            lock.textContent = '🔒';
            cellEl.appendChild(lock);
        }
        if (this.hasState('frozen')) {
            const frozen = document.createElement('div');
            frozen.className = 'piece-frozen';
            cellEl.appendChild(frozen);
        }
        if (this.hasState('bomb')) {
            const bomb = document.createElement('div');
            bomb.className = 'piece-bomb';
            bomb.textContent = '💣';
            cellEl.appendChild(bomb);
        }
    }

    _buildPatternBackground(pattern, color) {
        switch (pattern) {
            case 'dot':
                return `radial-gradient(circle at 25% 25%, ${color} 0 12%, transparent 13%), radial-gradient(circle at 75% 70%, ${color} 0 10%, transparent 11%)`;
            case 'stripe':
                return `linear-gradient(135deg, transparent 0 42%, ${color} 42% 48%, transparent 48% 100%)`;
            case 'check':
                return `linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%), linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%)`;
            case 'waves':
                return `radial-gradient(circle at 15% 25%, ${color} 0 8%, transparent 9%), radial-gradient(circle at 80% 70%, ${color} 0 8%, transparent 9%), linear-gradient(180deg, transparent 0 25%, ${color} 25% 35%, transparent 35% 100%)`;
            case 'spark':
                return `radial-gradient(circle at 50% 50%, ${color} 0 14%, transparent 15%), linear-gradient(0deg, transparent 0 30%, ${color} 30% 35%, transparent 35% 100%)`;
            case 'transparent':
                return 'transparent';
            default:
                return 'transparent';
        }
    }
}

/* ==================== 三、消除规则引擎 ==================== */

/**
 * MatchRule - 消除规则基类
 * 所有消除规则继承此类，实现 check 方法
 */
class MatchRule {
    constructor(config) {
        this.config = config;
        this.name = 'base';
    }

    // 检查并返回匹配的格子索引 Set
    check(board, rows, cols) {
        return new Set();
    }

    // 获取匹配的优先级（数字越大越先处理）
    get priority() {
        return 0;
    }
}
/**
 * LineMatchRule - 直线消除规则（横向/纵向）
 */
class LineMatchRule extends MatchRule {
    constructor(config) {
        super(config);
        this.matchLength = config.matchLength || 3;
    }

    get priority() {
        return 10;
    }

    check(board, rows, cols) {
        const matches = new Set();
        const len = this.matchLength;
        // 横向
        for (let r = 0; r < rows; r++) {
            if (!board[r]) continue;
            let c = 0;
            while (c <= cols - len) {
                const base = board[r][c];
                if (base === null || base === undefined) {
                    c++;
                    continue;
                }
                let allSame = true;
                for (let i = 1; i < len; i++) {
                    const current = board[r][c + i];
                    if (
                        current === null ||
                        current === undefined ||
                        current.typeId !== base.typeId
                    ) {
                        allSame = false;
                        break;
                    }
                }
                if (allSame) {
                    let ext = len;
                    while (
                        c + ext < cols &&
                        board[r][c + ext] !== null &&
                        board[r][c + ext] !== undefined &&
                        board[r][c + ext].typeId === base.typeId
                    )
                        ext++;
                    for (let i = 0; i < ext; i++) matches.add(r * cols + c + i);
                    c += ext;
                } else {
                    c++;
                }
            }
        }

        // 纵向
        for (let c = 0; c < cols; c++) {
            let r = 0;
            while (r <= rows - len) {
                if (!board[r] || !board[r][c]) {
                    r++;
                    continue;
                }
                const base = board[r][c];
                if (base === null || base === undefined) {
                    r++;
                    continue;
                }
                let allSame = true;
                for (let i = 1; i < len; i++) {
                    const nextRow = board[r + i];
                    if (!nextRow) {
                        allSame = false;
                        break;
                    }
                    const current = nextRow[c];
                    if (
                        current === null ||
                        current === undefined ||
                        current.typeId !== base.typeId
                    ) {
                        allSame = false;
                        break;
                    }
                }
                if (allSame) {
                    let ext = len;
                    while (
                        r + ext < rows &&
                        board[r + ext] &&
                        board[r + ext][c] !== null &&
                        board[r + ext][c] !== undefined &&
                        board[r + ext][c].typeId === base.typeId
                    )
                        ext++;
                    for (let i = 0; i < ext; i++) matches.add((r + i) * cols + c);
                    r += ext;
                } else {
                    r++;
                }
            }
        }

        return matches;
    }
}

/**
 * SquareMatchRule - 田字形消除规则
 */
class SquareMatchRule extends MatchRule {
    constructor(config) {
        super(config);
        this.name = 'square';
    }

    get priority() {
        return 5;
    }

    check(board, rows, cols) {
        const matches = new Set();
        for (let r = 0; r < rows - 1; r++) {
            if (!board[r]) continue;
            for (let c = 0; c < cols - 1; c++) {
                const t = board[r][c];
                if (t === null || t === undefined) continue;
                const right = board[r][c + 1];
                const downRow = board[r + 1];
                if (!downRow) continue;
                const down = downRow[c];
                const diag = downRow[c + 1];
                if (
                    right !== null &&
                    right !== undefined &&
                    right.typeId === t.typeId &&
                    down !== null &&
                    down !== undefined &&
                    down.typeId === t.typeId &&
                    diag !== null &&
                    diag !== undefined &&
                    diag.typeId === t.typeId
                ) {
                    matches.add(r * cols + c);
                    matches.add(r * cols + c + 1);
                    matches.add((r + 1) * cols + c);
                    matches.add((r + 1) * cols + c + 1);
                }
            }
        }
        return matches;
    }
}

/**
 * DiagonalMatchRule - 斜线消除规则
 */
class DiagonalMatchRule extends MatchRule {
    constructor(config) {
        super(config);
        this.name = 'diagonal';
        this.matchLength = config.matchLength || 3;
    }

    get priority() {
        return 8;
    }

    check(board, rows, cols) {
        const matches = new Set();
        const len = this.matchLength;

        // 主对角线方向 (\): 从左上到右下
        for (let r = 0; r <= rows - len; r++) {
            if (!board[r]) continue;
            for (let c = 0; c <= cols - len; c++) {
                const t = board[r][c];
                if (t === null || t === undefined) continue;
                let allSame = true;
                for (let i = 1; i < len; i++) {
                    const nextRow = board[r + i];
                    if (!nextRow) {
                        allSame = false;
                        break;
                    }
                    const current = nextRow[c + i];
                    if (current === null || current === undefined || current.typeId !== t.typeId) {
                        allSame = false;
                        break;
                    }
                }
                if (allSame) {
                    let ext = len;
                    while (
                        r + ext < rows &&
                        c + ext < cols &&
                        board[r + ext] &&
                        board[r + ext][c + ext] !== null &&
                        board[r + ext][c + ext] !== undefined &&
                        board[r + ext][c + ext].typeId === t.typeId
                    )
                        ext++;
                    for (let i = 0; i < ext; i++) matches.add((r + i) * cols + (c + i));
                }
            }
        }

        // 副对角线方向 (/): 从右上到左下
        for (let r = 0; r <= rows - len; r++) {
            if (!board[r]) continue;
            for (let c = len - 1; c < cols; c++) {
                const t = board[r][c];
                if (t === null || t === undefined) continue;
                let allSame = true;
                for (let i = 1; i < len; i++) {
                    const nextRow = board[r + i];
                    if (!nextRow) {
                        allSame = false;
                        break;
                    }
                    const current = nextRow[c - i];
                    if (current === null || current === undefined || current.typeId !== t.typeId) {
                        allSame = false;
                        break;
                    }
                }
                if (allSame) {
                    let ext = len;
                    while (
                        r + ext < rows &&
                        c - ext >= 0 &&
                        board[r + ext] &&
                        board[r + ext][c - ext] !== null &&
                        board[r + ext][c - ext] !== undefined &&
                        board[r + ext][c - ext].typeId === t.typeId
                    )
                        ext++;
                    for (let i = 0; i < ext; i++) matches.add((r + i) * cols + (c - i));
                }
            }
        }

        return matches;
    }
}

/**
 * 爆炸规则处理器
 * 根据消除数量触发不同类型的爆炸效果
 */
class ExplosionHandler {
    constructor(config) {
        this.rules = config.explodeRules || {};
        // 解析规则: 'cross', 'screen', 'blast:半径'
        this.parsedRules = {};
        for (const [count, rule] of Object.entries(this.rules)) {
            const parts = rule.split(':');
            this.parsedRules[parseInt(count)] = {
                type: parts[0],
                radius: parts[1] ? parseInt(parts[1]) : 1,
            };
        }
    }

    // 检测是否有爆炸触发，返回爆炸影响的格子索引
    getExplosionCells(matches, board, rows, cols) {
        const count = matches.size;
        const rule = this.parsedRules[count];
        if (!rule) return new Set();

        const result = new Set();
        const matchArray = Array.from(matches);

        switch (rule.type) {
            case 'cross': {
                // 十字爆炸：以匹配中心（或第一个）为中心，十字方向
                const center = this._getCenter(matchArray, cols);
                const { r, c } = center;
                // 上下左右
                for (let i = -2; i <= 2; i++) {
                    if (r + i >= 0 && r + i < rows) result.add((r + i) * cols + c);
                    if (c + i >= 0 && c + i < cols) result.add(r * cols + (c + i));
                }
                break;
            }
            case 'screen': {
                // 全屏爆炸
                for (let i = 0; i < rows * cols; i++) result.add(i);
                break;
            }
            case 'blast': {
                // 范围爆炸：以匹配中心为中心，半径内
                const center = this._getCenter(matchArray, cols);
                const { r, c } = center;
                const radius = rule.radius || 1;
                for (let dr = -radius; dr <= radius; dr++) {
                    for (let dc = -radius; dc <= radius; dc++) {
                        const nr = r + dr,
                            nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            result.add(nr * cols + nc);
                        }
                    }
                }
                break;
            }
        }

        return result;
    }

    _getCenter(indices, cols) {
        let sumR = 0,
            sumC = 0;
        for (const idx of indices) {
            sumR += Math.floor(idx / cols);
            sumC += idx % cols;
        }
        return { r: Math.round(sumR / indices.length), c: Math.round(sumC / indices.length) };
    }
}

/* ==================== 四、计分系统 ==================== */

class ScoreSystem {
    constructor(config) {
        this.baseScore = config.baseScore || 10;
        this.comboMultiplier = config.comboMultiplier !== false;
    }

    calculate(matchCount, comboCount, extra = {}) {
        const multiplier = this.comboMultiplier ? comboCount : 1;
        let score = matchCount * this.baseScore * multiplier;

        // 额外奖励
        if (extra.bonus) score += extra.bonus;
        if (extra.special) score *= 2;

        return Math.round(score);
    }
}

/* ==================== 五、游戏主引擎 ==================== */

class GameEngine {
    constructor() {
        // 配置
        this.config = null;

        // 棋盘
        this.rows = 0;
        this.cols = 0;
        this.board = [];

        // 状态
        this.score = 0;
        this.movesLeft = 0;
        this.comboCount = 0;
        this.selected = null;
        this.isProcessing = false;
        this.mode = 'admin';

        // 规则引擎组件
        this.matchRules = [];
        this.explosionHandler = null;
        this.scoreSystem = null;

        // DOM 引用
        this.boardEl = document.getElementById('board');
        this.scoreEl = document.getElementById('score');
        this.movesEl = document.getElementById('moves');
        this.comboEl = document.getElementById('combo');
        this.targetScoreEl = document.getElementById('target-score');
        this.timeLeftEl = document.getElementById('time-left');
        this.messageEl = document.getElementById('message');
        this.movesStatEl = document.getElementById('moves').parentElement;
        this.restartBtn = document.getElementById('restart-btn');
        this.hintBtn = document.getElementById('hint-btn');
        this.docsBtn = document.getElementById('docs-btn');
        this.lastHint = null;
        this.targetScore = 50000;
        this.timeLeft = 90;
        this.timerId = null;
        this.isGameEnded = false;
        this.targetScoreEnabled = true;
        this.requiredPieceType = null;
        this.requiredPieceCount = 10;
        this.requiredPieceEnabled = false;
        this.elimCounts = {};

        // 缓存
        this._cellCache = {};

        // 绑定事件
        this._bindEvents();
        if (typeof window !== 'undefined') {
            window.__gameEngine = this;
        }
        this.refreshSelectorUI();
    }

    /* ---------- 配置管理 ---------- */

    loadConfig() {
        try {
            const saved = localStorage.getItem(CONFIG_KEY);
            if (!saved) {
                return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
            }

            const parsed = JSON.parse(saved);
            const fixed = sanitizeConfig(parsed);
            if (JSON.stringify(fixed) !== JSON.stringify(parsed)) {
                localStorage.setItem(CONFIG_KEY, JSON.stringify(fixed));
            }
            return fixed;
        } catch (err) {
            console.warn('配置加载失败，已重置为默认配置', err);
            try {
                localStorage.removeItem(CONFIG_KEY);
            } catch (_) {}
            return { ...DEFAULT_CONFIG, pieceTypes: [...DEFAULT_CONFIG.pieceTypes] };
        }
    }

    applyConfig(cfg) {
        const safeCfg = sanitizeConfig(cfg);
        this.config = { ...safeCfg };
        this.rows = safeCfg.rows;
        this.cols = safeCfg.cols;
        this._cellSize = safeCfg.cellSize;
        this._gap = safeCfg.gap;
        this._cellPx = safeCfg.cellSize + safeCfg.gap;
        this.selected = null;
        this.lastHint = null;
        this._cellCache = {};
        this.targetScoreEnabled = safeCfg.targetScoreEnabled !== false;
        this.targetScore = this.targetScoreEnabled
            ? Math.max(0, Number(safeCfg.targetScore || 50000))
            : 0;
        this.timeLeft = safeCfg.enableTimeLimit ? Number(safeCfg.timeLimitSeconds || 90) : 0;
        this.requiredPieceEnabled = safeCfg.requiredPieceEnabled === true;
        this.requiredPieceType = safeCfg.requiredPieceType || safeCfg.pieceTypes?.[0]?.id || null;
        this.requiredPieceType =
            getPieceTypeCodeById(this.requiredPieceType, safeCfg.pieceTypes) ||
            this.requiredPieceType;
        this.requiredPieceCount = Number.isFinite(Number(safeCfg.requiredPieceCount))
            ? Math.max(0, Number(safeCfg.requiredPieceCount))
            : 10;
        this.elimCounts = {};
        this.totalMoves = Number.isFinite(Number(safeCfg.totalMoves))
            ? Math.max(1, Number(safeCfg.totalMoves))
            : 30;
        this.refreshSelectorUI();

        // 初始化规则引擎
        this._initMatchRules(safeCfg);
        this.explosionHandler = new ExplosionHandler(safeCfg);
        this.scoreSystem = new ScoreSystem(safeCfg);

        // 更新棋盘尺寸
        const boardWidth = this.cols * safeCfg.cellSize + (this.cols - 1) * safeCfg.gap;
        const boardHeight = this.rows * safeCfg.cellSize + (this.rows - 1) * safeCfg.gap;
        this.boardEl.style.width = `${boardWidth}px`;
        this.boardEl.style.height = `${boardHeight}px`;
        this.boardEl.style.setProperty('--cell-size', safeCfg.cellSize + 'px');
        this.boardEl.style.setProperty('--gap', safeCfg.gap + 'px');
        this.boardEl.style.setProperty('--cols', String(this.cols));
        this.boardEl.style.setProperty('--rows', String(this.rows));
        this.boardEl.style.display = 'grid';
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, ${safeCfg.cellSize}px)`;
        this.boardEl.style.gridTemplateRows = `repeat(${this.rows}, ${safeCfg.cellSize}px)`;
        this.boardEl.style.gap = `${safeCfg.gap}px`;
        this.boardEl.innerHTML = '';

        // 保存到 localStorage
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(safeCfg));
        } catch (err) {}
    }

    _initMatchRules(cfg) {
        this.matchRules = [];
        // 直线规则（始终启用）
        this.matchRules.push(new LineMatchRule(cfg));
        // 田字形
        if (cfg.enableSquare) {
            this.matchRules.push(new SquareMatchRule(cfg));
        }
        // 斜线
        if (cfg.enableDiagonal) {
            this.matchRules.push(new DiagonalMatchRule(cfg));
        }
        // 按优先级排序
        this.matchRules.sort((a, b) => b.priority - a.priority);
    }

    /* ---------- 棋子系统 ---------- */

    createPiece(typeId) {
        const type = this.config.pieceTypes.find((t) => t.id === typeId || t.code === typeId);
        if (!type)
            return new Piece('unknown', '#888', '❓', {
                background: '#888',
                pattern: 'solid',
                pieceColor: '#fff',
            });
        return new Piece(
            type.id,
            type.background || type.color || '#888',
            type.id === BLANK_PIECE_TYPE || type.isPiece === false ? '' : type.char || type.id,
            {
                background: type.background || type.color || '#888',
                pattern: type.pattern || 'solid',
                patternColor: type.patternColor || 'rgba(255,255,255,0.22)',
                pieceColor: type.pieceColor || '#ffffff',
                borderColor: type.borderColor || 'rgba(255,255,255,0.3)',
                borderWidth: type.borderWidth || 2,
                walls: type.walls || {},
                isPiece: type.isPiece !== false,
                id: type.id,
                code: type.code || type.id,
                pieceUI: type.pieceUI || {},
                iceLevel: type.iceLevel || 0,
                frozenValue: type.frozenValue || 0,
            },
        );
    }

    randomPiece() {
        const types = (this.config.pieceTypes || []).filter(
            (type) => type && type.isPiece !== false,
        );
        if (!types.length) return null;
        const type = types[Math.floor(Math.random() * types.length)];
        return this.createPiece(type.id);
    }

    /* ---------- 棋盘操作 ---------- */

    _parseInitialBoardValue(value) {
        if (!value) return null;
        const rawRows = Array.isArray(value)
            ? value
            : String(value)
                  .split(/\n|;/)
                  .map((row) => row.trim())
                  .filter(Boolean);

        if (rawRows.length === 0) return null;

        const rows = rawRows
            .map((row) => {
                if (Array.isArray(row)) {
                    return row.map((cell) =>
                        cell && typeof cell === 'object' ? cell : String(cell ?? '').trim(),
                    );
                }
                return String(row)
                    .split(',')
                    .map((cell) => cell.trim())
                    .filter((cell) => cell.length > 0);
            })
            .filter((row) => row.length > 0);

        if (rows.length === 0) return null;

        const normalized = rows.map((row) => row.slice(0, this.cols));
        while (normalized.length < this.rows) normalized.push([]);

        const board = Array.from({ length: this.rows }, (_, r) => {
            const row = normalized[r] || [];
            const cells = Array.from({ length: this.cols }, (_, c) => {
                const token = row[c];
                if (
                    !token ||
                    (typeof token === 'string' &&
                        ['-', '_', '.', 'empty', 'null', 'none'].includes(token.toLowerCase()))
                ) {
                    return null;
                }

                const piece = this._buildPieceFromBoardToken(token);
                return piece;
            });
            return cells;
        });

        return board;
    }

    _buildPieceFromBoardToken(token) {
        if (token && typeof token === 'object' && !Array.isArray(token)) {
            const piece = this.createPiece(token.typeId || token.id);
            if (!piece || piece.typeId === 'unknown' || piece.isPiece === false) return null;
            piece.color = token.color || piece.color;
            piece.backgroundColor =
                token.backgroundColor || token.background || piece.backgroundColor;
            piece.pattern = token.pattern || piece.pattern;
            piece.patternColor = token.patternColor || piece.patternColor;
            piece.pieceColor = token.pieceColor || piece.pieceColor;
            piece.char = token.char || piece.char;
            piece.borderColor = token.borderColor || piece.borderColor;
            piece.borderWidth = Number(token.borderWidth || piece.borderWidth);
            piece.type.value = token.type?.value || token.code || piece.type.value;
            piece.type.priority = Number(token.type?.priority ?? piece.type.priority);
            piece.background.priority = Number(
                token.background?.priority ?? piece.background.priority,
            );
            piece.ices.level = Number(
                token.ices?.level ?? token.stateData?.iceLayers ?? piece.ices.level,
            );
            piece.ices.priority = Number(token.ices?.priority ?? piece.ices.priority);
            piece.frozen.value = Number(token.frozen?.value ?? piece.frozen.value);
            piece.frozen.priority = Number(token.frozen?.priority ?? piece.frozen.priority);
            piece.walls = piece._normalizeWalls(token.walls || {});
            piece.walls.priority = Number(token.walls?.priority ?? piece.walls.priority);
            piece.pieceUI =
                token.pieceUI && typeof token.pieceUI === 'object' ? token.pieceUI : piece.pieceUI;
            piece.states = new Set(Array.isArray(token.states) ? token.states : []);
            piece.stateData =
                token.stateData && typeof token.stateData === 'object'
                    ? { ...token.stateData }
                    : {};
            if (piece.states.has('frozen') && piece.frozen.value === 0) piece.frozen.value = 1;
            if (piece.stateData.iceLayers !== undefined && piece.ices.level === 0)
                piece.ices.level = Number(piece.stateData.iceLayers) || 0;
            return piece;
        }
        const cleaned = String(token).trim();
        if (!cleaned || ['-', '_', '.', 'empty', 'null', 'none'].includes(cleaned.toLowerCase())) {
            return null;
        }

        const rawParts = cleaned
            .split(/[|:]/)
            .map((part) => part.trim())
            .filter(Boolean);
        const baseToken = rawParts[0];
        const stateTokens = rawParts.slice(1);

        const matched = this.config.pieceTypes.find(
            (type) =>
                type.id.toLowerCase() === baseToken.toLowerCase() ||
                String(type.code || '').toLowerCase() === baseToken.toLowerCase() ||
                (type.char && type.char === baseToken) ||
                (type.char && type.char === String(baseToken)),
        );

        // 修复：无法匹配时返回 null，而不是随机生成棋子，避免初始棋盘与预期不符
        if (!matched) return null;

        const piece = this.createPiece(matched.id);

        const allowedStates = new Set(['locked', 'frozen', 'bomb']);
        for (const stateToken of stateTokens) {
            const normalized = stateToken.toLowerCase();
            if (!allowedStates.has(normalized)) continue;
            piece.addState(normalized);
            if (normalized === 'bomb') piece.stateData.bomb = { radius: 1 };
        }

        return piece;
    }

    serializeCurrentBoard() {
        return this.board.map((row) =>
            row.map((piece) => {
                if (!piece) return null;
                return {
                    typeId: piece.typeId,
                    code: piece.typeId === BLANK_PIECE_TYPE ? BLANK_PIECE_CODE : piece.typeId,
                    isPiece: piece.isPiece,
                    id: piece.id,
                    local: { ...piece.local },
                    background: { ...piece.background },
                    type: { ...piece.type },
                    color: piece.color,
                    backgroundColor: piece.backgroundColor,
                    pattern: piece.pattern,
                    patternColor: piece.patternColor,
                    pieceColor: piece.pieceColor,
                    char: piece.char,
                    borderColor: piece.borderColor,
                    borderWidth: piece.borderWidth,
                    walls: JSON.parse(JSON.stringify(piece.walls || {})),
                    ices: { ...piece.ices },
                    frozen: { ...piece.frozen },
                    pieceUI: JSON.parse(JSON.stringify(piece.pieceUI || {})),
                    states: [...piece.states],
                    stateData: JSON.parse(JSON.stringify(piece.stateData || {})),
                };
            }),
        );
    }

    createBoard() {
        const b = [];
        for (let r = 0; r < this.rows; r++) {
            b[r] = [];
            for (let c = 0; c < this.cols; c++) {
                let piece;
                let attempts = 0;
                do {
                    piece = this.randomPiece();
                    attempts++;
                    // 限制尝试次数，避免极端情况下长时间循环（原为200，现为50）
                    if (attempts > 50) break;
                } while (this._wouldMatch(b, r, c, piece));

                if (Math.random() < 0.12) {
                    const stateRoll = ['frozen', 'locked', 'bomb'][Math.floor(Math.random() * 3)];
                    piece.addState(stateRoll);
                    if (stateRoll === 'bomb') piece.stateData.bomb = { radius: 1 };
                }

                b[r][c] = piece;
            }
        }
        return b;
    }

    _wouldMatch(b, r, c, piece) {
        // 优化：只检查新放置位置周围是否形成消除，避免全盘扫描
        const testBoard = b.map((row) => [...row]);
        testBoard[r][c] = piece;
        return this._hasMatchAt(testBoard, r, c);
    }

    // 局部检查指定位置是否参与任何匹配（覆盖直线/田字/斜线规则）
    _hasMatchAt(board, r, c) {
        const len = this.config.matchLength || 3;
        const typeId = board[r]?.[c]?.typeId;
        if (!typeId) return false;

        // 横向检查
        let count = 1;
        for (let i = c - 1; i >= 0 && board[r][i]?.typeId === typeId; i--) count++;
        for (let i = c + 1; i < this.cols && board[r][i]?.typeId === typeId; i++) count++;
        if (count >= len) return true;

        // 纵向检查
        count = 1;
        for (let i = r - 1; i >= 0 && board[i]?.[c]?.typeId === typeId; i--) count++;
        for (let i = r + 1; i < this.rows && board[i]?.[c]?.typeId === typeId; i++) count++;
        if (count >= len) return true;

        // 田字检查（如果启用）
        if (this.config.enableSquare) {
            // 以 (r,c) 为右下角
            if (r > 0 && c > 0) {
                if (
                    board[r - 1][c - 1]?.typeId === typeId &&
                    board[r - 1][c]?.typeId === typeId &&
                    board[r][c - 1]?.typeId === typeId
                )
                    return true;
            }
            // 以 (r,c) 为左下角
            if (r < this.rows - 1 && c > 0) {
                if (
                    board[r][c - 1]?.typeId === typeId &&
                    board[r + 1]?.[c - 1]?.typeId === typeId &&
                    board[r + 1]?.[c]?.typeId === typeId
                )
                    return true;
            }
            // 以 (r,c) 为右上角
            if (r > 0 && c < this.cols - 1) {
                if (
                    board[r - 1][c]?.typeId === typeId &&
                    board[r - 1][c + 1]?.typeId === typeId &&
                    board[r][c + 1]?.typeId === typeId
                )
                    return true;
            }
            // 以 (r,c) 为左上角
            if (r < this.rows - 1 && c < this.cols - 1) {
                if (
                    board[r][c + 1]?.typeId === typeId &&
                    board[r + 1]?.[c]?.typeId === typeId &&
                    board[r + 1]?.[c + 1]?.typeId === typeId
                )
                    return true;
            }
        }

        // 斜线检查（如果启用）
        if (this.config.enableDiagonal) {
            // 主对角线方向
            count = 1;
            for (let i = 1; r - i >= 0 && c - i >= 0 && board[r - i][c - i]?.typeId === typeId; i++)
                count++;
            for (
                let i = 1;
                r + i < this.rows && c + i < this.cols && board[r + i]?.[c + i]?.typeId === typeId;
                i++
            )
                count++;
            if (count >= len) return true;

            // 副对角线方向
            count = 1;
            for (
                let i = 1;
                r - i >= 0 && c + i < this.cols && board[r - i][c + i]?.typeId === typeId;
                i++
            )
                count++;
            for (
                let i = 1;
                r + i < this.rows && c - i >= 0 && board[r + i]?.[c - i]?.typeId === typeId;
                i++
            )
                count++;
            if (count >= len) return true;
        }

        return false;
    }

    _findAllMatches(board) {
        const all = new Set();
        for (const rule of this.matchRules) {
            const matches = rule.check(board, this.rows, this.cols);
            for (const idx of matches) all.add(idx);
        }
        return all;
    }

    findMatches() {
        return this._findAllMatches(this.board);
    }

    applyGravity() {
        const changed = new Set();
        for (let c = 0; c < this.cols; c++) {
            const column = [];
            for (let r = 0; r < this.rows; r++) {
                const piece = this.board[r][c];
                if (piece !== null && piece !== undefined) column.push(piece);
            }
            for (let r = this.rows - 1; r >= 0; r--) {
                const nextPiece = column.length > 0 ? column.pop() : this.randomPiece();
                if (this.board[r][c] !== nextPiece) {
                    this.board[r][c] = nextPiece;
                    changed.add(r * this.cols + c);
                }
            }
        }
        return changed;
    }

    stabilizeBoard() {
        let guard = 0;
        while (guard++ < 100) {
            const matches = this.findMatches();
            if (matches.size === 0) break;
            for (const idx of matches) {
                const r = Math.floor(idx / this.cols);
                const c = idx % this.cols;
                if (this.board[r][c] && this.board[r][c].isRemovable()) {
                    this.board[r][c] = null;
                }
            }
            this.applyGravity();
        }
    }

    hasValidMove() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                // 如果棋子不可交换，跳过
                if (this.board[r][c] && !this.board[r][c].isSwappable()) continue;

                if (c < this.cols - 1) {
                    [this.board[r][c], this.board[r][c + 1]] = [
                        this.board[r][c + 1],
                        this.board[r][c],
                    ];
                    const ok = this.findMatches().size > 0;
                    [this.board[r][c], this.board[r][c + 1]] = [
                        this.board[r][c + 1],
                        this.board[r][c],
                    ];
                    if (ok) return true;
                }
                if (r < this.rows - 1) {
                    [this.board[r][c], this.board[r + 1][c]] = [
                        this.board[r + 1][c],
                        this.board[r][c],
                    ];
                    const ok = this.findMatches().size > 0;
                    [this.board[r][c], this.board[r + 1][c]] = [
                        this.board[r + 1][c],
                        this.board[r][c],
                    ];
                    if (ok) return true;
                }
            }
        }
        return false;
    }

    /* ---------- 渲染系统 ---------- */

    // 相邻格子的墙共用：某条边已由“编号更小”的格子负责渲染时，本格就跳过该侧，
    // 避免同一条边界被两个格子各画一遍。
    _sharedWallSkipSides(r, c) {
        const piece = this.board[r]?.[c];
        if (!piece) return new Set();
        const skip = new Set();
        const sides = [
            { side: 'left', dr: 0, dc: -1, opposite: 'right' },
            { side: 'right', dr: 0, dc: 1, opposite: 'left' },
            { side: 'top', dr: -1, dc: 0, opposite: 'bottom' },
            { side: 'bottom', dr: 1, dc: 0, opposite: 'top' },
        ];
        const myIndex = r * this.cols + c;
        for (const item of sides) {
            const own = piece.walls?.[item.side];
            if (!own || !own.enabled || own.hp <= 0) continue;
            const nr = r + item.dr;
            const nc = c + item.dc;
            if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue; // 棋盘外边界，本格负责画
            const neighbor = this.board[nr]?.[nc];
            const opposite = neighbor?.walls?.[item.opposite];
            if (opposite && opposite.enabled && opposite.hp > 0) {
                const neighborIndex = nr * this.cols + nc;
                if (neighborIndex < myIndex) skip.add(item.side);
            }
        }
        return skip;
    }

    renderBoard(withFallAnim, changedCells = null) {
        const cellSize = this._cellSize;

        const expectedCount = this.rows * this.cols;
        if (this.boardEl.children.length !== expectedCount || changedCells === null) {
            this.boardEl.innerHTML = '';
            this._cellCache = {};
        }

        if (changedCells && changedCells.size > 0) {
            for (const idx of changedCells) {
                const r = Math.floor(idx / this.cols);
                const c = idx % this.cols;
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = String(r);
                cell.dataset.c = String(c);

                const piece = this.board[r][c];
                if (piece) {
                    piece.render(cell, cellSize, {
                        skipWallSides: this._sharedWallSkipSides(r, c),
                    });
                }

                if (withFallAnim) cell.classList.add('falling');
                if (this.selected && this.selected.r === r && this.selected.c === c) {
                    cell.classList.add('selected');
                }
                if (
                    this.lastHint &&
                    ((this.lastHint.from.r === r && this.lastHint.from.c === c) ||
                        (this.lastHint.to.r === r && this.lastHint.to.c === c))
                ) {
                    cell.classList.add('hint-cell');
                }

                const existing = this.boardEl.children[idx];
                if (existing) {
                    this._bindCellEvents(cell, r, c);
                    this.boardEl.replaceChild(cell, existing);
                } else {
                    this._bindCellEvents(cell, r, c);
                    this.boardEl.appendChild(cell);
                }
                this._cellCache[`${r},${c}`] = cell;
            }
            return;
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                const piece = this.board[r][c];
                if (piece) {
                    piece.render(cell, cellSize, {
                        skipWallSides: this._sharedWallSkipSides(r, c),
                    });
                }

                if (withFallAnim) cell.classList.add('falling');
                if (this.selected && this.selected.r === r && this.selected.c === c) {
                    cell.classList.add('selected');
                }
                if (
                    this.lastHint &&
                    ((this.lastHint.from.r === r && this.lastHint.from.c === c) ||
                        (this.lastHint.to.r === r && this.lastHint.to.c === c))
                ) {
                    cell.classList.add('hint-cell');
                }

                this._bindCellEvents(cell, r, c);
                this.boardEl.appendChild(cell);
                this._cellCache[`${r},${c}`] = cell;
            }
        }
    }

    getCell(r, c) {
        return this._cellCache[`${r},${c}`] || null;
    }

    setMode(mode) {
        const nextMode = mode === 'game' ? 'game' : 'admin';
        this.mode = nextMode;

        const adminBtn = document.getElementById('mode-admin-btn');
        const gameBtn = document.getElementById('mode-game-btn');
        const leftRulesCard = document.querySelector('#left-panel .rules-panel');
        const leftActionsCard = document.querySelector('#left-panel .admin-actions-panel');
        const editorPanel = document.getElementById('editor-panel');

        if (adminBtn) adminBtn.classList.toggle('active', nextMode === 'admin');
        if (gameBtn) gameBtn.classList.toggle('active', nextMode === 'game');

        if (leftRulesCard) leftRulesCard.style.display = nextMode === 'admin' ? '' : 'none';
        if (leftActionsCard) leftActionsCard.style.display = nextMode === 'admin' ? '' : 'none';
        if (editorPanel) editorPanel.style.display = nextMode === 'admin' ? '' : 'none';

        if (nextMode === 'game') {
            this.selected = null;
            this.renderBoard();
            this.showMessage('🎮 游戏模式已开启，开始消除棋子！');
            this.startTimer();
        } else {
            this.selected = null;
            this.stopTimer();
            this.renderBoard();
            this.syncEditorPanel();
            this.showMessage('🛠️ 管理员模式已开启，可编辑棋盘状态。');
        }
    }

    refreshSelectorUI() {
        const emptyCellOption = { value: EMPTY_CELL_VALUE, label: '无棋子' };
        const adminRequiredTypeSelect = document.getElementById('admin-required-piece-type');
        if (adminRequiredTypeSelect && this.config?.pieceTypes?.length) {
            const options = this.config.pieceTypes
                .filter((type) => type.isPiece !== false)
                .map(getPieceTypeUIOption);
            let current =
                this.requiredPieceType ||
                this.config.requiredPieceType ||
                options[0]?.value ||
                BLANK_PIECE_TYPE;
            current =
                getPieceTypeCodeById(current, this.config.pieceTypes) ||
                options[0]?.value ||
                BLANK_PIECE_TYPE;
            adminRequiredTypeSelect.innerHTML = options
                .map((type) => `<option value="${type.value}">${type.label}</option>`)
                .join('');
            adminRequiredTypeSelect.value = current;
            this.requiredPieceType = current;
            this.config.requiredPieceType = current;
            buildTileOptions(adminRequiredTypeSelect, options, current, () => {
                this.requiredPieceType = adminRequiredTypeSelect.value;
                this.config.requiredPieceType = this.requiredPieceType;
            });
        }

        const cellTypeSelect = document.getElementById('cell-piece-type');
        if (cellTypeSelect && this.config?.pieceTypes?.length) {
            const options = [
                emptyCellOption,
                ...this.config.pieceTypes
                    .filter((type) => type.isPiece !== false)
                    .map(getPieceTypeUIOption),
            ];
            const current = cellTypeSelect.value || options[1]?.value || EMPTY_CELL_VALUE;
            cellTypeSelect.innerHTML = options
                .map((type) => `<option value="${type.value}">${type.label}</option>`)
                .join('');
            cellTypeSelect.value = current;
            buildTileOptions(cellTypeSelect, options, current, () => {
                if (this.mode === 'admin') this.previewSelectedCellEditor();
            });
        }

        const patternSelect = document.getElementById('cell-pattern');
        if (patternSelect) {
            const patternOptions = [
                { value: 'solid', label: 'solid' },
                { value: 'transparent', label: 'transparent' },
                { value: 'dot', label: 'dot' },
                { value: 'stripe', label: 'stripe' },
                { value: 'check', label: 'check' },
                { value: 'waves', label: 'waves' },
                { value: 'spark', label: 'spark' },
            ];
            const current = patternSelect.value || 'dot';
            buildTileOptions(patternSelect, patternOptions, current, () => {
                if (this.mode === 'admin') this.previewSelectedCellEditor();
            });
        }

        ['left', 'top', 'right', 'bottom'].forEach((side) => {
            const wallSelect = document.getElementById(`cell-wall-${side}`);
            if (!wallSelect) return;
            const current = wallSelect.value || 'none';
            buildTileOptions(
                wallSelect,
                [
                    { value: 'none', label: '无' },
                    { value: 'low', label: '低' },
                    { value: 'medium', label: '中' },
                    { value: 'high', label: '高' },
                ],
                current,
                () => {
                    if (this.mode === 'admin') this.previewSelectedCellEditor();
                },
            );
        });

        const adminTotalMoves = document.getElementById('admin-total-moves');
        if (adminTotalMoves) adminTotalMoves.value = String(this.config?.totalMoves || 30);
        const adminRequiredCount = document.getElementById('admin-required-piece-count');
        if (adminRequiredCount)
            adminRequiredCount.value = String(
                this.requiredPieceCount || this.config?.requiredPieceCount || 10,
            );
        const adminRequiredEnabled = document.getElementById('admin-required-piece-enabled');
        if (adminRequiredEnabled)
            adminRequiredEnabled.checked =
                this.requiredPieceEnabled === true || this.config?.requiredPieceEnabled === true;
        const adminLevelName = document.getElementById('admin-level-name');
        if (adminLevelName) adminLevelName.value = this.config?.name || '';
    }

    syncEditorPanel() {
        const pieceTypeSelect = document.getElementById('cell-piece-type');
        const patternSelect = document.getElementById('cell-pattern');
        const bgColorInput = document.getElementById('cell-bg-color');
        const patternColorInput = document.getElementById('cell-pattern-color');
        const movableInput = document.getElementById('cell-movable');
        const iceInput = document.getElementById('cell-ice-layer');
        const label = document.getElementById('selected-cell-label');
        const walls = {
            left: document.getElementById('cell-wall-left'),
            top: document.getElementById('cell-wall-top'),
            right: document.getElementById('cell-wall-right'),
            bottom: document.getElementById('cell-wall-bottom'),
        };

        if (!pieceTypeSelect || !patternSelect || !movableInput || !iceInput) return;

        const fillColorDefaults = (bg, patColor) => {
            if (bgColorInput) bgColorInput.value = toCssHex(bg, '#888888');
            if (patternColorInput) patternColorInput.value = toCssHex(patColor, '#ffffff');
        };

        if (!this.selected) {
            label.textContent = '当前选中：未选择格子';
            pieceTypeSelect.value = EMPTY_CELL_VALUE;
            patternSelect.value = 'dot';
            fillColorDefaults('transparent', 'rgba(255,255,255,0.7)');
            movableInput.checked = true;
            iceInput.value = '0';
            Object.values(walls).forEach((el) => {
                if (el) el.value = 'none';
            });
            syncTileGroups();
            return;
        }

        const { r, c } = this.selected;
        const piece = this.board[r]?.[c];
        if (!piece) {
            label.textContent = `当前选中：(${r + 1}, ${c + 1}) 空格`;
            pieceTypeSelect.value = EMPTY_CELL_VALUE;
            patternSelect.value = 'solid';
            fillColorDefaults('transparent', 'rgba(255,255,255,0.7)');
            movableInput.checked = true;
            iceInput.value = '0';
            Object.values(walls).forEach((el) => {
                if (el) el.value = 'none';
            });
            syncTileGroups();
            return;
        }

        label.textContent = `当前选中：(${r + 1}, ${c + 1}) ${piece.typeId}`;
        pieceTypeSelect.value = getPieceTypeUIOption(
            this.config.pieceTypes.find((type) => type.id === piece.typeId) || {},
        ).value;
        patternSelect.value = piece.pattern || 'solid';
        fillColorDefaults(
            piece.background.type,
            isTransparentColor(piece.background.patternColor)
                ? contrastPatternColor(piece.background.type)
                : piece.background.patternColor,
        );
        movableInput.checked = !piece.hasState('locked');
        const iceLayers = Number(piece.stateData?.iceLayers || (piece.hasState('frozen') ? 1 : 0));
        iceInput.value = String(Math.max(0, Math.min(6, iceLayers)));

        for (const side of ['left', 'top', 'right', 'bottom']) {
            const wall = piece.walls?.[side];
            const wallSelect = walls[side];
            if (!wallSelect) continue;
            if (!wall || !wall.enabled || wall.hp <= 0) wallSelect.value = 'none';
            else if (wall.hp >= 3) wallSelect.value = 'high';
            else if (wall.hp >= 2) wallSelect.value = 'medium';
            else wallSelect.value = 'low';
        }

        syncTileGroups();
    }

    _createEditorPiece() {
        const pieceTypeSelect = document.getElementById('cell-piece-type');
        const nextTypeId = pieceTypeSelect?.value || EMPTY_CELL_VALUE;
        if (nextTypeId === EMPTY_CELL_VALUE) return null;

        const targetType = this.config.pieceTypes.find(
            (type) => type.id === nextTypeId || type.code === nextTypeId,
        );
        if (!targetType || targetType.isPiece === false) return null;

        const piece = this.createPiece(targetType.id);
        const patternSelect = document.getElementById('cell-pattern');
        const bgColorInput = document.getElementById('cell-bg-color');
        const patternColorInput = document.getElementById('cell-pattern-color');
        const movableInput = document.getElementById('cell-movable');
        const iceInput = document.getElementById('cell-ice-layer');

        // background 层独立状态：底色 + 图案 + 图案颜色 由 background 层自己的控件决定，不受类型透明默认值影响。
        piece.background.type = bgColorInput?.value || piece.background.type;
        piece.background.pattern = patternSelect?.value || targetType.pattern || 'dot';
        piece.background.patternColor =
            patternSelect?.value === 'transparent'
                ? 'transparent'
                : patternColorInput?.value || piece.background.patternColor;
        piece.ices.level = Math.max(0, Math.min(6, Number(iceInput?.value || 0)));
        piece.frozen.value = movableInput && !movableInput.checked ? 1 : 0;

        if (movableInput && !movableInput.checked) piece.addState('locked');
        const iceLayers = Math.max(0, Math.min(6, Number(iceInput?.value || 0)));
        piece.stateData.iceLayers = iceLayers;
        if (iceLayers > 0) piece.addState('frozen');

        for (const side of ['left', 'top', 'right', 'bottom']) {
            const valueSelect = document.getElementById(`cell-wall-${side}`);
            if (!valueSelect) continue;
            const hpMap = { none: 0, low: 1, medium: 2, high: 3 };
            const hp = hpMap[valueSelect.value] ?? 0;
            piece.walls[side] = {
                enabled: hp > 0,
                hp,
                maxHp: hp,
                color: '#facc15',
            };
        }
        return piece;
    }

    previewSelectedCellEditor() {
        if (!this.selected) return;
        const { r, c } = this.selected;
        const cell = this.getCell(r, c);
        if (!cell) return;
        const piece = this._createEditorPiece();
        if (piece) piece.render(cell, this._cellSize);
        else cell.innerHTML = '';
        cell.classList.add('selected');
    }

    applySelectedCellEditor() {
        if (!this.selected) return;
        const { r, c } = this.selected;
        this.board[r][c] = this._createEditorPiece();
        this.renderBoard();
        this.syncEditorPanel();
        syncTileGroups();
    }

    /* ---------- 交互系统 ---------- */

    _bindCellEvents(cell, r, c) {
        let startX = null,
            startY = null,
            dragging = false;
        const enableDrag = this.config.enableDrag !== false;
        const threshold = this.config.dragThreshold || 15;

        cell.addEventListener('pointerdown', (e) => {
            if (this.isProcessing || this.movesLeft <= 0) return;
            startX = e.clientX;
            startY = e.clientY;
            dragging = false;
            try {
                cell.setPointerCapture(e.pointerId);
            } catch (err) {}
        });

        cell.addEventListener('pointermove', (e) => {
            if (startX === null || !enableDrag) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!dragging && Math.hypot(dx, dy) > threshold) {
                dragging = true;
                cell.classList.add('dragging');
            }
        });

        cell.addEventListener('pointerup', (e) => {
            if (startX === null) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (this.mode !== 'game') {
                startX = null;
                startY = null;
                dragging = false;
                this.selected = { r, c };
                this.syncEditorPanel();
                this.renderBoard();
                return;
            }

            if (dragging && enableDrag) {
                cell.classList.remove('dragging');
                let targetR = r,
                    targetC = c;
                if (Math.abs(dx) > Math.abs(dy)) {
                    targetC = c + (dx > 0 ? 1 : -1);
                } else {
                    targetR = r + (dy > 0 ? 1 : -1);
                }
                startX = null;
                startY = null;
                dragging = false;

                if (targetR < 0 || targetR >= this.rows || targetC < 0 || targetC >= this.cols) {
                    this.selected = null;
                    this.renderBoard();
                    return;
                }
                this.selected = null;
                this._handleSwap(r, c, targetR, targetC);
            } else {
                startX = null;
                startY = null;
                dragging = false;
                this._onCellClick(r, c);
            }
        });
    }

    _onCellClick(r, c) {
        if (this.mode !== 'game') {
            this.selected = { r, c };
            this.syncEditorPanel();
            this.renderBoard();
            return;
        }

        if (this.isProcessing || this.movesLeft <= 0) return;

        // 检查棋子是否可交互
        const piece = this.board[r][c];
        if (piece && !piece.isSwappable()) {
            this.showMessage('🔒 这个棋子被锁定了！');
            return;
        }

        if (!this.selected) {
            this.selected = { r, c };
            this.renderBoard();
            return;
        }

        const { r: sr, c: sc } = this.selected;

        if (sr === r && sc === c) {
            this.selected = null;
            this.renderBoard();
            return;
        }

        const isAdjacent = Math.abs(sr - r) + Math.abs(sc - c) === 1;
        if (!isAdjacent) {
            this.selected = { r, c };
            this.renderBoard();
            return;
        }

        this.selected = null;
        this._handleSwap(sr, sc, r, c);
    }

    findPlayableMove() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const current = this.board[r][c];
                if (!current || !current.isSwappable()) continue;

                const candidates = [
                    { r: r + 1, c },
                    { r, c: c + 1 },
                ];

                for (const target of candidates) {
                    if (target.r >= this.rows || target.c >= this.cols) continue;
                    const other = this.board[target.r][target.c];
                    if (!other || !other.isSwappable()) continue;

                    [this.board[r][c], this.board[target.r][target.c]] = [
                        this.board[target.r][target.c],
                        this.board[r][c],
                    ];
                    const hasMatch = this.findMatches().size > 0;
                    [this.board[r][c], this.board[target.r][target.c]] = [
                        this.board[target.r][target.c],
                        this.board[r][c],
                    ];

                    if (hasMatch) {
                        return { from: { r, c }, to: { r: target.r, c: target.c } };
                    }
                }
            }
        }
        return null;
    }

    async showHint() {
        if (this.isProcessing) return;

        const move = this.findPlayableMove();
        if (!move) {
            this.board = this.createBoard();
            this.stabilizeBoard();
            this.renderBoard();
            this.showMessage('💡 当前盘面无有效组合，已重新洗牌！');
            return;
        }

        this.lastHint = move;
        this.renderBoard();
        this.showMessage(
            `💡 提示：尝试交换 (${move.from.r + 1},${move.from.c + 1}) 和 (${move.to.r + 1},${move.to.c + 1})`,
        );

        clearTimeout(this.hintTimer);
        this.hintTimer = setTimeout(() => {
            this.lastHint = null;
            this.renderBoard();
        }, 1500);
    }

    async _flashInvalidSwap(r1, c1, r2, c2) {
        const cells = [this.getCell(r1, c1), this.getCell(r2, c2)];
        cells.filter(Boolean).forEach((cell) => cell.classList.add('invalid-swap'));
        await this._sleep(260);
        cells.filter(Boolean).forEach((cell) => cell.classList.remove('invalid-swap'));
    }

    /* ---------- 核心游戏逻辑 ---------- */

    async _handleSwap(r1, c1, r2, c2) {
        if (this.isGameEnded) {
            return;
        }
        this.isProcessing = true;

        // 检查两个棋子是否都可交换
        const p1 = this.board[r1][c1];
        const p2 = this.board[r2][c2];
        if (!p1 || !p1.isSwappable() || !p2 || !p2.isSwappable()) {
            this.showMessage('🔒 有棋子被锁定，无法交换！');
            this.isProcessing = false;
            return;
        }

        const el1 = this.getCell(r1, c1);
        const el2 = this.getCell(r2, c2);
        const dx = (c2 - c1) * this._cellPx;
        const dy = (r2 - r1) * this._cellPx;

        if (el1 && el2) {
            el1.style.transition = 'transform 0.25s ease';
            el2.style.transition = 'transform 0.25s ease';
            el1.style.transform = `translate(${dx}px, ${dy}px)`;
            el2.style.transform = `translate(${-dx}px, ${-dy}px)`;
            el1.style.zIndex = '2';
            el2.style.zIndex = '2';
            await this._sleep(250);
        }

        [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];

        let matches = this.findMatches();

        if (matches.size === 0) {
            await this._sleep(60);
            if (el1 && el2) {
                el1.style.transform = 'translate(0, 0)';
                el2.style.transform = 'translate(0, 0)';
                await this._sleep(250);
            }
            [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];
            this.renderBoard();
            await this._flashInvalidSwap(r1, c1, r2, c2);
            this.showMessage('不能消除哦，换一个试试～');
            this.isProcessing = false;
            return;
        }

        this.movesLeft--;
        this.comboCount = 0;
        this._updateHUD();

        await this._processMatches(matches);

        if (!this.hasValidMove()) {
            await this._sleep(200);
            this.board = this.createBoard();
            this.stabilizeBoard();
            this.renderBoard();
            this.showMessage('没有可消除的移动，重新洗牌啦！✨');
        }

        if (this._checkGoalsAfterMove()) {
            // 确保 isProcessing 被重置，避免后续操作被阻塞
            this.isProcessing = false;
            return;
        }
        this.isProcessing = false;
    }

    async _processMatches(matches) {
        while (matches.size > 0) {
            this.comboCount++;

            // 标记消除动画
            const matchArray = Array.from(matches);
            for (const idx of matchArray) {
                const r = Math.floor(idx / this.cols);
                const c = idx % this.cols;
                const cell = this.getCell(r, c);
                if (cell) cell.classList.add('removed');
            }
            await this._sleep(300);

            // 触发特殊棋子效果：炸弹会扩散到周围格子
            const bombIndices = new Set();
            for (const idx of matchArray) {
                const r = Math.floor(idx / this.cols);
                const c = idx % this.cols;
                const piece = this.board[r][c];
                if (piece && piece.hasState('bomb')) {
                    bombIndices.add(idx);
                    for (let rr = r - 1; rr <= r + 1; rr++) {
                        for (let cc = c - 1; cc <= c + 1; cc++) {
                            if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols) {
                                bombIndices.add(rr * this.cols + cc);
                            }
                        }
                    }
                }
            }

            const explosionCells = new Set(
                this.explosionHandler.getExplosionCells(matches, this.board, this.rows, this.cols),
            );
            for (const idx of bombIndices) explosionCells.add(idx);

            // 计分
            const points = this.scoreSystem.calculate(
                matches.size + explosionCells.size,
                this.comboCount,
                { special: explosionCells.size > 0 },
            );
            this.score += points;
            this._updateHUD();

            // 显示消息
            let msg =
                this.comboCount > 1
                    ? `🔥 连击 x${this.comboCount}！+${points}`
                    : `消除！+${points}`;
            if (explosionCells.size > 0) msg += ' 💥 爆炸！';
            this.showMessage(msg);

            // 移除匹配的棋子（不可移除的保留）
            for (const idx of matchArray) {
                const r = Math.floor(idx / this.cols);
                const c = idx % this.cols;
                const piece = this.board[r][c];
                if (piece && piece.isRemovable()) {
                    this._countElim(piece);
                    this.board[r][c] = null;
                }
            }
            this._damageAdjacentWalls(matchArray);

            // 爆炸：移除额外格子（但只移除可移除的）
            if (explosionCells.size > 0) {
                // 标记爆炸动画
                for (const idx of explosionCells) {
                    const r = Math.floor(idx / this.cols);
                    const c = idx % this.cols;
                    const cell = this.getCell(r, c);
                    if (cell) cell.classList.add('exploding');
                }
                await this._sleep(400);

                for (const idx of explosionCells) {
                    const r = Math.floor(idx / this.cols);
                    const c = idx % this.cols;
                    const piece = this.board[r][c];
                    if (piece && piece.isRemovable()) {
                        this._countElim(piece);
                        this.board[r][c] = null;
                    }
                }
                this._damageAdjacentWalls(Array.from(explosionCells));
            }

            // 仅刷新发生变化的格子，避免全盘重绘
            const changedCells = this.applyGravity();
            await this._sleep(60);
            this.renderBoard(true, changedCells);
            await this._sleep(360);

            // 继续检测连锁
            matches = this.findMatches();
        }
    }

    _damageAdjacentWalls(indices) {
        const sideMap = [
            { dr: -1, dc: 0, side: 'top', target: 'bottom' },
            { dr: 1, dc: 0, side: 'bottom', target: 'top' },
            { dr: 0, dc: -1, side: 'left', target: 'right' },
            { dr: 0, dc: 1, side: 'right', target: 'left' },
        ];

        for (const idx of indices) {
            const r = Math.floor(idx / this.cols);
            const c = idx % this.cols;
            for (const mapping of sideMap) {
                const nr = r + mapping.dr;
                const nc = c + mapping.dc;
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
                const neighbor = this.board[nr][nc];
                if (!neighbor) continue;
                const wall = neighbor.walls?.[mapping.target];
                if (!wall || !wall.enabled || wall.hp <= 0) continue;
                neighbor.damageWall(mapping.target, 1);
            }
        }
    }

    /* ---------- 消除目标（类型层计数） ---------- */

    _countElim(piece) {
        if (!this.requiredPieceEnabled || !piece || !this.requiredPieceType) return;
        const code = piece.type && piece.type.value ? piece.type.value : piece.typeId || '';
        if (code === this.requiredPieceType) {
            this.elimCounts[this.requiredPieceType] =
                (this.elimCounts[this.requiredPieceType] || 0) + 1;
            if (this.mode === 'game') this._updateHUD();
        }
    }

    _scoreGoalMet() {
        return this.targetScoreEnabled && this.targetScore > 0 && this.score >= this.targetScore;
    }

    _elimGoalMet() {
        return (
            this.requiredPieceEnabled &&
            this.requiredPieceType &&
            this.requiredPieceCount > 0 &&
            (this.elimCounts[this.requiredPieceType] || 0) >= this.requiredPieceCount
        );
    }

    _elimGoalProgress() {
        const done =
            this.requiredPieceEnabled && this.requiredPieceType
                ? this.elimCounts[this.requiredPieceType] || 0
                : 0;
        return `${done}/${this.requiredPieceCount || 0}`;
    }

    _checkGoalsAfterMove() {
        const scoreGoalMet = this._scoreGoalMet();
        const elimGoalMet = this._elimGoalMet();
        this._updateHUD();

        if (this.movesLeft <= 0 && !scoreGoalMet && !elimGoalMet) {
            this.isProcessing = false;
            setTimeout(() => this.finishRound(false, `🏆 步数耗尽！最终得分：${this.score}`), 400);
            return true;
        }
        if (scoreGoalMet || elimGoalMet) {
            const parts = [];
            if (scoreGoalMet) parts.push(`分数 ${this.score}/${this.targetScore}`);
            if (elimGoalMet)
                parts.push(
                    `${this.requiredPieceType} 消除 ${this.elimCounts[this.requiredPieceType]}/${this.requiredPieceCount}`,
                );
            this.isProcessing = false;
            this.finishRound(true, `🎉 达成通关条件！(${parts.join('；')})`);
            return true;
        }
        return false;
    }

    /* ---------- UI 更新 ---------- */

    _updateHUD() {
        this.scoreEl.textContent = this.score;
        this.movesEl.textContent = this.movesLeft;
        this.comboEl.textContent = this.comboCount;
        let target = this.targetScoreEnabled ? String(this.targetScore) : '—';
        if (this.requiredPieceEnabled && this.requiredPieceType && this.requiredPieceCount > 0) {
            target += `  ·  ${this.requiredPieceType}×${this.requiredPieceCount}[${this._elimGoalProgress()}]`;
        }
        this.targetScoreEl.textContent = target;
        this.timeLeftEl.textContent =
            this.config && this.config.enableTimeLimit && this.mode === 'game'
                ? this.timeLeft
                : '∞';
        if (this.movesLeft <= 5) {
            this.movesStatEl.classList.add('warning');
        } else {
            this.movesStatEl.classList.remove('warning');
        }
        if (this.config && this.config.enableTimeLimit && this.timeLeft <= 10) {
            this.timeLeftEl.parentElement.classList.add('warning');
        } else {
            this.timeLeftEl.parentElement.classList.remove('warning');
        }
    }

    startTimer() {
        this.stopTimer();
        if (this.mode !== 'game') {
            this.timeLeft =
                this.config && this.config.enableTimeLimit
                    ? Number(this.config.timeLimitSeconds || 90)
                    : 0;
            this._updateHUD();
            return;
        }
        if (!this.config || !this.config.enableTimeLimit) {
            this.timeLeft = 0;
            this._updateHUD();
            return;
        }

        const seconds = Number(this.config.timeLimitSeconds || 90);
        if (!Number.isFinite(seconds) || seconds <= 0) {
            this.timeLeft = 0;
            this._updateHUD();
            return;
        }

        this.timeLeft = seconds;
        this.timerId = setInterval(() => {
            if (this.isGameEnded) return;
            this.timeLeft -= 1;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this._updateHUD();
                const won = this._scoreGoalMet() || this._elimGoalMet();
                const goals = [];
                if (this._scoreGoalMet()) goals.push(`分数 ${this.score}/${this.targetScore}`);
                if (this._elimGoalMet())
                    goals.push(
                        `${this.requiredPieceType} 消除 ${this.elimCounts[this.requiredPieceType]}/${this.requiredPieceCount}`,
                    );
                this.finishRound(
                    won,
                    won
                        ? `🎉 时间到但已通关！(${goals.join('；')})`
                        : `⏰ 时间到！最终得分：${this.score}，目标：${this.targetScore}，消除目标：${this._elimGoalProgress()}。`,
                );
                return;
            }
            this._updateHUD();
        }, 1000);
    }

    stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    finishRound(won, message) {
        if (this.isGameEnded) return;
        this.isGameEnded = true;
        this.stopTimer();
        this.showMessage(message);
        setTimeout(() => {
            const result = won ? '🎉 过关成功！' : '😵 关卡失败！';
            alert(`${result}\n\n${message}`);
        }, 300);
    }

    showMessage(msg) {
        this.messageEl.textContent = msg;
        this.messageEl.classList.add('show');
        clearTimeout(this.messageEl._t);
        this.messageEl._t = setTimeout(() => this.messageEl.classList.remove('show'), 1600);
    }

    /* ---------- 工具 ---------- */

    _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /* ---------- 初始化 ---------- */

    ensurePlayableBoard() {
        let attempts = 0;
        while (!this.hasValidMove() && attempts < 8) {
            this.board = this.createBoard();
            this.stabilizeBoard();
            attempts++;
        }
        if (!this.hasValidMove()) {
            this.board = this.createBoard();
            this.stabilizeBoard();
        }
    }

    init() {
        this.stopTimer();
        const customBoard =
            this.config && this.config.initialBoard
                ? this._parseInitialBoardValue(this.config.initialBoard)
                : null;
        this.board = customBoard && customBoard.length > 0 ? customBoard : this.createBoard();
        if (!customBoard) {
            this.stabilizeBoard();
            this.ensurePlayableBoard();
        }
        this.score = 0;
        this.movesLeft = this.config.totalMoves || 30;
        this.comboCount = 0;
        this.selected = null;
        this.isProcessing = false;
        this.lastHint = null;
        this.isGameEnded = false;
        this.elimCounts = {};
        this.requiredPieceEnabled = this.config?.requiredPieceEnabled === true;
        this.requiredPieceType = this.config?.requiredPieceType || null;
        this.requiredPieceType =
            getPieceTypeCodeById(this.requiredPieceType, this.config?.pieceTypes) ||
            this.requiredPieceType;
        this.requiredPieceCount = Number.isFinite(Number(this.config?.requiredPieceCount))
            ? Math.max(0, Number(this.config?.requiredPieceCount))
            : 10;
        this.targetScoreEnabled = this.config && this.config.targetScoreEnabled !== false;
        this.targetScore = this.targetScoreEnabled
            ? Math.max(0, Number(this.config?.targetScore || 50000))
            : 0;
        this.movesStatEl.classList.remove('warning');
        this._updateHUD();
        this.renderBoard();
        this.showMessage('点击或拖动相邻糖果交换位置！');
        if (this.mode === 'game') {
            this.startTimer();
        }
    }

    /* ---------- 事件绑定 ---------- */

    _bindEvents() {
        this.restartBtn.addEventListener('click', () => this.init());
        this.hintBtn.addEventListener('click', () => this.showHint());

        const adminRequiredTypeSelect = document.getElementById('admin-required-piece-type');
        const adminTotalMoves = document.getElementById('admin-total-moves');
        const adminRequiredCount = document.getElementById('admin-required-piece-count');
        const adminLevelName = document.getElementById('admin-level-name');

        const refreshAdminSelectors = () => {
            if (!adminRequiredTypeSelect) return;
            const existing = this.config?.pieceTypes || [];
            const list = existing.map((type) => ({
                value: type.id,
                label: `${type.char || type.id}`,
            }));
            const current =
                this.requiredPieceType ||
                this.config?.requiredPieceType ||
                this.config?.pieceTypes?.[0]?.id ||
                'apple';
            adminRequiredTypeSelect.innerHTML = list
                .map((type) => `<option value="${type.value}">${type.label}</option>`)
                .join('');
            adminRequiredTypeSelect.value = current;
            this.requiredPieceType = adminRequiredTypeSelect.value;
            buildTileOptions(adminRequiredTypeSelect, list, current, () => {
                this.requiredPieceType = adminRequiredTypeSelect.value;
                this.config = this.config || {
                    ...DEFAULT_CONFIG,
                    pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
                };
                this.config.requiredPieceType = this.requiredPieceType;
            });
        };

        if (adminRequiredTypeSelect) {
            adminRequiredTypeSelect.addEventListener('change', () => {
                this.requiredPieceType = adminRequiredTypeSelect.value;
                this.config = this.config || {
                    ...DEFAULT_CONFIG,
                    pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
                };
                this.config.requiredPieceType = this.requiredPieceType;
            });
        }

        if (adminTotalMoves) {
            adminTotalMoves.addEventListener('input', () => {
                const moves = Number(adminTotalMoves.value || 30);
                this.config = this.config || {
                    ...DEFAULT_CONFIG,
                    pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
                };
                this.config.totalMoves = Number.isFinite(moves) ? Math.max(1, moves) : 30;
                this.movesLeft = this.config.totalMoves;
                this._updateHUD();
            });
        }

        if (adminRequiredCount) {
            adminRequiredCount.addEventListener('input', () => {
                const count = Number(adminRequiredCount.value || 10);
                this.config = this.config || {
                    ...DEFAULT_CONFIG,
                    pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
                };
                this.config.requiredPieceCount = Number.isFinite(count) ? Math.max(0, count) : 10;
                this.requiredPieceCount = this.config.requiredPieceCount;
            });
        }

        if (adminLevelName) {
            adminLevelName.value = this.config?.name || '';
        }

        if (this.docsBtn) {
            this.docsBtn.addEventListener('click', () => {
                window.location.href = 'docs/index.html';
            });
        }

        const adminTargetScoreEnabled = document.getElementById('admin-target-score-enabled');
        const adminTargetScoreInput = document.getElementById('admin-target-score');
        const adminEnableTimeLimit = document.getElementById('admin-enable-time-limit');
        const adminTimeLimitSeconds = document.getElementById('admin-time-limit-seconds');

        const syncAdminGoalSettings = () => {
            const scoreEnabled = adminTargetScoreEnabled ? adminTargetScoreEnabled.checked : true;
            const scoreValue = Number(adminTargetScoreInput?.value || 50000);
            const timeEnabled = adminEnableTimeLimit ? adminEnableTimeLimit.checked : false;
            const timeSeconds = Number(adminTimeLimitSeconds?.value || 90);
            const movesValue = Number(
                document.getElementById('admin-total-moves')?.value ||
                    this.config?.totalMoves ||
                    30,
            );
            const requiredEnabled =
                document.getElementById('admin-required-piece-enabled')?.checked ?? false;
            const requiredType =
                document.getElementById('admin-required-piece-type')?.value ||
                this.requiredPieceType ||
                this.config?.requiredPieceType ||
                this.config?.pieceTypes?.[0]?.id ||
                'A';
            const requiredCount = Number(
                document.getElementById('admin-required-piece-count')?.value || 10,
            );

            this.targetScoreEnabled = scoreEnabled;
            this.targetScore = scoreEnabled
                ? Number.isFinite(scoreValue)
                    ? Math.max(0, scoreValue)
                    : 50000
                : 0;
            this.config = this.config || {
                ...DEFAULT_CONFIG,
                pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
            };
            this.config.targetScore = this.targetScore;
            this.config.targetScoreEnabled = scoreEnabled;
            this.config.enableTimeLimit = timeEnabled;
            this.config.timeLimitSeconds = Number.isFinite(timeSeconds)
                ? Math.max(10, timeSeconds)
                : 90;
            this.config.totalMoves = Number.isFinite(movesValue) ? Math.max(1, movesValue) : 30;
            this.requiredPieceEnabled = requiredEnabled;
            this.config.requiredPieceEnabled = requiredEnabled;
            this.config.requiredPieceType = requiredType;
            this.config.requiredPieceCount = Number.isFinite(requiredCount)
                ? Math.max(0, requiredCount)
                : 10;
            this.requiredPieceType = requiredType;
            this.requiredPieceCount = this.config.requiredPieceCount;
            this.timeLeft = timeEnabled ? Math.max(0, timeSeconds) : 0;
            this.movesLeft = this.config.totalMoves;
            this._updateHUD();
        };

        if (adminTargetScoreEnabled) {
            adminTargetScoreEnabled.addEventListener('change', syncAdminGoalSettings);
        }
        if (adminTargetScoreInput) {
            adminTargetScoreInput.addEventListener('input', syncAdminGoalSettings);
        }
        if (adminEnableTimeLimit) {
            adminEnableTimeLimit.addEventListener('change', syncAdminGoalSettings);
        }
        if (adminTimeLimitSeconds) {
            adminTimeLimitSeconds.addEventListener('input', syncAdminGoalSettings);
        }
        const adminRequiredEnabled = document.getElementById('admin-required-piece-enabled');
        if (adminRequiredEnabled) {
            adminRequiredEnabled.addEventListener('change', syncAdminGoalSettings);
        }

        const modeAdminBtn = document.getElementById('mode-admin-btn');
        const modeGameBtn = document.getElementById('mode-game-btn');
        const adminSaveRulesBtn = document.getElementById('admin-save-rules-btn');
        const adminApplyBoardBtn = document.getElementById('admin-apply-board-btn');
        const gameStartBtn = document.getElementById('game-start-btn');

        if (modeAdminBtn) {
            modeAdminBtn.addEventListener('click', () => this.setMode('admin'));
        }
        if (modeGameBtn) {
            modeGameBtn.addEventListener('click', () => this.setMode('game'));
        }
        if (adminSaveRulesBtn) {
            adminSaveRulesBtn.addEventListener('click', () => {
                const form = readAdminRuleForm();
                const baseCfg = this.config || {
                    ...DEFAULT_CONFIG,
                    pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
                };
                const safeCfg = sanitizeConfig({
                    ...baseCfg,
                    targetScoreEnabled: form.targetScoreEnabled,
                    targetScore: form.targetScore,
                    enableTimeLimit: form.enableTimeLimit,
                    timeLimitSeconds: form.timeLimitSeconds,
                    totalMoves: form.totalMoves,
                    requiredPieceEnabled: form.requiredPieceEnabled,
                    requiredPieceType: form.requiredPieceType,
                    requiredPieceCount: form.requiredPieceCount,
                    name: form.levelName || baseCfg.name || '自定义关卡',
                });
                safeCfg.requiredPieceType =
                    form.requiredPieceType ||
                    safeCfg.requiredPieceType ||
                    safeCfg.pieceTypes?.[0]?.id ||
                    'A';
                safeCfg.requiredPieceCount =
                    form.requiredPieceCount || safeCfg.requiredPieceCount || 10;
                this.applyConfig(safeCfg);
                this.init();
                this.showMessage('✅ 规则已保存并生效。');
            });
        }
        const adminSaveLevelBtn = document.getElementById('admin-save-level-btn');
        if (adminSaveLevelBtn) {
            adminSaveLevelBtn.addEventListener('click', () => {
                const form = readAdminRuleForm();
                const baseCfg = this.config || {
                    ...DEFAULT_CONFIG,
                    pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
                };
                const safeCfg = sanitizeConfig({
                    ...baseCfg,
                    targetScoreEnabled: form.targetScoreEnabled,
                    targetScore: form.targetScore,
                    enableTimeLimit: form.enableTimeLimit,
                    timeLimitSeconds: form.timeLimitSeconds,
                    totalMoves: form.totalMoves,
                    requiredPieceEnabled: form.requiredPieceEnabled,
                    requiredPieceType: form.requiredPieceType,
                    requiredPieceCount: form.requiredPieceCount,
                    name:
                        form.levelName ||
                        baseCfg.name ||
                        `关卡-${new Date().toLocaleDateString()}-${Date.now().toString().slice(-4)}`,
                });
                safeCfg.initialBoard = this.serializeCurrentBoard();
                const levelName =
                    form.levelName ||
                    safeCfg.name ||
                    `关卡-${new Date().toLocaleDateString()}-${Date.now().toString().slice(-4)}`;
                const levels = JSON.parse(localStorage.getItem(LEVELS_KEY) || '[]');
                const nextLevels = Array.isArray(levels) ? levels : [];
                const payload = { name: levelName, config: { ...safeCfg, name: levelName } };
                const index = nextLevels.findIndex((level) => level && level.name === levelName);
                if (index >= 0) nextLevels[index] = payload;
                else nextLevels.unshift(payload);
                localStorage.setItem(LEVELS_KEY, JSON.stringify(nextLevels.slice(0, 20)));
                updateLevelList();
                this.applyConfig(safeCfg);
                this.init();
                this.showMessage(`✅ 关卡已保存：${levelName}`);
            });
        }
        if (adminApplyBoardBtn) {
            adminApplyBoardBtn.addEventListener('click', () => {
                this.init();
                this.showMessage('✅ 管理员配置已应用到棋盘。');
            });
        }
        if (gameStartBtn) {
            gameStartBtn.addEventListener('click', () => this.setMode('game'));
        }

        const pieceTypeSelect = document.getElementById('cell-piece-type');
        if (pieceTypeSelect) {
            pieceTypeSelect.addEventListener('change', () => {
                if (this.mode === 'admin') this.previewSelectedCellEditor();
            });
        }
        [
            'cell-pattern',
            'cell-bg-color',
            'cell-pattern-color',
            'cell-movable',
            'cell-ice-layer',
            'cell-wall-left',
            'cell-wall-top',
            'cell-wall-right',
            'cell-wall-bottom',
        ].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    if (this.mode === 'admin') this.previewSelectedCellEditor();
                });
                el.addEventListener('input', () => {
                    if (this.mode === 'admin') this.previewSelectedCellEditor();
                });
            }
        });

        const patternTileContainer = document.getElementById('cell-pattern-tiles');
        if (patternTileContainer) {
            const patternOptions = [
                { value: 'solid', label: 'solid' },
                { value: 'dot', label: 'dot' },
                { value: 'stripe', label: 'stripe' },
                { value: 'check', label: 'check' },
                { value: 'waves', label: 'waves' },
                { value: 'spark', label: 'spark' },
            ];
            buildTileOptions(
                document.getElementById('cell-pattern'),
                patternOptions,
                document.getElementById('cell-pattern')?.value || 'dot',
                () => {
                    if (this.mode === 'admin') this.previewSelectedCellEditor();
                },
            );
        }
        ['left', 'top', 'right', 'bottom'].forEach((side) => {
            const wallSelect = document.getElementById(`cell-wall-${side}`);
            if (!wallSelect) return;
            buildTileOptions(
                wallSelect,
                [
                    { value: 'none', label: '无' },
                    { value: 'low', label: '低' },
                    { value: 'medium', label: '中' },
                    { value: 'high', label: '高' },
                ],
                wallSelect.value || 'none',
                () => {
                    if (this.mode === 'admin') this.previewSelectedCellEditor();
                },
            );
        });
        const adminRequiredPieceTypeSelect = document.getElementById('admin-required-piece-type');
        if (adminRequiredPieceTypeSelect) {
            const options = (this.config?.pieceTypes || [])
                .filter((type) => type.isPiece !== false)
                .map(getPieceTypeUIOption);
            buildTileOptions(
                adminRequiredPieceTypeSelect,
                options,
                adminRequiredPieceTypeSelect.value || this.config?.pieceTypes?.[0]?.id || 'apple',
                () => {
                    this.requiredPieceType = adminRequiredPieceTypeSelect.value;
                    this.config = this.config || {
                        ...DEFAULT_CONFIG,
                        pieceTypes: [...DEFAULT_CONFIG.pieceTypes],
                    };
                    this.config.requiredPieceType = this.requiredPieceType;
                },
            );
        }
        const cellApplyBtn = document.getElementById('cell-apply-btn');
        if (cellApplyBtn) {
            cellApplyBtn.addEventListener('click', () => this.applySelectedCellEditor());
        }
        const cellClearBtn = document.getElementById('cell-clear-btn');
        if (cellClearBtn) {
            cellClearBtn.addEventListener('click', () => {
                const current = this.selected;
                if (!current) return;
                const piece = this.board[current.r]?.[current.c];
                if (!piece) return;
                this.board[current.r][current.c] = null;
                this.renderBoard();
                this.syncEditorPanel();
            });
        }
    }
}

/* ==================== 六、管理面板 ==================== */

function setupSettingsPanel(engine) {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const cfgSaveBtn = document.getElementById('cfg-save');
    const cfgResetBtn = document.getElementById('cfg-reset');
    const cfgCloseBtn = document.getElementById('cfg-close');

    function serializePieceType(type) {
        const walls = type.walls || {};
        const wallEntries = ['top', 'right', 'bottom', 'left']
            .map((side) => {
                const wall = walls[side] || {};
                const enabled = Boolean(wall.enabled);
                const hp = Number(wall.hp || 0);
                return [
                    `wall${side[0].toUpperCase()}${side.slice(1)}=${enabled}`,
                    `wall${side[0].toUpperCase()}${side.slice(1)}Hp=${hp}`,
                    `wall${side[0].toUpperCase()}${side.slice(1)}Color=${wall.color || 'rgba(255,255,255,0.9)'}`,
                ];
            })
            .flat();

        return [
            `${type.id}:${type.color || type.background || '#888'}`,
            `char=${encodeURIComponent(type.char || '')}`,
            `code=${encodeURIComponent(type.code || type.id)}`,
            `typeOptions=${encodeURIComponent(JSON.stringify(type.pieceUI?.type?.options || [{ value: type.code || type.id, label: type.id }]))}`,
            `pattern=${type.pattern || 'dot'}`,
            `patternColor=${type.patternColor || 'rgba(255,255,255,0.22)'}`,
            `pieceColor=${type.pieceColor || '#ffffff'}`,
            `borderColor=${type.borderColor || 'rgba(255,255,255,0.3)'}`,
            ...wallEntries,
        ].join('|');
    }

    function fillForm(cfg) {
        document.getElementById('cfg-rows').value = cfg.rows;
        document.getElementById('cfg-cols').value = cfg.cols;
        document.getElementById('cfg-cell-size').value = cfg.cellSize;
        document.getElementById('cfg-piece-types').value = cfg.pieceTypes
            .map(serializePieceType)
            .join(';');
        document.getElementById('cfg-total-moves').value = cfg.totalMoves;
        document.getElementById('cfg-match-length').value = cfg.matchLength;
        document.getElementById('cfg-enable-square').checked = cfg.enableSquare;
        document.getElementById('cfg-enable-diagonal').checked = cfg.enableDiagonal;
        document.getElementById('cfg-enable-drag').checked = cfg.enableDrag;
        document.getElementById('cfg-enable-time-limit').checked = cfg.enableTimeLimit === true;
        document.getElementById('cfg-time-limit-seconds').value = cfg.timeLimitSeconds || 90;
        document.getElementById('cfg-initial-board').value = Array.isArray(cfg.initialBoard)
            ? cfg.initialBoard.map((row) => row.join(',')).join('\n')
            : cfg.initialBoard || '';
        document.getElementById('cfg-base-score').value = cfg.baseScore;
        document.getElementById('cfg-combo-multiplier').checked = cfg.comboMultiplier;
        const presetSelect = document.getElementById('cfg-preset');
        const match = Object.entries(PRESET_CONFIGS).find(([_, preset]) => {
            const p = {
                ...DEFAULT_CONFIG,
                ...preset.config,
                pieceTypes: preset.config.pieceTypes || DEFAULT_CONFIG.pieceTypes,
            };
            return (
                JSON.stringify({
                    rows: p.rows,
                    cols: p.cols,
                    cellSize: p.cellSize,
                    totalMoves: p.totalMoves,
                    matchLength: p.matchLength,
                    enableSquare: p.enableSquare,
                    enableDiagonal: p.enableDiagonal,
                    enableDrag: p.enableDrag,
                    enableTimeLimit: p.enableTimeLimit,
                    timeLimitSeconds: p.timeLimitSeconds,
                    baseScore: p.baseScore,
                    comboMultiplier: p.comboMultiplier,
                    explodeRules: p.explodeRules,
                    initialBoard: p.initialBoard,
                }) ===
                JSON.stringify({
                    rows: cfg.rows,
                    cols: cfg.cols,
                    cellSize: cfg.cellSize,
                    totalMoves: cfg.totalMoves,
                    matchLength: cfg.matchLength,
                    enableSquare: cfg.enableSquare,
                    enableDiagonal: cfg.enableDiagonal,
                    enableDrag: cfg.enableDrag,
                    enableTimeLimit: cfg.enableTimeLimit,
                    timeLimitSeconds: cfg.timeLimitSeconds,
                    baseScore: cfg.baseScore,
                    comboMultiplier: cfg.comboMultiplier,
                    explodeRules: cfg.explodeRules,
                    initialBoard: cfg.initialBoard,
                })
            );
        });
        if (presetSelect) {
            presetSelect.value = match ? match[0] : 'custom';
        }

        // 爆炸规则
        const explode4 = cfg.explodeRules && cfg.explodeRules[4] ? cfg.explodeRules[4] : '';
        const explode5 = cfg.explodeRules && cfg.explodeRules[5] ? cfg.explodeRules[5] : '';
        const explode6 = cfg.explodeRules && cfg.explodeRules[6] ? cfg.explodeRules[6] : '';
        document.getElementById('cfg-explode-4').value = explode4;
        document.getElementById('cfg-explode-5').value = explode5;
        document.getElementById('cfg-explode-6').value = explode6;
    }

    function readForm() {
        const num = (id) => parseInt(document.getElementById(id).value, 10);
        const toBool = (value) =>
            ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
        const preset = document.getElementById('cfg-preset')?.value || 'custom';

        const rows = num('cfg-rows');
        const cols = num('cfg-cols');
        const cellSize = num('cfg-cell-size');
        const totalMoves = num('cfg-total-moves');
        const matchLength = num('cfg-match-length');
        const baseScore = num('cfg-base-score');
        const enableTimeLimit = document.getElementById('cfg-enable-time-limit').checked;
        const timeLimitSeconds = num('cfg-time-limit-seconds');
        const targetScore = Number(document.getElementById('admin-target-score')?.value || 50000);
        const targetScoreEnabled =
            document.getElementById('admin-target-score-enabled')?.checked ?? true;
        const initialBoardRaw = document.getElementById('cfg-initial-board').value.trim();
        const initialBoard = initialBoardRaw
            ? initialBoardRaw.split(/\n|;/).map((row) =>
                  row
                      .split(',')
                      .map((cell) => cell.trim())
                      .filter(Boolean),
              )
            : null;

        // 解析棋子类型：支持 "🍎:#ff6b6b|pattern=dot|pieceColor=#fff|wallTop=true|wallTopHp=2" 这样的扩展配置
        const raw = document.getElementById('cfg-piece-types').value;
        const pieceTypes = splitPieceTypeEntries(raw)
            .map((entry, index) => parsePieceTypeEntry(entry, `piece${index + 1}`))
            .filter(Boolean);

        if (pieceTypes.length < 2) {
            alert('至少需要 2 种棋子');
            return null;
        }

        // 解析爆炸规则
        const explodeRules = {};
        const e4 = document.getElementById('cfg-explode-4').value.trim();
        const e5 = document.getElementById('cfg-explode-5').value.trim();
        const e6 = document.getElementById('cfg-explode-6').value.trim();
        if (e4) explodeRules[4] = e4;
        if (e5) explodeRules[5] = e5;
        if (e6) explodeRules[6] = e6;

        return {
            presetName: preset,
            rows,
            cols,
            cellSize,
            pieceTypes,
            totalMoves,
            matchLength,
            enableSquare: document.getElementById('cfg-enable-square').checked,
            enableDiagonal: document.getElementById('cfg-enable-diagonal').checked,
            enableDrag: document.getElementById('cfg-enable-drag').checked,
            enableTimeLimit,
            timeLimitSeconds:
                Number.isFinite(timeLimitSeconds) && timeLimitSeconds > 0 ? timeLimitSeconds : 90,
            targetScore: Number.isFinite(targetScore) ? Math.max(0, targetScore) : 50000,
            targetScoreEnabled,
            initialBoard,
            baseScore,
            comboMultiplier: document.getElementById('cfg-combo-multiplier').checked,
            explodeRules,
            gap: 4,
        };
    }

    function openSettings() {
        fillForm(engine.config);
        settingsOverlay.classList.remove('hidden');
    }

    function closeSettings() {
        settingsOverlay.classList.add('hidden');
    }

    function applyPreset(presetName) {
        const preset = PRESET_CONFIGS[presetName];
        if (!preset) return;
        const merged = { ...DEFAULT_CONFIG, ...preset.config };
        if (preset.config.pieceTypes) {
            merged.pieceTypes = preset.config.pieceTypes;
        }
        fillForm(merged);
        const nextCfg = readForm();
        if (nextCfg) saveConfig(nextCfg);
    }

    function saveConfig(cfg) {
        const safeCfg = sanitizeConfig(cfg || DEFAULT_CONFIG);
        engine.applyConfig(safeCfg);
        engine.init();
        closeSettings();
        engine.showMessage('✅ 设置已保存并应用！');
    }

    settingsBtn.addEventListener('click', openSettings);
    document.getElementById('cfg-preset')?.addEventListener('change', (e) => {
        if (e.target.value && e.target.value !== 'custom') {
            applyPreset(e.target.value);
        }
    });
    document.getElementById('cfg-load-preset')?.addEventListener('click', () => {
        const presetName = document.getElementById('cfg-preset')?.value;
        if (presetName && presetName !== 'custom') applyPreset(presetName);
    });
    cfgCloseBtn.addEventListener('click', closeSettings);
    cfgSaveBtn.addEventListener('click', () => {
        const cfg = readForm();
        if (cfg) saveConfig(cfg);
    });
    cfgResetBtn.addEventListener('click', () => {
        if (confirm('确定恢复所有默认设置吗？')) {
            saveConfig({ ...DEFAULT_CONFIG });
        }
    });
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) closeSettings();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSettings();
    });
}

/* ==================== 七、启动 ==================== */

// 创建游戏引擎实例
const game = new GameEngine();

// 加载配置并应用
const savedConfig = game.loadConfig();
game.applyConfig(savedConfig);

// 初始化游戏
game.init();

// 设置管理面板
setupSettingsPanel(game);

console.log('🍬 糖果消消乐 v5 已启动！');
console.log('📐 棋盘:', game.rows, 'x', game.cols);
console.log('🎯 匹配规则:', game.matchRules.map((r) => r.name).join(', '));
console.log('💥 爆炸规则:', game.config.explodeRules);
