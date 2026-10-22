# dsagent 项目设计文档

## 1. 项目概述

**dsagent** 是一个基于 LangChain/LangGraph 的智能助手 Web 应用，核心功能包括：
- 多轮对话管理（支持会话持久化到 SQLite）
- 流式 AI 响应（基于 DeepSeek API）
- 工具调用系统（文件系统操作、Git、网络请求等）
- MCP（Model Context Protocol）工具集成
- 上下文压缩管理
- 数据库管理接口

**技术栈：**
- 后端：Python + FastAPI + LangChain + LangGraph
- 前端：原生 HTML/CSS/JS（Jinja2 模板）
- 数据库：SQLite（agent_memory.db）
- AI 模型：DeepSeek（通过 langchain_deepseek）

---

## 2. 依赖树 / 模块关系

```
web_server.py (FastAPI 入口)
├── agent_core.py (Agent 核心逻辑)
│   ├── agent_message.py (带元数据的消息类)
│   ├── agent_dump.py (对象序列化)
│   ├── context_manager.py (上下文状态监控)
│   ├── context_compressor.py (消息压缩)
│   ├── prompts.py (系统提示词)
│   ├── tools.py (内置工具集合)
│   ├── agent_eventhandler.py (事件处理)
│   ├── agent_core_middleware.py (中间件)
│   ├── mcp_registry.py (MCP 工具注册)
│   └── skill/registry.py (技能注册中心)
├── db_manager_api.py (数据库管理 API)
│   └── db_manager.py (数据库操作)
├── server_log_manager.py (日志管理)
│   └── agent_log.py (日志系统)
├── visualizer.py (图可视化)
│   └── config/main_graph.yaml (图配置)
├── api_config_editor.py (配置编辑器)
├── exceptionLoggingMiddleware.py (异常中间件)
└── async_logger.py (异步日志)
```

---

## 3. 模块说明

### 3.1 web_server.py - Web 服务入口
- **职责**：FastAPI 应用主入口，定义所有 HTTP 路由
- **关键功能**：
  - 会话管理（sessions 字典）
  - 流式聊天接口 `/api/chat/stream`
  - 非流式聊天接口 `/api/chat`
  - 会话 CRUD 操作
  - MCP 工具预加载

### 3.2 agent_core.py - Agent 核心引擎
- **职责**：LangGraph 图定义、消息处理、工具执行
- **核心组件**：
  - `AgentState`：TypedDict 状态定义
  - `create_agent()`：同步 agent 创建
  - `create_async_agent()`：异步 agent 创建（含子图）
  - `call_model()`：LLM 调用节点
  - `execute_tools()`：工具执行节点
  - `route_tools()`：路由节点（判断是否继续工具调用）

### 3.3 agent_message.py - 消息类扩展
- **职责**：为 LangChain 消息类添加元数据支持
- **关键类**：
  - `MessageMetadataMixin`：混入类，添加 id、created_at 等元数据
  - `HumanMessageWithMeta`, `AIMessageWithMeta`, `ToolMessageWithMeta`, `SystemMessageWithMeta`

### 3.4 context_manager.py - 上下文监控
- **职责**：Token 统计、预警、压缩建议
- **关键函数**：
  - `count_messages_tokens()`：计算消息 Token
  - `get_context_status()`：返回上下文状态（normal/warning/caution/danger）
  - `compress_messages()`：压缩消息（保留最近 N 条）

### 3.5 context_compressor.py - 智能压缩
- **职责**：异常消息过滤 + 上下文压缩
- **关键函数**：
  - `filter_abnormal_conversation()`：过滤错误消息对
  - `compress_with_filter()`：先过滤再压缩

### 3.6 tools.py - 内置工具集
- **职责**：提供文件系统、Git、网络等工具
- **工具列表**：
  - `read_file`, `write_file`, `list_pages`：文件操作
  - `search_in_project`：项目搜索
  - `run_command`：命令执行
  - `check_balance`：API 余额查询
  - `switch_project`：项目切换
  - `git_commit`, `git_status`：Git 操作
  - `ip_location`, `fetch_webpage`：网络查询

### 3.7 mcp_registry.py - MCP 工具注册
- **职责**：异步加载 MCP 工具，提供同步访问接口
- **关键函数**：
  - `get_mcp_tools()`：同步获取工具列表（首次加载）
  - `start_preload()`：后台预加载线程

