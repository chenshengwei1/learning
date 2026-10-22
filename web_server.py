# web_server.py
import sys
import io
import os
import uuid
import json
from datetime import datetime, date
from pathlib import Path
from typing import List, Dict, Any
import builtins
import time
from exceptionLoggingMiddleware import ExceptionLoggingMiddleware
from langgraph.errors import GraphRecursionError
from async_logger import log_info, log_warning, log_error
from api_config_editor import save_config, get_preset_nodes,get_config
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from agent_core_file import upload, list_files
os.makedirs("conversations", exist_ok=True)

import logging

# 安装日志中间件
from agent_log import setup_logging
setup_logging()

import traceback

from collections import defaultdict
import asyncio
import inspect

# 1. 设置无缓冲（对所有 print 生效）
os.environ["PYTHONUNBUFFERED"] = "1"
os.environ["PYTHONIOENCODING"] = "utf-8"


if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace',line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace',line_buffering=True)
    except Exception as e:
        pass

# ✅ 在重新包装之后设置行缓冲
# sys.stdout.reconfigure(line_buffering=True)
# sys.stderr.reconfigure(line_buffering=True)
# ===================== 第二步：安全监控 stderr.close 【重点修复】 =====================
# 隐患修复：钩子内部禁止print/traceback.print_stack（都会写stderr）


# 保存原始 print
_original_print = builtins.print

def _print_with_timestamp(*args, **kwargs):
    """给所有 print 加上时间戳"""
    try:
        timestamp = time.strftime("%H:%M:%S")
        
        # 安全获取调用者信息
        func_name = "unknown"
        try:
            frame = inspect.currentframe()
            if frame and frame.f_back:
                caller_frame = frame.f_back
                if caller_frame:
                    func_name = caller_frame.f_code.co_name
            del frame
        except:
            pass
        
        # 直接使用原始 print
        _original_logger.info(f"[{timestamp}] [{func_name}]", *args, **kwargs)
        # fullmessage = f"[{timestamp}] [{func_name}]", *args, **kwargs
        prefix = f"[{timestamp}] [{func_name}]"
    
        # 格式化 args
        args_str = " ".join(map(str, args))
        
        # 格式化 kwargs
        kwargs_str = " ".join(f"{k}={v}" for k, v in kwargs.items())
        
        # 使用 format 构建完整消息
        full_message = "{} {} {}".format(prefix, args_str, kwargs_str).strip()
        # 可选：也写入日志
        log_info(full_message)
        
    except Exception as e:
        # 如果出错，用最原始的方式打印
        try:
            _original_logger.info(f"PRINT ERROR: {e}", *args)
        except:
            pass


# 替换全局 print
builtins.print = _print_with_timestamp
from dotenv import load_dotenv
load_dotenv()



from fastapi import FastAPI, HTTPException, Request,File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from agent_core import create_agent, stream_agent, formatMessage, list_skills
from agent_dump import object_to_str


from context_manager import get_context_status, compress_messages, get_compress_suggestion
from context_compressor import compress_for_ai, count_messages_tokens





from visualizer import reload, show_graph
from contextlib import asynccontextmanager
from session_io import export_session, import_session as io_import

logger = logging.getLogger(__name__)




# ============ 路径配置 ============
BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"

TEMPLATES_DIR.mkdir(exist_ok=True)

# 配置模板目录
templates = Jinja2Templates(directory="templates")

# ============ FastAPI 应用 ============

# 在 app 创建之前定义 lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ========== 启动时：后台预加载 MCP 工具 ==========
    try:
        logger.info("🚀 服务启动，开始后台预加载 MCP 工具...")
        
        # 用线程执行同步的 get_mcp_tools()，避免阻塞事件循环
        from mcp_registry import start_preload
        start_preload()        # 后台线程，立即返回
        logger.info("✅ 服务已启动，MCP 工具正在后台加载")
    except Exception as e:
        logger.error(f"⚠️ MCP 工具预加载失败: {e}")
        traceback.print_exc()
    yield
    
    # ========== 关闭时：清理 ==========
    logger.info("🛑 服务关闭")

app = FastAPI(title="Leaning 智能助手", version="1.0", lifespan=lifespan)

# 在创建 app 之后，路由之前添加
app.mount("/static", StaticFiles(directory="static"), name="static")

# ============ 注册其它路由 ============
# 注册数据库管理路由
# web_server.py 顶部添加
from db_manager_api import router as db_router, tablerouter
app.include_router(db_router)
app.include_router(tablerouter)

from server_log_manager import router as log_router
app.include_router(log_router)


from skill_manager import router as skill_router
app.include_router(skill_router)

# ============ 会话管理 ============
sessions = {}

# 每个会话的请求队列
request_queues = defaultdict(asyncio.Queue)
processing_sessions = set()

