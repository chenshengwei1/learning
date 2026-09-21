# dsagent2/v3 工程结构分析

> 基于 `v3/js/` 目录的完整文件分析，按层级拆分。

---

## 目录结构总览

```
v3/
├── css/style.css              # 样式
├── index.html                 # 入口 HTML
├── package.json               # 包信息
├── js/
│   ├── main.js                # 主入口（初始化编排）
│   ├── core/                  # 引擎层：核心类
│   │   ├── GameEngine.js      # 游戏引擎主类
│   │   ├── Board.js           # 多层棋盘数据结构
│   │   ├── Piece.js           # 棋子对象
│   │   ├── PieceFactory.js    # 棋子工厂
│   │   ├── ShapeResult.js     # 形状结果
│   │   └── EventQueue.js      # 事件队列
│   ├── systems/               # 系统层：功能子系统
│   │   ├── MatchSystem.js     # 匹配检测
│   │   ├── GravitySystem.js   # 重力系统
│   │   ├── RenderSystem.js    # 渲染系统
│   │   ├── InputSystem.js     # 输入处理
│   │   ├── ScoreSystem.js     # 计分系统
│   │   ├── GoalSystem.js      # 目标判定
│   │   ├── TimerSystem.js     # 计时系统
│   │   └── SaveSystem.js      # 本地存档
│   ├── engine/                # DSL 层
│   │   ├── registries/        # 注册表层（元数据）
│   │   │   ├── index.js       # Registries 聚合入口
│   │   │   ├── ElementRegistry.js
│   │   │   ├── ActionRegistry.js
│   │   │   ├── EventRegistry.js
│   │   │   ├── SelectorRegistry.js
│   │   │   ├── ConditionRegistry.js
│   │   │   └── GoalRegistry.js
│   │   ├── dsl/               # DSL 解析器
│   │   │   ├── ConfigValidator.js
│   │   │   ├── ExpressionParser.js
│   │   │   └── VariableResolver.js
│   │   └── runtime/           # 运行时
│   │       ├── EventBus.js
│   │       └── RuleRuntime.js
│   ├── config/                # 配置层（数据驱动）
│   │   ├── index.js           # ConfigLoader 聚合入口
│   │   ├── elements.js        # 元素库 BUILTIN_ELEMENTS
│   │   ├── levels.js          # 关卡库 BUILTIN_LEVELS
│   │   ├── creationRules.js   # 特效合成规则处理器
│   │   ├── swapRules.js       # 双特效交换规则
│   │   ├── rules.js           # 规则聚合（registerAllBuiltins）
│   │   └── presets.js         # 预设配置
│   ├── rules/                 # 词表层（DSL 注册表填充）
│   │   ├── actions.js         # 内置动作注册
│   │   ├── events.js          # 内置事件注册
│   │   ├── selectors.js       # 内置选择器注册
│   │   ├── conditions.js      # 内置条件注册
│   │   ├── goals.js           # 内置目标注册
│   │   └── index.js           # 统一入口
│   ├── ui/                    # UI 层
│   │   ├── AdminPanel.js      # 管理员面板
│   │   ├── HUD.js             # 顶部状态栏
│   │   ├── LevelSelector.js   # 关卡列表
│   │   ├── ElementEditor.js   # 元素编辑器弹窗
│   │   └── ElementList.js     # 元素分类展示
│   ├── assets/                # 资源层
│   │   └── svg-library.js     # SVG 库
│   └── utils/                 # 工具层
│       ├── helpers.js         # 通用工具函数
│       ├── constants.js       # 全局常量
│       ├── cache.js           # LRU 缓存
│       └── seeded-random.js   # 可重现随机数
```

---

## 一、引擎层（core/）

### 1.1 GameEngine.js — 游戏引擎主类

**概述**：游戏的核心控制器，协调所有系统。负责初始化、回合流程、状态管理、双特效交换。

**对外 API**：

| 方法 | 说明 |
|------|------|
| `init()` | 初始化：创建棋盘、注册匹配规则、稳定化、渲染、启动计时 |
| `swap(r1,c1,r2,c2)` | 执行一次交换（普通 / 双特效分支） |
| `handleCellClick(r,c,ctrlKey)` | 处理点击（含管理员模式多选） |
| `processMatches(matches)` | 处理匹配消除（含合成、连锁、重力、特效触发） |
| `undo()` / `clearHistory()` | 回退 / 清空历史记录 |
| `setMode(mode)` | 切换 admin/game 模式 |
| `applyConfig(config)` | 用新配置重新初始化 |
| `showHint()` / `_findHint()` | 提示功能 |
| `triggerEffect(r,c,piece)` | 手动触发特效 |
| `reshuffle(maxAttempts)` | 棋盘重排（卡死时使用） |

**内部系统依赖**：

```
GameEngine
├── board (Board)
├── pieceFactory (PieceFactory)
├── matchSystem (MatchSystem)
├── gravitySystem (GravitySystem)
├── scoreSystem (ScoreSystem)
├── goalSystem (GoalSystem)
├── timerSystem (TimerSystem)
├── renderSystem (RenderSystem)
├── inputSystem (InputSystem)
├── saveSystem (SaveSystem)
└── ruleRuntime (RuleRuntime)
```

**关键状态字段**：

