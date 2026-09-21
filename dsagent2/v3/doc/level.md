# 关卡配置说明

## 一、配置文件位置

| 用途 | 文件 |
|------|------|
| **内置关卡模板** | `js/config/levels.js` |
| **用户保存的关卡** | `localStorage`（key: `candy_levels_v7`） |
| **加载器** | `js/config/index.js` 的 `ConfigLoader.levelToConfig()` |

---

## 二、关卡数据结构总览

```javascript
{
    id: 'level-001',                    // 唯一标识
    name: '教学关卡',                    // 显示名
    description: '熟悉基本三消',          // 描述（可选）
    isBuiltin: true,                    // 是否内置（自动标记，无需手写）
    
    board: {                            // 棋盘
        rows: 8,
        cols: 8,
        layout: [[1,1,...], ...]        // 格子存在性矩阵
    },
    
    pieces: null,                       // 棋子初始布局（null = 随机）
    targets: [],                        // 目标物（水果）
    obstacles: [],                      // 障碍物（冰、锁链）
    overlays: [],                       // 覆盖物（藤蔓等阻挡移动的物体）
    goals: [],                          // 通关条件
    
    moves: 30,                          // 总步数
    
    config: {                           // 局内配置
        matchLength: 3,
        enableSquare: true,
        enableDiagonal: false,
        enableDrag: true,
        enableTimeLimit: false,
        timeLimitSeconds: 90,
        baseScore: 10,
        comboMultiplier: true,
        gravitySpeed: 1.0
    }
}
```

---

## 三、字段详解

### 1. 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识。内置关卡用 `level-001` 格式，自定义关卡用 `custom-时间戳` |
| `name` | string | ✅ | 显示名。会出现在关卡列表中 |
| `description` | string | ❌ | 描述。用于内部标注，不显示在列表 |
| `board` | object | ✅ | 棋盘定义，见下方 |
| `pieces` | array \| null | ❌ | 棋子初始布局，`null` 表示随机生成 |
| `targets` | array | ❌ | 目标物列表，默认 `[]` |
| `obstacles` | array | ❌ | 障碍物列表，默认 `[]` |
| `overlays` | array | ❌ | 覆盖物列表，默认 `[]` |
| `goals` | array | ❌ | 通关条件，默认 `[]`（无目标则无限玩） |
| `moves` | number | ✅ | 总步数，默认 30 |
| `config` | object | ❌ | 局内配置，见下方 |

---

