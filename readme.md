# 糖果消消乐 v7 - 规则驱动的消消乐游戏引擎

> 一个基于浏览器运行的规则驱动消消 le 游戏引擎，支持多种匹配规则、特效合成、双特效交换、多层棋盘等高级功能。

## 🎮 项目特点

- **规则驱动架构**：所有游戏内容（棋子、特效、障碍、关卡）都以纯 JSON 定义，无需修改引擎代码即可扩展
- **零构建依赖**：直接打开 `index.html` 即可运行，无需打包工具
- **双模式支持**：游戏模式（玩家游玩）+ 管理员模式（关卡设计）
- **丰富特效系统**：直线、彩虹、炸弹、方块等多种特效及其组合
- **多层棋盘**：支持布局层、目标物层、障碍物层、覆盖物层、棋予层
- **完整测试覆盖**：内置 UI 测试运行器，支持 Node.js 和浏览器环境

## 📁 项目结构

```
dsagent2/
├── v3/                    # v3 版本（当前主版本）
│   ├── index.html         # 游戏入口
│   ├── css/style.css      # 样式
│   ├── js/                # 源代码
│   │   ├── core/          # 核心类（GameEngine, Board, Piece 等）
│   │   ├── systems/       # 系统层（MatchSystem, GravitySystem 等）
│   │   ├── engine/        # DSL 引擎（注册表、解析器、运行时）
│   │   ├── config/        # 配置层（元素、关卡、规则）
│   │   ├── rules/         # 词表层（动作、事件、选择器等）
│   │   ├── ui/            # UI 层
│   │   ├── assets/        # 资源层（SVG 库）
│   │   └── utils/         # 工具层
│   ├── test/              # 测试套件
│   └── doc.md             # 项目导读
├── v4/                    # v4 版本（开发中）
├── docs/                  # 文档中心
│   ├── index.html         # 文档入口
│   ├── design.html        # 设计说明
│   ├── test-plan.html     # 测试计划
│   ├── user-guide.html    # 使用手册
│   └── dsagent2-v3.md     # 工程结构分析
└── readme.md              # 本文件
```

## 🚀 快速开始

### 运行游戏

1. 克隆项目到本地
2. 打开 `v3/index.html`（直接用浏览器打开）
3. 开始游戏！

### 运行测试

```bash
# Node.js 环境
cd v3
npm test

# 或直接在浏览器打开
open test/index.html
```

## 🎯 核心功能

### 匹配规则
- 直线匹配（水平/垂直 ≥3连）
- 田字匹配（2×2 同色）
- 斜线匹配（可选启用）

### 特效系统
| 形状 | 特效 | 效果 |
|------|------|------|
| 直线 4连 | line-horizontal/vertical | 消除整行/列 |
| 直线 ≥5连 | rainbow | 消除所有同色棋子 |
| 田字 | square-effect | 消除 3×3 范围 |
| T形/L形 | bomb | 消除 3×3 范围 |

### 双特效交换
- line + line → 十字清除
- line + bomb → 三行三列清除
- bomb + bomb → 5×5 全屏清除
- rainbow + 任意 → 全屏清除

### 障碍物与覆盖物
| 类型 | 类别 | 触发方式 | 说明 |
|------|------|----------|------|
| ice | obstacle | onCellCleared | 同格棋子消除时受伤 |
| chain | obstacle | onAdjacent | 相邻任意消除时受伤 |
| vine | overlay | onAdjacent + blocksMovement | 阻挡移动 + 相邻伤害 |

### 目标物
- watermelon（西瓜 2×2）
- grape、lemon、orange、strawberry（水果 1×1）

## 🛠️ 配置说明

### 预设模式
- `classic` - 经典模式（8×8，30步）
- `timed` - 限时挑战（8×8，60秒）
- `relaxed` - 休闲模式（8×8，50步）
- `expert` - 专家模式（10×10，20步）

### 自定义关卡
在管理员模式下：
1. 配置棋盘和目标
2. 填写关卡名称
3. 点击"保存为关卡"
4. 关卡自动保存到 localStorage

## 📚 文档

- [设计说明](docs/design.html) - 项目架构与设计原则
- [测试计划](docs/test-plan.html) - 完整测试用例
- [使用手册](docs/user-guide.html) - 玩家操作指南
- [工程结构分析](docs/dsagent2-v3.md) - 开发者参考

## 🔧 扩展开发

### 新增元素
编辑 `v3/js/config/elements.js`，添加新的元素配置即可，无需修改引擎。

### 新增关卡
编辑 `v3/js/config/levels.js`，在 `BUILTIN_LEVELS` 数组中添加新关卡。

### 新增动作/事件/选择器
编辑对应的 `v3/js/rules/*.js` 文件，注册新的词表即可。

## 📄 License

MIT License

## 👥 作者

陈晟威

## 🙏 致谢

- 基于经典消消 le 玩法
- 使用 SVG 素材
- 感谢所有测试用户