```javascript
this.score            // 当前分数
this.movesLeft        // 剩余步数
this.comboCount       // 连击次数
this.maxCombo         // 最大连击
this.turn             // 回合数
this.isProcessing     // 是否正在处理中（防重复操作）
this.isGameEnded      // 游戏是否结束
this.mode             // 'admin' | 'game'
this.selected         // 当前选中的棋子 {r,c}
this.selectedCells    // 多选集合 Set<string>（管理员模式）
this.editorMode       // 'single' | 'multi'（编辑器单选/多选模式）
this.history          // 回退历史栈（含棋盘快照 + rngState）
this.rng              // SeededRandom 实例
```

**核心流程 `processMatches`**：

```
1. 形状分析（analyzeShape）
2. 合成判断（resolveCreationFromShape）
3. 触发 match:done 事件
4. 计分
5. 消除动画（animateRemove）
6. 生成新特效（create effect）
7. 触发 adjacent:match 事件（障碍物受伤）
8. 触发被消除特效（triggerEffect 连锁）
9. 重力下落（apply + animateGravityDrop）
10. 连锁匹配检测（循环）
```

**双特效交换流程 `_handleEffectSwap`**：

```
1. 数据层交换 + 渲染
2. 匹配组合规则（_findSwapRule）
3. 构建 context 变量
4. 解析目标格子（targets / each 分支）
5. 应用效果（_applySwapEffect）：消除棋子 → 对障碍物造成伤害 → 重力
6. 消耗步数 + 连锁检查
```

---

### 1.2 Board.js — 多层棋盘数据结构

**概述**：承载 5 层数据（布局 / 目标物 / 障碍物 / 覆盖物 / 棋子），提供统一的 CRUD 接口。

**数据结构**：

| Layer | 字段 | 类型 | 说明 |
|-------|------|------|------|
| 0 | `layout` | `number[][]` | 1=有效格，0=无效格（异形棋盘） |
| 1 | `targets` | `Array<{id,element,r,c,w,h,hp,maxHp}>` | 可跨格子的目标物（水果等） |
| 2 | `obstacles` | `Array<{id,element,r,c,hp,maxHp,layers}>` | 逐格的障碍物（冰、藤蔓） |
| 3 | `grid` | `any[][]` | 棋子网格，null 表示空 |
| 4 | `overlays` | `Array<{id,element,r,c,w,h,hp}>` | 覆盖层（藤蔓等阻挡移动的物体） |

**关键 API**：

```javascript
board.get(r, c)            // 获取棋子
board.set(r, c, piece)     // 设置棋子
board.swap(r1,c1,r2,c2)    // 交换两个格子
board.isInBounds(r, c)     // 边界检测
board.isCellActive(r, c)   // 格子是否有效（layout=1）
board.getAdjacent(r, c, opts)  // 相邻格子（可选对角）
board.hasBlockingOverlay(r, c) // 是否有阻挡移动的覆盖物

// 目标物
board.addTarget(target)
board.getTargetAt(r, c)
board.damageTargetAt(r, c, amount)
board.isAllTargetsCleared()

// 障碍物
board.addObstacle(obstacle)
board.getObstacleAt(r, c)
board.damageObstacleAt(r, c, amount)  // 返回 {removed, obstacle}
board.removeObstacleAt(r, c)

// 通用层（支持 target/obstacle/overlay）
board.getAt(category, r, c)
board.damageAt(category, r, c, amount)
board.removeAt(category, r, c)

// 获取某格所有实体（从上到下）
board.getEntitiesAt(r, c)   // [{category, entity}, ...]
```

**序列化支持**：

```javascript
Board.serialize()   // → {rows, cols, layout, grid, targets, obstacles, overlays}
Board.deserialize(obj)  // 静态方法，重建 Board
```

---

### 1.3 Piece.js — 棋子对象

**概述**：单一棋子的完整描述，包含视觉、属性、状态数据、元数据。

**数据结构**：

```javascript
{
  id: string,          // 唯一标识（如 'fox', 'line-horizontal'）
  element: string,     // 元素 id（同 id，语义上用于事件匹配）
  effect: string|null, // 特效类型（如 'line-horizontal', 'bomb'）
  visual: {
    svg, image, char, color,
    pattern, patternColor, pieceColor,
    borderColor, borderWidth
  },
  attrs: { locked: 0, frozen: 0, ... },  // 数值属性
  stateData: { direction, color, ... },   // 状态数据
  metadata: { ... }                         // 扩展元数据
}
```

**关键方法**：

```javascript
piece.isRemovable()  // 未被 locked → 可被消除
piece.isSwappable()  // 未被 locked && 未被 frozen → 可被交换
piece.isEffect()     // 有 effect 字段 → 是特效棋子
piece.clone()        // 深拷贝
piece.serialize()    // 序列化为纯对象
```

---

### 1.4 PieceFactory.js — 棋子工厂

**概述**：从 ElementRegistry 创建 Piece 实例。

**API**：

```javascript
factory.create(elementId)          // 从注册表创建普通棋子
factory.random()                   // 随机创建棋子（使用 SeededRandom）
factory.createEffect(elementId, opts)  // 创建特效棋子（带 direction/color）
factory.deserialize(obj)           // 反序列化
factory.getAllPieceIds()           // 获取所有棋子 id 列表
```

---

### 1.5 ShapeResult.js — 形状结果

**概述**：记录一次匹配的形状信息，用于合成判断。

**数据结构**：

