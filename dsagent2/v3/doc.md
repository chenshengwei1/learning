# 糖果消消乐 v7 · 项目导读提示词

> **用途**：把这份文档连同代码一起给其他大模型（或新加入的开发者），让对方**不需要通读全部代码**，就能快速理解项目结构、定位修改点。

---

## 一、项目定位

这是一个**规则驱动的消消乐游戏引擎**。核心设计原则：

- **引擎无业务**：`js/core/GameEngine.js` 及 `js/systems/*` 不包含任何具体游戏内容（不出现"冰"、"狐狸"、"直线特效"这类字眼）
- **内容全配置**：所有游戏内容（棋子、特效、障碍、关卡）都以 **纯 JSON** 定义在 `js/config/*` 中
- **策划可用**：新增元素、新增关卡、修改行为，**不需要改引擎代码**
- **注册表驱动**：动作、事件、选择器、条件、目标都是"词"，通过注册表管理，可动态扩展
- **零构建**：不使用 ES Module、不使用打包工具，直接 `file://` 打开 `index.html` 即可运行

---

## 二、目录结构

```
项目根目录/
├── index.html                  # 入口，按顺序加载所有 JS
├── css/
│   └── style.css               # 全局样式
├── js/
│   ├── utils/                  # 工具层（无依赖）
│   │   ├── constants.js        # 全局常量、默认配置、枚举
│   │   ├── helpers.js          # 通用工具函数（posToKey/clamp/sleep等）
│   │   ├── cache.js            # SimpleCache（LRU缓存）
│   │   └── seeded-random.js    # SeededRandom（可重现随机数）
│   │
│   ├── assets/                 # 资源层
│   │   └── svg-library.js      # 所有 SVG 素材（内联，Data URI）
│   │
│   ├── engine/                 # 引擎核心（词表 + DSL）
│   │   ├── registries/         # 注册表（6个）
│   │   │   ├── ActionRegistry.js       # 动作词表
│   │   │   ├── EventRegistry.js        # 事件词表
│   │   │   ├── SelectorRegistry.js     # 选择器词表
│   │   │   ├── ConditionRegistry.js    # 条件词表
│   │   │   ├── ElementRegistry.js      # 元素库
│   │   │   ├── GoalRegistry.js         # 目标词表
│   │   │   └── index.js                # 统一入口 Registries 类
│   │   ├── dsl/                # 声明式 DSL 解析
│   │   │   ├── VariableResolver.js     # 解析 $r/$c/$color 变量
│   │   │   ├── ExpressionParser.js     # 解析选择器/条件/动作
│   │   │   └── ConfigValidator.js      # 校验配置合法性
│   │   └── runtime/            # 运行时
│   │       ├── EventBus.js             # 发布订阅
│   │       └── RuleRuntime.js          # 规则执行器（监听事件→执行动作）
│   │
│   ├── core/                   # 领域模型
│   │   ├── Piece.js            # 棋子（身份/视觉/属性/特效数据）
│   │   ├── Board.js            # 多层棋盘（底板/目标物/障碍物/覆盖物/棋子）
│   │   ├── ShapeResult.js      # 形状分析结果
│   │   ├── PieceFactory.js     # 棋子工厂
│   │   ├── EventQueue.js       # 事件队列
│   │   └── GameEngine.js       # 游戏引擎（总调度，最核心）
│   │
│   ├── systems/                # 系统层（"物理世界"）
│   │   ├── MatchSystem.js      # 匹配检测 + 形状分析
│   │   ├── GravitySystem.js    # 重力下落
│   │   ├── ScoreSystem.js      # 计分
│   │   ├── GoalSystem.js       # 目标检查
│   │   ├── TimerSystem.js      # 计时
│   │   ├── RenderSystem.js     # 多层渲染 + 动画
│   │   ├── InputSystem.js      # 点击/拖拽输入
│   │   └── SaveSystem.js       # localStorage 读写
│   │
│   ├── rules/                  # 内置词表（扩展词表就在这里加）
│   │   ├── selectors.js        # 14 个选择器
│   │   ├── conditions.js       # 5 个条件
│   │   ├── actions.js          # 15 个动作
│   │   ├── events.js           # 13 个事件
│   │   ├── goals.js            # 6 个目标
│   │   └── index.js            # registerAllBuiltins()
│   │
│   ├── config/                 # 内容层（策划改这里）
│   │   ├── elements.js         # 元素库（棋子/特效/障碍/覆盖物/目标物）
│   │   ├── rules.js            # 规则聚合入口
│   │   ├── levels.js           # 关卡数据
│   │   ├── presets.js          # 预设模式
│   │   ├── creationRules.js    # 合成规则处理器
│   │   ├── swapRules.js        # 双特效交换规则
│   │   └── index.js            # ConfigLoader
│   │
│   ├── ui/                     # UI 层
│   │   ├── HUD.js              # 顶部 HUD
│   │   ├── AdminPanel.js       # 管理员面板
│   │   ├── LevelSelector.js    # 关卡选择
│   │   ├── ElementEditor.js    # 元素编辑器（元数据驱动表单）
│   │   └── ElementList.js      # 元素列表
│   │
│   ├── console-tools.js        # 控制台调试工具
│   └── main.js                 # 入口，装配所有模块
└── assets/                     # 预留（当前用 svg-library.js）
```