### 3.8 skill/registry.py - 技能注册中心
- **职责**：扫描 skills 目录，加载 SKILL.md，注册可执行技能
- **关键类**：
  - `Skill`：技能数据结构
  - `SkillRegistry`：技能注册表
  - `get_skill_registry()`：全局单例

---

## 4. 关键流程

### 4.1 启动流程
```
1. init_session_metadata_table() - 初始化 SQLite 表
2. load_existing_sessions() - 从数据库加载历史会话
3. start_preload() - 后台线程预加载 MCP 工具
4. uvicorn.run() - 启动 FastAPI 服务
```

### 4.2 流式聊天流程
```
POST /api/chat/stream
├── sanitize_input() - 清洗用户输入
├── get_or_create_agent() - 获取/创建会话
├── _stream_generator()
│   ├── stream_agent() - 调用 LangGraph agent
│   ├── yield 事件（tool_start, content, tool_end, done）
│   └── 更新 session['messages']
└── StreamingResponse - SSE 流式返回
```

### 4.3 Agent 执行流程（异步图）
```
sanitize → load_history → retrieve → build → agent → validate → {tools | END}
                                                      ↓
                                                  error_handler → END
```

### 4.4 会话管理流程
```
POST /api/sessions/new → 创建新会话，返回 session_id
POST /api/sessions/{id}/rename → 重命名会话，保存到 SQLite
GET /api/sessions/{id}/messages → 获取格式化消息列表
DELETE /api/sessions/{id} → 删除会话（内存 + SQLite）
```

---

## 5. 数据结构与接口

### 5.1 AgentState（TypedDict）
```python
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]  # 完整历史
    session_id: str
    knowledge: List[dict]      # RAG 检索结果
    history: List[dict]        # 压缩历史
    validation: str            # 校验状态
    error_msg: str             # 错误信息
    retry_count: int           # 重试计数
    full_messages: List[Any]   # 完整历史
    context_messages: List[Any]  # 处理后上下文
    compression_info: dict     # 压缩信息
    llm_response: Any          # 原始响应
    llm_start_time: float      # 开始时间
    llm_duration_ms: float     # 耗时
    updated_context: List[Any] # 更新后上下文
    thread_id: str             # 线程 ID
```

### 5.2 ChatRequest / ChatResponse
```python
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    reply: str
    thinking: str = ""
    tool_calls: List[Dict[str, Any]] = []
    session_id: str
    token_usage: Dict[str, int] = {}
    used_tokens: int = 0
    max_tokens: int = 1000000
    remaining_tokens: int = 1000000
```

### 5.3 HTTP API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 首页（chat.html）|
| POST | `/api/chat/stream` | 流式聊天 |
| POST | `/api/chat` | 非流式聊天 |
| POST | `/api/chat/retry` | 重试最后消息 |
| GET | `/api/sessions` | 列出所有会话 |
| POST | `/api/sessions/new` | 创建新会话 |
| POST | `/api/sessions/{id}/rename` | 重命名会话 |
| GET | `/api/sessions/{id}/messages` | 获取消息 |
| DELETE | `/api/sessions/{id}` | 删除会话 |
| GET | `/api/graph` | 图结构可视化 |
| POST | `/api/reload` | 重新加载配置 |
| GET | `/api/config` | 获取 YAML 配置 |
| POST | `/api/config` | 保存 YAML 配置 |
| GET | `/api/mcp/status` | MCP 工具状态 |
| POST | `/api/mcp/reload` | 重新加载 MCP |

---

## 6. 设计优点

1. **分层清晰**：Web 层（FastAPI）、Agent 层（LangGraph）、工具层（tools.py）职责分明
2. **会话持久化**：SQLite checkpoint 机制支持历史会话恢复
3. **上下文压缩**：智能过滤异常消息 + Token 限制保护
4. **流式响应**：SSE 支持实时显示思考过程和工具调用状态
5. **技能系统**：插件式技能注册，支持代码技能和文档技能
6. **日志分级**：模块化日志控制，支持运行时调整级别

---

## 7. 问题与风险