```javascript
{
  shape: SHAPES.LINE | SQUARE | T_SHAPE | L_SHAPE | CROSS | BIG_T | COMPLEX,
  direction: DIRECTIONS.HORIZONTAL | VERTICAL | null,
  length: number,              // 匹配格子数
  positions: [{r,c}, ...],     // 所有匹配位置
  center: {r, c},              // 中心位置
  color: string,               // 颜色（第一个棋子的 id）
  extra: { line: [...], intersection: {r,c}, ... }  // 形状详情
}
```

---

### 1.6 EventQueue.js — 事件队列

**概述**：简单 FIFO 队列，用于 RuleRuntime 的事件缓冲。

**API**：

```javascript
queue.push(event)       // 入队（附 timestamp）
queue.shift()           // 出队
queue.length            // 当前长度
queue.peekAll()         // 查看但不删除
queue.hasPending()      // 是否有待处理事件
queue.clear()           // 清空
```

---

## 二、系统层（systems/）

### 2.1 MatchSystem.js — 匹配检测

**职责**：检测棋盘上所有可消除的组合，支持缓存加速。

**注册规则**（priority 越高越先执行）：

| 规则类 | 说明 |
|--------|------|
| `LineMatchRule` | 直线检测（水平 / 垂直 ≥ 3 连） |
| `SquareMatchRule` | 田字检测（2×2 同色） |
| `DiagonalMatchRule` | 斜线检测 |

**对外 API**：

```javascript
matchSystem.registerRule(rule)
matchSystem.clearRules()
matchSystem.clearCache()              // 棋盘变化后必须调用
matchSystem.findMatches()             // → Set<"r,c">
matchSystem.analyzeShape(matches)     // → ShapeResult | null
matchSystem.detectShape(positions)    // 底层形状检测
```

**形状检测优先级**：直线 → 大T → T形 → L形 → 十字 → 田字 → 复杂

---

### 2.2 GravitySystem.js — 重力系统

**职责**：将空格上方的棋子向下掉落，空位顶部生成新棋子。

**返回结构**：

```javascript
{
  changed: Set<"r,c">,    // 发生变化的格子
  drops: [
    {
      from: {r,c}, to: {r,c},
      piece: Piece,
      isNew: boolean,     // true = 新棋子
      distance: number
    }
  ]
}
```

**关键行为**：
- 只处理 `layout[r][c] === 1` 的有效格子
- 从底部向上填棋子，顶部空格补新棋子
- 支持异形棋盘（layout=0 的位置不参与重力）

---

### 2.3 RenderSystem.js — 渲染系统

**职责**：将 Board 数据渲染为 DOM，支持局部更新。

**分层渲染（z-index）**：

| z-index | Layer | 内容 |
|---------|-------|------|
| 0 | BOARD | 底板格子 |
| 1 | TARGET | 目标物（水果） |
| 2 | OBSTACLE | 障碍物（冰、藤蔓） |
| 3 | PIECE | 棋子 |
| 4 | EFFECT | 特效覆盖层 |
| 5 | OVERLAY | 弹层 |

**对外 API**：

```javascript
renderSystem.init(boardEl)           // 绑定容器 + 应用棋盘尺寸
renderSystem.renderAll()             // 全量重绘
renderSystem.renderPartial(keys)     // 局部重绘（keys: Set<"r,c">）
renderSystem.getCell(r, c)           // 获取 DOM 元素
renderSystem.animateSwap(r1,c1,r2,c2)  // 交换动画
renderSystem.animateRemove(keys)     // 消除动画
renderSystem.animateGravityDrop(drops) // 重力下落动画
renderSystem.renderLayerAt(category, r, c) // 重绘指定层的单个实体
```

**cellCache**：`Map<"r,c", DOMElement>`，用于快速查找格子的 DOM。

---

### 2.4 InputSystem.js — 输入系统

**职责**：处理鼠标/触摸事件，区分点击、拖动交换、框选。

**事件绑定**：

```javascript
inputSystem.bindCell(cell, r, c)
```

**交互逻辑**：
- `pointerdown` → 记录起始坐标，进入拖拽检测
- `pointermove` → 超过阈值后标记为 dragging
- `pointerup` → 判断是拖动交换还是点击选中
- 管理员多选模式（`editorMode='multi'`）→ 框选行为

**框选**：
- 创建 `#selection-box` div 跟随鼠标
- `pointermove` / `pointerup` 全局监听计算覆盖格子
- 通过 `ctrlKey` 切换多选/单选

---

### 2.5 ScoreSystem.js — 计分系统

**计算公式**：

```
score = matchCount * baseScore
       * comboMultiplier（combo>1 时乘 comboCount）
       * 2（special=true 时，合成特效额外加成）
       + bonus（额外加分）
```

**配置字段**：`baseScore`（默认 10）、`comboMultiplier`（默认 true）

---

### 2.6 GoalSystem.js — 目标系统

**职责**：根据关卡目标配置，判断胜负。

**目标检查流程**：

```javascript
goalSystem.setGoals(goals)   // 设置目标（每关调用一次）
goalSystem.check()           // → {status: 'win'|'lose'|'continue', results: [...]}
goalSystem.getProgress()     // → [{type, label, progress, achieved}]
```

**胜利条件**：任意目标达成 → win；失败条件触发 → lose。

---

### 2.7 TimerSystem.js — 计时系统

**API**：

```javascript
timerSystem.start(seconds)   // 启动倒计时（每秒 emit timer:tick）
timerSystem.stop()           // 停止
timerSystem.pause() / resume()
timerSystem.reset(seconds)
```

**事件**：`timer:tick`（每秒）、`timer:expired`（归零时）

---

### 2.8 SaveSystem.js — 本地存档