# 允许跨域（开发阶段方便前端联调）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def all_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "未处理异常: %s %s | %s",
        request.method,
        request.url.path,
        exc,
        exc_info=exc)
    traceback.format_exception(exc)
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(f"[UNHANDLED] {request.method} {request.url}\n{tb}", file=sys.stdout, flush=True)
    return JSONResponse(status_code=500, content={"error": str(exc)})

# 在 load_existing_sessions 函数之前添加初始化表
def init_session_metadata_table():
    """初始化会话元数据表"""
    db_path = BASE_DIR / "agent_memory.db"
    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 创建会话元数据表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_metadata (
                thread_id TEXT PRIMARY KEY,
                name TEXT DEFAULT '新对话',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("✅ 会话元数据表初始化成功")
    except Exception as e:
        logger.error(f"⚠️ 初始化会话元数据表失败: {e}")

def load_existing_sessions():
    """启动时从 SQLite 数据库加载已有的 thread_id"""
    db_path = BASE_DIR / "agent_memory.db"
    if not db_path.exists():
        return
    
    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT thread_id FROM checkpoints")
        thread_ids = [row[0] for row in cursor.fetchall()]

         # 2. 获取会话元数据（名称等）
        # 确保表存在
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_metadata (
                thread_id TEXT PRIMARY KEY,
                name TEXT DEFAULT '新对话',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. 加载已有元数据
        cursor.execute("SELECT thread_id, name FROM session_metadata")
        metadata = {row[0]: row[1] for row in cursor.fetchall()}
        
        logger.info(f"📂 已加载 {len(thread_ids)} 个会话，{len(metadata)} 个有名称")

        conn.close()
        
        for tid in thread_ids:
            if tid not in sessions:
                 # 从元数据获取名称，如果没有则使用默认
                session_name = metadata.get(tid, f"会话 {tid[:8]}")

                sessions[tid] = {
                    "agent": create_agent(),
                    "config": {"configurable": {"thread_id": tid}},
                    "created_at": datetime.now(),
                    "messages": [],
                    "name": session_name,   # ✅ 新增
                    "message_count": 0           # ✅ 新增
                }
    except Exception:
        logger.error(f"⚠️ 加载会话失败: {e}")
        import traceback
        traceback.logger.info_exc()

import re  # 如果还没有导入

def generate_session_name(message: str) -> str:
    """
    根据用户第一条消息生成会话名称
    """
    # 清理消息：去除多余空格、换行
    cleaned = re.sub(r'\s+', ' ', message).strip()
    
    # 取前 30 个字符
    if len(cleaned) <= 30:
        name = cleaned
    else:
        # 尝试在完整单词处截断
        truncated = cleaned[:30]
        if ' ' in truncated:
            last_space = truncated.rfind(' ')
            if last_space > 10:
                truncated = truncated[:last_space]
        name = truncated + "..."
    
    # 如果名称太短或只有标点，使用默认名称
    if len(name) < 2 or not re.search(r'[\w\u4e00-\u9fff]', name):
        name = "新对话"
    
    return name

def save_session_metadata_to_db(session_id: str, name: str):
    """保存会话名称到数据库"""
    db_path = BASE_DIR / "agent_memory.db"
    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 确保表存在
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_metadata (
                thread_id TEXT PRIMARY KEY,
                name TEXT DEFAULT '新对话',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 插入或更新
        cursor.execute("""
            INSERT INTO session_metadata (thread_id, name, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(thread_id) DO UPDATE SET 
                name = excluded.name,
                updated_at = CURRENT_TIMESTAMP
        """, (session_id, name))
        
        conn.commit()
        conn.close()
        logger.info(f"💾 会话名称已保存: {session_id[:8]} - {name}")
    except Exception as e:
        logger.info(f"⚠️ 保存会话名称失败: {e}")

def get_or_create_agent(session_id: str, first_message: str = None):
    """获取或创建指定会话的智能体"""
    if session_id not in sessions:
        session_name = "新对话"
        if first_message:
            session_name = generate_session_name(first_message)
        
        sessions[session_id] = {
            "agent": create_agent(),
            "config": {"configurable": {"thread_id": session_id}},
            "created_at": datetime.now(),
            "messages": [],           # UI 展示用
            "context": [],            # ✅ 新增：压缩上下文缓存
            "name": session_name,
            "message_count": 0
        }

         # ✅ 保存到数据库
        save_session_metadata_to_db(session_id, session_name)

        logger.info(f"📝 创建新会话: {session_id[:8]} - {session_name}")
    
    return sessions[session_id]

def sanitize_input(user_input: str) -> str:
    """清洗用户输入，防止prompt注入"""
    # 1. 移除明显的注入尝试
    dangerous_patterns = [
        r"忽略.*指令", r"ignore.*instruction", 
        r"system.*prompt", r"之前.*设定"
    ]
    for pattern in dangerous_patterns:
        user_input = re.sub(pattern, "", user_input, flags=re.IGNORECASE)
    
    # 2. 截断过长输入（防止恶意填充）
    max_len = 2000
    if len(user_input) > max_len:
        user_input = user_input[:max_len] + "...(截断)"
    
    # 3. 移除不可见控制字符
    user_input = ''.join(ch for ch in user_input if ord(ch) >= 32 or ch in '\n\r\t')
    
    return user_input.strip()

# ============ 数据模型 ============
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    reply: str
    thinking: str = ""
    tool_calls: List[Dict[str, Any]] = []
    session_id: str
    token_usage: Dict[str, int] = {}  # ✅ 新增
    used_tokens: int = 0          # ✅ 累计已消耗
    max_tokens: int = 1000000      # ✅ 最大可用
    remaining_tokens: int = 1000000  # ✅ 剩余可用


# ============ API 路由 ============

@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = TEMPLATES_DIR / "chat.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        return HTMLResponse(content=f.read())


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """流式聊天接口"""

    logger.info(f"📨 收到流式请求: message={request.message}, session_id={request.session_id}")
    request.message = sanitize_input(request.message)
    if not request.message:
        return JSONResponse(content={"error": "Empty message"}, status_code=400)
    
    logger.info(f"📨 流式请求清洗后: message={request.message}, session_id={request.session_id}")
    
    session_id = request.session_id
    session = get_or_create_agent(session_id, request.message)
    config = session["config"]
    
    """async def generate():
        try:
            # 1. 发送开始事件
            yield f"data: {json.dumps({'type': 'start', 'session_id': session_id})}\n\n"
            await asyncio.sleep(0.01)
            
            # 2. 执行 agent
            async for event in stream_agent(
                [HumanMessage(content=request.message)],
                config,
                session_id
            ):
                # 发送事件
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0.01)
            
            # 3. 发送完成事件
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"
            
        except Exception as e:
            # 发送错误事件
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    """
    
    return StreamingResponse(
        _stream_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
        }
    )

async def _stream_generator(request: ChatRequest):
    """
    流式处理的核心生成器
    可以被路由和重试接口复用
    """
    session_id = request.session_id
    session = get_or_create_agent(session_id, request.message)
    config = session["config"]
    agent = session["agent"]  # ✅ 获取 agent 对象

    logger.info(f"📨 流式处理: message={request.message}, session_id={session_id}")
    logger.info(f"📊 流式处理前: 历史消息数={len(session['messages'])}, 累计已消耗={session.get('used_tokens', 0)}")
    
    # print many ===
    logger.info("=" * 100)
    
    try:
        # 发送开始事件
        yield f"data: {json.dumps({'type': 'start', 'session_id': session_id})}\n\n"
        await asyncio.sleep(0.01)
        
        # 执行 agent 流式
        async for event in stream_agent(
            [HumanMessage(content=request.message)],
            config,
            session_id
        ):
            yield f"data: {object_to_str(event)}\n\n"
            await asyncio.sleep(0.01)


        # ✅ 流式完成后，更新 session 中的消息
        state = agent.get_state(config)


        if state and state.values:
            session['messages'] = state.values.get("messages", [])
            session['used_tokens'] = state.values.get("used_tokens", 0)

        # 发送完成事件
        yield f"data: {object_to_str({'type': 'done', 'session_id': session_id})}\n\n"

    except GraphRecursionError as e:
            # ✅ 清理不完整的 tool_calls
            logger.info(f"⚠️ GraphRecursionError: {e}")
            state = agent.get_state(config)
            if state and state.values:
                messages = state.values.get("messages", [])
                if messages:
                    last_msg = messages[-1]
                    # 如果最后一条是带 tool_calls 的 AIMessage，清除 tool_calls
                    if isinstance(last_msg, AIMessage) and hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                        last_msg.tool_calls = []
                        await _update_state(
                            agent,
                            config,
                            {"messages": messages}
                        )
                        logger.info("🧹 已清除不完整的 tool_calls")
                        session['messages'] = messages

            # ✅ 捕获递归错误，发送给前端
            error_msg = "⚠️ 当前任务步骤过多，已达到最大处理限制。请尝试简化问题或分步提问。"
            
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"

    except Exception as e:
        import traceback
        traceback.print_exc()
        error_event = {
            "type": "error",
            "error": str(e),
            "timestamp": time.time()
        }
        yield f"data: {json.dumps(error_event)}\n\n"
    finally:
        logger.info(f"📊 流式处理后: 历史消息数={len(session['messages'])}, 累计已消耗={session.get('used_tokens', 0)}")
        logger.info("=" * 100)

@app.post("/api/chat", response_class=JSONResponse)
async def chat(request: ChatRequest):
    session_id = request.session_id
    
    # 如果该会话正在处理，将消息加入队列
    if session_id in processing_sessions:
        logger.info(f"⏳ 会话 {session_id} 正在处理，消息加入队列")
        queue = request_queues[session_id]
        await queue.put(request.message)
        return {"status": "queued", "message": "消息已加入队列，正在处理中..."}
    
    # 标记为处理中
    processing_sessions.add(session_id)
    
    try:
        # 处理第一条消息
        result = await process_message(request)
        
        # 处理队列中的后续消息
        queue = request_queues[session_id]
        while not queue.empty():
            next_message = await queue.get()
            logger.info(f"📨 处理队列消息: {next_message}")
            # 处理队列中的消息
            result = await process_message(
                ChatRequest(message=next_message, session_id=session_id)
            )
        
        # ✅ 修复：返回 dict 而不是 ChatResponse
        return result.model_dump()
        
    finally:
        # ✅ 安全删除
        if session_id in processing_sessions:
            processing_sessions.remove(session_id)
        if session_id in request_queues:
            del request_queues[session_id]


async def process_message(request: ChatRequest):
    """实际处理消息的逻辑"""
    session = get_or_create_agent(request.session_id, request.message)
    agent = session["agent"]
    config = session["config"]

    logger.info(f"📊 process_message 前: {len(session["messages"])} 条")
    
    session["message_count"] = session.get("message_count", 0) + 1
    
    # ========== 1. 获取完整历史 ==========
    state = agent.get_state(config)
    history_messages = []
    if state and state.values:
        raw_messages = state.values.get("messages", [])
        if raw_messages:
            # 只修复 tool_calls 不匹配，不压缩
            history_messages = raw_messages
            logger.info(f"📝 历史消息修复完成: {len(raw_messages)} 条")
    
    # ========== 2. 传入完整历史 + 新消息 ==========
    messages = history_messages + [HumanMessage(content=request.message)]

    state = agent.get_state(config)
    logger.info(f"📊 invoke 前 history_messages: {len(history_messages)} 条")
    logger.info(f"📊 invoke 前 state.values.messages: {len(state.values.get('messages', []))} 条")
    logger.info(f"📊 invoke 前 messages: {len(messages)} 条")
    
    try:
        # ========== 3. 调用 agent ==========
        result = agent.invoke(
            {"messages": [HumanMessage(content=request.message)]},  # 因为checkpoint会追加历史，所以只需要最新消息
            config=config
        )

        new_state = agent.get_state(config)
        logger.info(f"📊 invoke 后: {len(new_state.values.get('messages', []))} 条")
        
        last_message = result["messages"][-1]
        
        # 提取响应信息
        tool_calls_info = []
        reply_text = ""
        thinking = ""
        
        for msg in result["messages"]:
            if isinstance(msg, AIMessage):
                if msg.content:
                    reply_text = msg.content
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tc in msg.tool_calls:
                        tool_calls_info.append({
                            "name": tc.get("name", "unknown"),
                            "args": tc.get("args", {})
                        })
        
        if hasattr(last_message, "additional_kwargs"):
            thinking = last_message.additional_kwargs.get("reasoning_content", "")
            token_usage = last_message.additional_kwargs.get("token_usage", {})
        else:
            token_usage = {}
        
        # 更新会话累计消耗
        session["used_tokens"] = session.get("used_tokens", 0) + token_usage.get("total_tokens", 0)
        
        max_tokens = 1000000
        used_tokens = session["used_tokens"]
        remaining_tokens = max(0, max_tokens - used_tokens)
        
        # ========== 4. 更新 UI 展示消息 ==========
        # 获取最新的完整历史（用于 UI）
        new_state = agent.get_state(config)
        if new_state and new_state.values:
            session["messages"] = new_state.values.get("messages", [])
        
        logger.info(f"process message 后: {len(session["messages"])} 条")
        return ChatResponse(
            reply=reply_text or "任务执行完成",
            thinking=thinking,
            tool_calls=tool_calls_info,
            session_id=request.session_id,
            token_usage=token_usage,
            used_tokens=used_tokens,
            max_tokens=max_tokens,
            remaining_tokens=remaining_tokens
        )
    
    except Exception as e:
        return ChatResponse(
            reply=f"❌ 出错了：{str(e)}",
            session_id=request.session_id
        )
    
@app.post("/api/chat/retry")
async def retry_chat(request: ChatRequest):
    """
    重试最后一条用户消息
    删除最后一条用户消息之后的所有消息，然后重新处理该用户消息
    """
    session = get_or_create_agent(request.session_id)
    agent = session["agent"]
    config = session["config"]
    
    # ========== 1. 获取当前状态 ==========
    state = agent.get_state(config)
    if not state or not state.values:
        return JSONResponse(
            status_code=404,
            content={"error": "会话无消息"}
        )
    
    messages = state.values.get("messages", [])
    if not messages:
        return JSONResponse(
            status_code=404,
            content={"error": "会话无消息"}
        )
    
    # ========== 2. 找到最后一条用户消息 ==========
    last_user_index = -1
    last_user_content = None
    for i in range(len(messages) - 1, -1, -1):
        if isinstance(messages[i], HumanMessage):
            last_user_index = i
            last_user_content = messages[i].content
            break
    
    if last_user_index == -1:
        return JSONResponse(
            status_code=404,
            content={"error": "未找到用户消息"}
        )
    
    # ========== 3. 删除最后一条用户消息及其之后的所有消息 ==========
    # 保留到最后一条用户消息之前
    messages_before_last_user = messages[:last_user_index]
    await _update_state(
            agent,
            config,
            {"messages": messages_before_last_user}
        )
    
    logger.info(f"📝 重试: 回滚到 {len(messages_before_last_user)} 条消息")
    logger.info(f"📝 重试: 重新处理用户消息: {last_user_content}")
    
    # ========== 4. 构造 ChatRequest 并调用 process_message ==========
    # 创建一个新的请求对象
    retry_request = ChatRequest(
        message=last_user_content,
        session_id=session_id
    )
    
    # 调用 process_message 处理
    result = await process_message(retry_request)
    
    return result

@app.post("/api/chat/retry/stream/{sessionid}")
async def retry_chat_stream(sessionid: str):
    """流式重试接口"""
    session = get_or_create_agent(sessionid)
    agent = session["agent"]
    config = session["config"]

    logger.info(f"📝 重试: sessionid {sessionid} 回滚")

    try:
        # 1. 获取最后一条用户消息
        state = agent.get_state(config)
        if not state or not state.values:
            return JSONResponse(status_code=404, content={"error": "会话无消息"})
        
        messages = state.values.get("messages", [])
        
        last_user_index = -1
        last_user_content = None
        for i in range(len(messages) - 1, -1, -1):
            if isinstance(messages[i], HumanMessage):
                last_user_index = i
                last_user_content = messages[i].content
                break
        
        if last_user_index == -1:
            return JSONResponse(status_code=404, content={"error": "未找到用户消息"})
        
        # 2. 回滚到该用户消息之前
        messages_before_last_user = messages[:last_user_index]
        await _update_state(
            agent,
            config,
            {"messages": messages_before_last_user}
        )
        logger.info(f"📝 重试: 回滚到 {len(messages_before_last_user)} 条消息")
        logger.info(f"📝 重试: last_user_content {last_user_content} 回滚")
        
        # 3. 直接复用 _stream_generator
        retry_request = ChatRequest(
            message=last_user_content,
            session_id=sessionid
        )
        return StreamingResponse(
            _stream_generator(retry_request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        logger.error(f"⚠️ 重试流式出错: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/chat/upload")
async def upload_file(file: UploadFile = File(...)):
    return await upload(file)

@app.get("/api/chat/listfile")
async def listfile():
    return await list_files()

@app.get("/api/sessions")
async def list_sessions(current_session_id: str = ""):
    """列出所有活跃会话"""
    load_existing_sessions()
    result = []
    for sid, session in sessions.items():
        result.append({
            "session_id": sid,
            "name": session.get("name", f"会话 {sid[:8]}"),  # ✅ 返回会话名称
            "created_at": session["created_at"].isoformat(),
            "message_count": session.get("message_count", 0),  # ✅ 返回消息数
            "is_current": sid == current_session_id
        })
    return result


@app.post("/api/sessions/new")
async def new_session():
    """创建新会话"""
    session_id = uuid.uuid4().hex[:12]
    sessions[session_id] = {
        "agent": create_agent(),
        "config": {"configurable": {"thread_id": session_id}},
        "created_at": datetime.now(),
        "messages": [],
        "name": "新对话",      # ✅ 新增
        "message_count": 0     # ✅ 新增
    }
    return {"session_id": session_id, "name": "新对话"}  # ✅ 返回名称

@app.post("/api/sessions/{session_id}/export")
async def api_export_session(session_id: str):
    """导出聊天记录"""
    session = get_or_create_agent(session_id)
    agent = session["agent"]
    config = session["config"]
    state = agent.get_state(config)

    saved_conversation = export_session(session_id, session=session, state=state)

    def json_default(o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        return str(o)

    with open(f"conversations/{session_id}.json", "w", encoding="utf-8") as f:
        json.dump(saved_conversation, f, ensure_ascii=False, indent=2, default=json_default)
    return saved_conversation
    

@app.post("/api/sessions/{session_id}/imports")
async def api_import_session(request):
    """导出聊天记录"""
    session_id = request.session_id
    session = get_or_create_agent(session_id)
    saved_conversation = request.conversation
    resp = io_import(session_id, saved_conversation, session)

    return resp

@app.post("/api/sessions/{session_id}/rename")
async def rename_session(session_id: str, new_name: str = ""):
    """重命名会话"""
    session = get_or_create_agent(session_id)
    
    if new_name and new_name.strip():
        session["name"] = new_name.strip()
    else:
        # ✅ 从 SQLite 获取第一条用户消息
        agent = session["agent"]
        config = session["config"]
        state = agent.get_state(config)
        
        first_message = "未命名会话"
        if state and state.values:
            messages = state.values.get("messages", [])
            for msg in messages:
                if hasattr(msg, "type") and msg.type == "human":
                    first_message = msg.content
                    break
        
        session["name"] = generate_session_name(first_message) if first_message else "未命名会话"

        # ✅ 保存到数据库
        save_session_metadata_to_db(session_id, session["name"])
    
    return {"session_id": session_id, "name": session["name"]}

@app.get("/api/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    """获取会话消息（使用缓存的 UI 展示消息）"""
    session = get_or_create_agent(session_id)
    logger.info(f"获取会话消息: {session_id}, 消息数={len(session['messages'])}")
    
    # ✅ 优先使用缓存的 messages
    if session.get("messages"):
        cached = session["messages"]
        # 格式化缓存消息
        formatted = []
        for msg in cached:
            entry = formatMessage(msg)
            formatted.append(entry)
        return {"messages": formatted}
    
    # ✅ 如果缓存为空，从 checkpoint 获取（兼容旧会话）
    agent = session["agent"]
    config = session["config"]
    state = agent.get_state(config)
    
    formatted = []  # ✅ 初始化变量
    logger.info(f"获取会话消息: {session_id}, state.values.messages={len(state.values.get('messages', [])) if state and state.values else 0}")
    
    if state and state.values:
        raw_messages = state.values.get("messages", [])
        # raw_messages = fix_incomplete_tool_calls(raw_messages)
        
        for msg in raw_messages:
            entry = formatMessage(msg)
            formatted.append(entry)
    
    logger.info(f"获取会话消息: {session_id}, 格式化后消息数={len(formatted)}")
    return {"messages": formatted}

async def _update_state(agent, config, values: dict):
    """更新状态，兼容同步和异步"""
    checkpointer = agent.checkpointer
    is_async = isinstance(checkpointer, AsyncSqliteSaver)
    
    if is_async:
        checkpoint_tuple = await checkpointer.aget_tuple(config)
    else:
        checkpoint_tuple = checkpointer.get_tuple(config)
    
    if not checkpoint_tuple:
        raise ValueError("Checkpoint not found")
    
    checkpoint = checkpoint_tuple.checkpoint
    metadata = checkpoint_tuple.metadata
    
    if "channel_values" not in checkpoint:
        checkpoint["channel_values"] = {}
    
    for key, value in values.items():
        checkpoint["channel_values"][key] = value
    
    if is_async:
        await checkpointer.aput(config, checkpoint, metadata, {})
    else:
        if "configurable" not in config:
            config["configurable"] = {}
        if "checkpoint_ns" not in config["configurable"]:
            config["configurable"]["checkpoint_ns"] = ""
        checkpointer.put(config, checkpoint, metadata, {})
    
    return checkpoint["channel_values"]

@app.get("/api/sessions/{session_id}/context/compare")
async def compare_context(session_id: str):
    """
    比较完整历史和压缩后上下文的差异
    用于调试和展示
    """
    session = get_or_create_agent(session_id)
    agent = session["agent"]
    config = session["config"]
    
    state = agent.get_state(config)
    
    if not state or not state.values:
        return {"status": "error", "message": "会话没有消息"}
    
    raw_messages = state.values.get("messages", [])
    
    
    # 完整历史统计
    full_count = len(raw_messages)
    full_tokens = count_messages_tokens(raw_messages)
    
    # 压缩后统计
    compressed, info = compress_for_ai(raw_messages, SYSTEM_PROMPT)
    
    return {
        "session_id": session_id,
        "full_history": {
            "message_count": full_count,
            "tokens": full_tokens,
            "messages": [
                {
                    "type": msg.__class__.__name__,
                    "content_preview": str(getattr(msg, "content", ""))[:80] + "..."
                }
                for msg in raw_messages[:10]
            ] + (["..."] if len(raw_messages) > 10 else [])
        },
        "compressed_context": {
            "message_count": len(compressed),
            "tokens": info.get("compressed_tokens", 0),
            "compression_ratio": info.get("compression_ratio", "0%"),
            "messages": [
                {
                    "type": msg.__class__.__name__,
                    "content_preview": str(getattr(msg, "content", ""))[:80] + "..."
                }
                for msg in compressed[:10]
            ] + (["..."] if len(compressed) > 10 else [])
        },
        "compression_info": info
    }


@app.post("/api/sessions/switch")
async def switch_session(session_id: str = ""):
    """切换到指定会话"""
    if not session_id:
        return {"status": "error", "message": "session_id 不能为空"}
    get_or_create_agent(session_id)
    return {"status": "ok", "session_id": session_id}


@app.post("/api/sessions/{session_id}/interrupt")
async def interrupt_session(session_id: str):
    """中断当前会话的执行"""
    from agent_core import set_interrupt
    set_interrupt(session_id, "interrupt")
    return {"status": "interrupted", "session_id": session_id}


@app.post("/api/sessions/{session_id}/resume")
async def resume_session(session_id: str):
    """恢复被中断的会话"""
    from agent_core import clear_interrupt
    clear_interrupt(session_id)
    return {"status": "resumed", "session_id": session_id}


@app.post("/api/sessions/{session_id}/cancel")
async def cancel_session(session_id: str):
    """取消当前会话的执行"""
    from agent_core import set_interrupt
    set_interrupt(session_id, "cancel")
    return {"status": "cancelled", "session_id": session_id}


@app.post("/api/sessions/{session_id}/import")
async def import_session(request: ChatRequest):
    message = request.message
    session_id = request.session_id
    logger.debug(message)

    session = get_or_create_agent(session_id)
    agent = session["agent"]
    config = session["config"]
    logger.info(f"开始获取上下文信息")
    
    state = agent.get_state(config)
    messages = []
    
    if state and state.values:
        messages = state.values.get("messages", [])
    _update_state(agent,config, messages)

@app.post("/api/sessions/{session_id}/context/compress")
async def compress_session_context(
    session_id: str, 
    keep_recent: int = 20,
    include_summary: bool = True
):
    """
    手动压缩会话上下文
    
    Args:
        session_id: 会话ID
        keep_recent: 保留的最近消息数（默认20）
        include_summary: 是否包含摘要提示（默认True）
    """
    session = get_or_create_agent(session_id)
    agent = session["agent"]
    config = session["config"]
    
    state = agent.get_state(config)
    if not state or not state.values:
        return {"status": "error", "message": "会话没有消息"}
    
    messages = state.values.get("messages", [])
    original_count = len(messages)
    
    if original_count == 0:
        return {"status": "error", "message": "会话没有消息可压缩"}
    
    # 获取压缩建议
    suggestion = get_compress_suggestion(messages)
    
    # 执行压缩
    compressed = compress_messages(messages, keep_recent, include_summary)
    
    # 注意：这里不能直接修改 state
    # 需要通过 agent.invoke 或 checkpoint 的 put 方法来更新
    # 这里返回压缩结果，前端可以提示用户重新加载会话
    
    return {
        "status": "success",
        "original_count": original_count,
        "compressed_count": len(compressed),
        "kept_recent": keep_recent,
        "suggestion": suggestion,
        "message": f"已从 {original_count} 条压缩到 {len(compressed)} 条消息，请刷新会话查看效果"
    }


@app.get("/api/sessions/{session_id}/context/suggestion")
async def get_compress_suggestion_api(session_id: str):
    """获取压缩建议"""
    session = get_or_create_agent(session_id)
    agent = session["agent"]
    config = session["config"]
    
    state = agent.get_state(config)
    messages = []
    
    if state and state.values:
        messages = state.values.get("messages", [])
    
    if not messages:
        return {"status": "error", "message": "会话没有消息"}
    
    status = get_context_status(messages)
    suggestion = get_compress_suggestion(messages)
    
    return {
        "session_id": session_id,
        "status": status,
        "suggestion": suggestion
    }


@app.post("/api/sessions/{session_id}/context/reset")
async def reset_session_context(session_id: str):
    """
    重置会话上下文（清除历史消息）
    注意：这会丢失所有历史消息
    """
    # 获取当前会话
    session = get_or_create_agent(session_id)
    
    # 方法：创建一个新的 checkpoint
    # 最简单的方式：删除会话并重新创建
    # 或者使用 agent 的 checkpoint 方法
    
    # 这里我们简单返回提示，实际重置需要更复杂的操作
    return {
        "status": "warning",
        "message": "重置功能需要实现 checkpoint 操作。建议手动创建新会话。",
        "suggestion": "请使用 /api/sessions/new 创建新会话"
    }


@app.get("/api/sessions/{session_id}/context")
async def get_context_info(session_id: str):
    """获取会话的上下文使用情况"""
    session = get_or_create_agent(session_id)
    agent = session["agent"]
    config = session["config"]
    logger.info(f"开始获取上下文信息")
    
    state = agent.get_state(config)
    messages = []
    
    if state and state.values:
        messages = state.values.get("messages", [])
    
    status = get_context_status(messages)

    # get first human message then generate a name if no name exists or name like "会话xxx"
    if not session.get("name") or session["name"] == "新对话" or session["name"].startswith("会话"):
        first_human_msg = next((msg for msg in messages if isinstance(msg, HumanMessage)), None)
        if first_human_msg:
            session["name"] = generate_session_name(first_human_msg.content)

            # ✅ 保存到数据库
            save_session_metadata_to_db(session_id, session["name"])
        else:
            session["name"] = "新对话"
    
    # set session name in status
    status["session_name"] = session.get("name", "新对话")
    
    return {
        "session_id": session_id,
        **status
    }


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """删除指定会话"""
    # 1. 检查会话是否存在
    if session_id in sessions:
        # 2. 从内存中移除
        del sessions[session_id]
        logger.info(f"会话 {session_id} 已删除")
    
    
    # 3. 从 SQLite 中删除（可选）
    try:
        import sqlite3
        DB_PATH = os.path.join(os.path.dirname(__file__), "agent_memory.db")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # 删除该会话的所有 checkpoint
        # ✅ 先查看有哪些表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"📋 数据库表: {tables}")
        
        # 根据实际表名删除
        if "checkpoints" in tables:
            cursor.execute("DELETE FROM checkpoints WHERE thread_id = ?", (session_id,))
        if "checkpoint_writes" in tables:
            cursor.execute("DELETE FROM checkpoint_writes WHERE thread_id = ?", (session_id,))
        if "checkpoint_blobs" in tables:
            cursor.execute("DELETE FROM checkpoint_blobs WHERE thread_id = ?", (session_id,))
        if "writes" in tables:
                    cursor.execute("DELETE FROM writes WHERE thread_id = ?", (session_id,))

        conn.commit()
        conn.close()
        logger.info(f"🗑️ 会话 {session_id} 已从数据库删除")
    except Exception as e:
        logger.info(f"⚠️ 删除数据库记录失败: {e}")
    
    return {"status": "success", "message": f"会话 {session_id} 已删除"}

logger.info("start web server......................................................................")

@app.get("/api/graph")
async def get_graph_api():
    return  HTMLResponse(show_graph())

@app.post("/api/reload")
async def reload_config():
    """手动刷新配置"""
    reload()
    return {"status": "ok", "message": "配置已重新加载"}

CONFIG_PATH = "config/main_graph.yaml"
@app.get("/api/editconfig", response_class=HTMLResponse)
async def edit_config(request: Request):
    """返回编辑器 HTML 页面"""
    logger.info(f"templates 类型: {type(templates)}")
    logger.info(f"templates 内容: {templates}")
    html_path = TEMPLATES_DIR / "config.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return HTMLResponse(content=content)


@app.get("/api/preset/nodes")
async def api_get_preset_nodes():
    """获取所有预置节点"""
    return get_preset_nodes()

@app.get("/api/config")
async def api_get_config():
    """获取当前 YAML 配置"""
    try:
        return JSONResponse(content=get_config())
    except FileNotFoundError:
        return JSONResponse(content={"name": "新配置", "entry": "start", "nodes": [], "edges": []})

@app.post("/api/config")
async def api_save_config(config: Dict[str, Any]):
    """保存 YAML 配置"""
    try:
        return save_config(config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from mcp_registry import reload_mcp_tools, is_loaded, is_loading

@app.post("/api/mcp/reload")
async def api_reload_mcp():
    """手动触发 MCP 工具重新加载"""
    result = reload_mcp_tools()
    status_code = 200 if result["success"] else 500
    return JSONResponse(content=result, status_code=status_code)


@app.get("/api/mcp/status")
async def api_mcp_status():
    """查询 MCP 工具加载状态"""
    from mcp_registry import _mcp_tools, get_mcp_dict  # 或加个 getter
    
    return {
        "loaded": is_loaded(),
        "loading": is_loading(),
        "tool_count": len(_mcp_tools),
        "tool_names": [getattr(t, "name", "unknown") for t in _mcp_tools],
        "tool_details": get_mcp_dict()
    }

app.add_middleware(ExceptionLoggingMiddleware)

# ============ 启动 ============
if __name__ == "__main__":
    import uvicorn

     # ✅ 初始化会话元数据表
    init_session_metadata_table()
    load_existing_sessions()
    
    logger.info("""
╔══════════════════════════════════════════════╗
║    🚀 Leaning 智能助手 Web 服务              ║
║                                              ║
║    打开浏览器访问：http://localhost:8800     ║
║                                              ║
║    按 Ctrl+C 停止服务                        ║
╚══════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8801,
        reload=False,
        log_level="info"
    )