### 7.1 代码质量问题
- **重复代码**：`sanitize_input()` 在 web_server.py 和 agent_core.py 中重复定义
- **注释代码**：大量调试代码未清理（如 `sys.stderr.write`）
- **变量命名**：部分变量名不清晰（如 `tablerouter`）

### 7.2 架构问题
- **同步/异步混用**：`create_agent()` 同步 vs `create_async_agent()` 异步，逻辑重复
- **全局状态**：`sessions` 字典、`_current_project_path` 等全局变量不利于测试
- **硬编码路径**：`BASE_DIR`、`CONFIG_PATH` 等散落在多处

### 7.3 潜在 Bug
- `get_mcp_tools()` 第 117 行：`_mcp_tools = _mcp_tools.extend(t_mcp_tools) or t_mcp_tools`
  - `list.extend()` 返回 None，导致 `_mcp_tools` 被赋值为 None
- `compress_messages()` 第 117 行：包含未定义变量 `status`
- `agent_core.py` 中 `filter_groups()` 函数是空操作

### 7.4 安全问题
- **SQL 注入风险**：`db_manager_api.py` 的 `/api/db/query` 执行用户提供的 SQL
- **命令注入**：`run_command()` 直接执行用户输入的命令字符串

---

## 8. 改进建议（按优先级）

### P0 - 紧急修复
1. **修复 `get_mcp_tools()` 的 bug**
   ```python
   # 错误代码
   _mcp_tools = _mcp_tools.extend(t_mcp_tools) or t_mcp_tools
   # 应改为
   _mcp_tools.extend(t_mcp_tools)
   ```

2. **修复 SQL 注入风险**
   - 只允许 SELECT 查询
   - 使用参数化查询

### P1 - 高优先级
3. **消除重复代码**
   - 将 `sanitize_input()` 统一移到 `tools.py` 或 `agent_core.py`
   - 统一同步/异步 agent 创建逻辑

4. **清理调试代码**
   - 移除 `sys.stderr.write()` 等调试输出
   - 清理注释掉的代码块

5. **修复 `compress_messages()` 中的 NameError**
   ```python
   # 第 117 行缺少 status 变量定义
   f"🎯 阈值: 警告 {status['thresholds']['warning']}% | ..."
   ```

### P2 - 中优先级
6. **引入依赖注入**
   - 用 DI 容器替代全局 `sessions` 字典
   - 便于单元测试

7. **配置集中管理**
   - 将所有配置项集中到 `config/settings.py`
   - 使用 Pydantic Settings 管理环境变量

8. **增强错误处理**
   - 统一异常处理中间件
   - 添加请求限流

### P3 - 低优先级
9. **代码重构**
   - 拆分大文件（`agent_core.py` 约 800 行）
   - 使用异步上下文管理器管理数据库连接

10. **文档完善**
    - 添加 API 文档（OpenAPI/Swagger）
    - 编写部署指南

---

## 9. 附录：本次实际读取的文件清单及读取理由

| 文件 | 读取理由 |
|------|----------|
| `web_server.py` | 用户指定的分析入口文件 |
| `agent_core.py` | web_server.py 中 `from agent_core import create_agent, stream_agent` |
| `agent_dump.py` | agent_core.py 中 `from agent_dump import object_to_str` |
| `context_manager.py` | web_server.py 和 agent_core.py 中导入的上下文管理模块 |
| `context_compressor.py` | agent_core.py 中 `from context_compressor import compress_with_filter` |
| `prompts.py` | agent_core.py 中 `from prompts import SYSTEM_PROMPT` |
| `tools.py` | agent_core.py 中 `from tools import ALL_TOOLS` |
| `mcp_registry.py` | agent_core.py 中 `from mcp_registry import get_mcp_tools` |
| `db_manager_api.py` | web_server.py 中 `from db_manager_api import router as db_router` |
| `server_log_manager.py` | web_server.py 中 `from server_log_manager import router as log_router` |

---

**设计文档已写入**: `docs/design.md`

**核心结论摘要**：
dsagent 是一个功能完整的 LangChain/LangGraph 智能助手应用，具备会话管理、流式响应、工具调用、上下文压缩等核心能力。当前存在一个 P0 级 bug（`get_mcp_tools()` 返回值错误）需要紧急修复，同时建议消除重复代码、清理调试输出、加强安全防护。整体架构分层清晰，但全局状态管理和文件拆分有优化空间。