---

## 三、核心概念

### 1. 元素（Element）

元素是**游戏内容的最小单位**，定义在 `js/config/elements.js`。有 6 类：

| 类别 | 说明 | 示例 |
|------|------|------|
| `piece` | 普通棋子 | 狐狸、猫头鹰、猫 |
| `effect` | 特效 | 直线、爆炸、彩虹 |
| `obstacle` | 障碍物 | 冰、锁链 |
| `overlay` | 覆盖物（阻挡移动） | 藤蔓 |
| `target` | 目标物 | 西瓜、葡萄 |
| `decoration` | 装饰 | empty（空占位） |

**元素的结构**：

```javascript
{
    id: 'fox',                          // 唯一标识
    name: '狐狸',                        // 显示名
    category: 'piece',                  // 类别
    svg: '@fox',                        // 资源（@ 开头表示用内置库）
    color: '#e63946',
    properties: { hp: 1 },              // 属性（数值）
    events: [                           // 事件响应（行为）
        {
            event: 'onCellCleared',     // 何时（注意：冰改为 onCellCleared）
            when: { direction: 'cross' },// 条件
            actions: [                  // 做什么
                { type: 'damage', targets: {...}, amount: 1 }
            ]
        }
    ]
}
```

**元素事件类型**：

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

### 2. 词表（Vocabulary）

引擎认识的所有"词"分为 5 类，都在 `js/rules/*.js` 中注册：

| 词表 | 数量 | 作用 | 文件 |
|------|------|------|------|
| **选择器** | 14 | "哪些格子" | `selectors.js` |
| **条件** | 5 | "何时满足" | `conditions.js` |
| **动作** | 15 | "做什么" | `actions.js` |
| **事件** | 13 | "什么时候触发" | `events.js` |
| **目标** | 6 | "通关条件" | `goals.js` |

**每个"词"都有两部分**：
- `meta`：元数据（label/description/params），用于**自动生成策划表单**
- 执行逻辑：`resolve`（选择器）/`match`（条件）/`execute`（动作）

### 3. 事件驱动

游戏在关键时刻会**发出事件**，元素可以**监听事件**并执行动作。

### 4. 多层棋盘

`Board` 有 5 层，从下到上：

```
Layer 0: layout    底板（哪些格子存在）
Layer 1: targets   目标物（水果，跨格子）
Layer 2: obstacles 障碍物（冰、锁链，逐格）
Layer 3: grid      棋子（动物，可移动）
Layer 4: overlays  覆盖物（藤蔓，阻挡移动）
```