### 2. `board` — 棋盘

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rows` | number | ✅ | 行数（2~20） |
| `cols` | number | ✅ | 列数（2~20） |
| `layout` | number[][] | ❌ | 格子存在性矩阵，`1` 存在 / `0` 不存在。默认全 1 |

**`layout` 示例**：

```javascript
layout: [
    [0, 1, 1, 1, 1, 0],   // 四角挖空
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 0]
]
```

**注意**：`layout[r][c] === 0` 的位置**永远不会生成棋子**，重力下落也会跳过它。

---

### 3. `pieces` — 棋子初始布局

| 值 | 含义 |
|----|------|
| `null` | **随机生成**（默认）。随机时用 `_wouldMatch` 防三连 |
| 二维数组 | **人为指定**。每格是元素 id 或 `'empty'` |

**示例 1：随机生成**

```javascript
pieces: null
```

**示例 2：人为指定**

```javascript
pieces: [
    ['fox', 'owl', 'cat', 'chick', null, null],
    ['owl', 'cat', 'chick', 'bear', 'frog', 'octopus'],
    // ... 每行 length 应等于 board.cols
]
```

**规则**：

- **`null` 或 `'empty'` 或 `''`** → 该格不放棋子
- **元素 id**（如 `'fox'`）→ 创建该棋子
- **行数/列数不足** → 缺的部分留空
- **超出 board 尺寸** → 忽略

**⚠️ 人为指定时**：

- **允许初始三连**（会触发 `stabilize()` 自动消除）
- **不允许指定不在元素库的 id**（会被忽略）

---

### 4. `targets` — 目标物（水果）

**每个 target 是一个对象**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `element` | string | ✅ | 元素 id（如 `'watermelon'`） |
| `r` | number | ✅ | 起始行（左上角） |
| `c` | number | ✅ | 起始列（左上角） |
| `w` | number | ❌ | 宽度（跨几列），默认 1 |
| `h` | number | ❌ | 高度（跨几行），默认 1 |
| `hp` | number | ❌ | 血量，默认 1 |
| `hpMode` | string | ❌ | 血量模式：`whole`（整体）/ `perCell`（逐格），默认 `whole` |
| `metadata` | object | ❌ | 自定义元数据 |

**示例**：

```javascript
targets: [
    // 2×2 西瓜，左上角在 (0,0)
    { element: 'watermelon', r: 0, c: 0, w: 2, h: 2, hp: 1 },
    
    // 1×1 葡萄
    { element: 'grape', r: 2, c: 2, w: 1, h: 1, hp: 1 },
    
    // 2×3 大西瓜（横跨 2 列 3 行）
    { element: 'watermelon', r: 6, c: 6, w: 2, h: 3, hp: 1 }
]
```

**规则**：

- **水果跨格子**，覆盖 `(r, c)` 到 `(r+h-1, c+w-1)`
- **`element` 必须是 `category: 'target'` 的元素**
- **不能重叠**（运行时后加的会覆盖先加的）
- **消除条件**：水果覆盖范围内所有障碍物都被清除后，水果才消失

---

### 5. `obstacles` — 障碍物

**每个 obstacle 是一个对象**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `element` | string | ✅ | 元素 id（如 `'ice'`、`'chain'`） |
| `r` | number | ✅ | 行 |
| `c` | number | ✅ | 列 |
| `hp` | number | ❌ | 血量，默认 1 |
| `maxHp` | number | ❌ | 最大血量，默认等于 hp |
| `hpMode` | string | ❌ | 血量模式：`whole`（整体）/ `perCell`（逐格），默认 `whole` |
| `metadata` | object | ❌ | 自定义元数据 |

**示例**：

```javascript
obstacles: [
    // 冰，3 层血
    { element: 'ice', r: 0, c: 0, hp: 3 },
    
    // 锁链，1 层血
    { element: 'chain', r: 5, c: 5, hp: 1 }
]
```

**规则**：

- **障碍物逐格**，一个位置只能有一个
- **`element` 必须是 `category: 'obstacle'` 的元素**
- **障碍物的伤害规则由元素配置决定**：
  - `ice` 监听 `onCellCleared`（同格棋子被消除时受伤）
  - `chain` 监听 `onAdjacent`（相邻棋子被消除时受伤）
  - 具体见 `elements.js` 的 `events`

---

### 6. `overlays` — 覆盖物（阻挡移动）

**每个 overlay 是一个对象**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `element` | string | ✅ | 元素 id（如 `'vine'`） |
| `r` | number | ✅ | 起始行（左上角） |
| `c` | number | ✅ | 起始列（左上角） |
| `w` | number | ❌ | 宽度（跨几列），默认 1 |
| `h` | number | ❌ | 高度（跨几行），默认 1 |
| `hp` | number | ❌ | 血量，默认 1 |
| `hpMode` | string | ❌ | 血量模式，默认 `whole` |
| `metadata` | object | ❌ | 自定义元数据 |

**示例**：

```javascript
overlays: [
    // 2×2 藤蔓，阻挡移动
    { element: 'vine', r: 3, c: 3, w: 2, h: 2, hp: 2 },
    
    // 单格藤蔓
    { element: 'vine', r: 0, c: 0, hp: 1 }
]
```

**规则**：

- **覆盖物跨格子**，覆盖 `(r, c)` 到 `(r+h-1, c+w-1)`
- **`element` 必须是 `category: 'overlay'` 的元素**
- **覆盖物会阻挡玩家交换棋子**（`blocksMovement: true`）
- **覆盖物的伤害规则由元素配置决定**：
  - `vine` 监听 `onAdjacent`（相邻棋子被消除时受伤）
  - 具体见 `elements.js` 的 `events`

---

### 7. `goals` — 通关条件

**每个 goal 是一个对象**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 目标类型（见下表） |
| （其他） | - | - | 视类型而定 |

**内置目标类型**：

| type | 参数 | 说明 |
|------|------|------|
| `score` | `value` | 达到指定分数 |
| `collect` | `element`, `count` | 收集指定数量的目标物 |
| `collectAll` | `element`（可选） | 收集所有目标物 |
| `eliminate` | `element`, `count` | 消除指定数量的棋子 |
| `movesLeft` | `min` | 剩余步数（失败条件） |
| `timeLeft` | `min` | 剩余时间（失败条件） |

**示例**：

```javascript
// 达到 5000 分
goals: [{ type: 'score', value: 5000 }]

// 消除 30 只狐狸
goals: [{ type: 'eliminate', element: 'fox', count: 30 }]

// 收集所有西瓜
goals: [{ type: 'collectAll', element: 'watermelon' }]