**存储键**（localStorage）：

| Key | 内容 |
|-----|------|
| `candy_config_v7` | 当前配置 |
| `candy_levels_v7` | 自定义关卡列表 |
| `candy_elements_v7` | 自定义元素 |
| `candy_version_v7` | 版本标记 |

**API**：

```javascript
saveSystem.saveConfig(config)
saveSystem.loadConfig()
saveSystem.saveLevels(levels)
saveSystem.loadLevels()
saveSystem.saveElements(elements)
saveSystem.loadElements()
```

---

## 三、DSL 层（engine/）

### 3.1 注册表层（registries/）

**概述**：6 个注册表的聚合容器 `Registries`，每个注册表存储一类 DSL 元数据。

#### Registries（index.js）

```javascript
const registries = new Registries();
// 包含：actions, events, selectors, conditions, elements, goals
registries.getAllMeta()  // 返回所有注册表的 meta（用于编辑器表单生成）
registries.clearAll()    // 清空全部
```

#### ElementRegistry

存储 `Map<id, elementConfig>`，支持按 category 过滤。

```javascript
elementRegistry.register(element)
elementRegistry.get(id)
elementRegistry.getByCategory(category)
elementRegistry.getAll()
```

**元素结构**：

```javascript
{
  id: string,
  name: string,
  category: 'piece'|'effect'|'obstacle'|'target'|'generator'|'decoration',
  svg: string|null,
  visual: {...},
  properties: {...},           // 数值属性（如 hp）
  events: [{event, when, actions}],
  visualResolver: {by, map}    // 多态视觉（如冰的 HP 变化 SVG）
}
```

#### ActionRegistry

存储 `Map<type, {meta, validate, execute})`。

**动作执行签名**：`execute(game, action, context) => Promise<void>`

#### EventRegistry

存储 `Map<type, {meta, match(config, event) => bool})`。

**事件匹配函数**决定元素是否响应某事件。

#### SelectorRegistry

存储 `Map<type, {meta, resolve(board, params, context) => Set<"r,c">})`。

**内置选择器类型**：`row`、`col`、`area`、`all`、`cell`、`self`、`sameColor`

#### ConditionRegistry

存储 `Map<type, {meta, match(params, data) => bool})`。

#### GoalRegistry

存储 `Map<type, {meta, check(game, goal) => bool, progress(game, goal) => {current,target}}}`。

---

### 3.2 DSL 解析器（dsl/）

#### ConfigValidator.js

校验元素和关卡配置，返回 `{valid, errors, warnings}`。

**校验规则**：
- 元素：必须有 `id`、`category`，事件类型必须在 EventRegistry 中
- 关卡：必须有 `id`、`board`（含 `rows`/`cols`）

#### ExpressionParser.js

解析 DSL 中的表达式（选择器、条件、动作）。

```javascript
parser.resolveSelector(config, board, context)  // 解析选择器 → Set<"r,c">
parser.matchCondition(config, data)             // 解析条件 → bool
parser.executeAction(action, context)           // 执行动作
```

支持简写：`'self'`、`'all'`、`'sameColor'`

#### VariableResolver.js

递归解析配置中的变量（`$r`、`$c` 等）。

```javascript
VariableResolver.resolve(value, context)     // 单值
VariableResolver.resolveDeep(obj, context)   // 深度递归
VariableResolver.isVariable(value)           // 判断是否是变量
```

---

### 3.3 运行时（runtime/）

#### EventBus.js

发布/订阅事件总线。

```javascript
bus.on(event, callback)       // 订阅（返回取消监听函数）
bus.once(event, callback)     // 一次性订阅
bus.off(event, callback)      // 取消订阅
bus.emit(event, data)         // 异步触发
bus.emitSync(event, data)     // 同步触发
bus.clear(event?)             // 清空指定或全部事件
```

#### RuleRuntime.js

规则运行时引擎，连接 EventBus + EventQueue + 元素监听器。

**初始化流程**：
1. 遍历所有元素，按 `event` 类型建立监听器索引 `this.listeners`
2. `emit(type, data)` 将事件入队
3. `flush()` 逐个出队处理，先执行元素监听器，再触发 EventBus

**事件匹配逻辑**：
- 注册事件 `onRemove` 匹配触发事件 `piece:removed`
- 源元素过滤：`piece:removed` 只响应来源棋子的元素 + 障碍物/生成器
- `adjacent:match` 只响应障碍物元素
- `cell:cleared` 只响应障碍物元素

---

## 四、配置层（config/）

### 4.1 index.js — ConfigLoader

**职责**：加载元素和关卡配置，提供关卡查询接口。

```javascript
configLoader.loadAll()           // 加载元素 + 关卡
configLoader.getLevels()         // 内置 + 自定义
configLoader.getLevel(id)        // 单个关卡
configLoader.levelToConfig(level) // 将关卡转为 GameEngine config
```

**元素加载**：优先从 localStorage 读取，无则使用 `BUILTIN_ELEMENTS`。

**关卡加载**：内置关卡永远是 `BUILTIN_LEVELS`，自定义关卡来自 localStorage。

---

### 4.2 elements.js — 元素库

**元素分类**（`ELEMENT_CATEGORIES`）：

| 分类 | 说明 | 示例 |
|------|------|------|
| `piece` | 普通棋子（可移动） | fox, owl, cat, chick, bear, frog, octopus |
| `target` | 目标物（被保护的水果） | watermelon, grape, lemon, orange, strawberry |
| `obstacle` | 障碍物（需要消除的冰、藤蔓） | ice, vine, chain |
| `overlay` | 覆盖物（阻挡移动） | vine |
| `effect` | 特效棋子 | line-horizontal, line-vertical, bomb, rainbow, square-effect |