**关键规则**：
- 消除棋子 → 相邻/同格障碍物受伤 → 障碍物清空 → 水果自动收集
- 藤蔓（overlay）可以阻挡玩家交换棋子（`blocksMovement: true`）

### 5. DSL 变量

配置中的 `$xxx` 是变量，触发时被替换为实际值：

| 变量 | 含义 |
|------|------|
| `$r`, `$c` | 触发位置的行列 |
| `$color` | 触发棋子的颜色（id） |
| `$direction` | 方向（horizontal/vertical） |
| `$shapeResult` | 形状分析结果 |
| `$turn` | 当前回合 |
| `$score` | 当前分数 |

---

## 四、核心流程

### 交换流程

```
用户点击/拖拽
  ↓
InputSystem 捕获 → GameEngine.swap(r1,c1,r2,c2)
  ↓
规则运行时检查：
  - 是否被覆盖物阻挡（vine）
  - 棋子是否被锁定（locked/frozen）
  ↓
预判：是否能产生效果（彩虹+任意/双特效/普通匹配）
  ↓
执行交换动画 → 触发 piece:swapped 事件
  ↓
分支处理：
  ├── 双特效分支：_handleEffectSwap
  │   ├── 匹配 swapRules
  │   ├── 解析目标格子
  │   └── 消除 + 伤害 + 重力
  └── 普通分支：_handleNormalSwap
      └── processMatches()
```

### processMatches 流程（核心）

```
循环：
  ├─ 1. 形状分析 → shapeResult
  ├─ 2. 判断合成 → resolveCreationFromShape()
  ├─ 3. 触发 match:done 事件
  ├─ 4. 计分
  ├─ 5. 消除动画
  ├─ 6. 计算特效生成位置
  ├─ 7. 遍历匹配，收集特效，消除棋子
  ├─ 8. 生成新特效 + 触发 effect:created
  ├─ 9. 发送 adjacent:match（障碍物受伤）
  ├─ 10. 发送 any:match（任意匹配）
  ├─ 11. 触发被消除的特效（连锁）
  ├─ 12. 重力下落
  └─ 13. 检查新匹配 → 继续循环
```

---

## 五、修改定位指南

### 场景 1：修改某个棋子的外观

**位置**：`js/config/elements.js`

**操作**：修改对应元素的 `svg` / `color` / `name`。或打开游戏用"元素编辑器"直接改。

**不需要动引擎。**

### 场景 2：修改某个棋子的行为（如"冰的伤害规则"）

**位置**：`js/config/elements.js` 中对应元素的 `events` 字段

**操作**：修改事件配置，如：
```javascript
events: [{
    event: 'onCellCleared',    // ← 注意：冰已改为 onCellCleared（同格消除时触发）
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

**位置**：`js/config/elements.js`

**操作**：
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
    meta: {
        label: '传送',
        description: '把目标棋子传到另一个位置',
        category: '特殊',
        params: [
            { name: 'from', label: '起点', type: 'selector', required: true },
            { name: 'to',   label: '终点', type: 'selector', required: true }
        ]
    },
    execute: async (game, action, context) => {
        // 实现
    }
});
```

**只改 1 个文件。**

### 场景 8：修改匹配算法（如"支持 3 连斜线"）

**位置**：`js/systems/MatchSystem.js` 中的 `DiagonalMatchRule`，或新增规则类。

**这是引擎逻辑，需要谨慎修改。**

### 场景 9：修改渲染层级（如"给水果加一层光效"）

**位置**：`js/systems/RenderSystem.js` + `js/utils/constants.js` 中的 `RENDER_LAYERS`

**修改渲染层，会影响所有元素。**

### 场景 10：修改重力下落速度

**位置**：
- 全局默认：`js/utils/constants.js` 的 `DEFAULT_CONFIG.gravitySpeed`
- 单关卡：`js/config/levels.js` 中 `config.gravitySpeed`
- 运行时：管理员面板

---

## 六、快速定位表

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

