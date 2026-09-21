// js/engine/shape-templates.js
// ==================== 形状模板 ====================
// 
// 可视化定义形状，运行时转成相对坐标，支持旋转 / 翻转生成变体。
// 
// pattern 约定：
//   'F' = 必须匹配的格
//   '.' / '?' / ' ' = 通配（不参与匹配）
//   'O' = 锚点（可选，也可以显式指定 anchor）
// 
// rotate 约定：
//   角度数组，如 [0, 90, 180, 270]
//   不写默认 [0]
//   旋转公式：
//     90°:  (dr, dc) → (dc, -dr)
//     180°: (dr, dc) → (-dr, -dc)
//     270°: (dr, dc) → (-dc, dr)
// 
// flip 约定：
//   true → 额外生成"水平翻转 + 各旋转"的变体（模板数翻倍）
//   水平翻转公式：(dr, dc) → (dr, -dc)
//   对称形状（大 T / 直线 / 田字）不加，避免冗余
//   非对称形状（T 形 / L 形）加
// 
// directionByAngle：
//   true  → 旋转 0/180 为 horizontal，90/270 为 vertical
//   不写  → direction 由 def.direction 决定
// 
// 优先级：数字越大越先匹配。

const SHAPE_PATTERNS = [
    // ==================== 大 T（彩色小鸟）====================
    // 横版，竖向上
    {
        id: 'bigT-up',
        shape: 'bigT',
        priority: 100,
        pattern: [
            '.F.',
            '.F.',
            'FFFFF',
        ],
        anchor: { r: 2, c: 2 },
        rotate: [0, 90, 180, 270],
    },
    // 横版，竖对称
    {
        id: 'bigT-mid',
        shape: 'bigT',
        priority: 100,
        pattern: [
            '.F.',
            'FFFFF',
            '.F.',
        ],
        anchor: { r: 1, c: 2 },
        rotate: [0, 90],
    },
    
    // ==================== 直线 5（单色小鸟）====================
    {
        id: 'line5',
        shape: 'line',
        priority: 90,
        pattern: ['FFFFF'],
        anchor: { r: 0, c: 2 },
        rotate: [0, 90],
        directionByAngle: true,
    },
    
    // ==================== T 形（大炸弹）====================
    {
        id: 'tshape',
        shape: 'tshape',
        priority: 80,
        pattern: [
            '.F..',
            'FFFF',
            '.F..',
            '.F..',
        ],
        anchor: { r: 1, c: 1 },
        rotate: [0, 90, 180, 270],
        flip: true,
    },
    
    // ==================== L 形（大炸弹）====================
    {
        id: 'lshape',
        shape: 'lshape',
        priority: 70,
        pattern: [
            'F...',
            'F...',
            'FFFF',
        ],
        anchor: { r: 0, c: 0 },
        rotate: [0, 90, 180, 270],
        flip: true,
    },
    
    // ==================== 直线 4（直线炸弹）====================
    {
        id: 'line4',
        shape: 'line',
        priority: 60,
        pattern: ['FFFF'],
        anchor: { r: 0, c: 1 },
        rotate: [0, 90],
        directionByAngle: true,
    },
    
    // ==================== 直线 3（普通消除）====================
    {
        id: 'line3',
        shape: 'line',
        priority: 50,
        pattern: ['FFF'],
        anchor: { r: 0, c: 1 },
        rotate: [0, 90],
        directionByAngle: true,
    },
    
    // ==================== 田字（小炸弹）====================
    {
        id: 'square',
        shape: 'square',
        priority: 40,
        pattern: [
            'FF',
            'FF',
        ],
        anchor: { r: 0, c: 0 },
        rotate: [0],
    },
];


// ==================== 几何变换 ====================

function rotateCell(cell, angle) {
    const { dr, dc } = cell;
    switch (angle) {
        case 0:   return { dr, dc };
        case 90:  return { dr: dc, dc: -dr };
        case 180: return { dr: -dr, dc: -dc };
        case 270: return { dr: -dc, dc: dr };
        default:
            console.warn(`[ShapeTemplate] 未知旋转角度 ${angle}，按 0 处理`);
            return { dr, dc };
    }
}

function flipCell(cell, axis) {
    const { dr, dc } = cell;
    if (axis === 'h') return { dr, dc: -dc };      // 水平翻转（左右镜像）
    if (axis === 'v') return { dr: -dr, dc };      // 垂直翻转（上下镜像）
    return { dr, dc };
}


// ==================== 转换：pattern → 模板变体 ====================

function buildVariant(def, cells, angle, flipped, directionByAngle) {
    let direction = def.direction;
    if (directionByAngle) {
        // 水平翻转不改变"横竖"属性，旋转 0/180 横、90/270 竖
        direction = (angle === 0 || angle === 180) ? 'horizontal' : 'vertical';
    }
    
    const suffix = [
        angle !== 0 ? `r${angle}` : '',
        flipped ? 'f' : '',
    ].filter(Boolean).join('-');
    
    const variantId = suffix ? `${def.id}-${suffix}` : def.id;
    
    console.log(
        `[ShapeTemplate] ${variantId}: shape=${def.shape}` +
        (direction ? ` dir=${direction}` : '') +
        ` 格数=${cells.length} cells=${JSON.stringify(cells)}`
    );
    
    return {
        id: variantId,
        shape: def.shape,
        direction,
        priority: def.priority,
        cells,
        center: { dr: 0, dc: 0 },
    };
}

function patternToTemplates(def) {
    const { pattern, anchor, rotate, flip, directionByAngle } = def;
    
    // 收集 F / O
    const fPositions = [];
    for (let r = 0; r < pattern.length; r++) {
        const row = pattern[r];
        for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch === 'F' || ch === 'O') {
                fPositions.push({ r, c, isAnchor: ch === 'O' });
            }
        }
    }
    
    if (fPositions.length === 0) {
        console.warn(`[ShapeTemplate] ${def.id} 没有 F，跳过`);
        return [];
    }
    
    // 锚点
    let anchorPos;
    if (anchor) {
        anchorPos = anchor;
    } else {
        const explicit = fPositions.find(p => p.isAnchor);
        anchorPos = explicit || fPositions[0];
    }
    
    // 基础 cells（相对锚点）
    const baseCells = fPositions.map(p => ({
        dr: p.r - anchorPos.r,
        dc: p.c - anchorPos.c,
    }));
    
    const angles = rotate || [0];
    const variants = [];
    
    // 原版 + 各旋转
    for (const angle of angles) {
        const cells = baseCells.map(c => rotateCell(c, angle));
        variants.push(buildVariant(def, cells, angle, false, directionByAngle));
    }
    
    // 水平翻转版 + 各旋转
    if (flip) {
        for (const angle of angles) {
            const cells = baseCells
                .map(c => flipCell(c, 'h'))
                .map(c => rotateCell(c, angle));
            variants.push(buildVariant(def, cells, angle, true, directionByAngle));
        }
    }
    
    return variants;
}

const SHAPE_TEMPLATES = SHAPE_PATTERNS
    .flatMap(def => patternToTemplates(def));

console.log(
    `[ShapeTemplate] 已加载 ${SHAPE_TEMPLATES.length} 个模板（来自 ${SHAPE_PATTERNS.length} 个定义）`
);

window.SHAPE_PATTERNS = SHAPE_PATTERNS;
window.SHAPE_TEMPLATES = SHAPE_TEMPLATES;
window.patternToTemplates = patternToTemplates;
window.rotateCell = rotateCell;
window.flipCell = flipCell;