**元素事件格式**：

```javascript
{
  event: 'onRemove' | 'onAdjacent' | 'onObstacleCleared' | 'onCellCleared' | 'onAnyMatch',
  when: { direction: 'cross', source: 'match' },  // 可选
  actions: [{ type, targets, amount, layer }]
}
```

**特殊机制**：
- `visualResolver`：根据 `hp` 字段切换 SVG（冰有 3 级形态）
- 目标物的 `onObstacleCleared` 事件：障碍物消除时对下方目标物造成伤害
- `overlay` 类别的障碍物可以设置 `blocksMovement: true` 阻止玩家交换棋子

**注意事项**：
- 藤蔓（vine）已从 `obstacle` 类别移至 `overlay` 类别
- 冰（ice）的伤害触发已从 `onAdjacent` 改为 `onCellCleared`
- 空白格（empty）已改为 `decoration` 类别

---

### 4.3 levels.js — 关卡库

**关卡结构**：

```javascript
{
  id: string,
  name: string,
  description: string,
  board: {
    rows: number,
    cols: number,
    layout: number[][]   // 1=有效格
  },
  pieces: number[][] | null,  // null=随机填充，非 null=人为指定
  targets: Array<{r,c,w,h,element,hp}>，
  obstacles: Array<{r,c,element,hp}>，
  overlays: Array<{r,c,w,h,element,hp}>，  // ← 新增：覆盖物
  goals: Array<{type, value}>，
  moves: number,
  config: {...}
}
```

**内置关卡**：
- `sandbox`：沙盒测试，9999步，无目标
- `level-001`：教学关卡，30步，目标分 5000
- `level-002`：水果收集，经典关卡（含冰覆盖水果 + 中间藤蔓）
- `level-003`：捕猎狐狸，消除 30 只狐狸
- `level-004`：限时挑战，60秒内 10000 分
- `level-005`：固定布局，6×6 异形棋盘

---

### 4.4 creationRules.js — 特效合成规则处理器

**职责**：根据形状分析结果，决定生成什么特效棋子。

**规则格式**：

```javascript
{
  id: string,
  when: { shape, length, minLength, maxLength, direction },
  create: string,           // 生成什么特效
  place: 'middle'|'intersection'|'random'|'first',
  preserve: ['direction', 'color']  // 传递的属性
}
```

**核心函数**：

```javascript
resolveCreationFromShape(game, shapeResult, matches) → {create, place, preserve} | null
resolveCreationPosition(place, shapeResult, game) → {r, c}
resolveCreationData(preserve, shapeResult, matches) → {direction, color}
```

---

### 4.5 swapRules.js — 双特效交换规则

**职责**：定义双特效交换时的组合效果。

**规则格式**：

```javascript
{
  id: string,
  when: { p1Effect, p2Effect, condition },
  effect: { targets: [selector...], damage: number }
}
```

**condition 可选值**：`sameRow`、`diffRow`、`sameCol`、`diffCol`

**内置规则组合**：

| 组合 | 条件 | 效果 |
|------|------|------|
| line-h + line-h | sameRow | 整行消除，伤害2 |
| line-h + line-h | diffRow | 两行各消除，伤害1 |
| line-v + line-v | sameCol | 整列消除，伤害2 |
| line-v + line-v | diffCol | 两列各消除，伤害1 |
| line-h + line-v | — | 十字清除（行+列） |
| line + bomb | — | 三行三列范围清除 |
| bomb + bomb | — | 5×5 范围全屏消除 |
| rainbow + 任意 | — | 全屏清除 |
| fallback | — | 各自触发（each） |

---

### 4.6 presets.js — 预设配置

| 预设 | 说明 | rows×cols | moves | timeLimit |
|------|------|-----------|-------|-----------|
| `classic` | 经典模式 | 8×8 | 30 | 关 |
| `timed` | 限时挑战 | 8×8 | 999 | 60s |
| `relaxed` | 休闲模式 | 8×8 | 50 | 关 |
| `expert` | 专家模式 | 10×10 | 20 | 关 |

---

### 4.7 rules.js — 规则聚合入口

统一调用 `registerAllBuiltins(registries)` 注册所有内置词表（actions、events、selectors、conditions、goals）。

---

## 五、词表层（rules/）

### 5.1 actions.js — 内置动作

| 动作类型 | 说明 | 关键参数 |
|----------|------|----------|
| `remove` | 消除棋子 | `targets`（选择器） |
| `damage` | 造成伤害 | `targets`, `amount`, `layer` |
| `convert` | 转化棋子 | `targets`, `to`（目标元素） |
| `spawn` | 生成棋子 | `targets`, `element` |
| `trigger` | 触发特效 | `targets` |
| `wait` | 等待 | `ms` |
| `collect` | 收集目标物 | `targets` |
| `addScore` | 加分 | `amount` |
| `scorePerTarget` | 按目标计分 | `targets`, `perUnit` |
| `if` | 条件分支 | `condition`, `then`, `else` |
| `repeat` | 循环执行 | `times`, `actions` |
| `randomPick` | 随机选一个 | `options` |
| `setVar` | 设置变量 | `name`, `value` |
| `log` | 调试日志 | `message` |
| `updateHUD` | 刷新界面 | — |