## 七、加载顺序（`index.html`）

**必须严格按这个顺序加载**，否则会报 `xxx is not defined`：

```
1. 工具层          utils/*.js
2. SVG 资源库      assets/svg-library.js
3. 注册表层        engine/registries/*.js
4. DSL 层          engine/dsl/*.js
5. 运行时          engine/runtime/*.js
6. 领域模型        core/Piece.js, Board.js, ShapeResult.js, PieceFactory.js, EventQueue.js
7. 内置词表        rules/selectors.js ... rules/index.js
8. 系统层          systems/*.js
9. 引擎            core/GameEngine.js
10. 配置层         config/*.js
11. UI 层          ui/*.js
12. 入口           main.js
```

**依赖关系**：
- `Piece`, `Board` 不依赖任何引擎
- `RuleRuntime` 依赖 `ExpressionParser` + `EventBus`
- `GameEngine` 依赖所有 systems + rules
- `main.js` 最后

---

## 八、调试技巧

### 控制台常用命令

```javascript
// 查看所有注册的词
__registries__.actions.getAllMeta()
__registries__.events.getAllMeta()
__registries__.selectors.getAllMeta()

// 查看已注册元素
__registries__.elements.getAll()

// 查看当前棋盘状态
__gameEngine.board.get(0, 0)           // 某格棋子
__gameEngine.board.targets             // 所有目标物
__gameEngine.board.obstacles           // 所有障碍物
__gameEngine.board.overlays            // 所有覆盖物

// 手动触发事件
__gameEngine.ruleRuntime.emit('match:done', {...})

// 手动交换
await __gameEngine.swap(0, 0, 0, 1)

// 清空存档
localStorage.clear()
```

### 启动日志

打开页面控制台会输出：

```
✅ 内置词表注册完成
   选择器: 14
   条件: 5
   动作: 15
   事件: 13
   目标: 6
✅ 配置层加载完成
   元素: 22
   关卡: 6
🍬 糖果消消乐 v7 已启动
   棋盘: 8 x 8
```

如果某个数字不对，说明对应的注册表或配置文件有问题。

---

## 九、常见 Bug 定位

| 症状 | 可能原因 | 检查文件 |
|------|---------|---------|
| `xxx is not defined` | 加载顺序错 | `index.html` |
| 棋子渲染不出来 | SVG 路径错 | `svg-library.js` / `RenderSystem.js` |
| 交换无效 | 匹配算法未识别 | `MatchSystem.js` |
| 消除后不生成特效 | 合成规则未匹配 | `creationRules.js` |
| 障碍物不受伤 | 事件未触发 | `GameEngine._emitAdjacentEvents` |
| 关卡加载失败 | 配置格式错 | `levels.js` / `ConfigLoader` |
| 元素编辑器打不开 | 元数据缺字段 | `rules/*.js` 的 meta |
| 表单输入无响应 | 事件绑定丢失 | `ElementEditor.js` |
| 下落动画卡顿 | `gravitySpeed` 太大 | `constants.js` |
| 目标不判定 | 目标配置错 | `goals.js` / `GoalSystem.js` |
| 藤蔓阻挡不了交换 | `blocksMovement` 未设置 | `elements.js` |
| 冰不触发伤害 | 使用了旧事件 `onAdjacent` | `elements.js` |

---

## 十、扩展原则

1. **改内容不改引擎**：99% 的修改都在 `js/config/*` 和 `js/rules/*`
2. **加词不改引擎**：新增动作/事件/选择器/条件/目标，只改 1 个文件
3. **元数据驱动**：每个词必须带 `meta`，编辑器才能自动生成表单
4. **纯 JSON**：所有配置必须可序列化，不能有函数
5. **事件优先**：让元素"监听事件 + 执行动作"，而不是硬编码行为
6. **多层棋盘**：5 层数据结构支持复杂游戏机制

---

**这份文档 + 代码，应该能让任何大模型在 5 分钟内定位到要修改的文件。**