// 多目标（任一达成就胜利）
goals: [
    { type: 'score', value: 5000 },
    { type: 'collectAll' }
]

// 无目标（无限玩）
goals: []
```

**规则**：

- **任一目标达成就胜利**
- **步数/时间耗尽且无目标达成则失败**
- **`goals: []`** → 无目标，不判胜负（适合沙盒/测试关卡）

---

### 8. `config` — 局内配置

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `matchLength` | number | 3 | 最少连消数量（3~6） |
| `enableSquare` | boolean | true | 是否启用田字消除 |
| `enableDiagonal` | boolean | false | 是否启用斜线消除 |
| `enableDrag` | boolean | true | 是否启用拖拽交换 |
| `enableTimeLimit` | boolean | false | 是否启用时间限制 |
| `timeLimitSeconds` | number | 90 | 时间限制（秒） |
| `baseScore` | number | 10 | 每颗棋子的基础分 |
| `comboMultiplier` | boolean | true | 连击是否加倍 |
| `gravitySpeed` | number | 1.0 | 重力下落速度倍率 |

---

## 四、完整示例

### 示例 1：最简关卡（随机棋盘 + 分数目标）

```javascript
{
    id: 'level-001',
    name: '教学关卡',
    board: {
        rows: 8,
        cols: 8,
        layout: [
            [1, 1, 1, 1, 1, 1, 1, 1],
            // ... 8 行全 1
        ]
    },
    pieces: null,
    targets: [],
    obstacles: [],
    overlays: [],
    goals: [{ type: 'score', value: 5000 }],
    moves: 30,
    config: {}
}
```

### 示例 2：收集水果关卡（带冰 + 藤蔓覆盖物）

```javascript
{
    id: 'level-002',
    name: '水果收集',
    description: '消除冰块，收集所有水果',
    board: {
        rows: 8,
        cols: 8,
        layout: [...8x8 全 1...]
    },
    pieces: null,
    targets: [
        { element: 'watermelon', r: 0, c: 0, w: 2, h: 2, hp: 1 },
        { element: 'grape', r: 0, c: 6, w: 2, h: 2, hp: 1 },
        { element: 'lemon', r: 6, c: 0, w: 2, h: 2, hp: 1 },
        { element: 'orange', r: 6, c: 6, w: 2, h: 2, hp: 1 }
    ],
    obstacles: [
        // 覆盖在水果上的冰（ice 监听 onCellCleared）
        { element: 'ice', r: 0, c: 0, hp: 1 },
        { element: 'ice', r: 0, c: 1, hp: 1 },
        { element: 'ice', r: 1, c: 0, hp: 1 },
        { element: 'ice', r: 1, c: 1, hp: 1 },
        // ... 其他水果上的冰
    ],
    overlays: [
        // 中间藤蔓（vine 监听 onAdjacent，阻挡移动）
        { element: 'vine', r: 3, c: 3, w: 2, h: 2, hp: 2 }
    ],
    goals: [{ type: 'collectAll' }],
    moves: 25,
    config: {}
}
```

### 示例 3：固定棋盘关卡

```javascript
{
    id: 'level-005',
    name: '固定布局',
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
    overlays: [],
    goals: [{ type: 'score', value: 3000 }],
    moves: 15,
    config: {}
}
```

---

## 五、配置方法

### 方法 1：改 `js/config/levels.js`（内置关卡）

在 `BUILTIN_LEVELS` 数组里加新关卡：

```javascript
const BUILTIN_LEVELS = [
    // ... 已有
    {
        id: 'level-006',
        name: '我的新关卡',
        // ...
    }
];
```

**效果**：**刷新页面**就能在关卡列表看到（带"内置"标签）。

### 方法 2：用编辑器保存（自定义关卡）

1. **管理员模式**下摆好棋盘
2. **左侧面板**填"关卡名称"
3. **点"保存为关卡"**
4. **自动存入 `localStorage`**（带"自定义"标签）

**注意**：
- 内置关卡**不可覆盖**，保存时会**另存为新关卡**
- 自定义关卡**可以删除**

### 方法 3：手动导入/导出（高级）

**导出**：

```javascript
// 控制台执行，复制输出
JSON.stringify(__gameEngine.configLoader.getLevels(), null, 2)
```

**导入**：

```javascript
// 控制台执行
const level = { /* 你的关卡 JSON */ };
const levels = JSON.parse(localStorage.getItem('candy_levels_v7') || '[]');
levels.push(level);
localStorage.setItem('candy_levels_v7', JSON.stringify(levels));
location.reload();
```

---

## 六、常见问题

### Q1：`pieces: null` 时，随机生成的棋子种类有哪些？

**答**：所有 `category: 'piece'` 的元素（排除 `empty`）。

### Q2：`layout` 是 0 的位置，能不能放障碍物或目标物？

**答**：**不建议**。`layout=0` 表示格子不存在，重力下落也会跳过。放上去可能不会被正确处理。

### Q3：目标物（水果）能不能重叠？

**答**：**不能**。重叠会导致 `getTargetAt` 只返回第一个匹配的。

### Q4：障碍物的 `hp` 和元素的 `properties.hp` 有什么关系？

**答**：
- **元素配置的 `properties.hp`** 是**默认值**
- **关卡配置的 `obstacle.hp`** 是**实际值**（会覆盖默认值）
- 如果关卡里不写 `hp`，就用元素配置的默认值

### Q5：`goals: []` 会怎样？

**答**：**无通关条件**，游戏不会判胜负，适合**沙盒/测试关卡**。

### Q6：能不能限制"只能用某种棋子"？

**答**：**当前不支持**。随机生成时会从所有 `piece` 元素里随机。

**如需限制**：可在 `pieces` 里人为指定棋盘，让某些棋子不出现。

### Q7：`goals` 里能不能用自定义目标？

**答**：**能**。在 `js/rules/goals.js` 里注册新目标，然后在关卡里引用。

### Q8：内置关卡能不能修改？

**答**：
- **能改代码**（改 `js/config/levels.js`）
- **不能运行时改**（编辑器会另存为新关卡）

### Q9：覆盖物（overlay）和障碍物（obstacle）有什么区别？

**答**：
- **障碍物**（obstacle）：需要被消除才能露出下方的目标物，一般通过匹配/伤害消除
- **覆盖物**（overlay）：阻挡玩家交换棋子（`blocksMovement: true`），需要通过伤害消除
- **藤蔓**（vine）是 overlay 类别，它会阻止玩家交换它覆盖的格子上的棋子

### Q10：冰的伤害触发机制是什么？

**答**：冰监听 `onCellCleared` 事件，当同格的棋子被消除时（而不是相邻消除），冰会受伤。这意味着：
- 普通匹配消除同格棋子 → 冰受伤
- 特效消除（如炸弹）→ 冰不受影响（除非特效也覆盖了该格）

---

## 七、字段速查表

| 字段路径 | 类型 | 必填 | 默认 |
|---------|------|------|------|
| `id` | string | ✅ | - |
| `name` | string | ✅ | - |
| `description` | string | ❌ | `''` |
| `board.rows` | number | ✅ | - |
| `board.cols` | number | ✅ | - |
| `board.layout` | number[][] | ❌ | 全 1 |
| `pieces` | array \| null | ❌ | `null` |
| `targets[].element` | string | ✅ | - |
| `targets[].r/c/w/h/hp` | number | 部分 | 1 |
| `obstacles[].element` | string | ✅ | - |
| `obstacles[].r/c/hp` | number | 部分 | 1 |
| `overlays[].element` | string | ✅ | - |
| `overlays[].r/c/w/h/hp` | number | 部分 | 1 |
| `goals[].type` | string | ✅ | - |
| `moves` | number | ✅ | 30 |
| `config.matchLength` | number | ❌ | 3 |
| `config.enableSquare` | boolean | ❌ | true |
| `config.enableDiagonal` | boolean | ❌ | false |
| `config.enableDrag` | boolean | ❌ | true |
| `config.enableTimeLimit` | boolean | ❌ | false |
| `config.timeLimitSeconds` | number | ❌ | 90 |
| `config.baseScore` | number | ❌ | 10 |
| `config.comboMultiplier` | boolean | ❌ | true |
| `config.gravitySpeed` | number | ❌ | 1.0 |

---

## 八、元素 id 参考

**当前内置元素**（`js/config/elements.js`）：

| 类别 | 元素 id |
|------|---------|
| **棋子** | `fox`, `owl`, `cat`, `chick`, `bear`, `frog`, `octopus` |
| **目标物** | `watermelon`, `grape`, `lemon`, `orange`, `strawberry` |
| **障碍物** | `ice`, `chain` |
| **覆盖物** | `vine` |
| **特效** | `line-horizontal`, `line-vertical`, `bomb`, `square-effect`, `rainbow`, `rainbow-plus` |
| **特殊** | `empty`（空占位） |

**自定义元素**：在编辑器里新建，或改 `js/config/elements.js`。