**damage 动作的 layer 参数**：
- `obstacle`：伤害障碍物（默认）
- `target`：伤害目标物（跳过障碍物保护）
- `overlay`：伤害覆盖物（新增）
- `piece`：伤害棋子 HP（修改 attrs.hp）

---

### 5.2 events.js — 内置事件

| 事件类型 | 匹配触发事件 | 说明 |
|----------|-------------|------|
| `onMatch` | `match:done` | 匹配完成 |
| `onRemove` | `piece:removed` | 棋子被消除 |
| `onSwap` | `piece:swapped` | 棋子交换 |
| `onAdjacent` | `adjacent:match` | 相邻消除 |
| `onObstacleCleared` | `obstacle:cleared` | 障碍物消除 |
| `onCellCleared` | `cell:cleared` | 所在格棋子被消除 |
| `onAnyMatch` | `any:match` | 任意位置匹配 |
| `onTurn` | `turn:end` | 回合结束 |
| `onLand` | `piece:landed` | 棋子落地 |
| `onCreate` | `effect:created` | 特效生成 |
| `onChain` | `chain:triggered` | 连锁触发 |
| `onGameStart` | `game:start` | 游戏开始 |
| `onGameEnd` | `game:end` | 游戏结束 |

---

### 5.3 selectors.js — 内置选择器

| 选择器类型 | 参数 | 说明 |
|------------|------|------|
| `cell` | `r`, `c` | 单格 |
| `row` | `r` | 整行 |
| `col` | `c` | 整列 |
| `cross` | `r`, `c` | 十字（行+列） |
| `area` | `r`, `c`, `radius`, `diagonal` | 圆形/方形区域 |
| `all` | — | 全棋盘 |
| `sameColor` | `color` | 同色棋子 |
| `sameElement` | `element` | 同类型棋子 |
| `random` | `count`, `filter` | 随机 N 个 |
| `adjacent` | `r`, `c`, `diagonal` | 相邻格子 |
| `obstacles` | `element` | 所有障碍物 |
| `targets` | `element` | 所有目标物 |
| `inShape` | — | 匹配形状内 |
| `varCell` | `var` | 变量位置 |

---

### 5.4 conditions.js — 内置条件

| 条件类型 | 说明 |
|----------|------|
| `sameRow` | 同行 |
| `diffRow` | 不同行 |
| `sameCol` | 同列 |
| `diffCol` | 不同列 |
| `atLeast` | 至少 N 个 |

---

### 5.5 goals.js — 内置目标

| 目标类型 | 检查逻辑 |
|----------|----------|
| `score` | 分数 ≥ value |
| `collect` | 收集 N 个指定元素 |
| `collectAll` | 收集所有目标物 |
| `eliminate` | 消除 N 个指定元素 |
| `movesLeft` | 剩余步数 ≥ min |
| `timeLeft` | 剩余时间 ≥ min |

---

## 六、UI 层（ui/）

### 6.1 AdminPanel.js — 管理员面板

**职责**：管理员模式下的配置调整面板。

**绑定 DOM ID**：
- `admin-total-moves`、`admin-target-score`、`admin-target-score-enabled`
- `admin-enable-time-limit`、`admin-time-limit-seconds`、`admin-level-name`
- `admin-level-list`

**关键方法**：
```javascript
adminPanel.init()                    // 绑定事件 + 同步表单
adminPanel.refresh()                 // 刷新关卡列表
adminPanel.showCellEditorForMultiple(keys)  // 打开格子编辑器（多选）
```

---

### 6.2 HUD.js — 顶部状态栏

**同步字段**：score、movesLeft、comboCount、timeLeft、goals

**DOM ID**：`score`、`moves`、`combo`、`time-left`、`goals`

---

### 6.3 LevelSelector.js — 关卡列表

**DOM ID**：`level-list`

**行为**：
- 渲染内置 + 自定义关卡列表
- 点击「开始」→ `game.applyConfig(level)`
- 自定义关卡显示删除按钮

---

### 6.4 ElementEditor.js — 元素编辑器弹窗

**DOM ID**：`element-editor`、`element-editor-content`

**绑定按钮**：
- `element-save-btn`：保存修改
- `element-close-btn`：关闭
- `element-test-btn`：测试预览

---

### 6.5 ElementList.js — 元素分类展示

**DOM ID**：`element-list`

**行为**：
- 按 category 分组展示所有元素
- 点击元素 tile → 打开 ElementEditor

---

## 七、资源层（assets/）

### svg-library.js

**职责**：SVG 字符串库，通过 `@svgName` 引用。

```javascript
SVGLibrary.resolve('@fox')   // → SVG string
SVGLibrary.getAll()          // → 所有 SVG key
```

---

## 八、工具层（utils/）

### 8.1 helpers.js

| 函数 | 说明 |
|------|------|
| `posToKey(r,c)` | 坐标 → `"r,c"` 字符串 |
| `keyToPos(key)` | `"r,c"` → `{r,c}` |
| `deepClone(obj)` | 深拷贝（递归） |
| `debounce(fn, delay)` | 防抖 |
| `clamp(v, min, max)` | 范围限制 |
| `sleep(ms)` | 延迟 Promise |
| `isTransparent(v)` | 判断透明色 |
| `toCssHex(v, fallback)` | 颜色格式转换 |

### 8.2 constants.js

**核心常量**：

```javascript
STORAGE_KEYS = { config, levels, elements, version }
CONFIG_VERSION = '7.0.0'

SHAPES = { LINE, SQUARE, T_SHAPE, L_SHAPE, CROSS, BIG_T, COMPLEX }
DIRECTIONS = { HORIZONTAL, VERTICAL }

ELEMENT_CATEGORIES = { PIECE, EFFECT, OBSTACLE, GENERATOR, TARGET, DECORATION }

RENDER_LAYERS = { BOARD:0, TARGET:1, OBSTACLE:2, PIECE:3, EFFECT:4, OVERLAY:5 }

ANIMATION = { SWAP:250, REMOVE:300, EXPLODE:400, GRAVITY_BASE:400, MESSAGE:1600, HINT:1500 }

LIMITS = { MAX_STABILIZE:100, MAX_RANDOM:50, MAX_CHAIN:50, MAX_LEVELS:500 }

DEFAULT_CONFIG = { rows:8, cols:8, cellSize:60, gap:4, totalMoves:30, ... }
```

### 8.3 cache.js — SimpleCache

LRU 缓存，最大 30 条（MatchSystem 使用）。

```javascript
cache.get(key)    // 命中时移到末尾
cache.set(key, value)  // 满时淘汰最旧
cache.clear()
```

### 8.4 seeded-random.js — SeededRandom

Mulberry32 算法，支持状态保存/恢复，用于可重现的棋盘生成和回退。

```javascript
rng.next()        // [0, 1)
rng.nextInt(max)  // [0, max)
rng.saveState()   // 保存状态（用于 undo）
rng.restoreState(state)
rng.reset(seed)
```

---

## 九、入口（main.js）

**初始化顺序**：

```
1. 创建 Registries
2. registerAllBuiltins(registries)   // 注册所有词表
3. ConfigLoader.loadAll()            // 加载元素 + 关卡
4. 创建 ExpressionParser（挂到 window.__expressionParser__）
5. 确定初始配置（localStorage 优先，否则用 level-002）
6. 创建 GameEngine
7. renderSystem.init(boardEl)
8. 创建 UI 组件（HUD, AdminPanel, LevelSelector, ElementEditor, ElementList）
9. 重写 updateHUD → 同时调用 game.updateHUD() + hud.update()
10. 启动游戏 game.init()
```

---

## 十、关键设计原则

1. **配置驱动**：99% 业务逻辑在 `config/` 和 `rules/`，引擎层保持中性
2. **事件优先**：元素通过 `events[]` 声明行为，而非硬编码
3. **元数据驱动 UI**：注册表的 `meta` 字段供编辑器自动生成表单
4. **纯 JSON 配置**：所有配置可序列化、可持久化、可远程下发
5. **扩展无侵入**：加新动作/事件/选择器/条件/目标 = 注册一个即可，无需改引擎
6. **种子随机**：`SeededRandom` 保证同一局棋盘可重现，支持 undo 恢复随机状态
7. **分层渲染**：6 层 z-index 分离，局部更新不影响其他层
8. **多层棋盘**：5 层数据结构支持复杂游戏机制（布局/目标/障碍/覆盖/棋子）

---

## 十一、修改定位指南

### 场景 1：修改某个棋子的外观

**位置**：`js/config/elements.js`

**操作**：修改对应元素的 `svg` / `color` / `name`。或打开游戏用"元素编辑器"直接改。

**不需要动引擎。**

### 场景 2：修改某个棋子的行为（如"冰的伤害规则"）

**位置**：`js/config/elements.js` 中对应元素的 `events` 字段

**操作**：修改事件配置，如：
```javascript
events: [{
    event: 'onCellCleared',    // ← 注意：冰已改为 onCellCleared
    actions: [{ type: 'damage', amount: 2 }]
}]
```

**不需要动引擎。**

### 场景 3：新增一种障碍物（如"果冻"）

**位置**：`js/config/elements.js`

**操作**：加一段 JSON：
```javascript
{
    id: 'jelly',
    name: '果冻',
    category: 'obstacle',
    svg: '@jelly',       // 需先在 svg-library.js 加
    properties: { hp: 1 },
    events: [{
        event: 'onMatch',
        when: { shapes: ['square'] },
        actions: [{ type: 'damage', amount: 1 }]
    }]
}
```

**不需要动引擎。**

### 场景 4：新增一种覆盖物（如"锁链墙"）

**位置**：`js/config/elements.js`

**操作**：
```javascript
{
    id: 'chain-wall',
    name: '锁链墙',
    category: 'overlay',    // ← 使用 overlay 类别
    svg: '@chain',
    properties: { hp: 3, blocksMovement: true },
    events: [{
        event: 'onAdjacent',
        when: { direction: 'cross', source: 'match' },
        actions: [{ type: 'damage', targets: { type: 'cell', r: '$r', c: '$c' }, amount: 1, layer: 'overlay' }]
    }]
}
```

关卡配置中使用：
```javascript
overlays: [
    { element: 'chain-wall', r: 3, c: 3, hp: 3 }
]
```

### 场景 5：新增一种特效（如"闪电"）

**位置**：`js/config/elements.js` + `js/config/creationRules.js`（如需合成）

**操作**：

`elements.js` 加：
```javascript
{
    id: 'lightning',
    name: '闪电特效',
    category: 'effect',
    svg: null,
    char: '⚡',
    events: [{
        event: 'onRemove',
        actions: [{ type: 'remove', targets: { type: 'area', radius: 2 } }]
    }]
}
```

### 场景 6：新增一个关卡

**位置**：`js/config/levels.js`

**操作**：加一段 JSON，或者用游戏里的"保存为关卡"按钮。**不需要动引擎。**

### 场景 7：新增一种动作（如"传送"）

**位置**：`js/rules/actions.js`

**操作**：加一段注册：
```javascript
A.register('teleport', {
    meta: { label: '传送', description: '把目标棋子传到另一个位置', category: '特殊', params: [...] },
    execute: async (game, action, context) => { /* 实现 */ }
});
```

**只改 1 个文件。**

### 场景 8：修改匹配算法（如"支持 3 连斜线"）

**位置**：`js/systems/MatchSystem.js` 中的 `DiagonalMatchRule`，或新增规则类。

**这是引擎逻辑，需要谨慎修改。**

### 场景 9：修改渲染层级（如"给水果加一层光效"）

**位置**：`js/systems/RenderSystem.js` + `js/utils/constants.js` 中的 `RENDER_LAYERS`

**修改渲染层，会影响所有元素。**

---

## 十二、快速定位表

| 我想…… | 打开文件 |
|--------|---------|
| 改棋子外观 | `js/config/elements.js` |
| 改棋子行为 | `js/config/elements.js` |
| 加新棋子 | `js/config/elements.js` |
| 加新覆盖物 | `js/config/elements.js` |
| 加新特效 | `js/config/elements.js` |
| 加新关卡 | `js/config/levels.js` |
| 改特效合成条件 | `js/config/creationRules.js` |
| 改双特效交换规则 | `js/config/swapRules.js` |
| 改棋盘渲染 | `js/systems/RenderSystem.js` |
| 改匹配算法 | `js/systems/MatchSystem.js` |
| 改重力 | `js/systems/GravitySystem.js` |
| 改计分 | `js/systems/ScoreSystem.js` |
| 改目标检查 | `js/systems/GoalSystem.js` |
| 改输入 | `js/systems/InputSystem.js` |
| 改存档 | `js/systems/SaveSystem.js` |
| 改主流程 | `js/core/GameEngine.js` |
| 改棋盘数据结构 | `js/core/Board.js` |
| 改棋子数据结构 | `js/core/Piece.js` |
| 加新动作词 | `js/rules/actions.js` |
| 加新事件词 | `js/rules/events.js` |
| 加新选择器 | `js/rules/selectors.js` |
| 加新条件 | `js/rules/conditions.js` |
| 加新目标 | `js/rules/goals.js` |
| 改注册表逻辑 | `js/engine/registries/*` |
| 改 DSL 解析 | `js/engine/dsl/*` |
| 改规则运行时 | `js/engine/runtime/RuleRuntime.js` |
| 改 HUD | `js/ui/HUD.js` |
| 改策划编辑器 | `js/ui/ElementEditor.js` |
| 改 SVG 素材 | `js/assets/svg-library.js` |
| 改样式 | `css/style.css` |

---

## 十三、测试层（test/）

### 13.1 目录结构

```
test/
├── harness.js            # 测试脚手架（Node.js vm 沙箱 + 浏览器双环境）
├── assertions.js         # 自定义断言库
├── page-checker.js       # DOM 一致性检测器
├── ui-test-runner.js     # UI 一键测试运行器（17 个场景）
├── run-all.js            # Node.js 测试入口（扫描 suites/*.test.js）
├── index.html            # 浏览器测试页
└── suites/
    ├── 01-match-3.test.js          # 3 消基础测试
    ├── 02-match-4.test.js          # 4 消 → 直线特效
    ├── 03-match-5.test.js          # 5 消 → 彩虹特效
    ├── 04-match-square.test.js     # 田字 → 方块特效
    ├── 05-match-tshape.test.js     # T 形 → 炸弹
    ├── 06-match-lshape.test.js     # L 形 → 炸弹
    ├── 07-swap-line-bomb.test.js   # 双特效：直线+炸弹
    ├── 08-swap-line-line.test.js   # 双特效：直线+直线十字清除
    ├── 09-swap-bomb-bomb.test.js   # 双特效：炸弹+炸弹全屏
    ├── 10-swap-rainbow-line.test.js# 双特效：彩虹+直线
    └── 11-page-check.test.js       # DOM 一致性检查
```

### 13.2 运行方式

```bash
# Node.js 环境
npm test
# 或
node test/run-all.js

# 浏览器环境
# 打开 test/index.html，点击「运行所有测试」
```

---

## 📊 完整架构总结

本项目的分层架构清晰，核心设计原则是**规则驱动、事件优先、配置即内容**：

| 层级 | 职责 | 关键文件 |
|------|------|---------|
| **工具层** | 常量、通用函数、缓存 | `utils/` |
| **资源层** | SVG 字符串库 | `assets/svg-library.js` |
| **注册表层** | 词表注册中心 | `engine/registries/` |
| **DSL 层** | 变量解析、表达式、校验 | `engine/dsl/` |
| **运行时** | 事件总线、规则引擎 | `engine/runtime/` |
| **领域层** | 棋子、棋盘、匹配、重力 | `core/`, `systems/` |
| **词表层** | 内置动作/事件/选择器/条件/目标 | `rules/` |
| **配置层** | 元素/规则/关卡/预设 | `config/` |
| **UI 层** | 管理面板、HUD、编辑器 | `ui/` |
| **测试层** | 单元测试、DOM 一致性 | `test/` |
| **入口** | 组装所有模块，启动游戏 | `main.js` |

**核心一句话**：**先拆分、先读、先诊断、后改、最小改、每步确认。**
