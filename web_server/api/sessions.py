# web_server/api/sessions.py
import sqlite3
from fastapi import APIRouter

from datetime import datetime

from web_server.models import ChatRequest
from web_server.services.session_service import get_session_service
from web_server.services.message_service import MessageService
from web_server.services.context_service import ContextService
from web_server.services.agent_service import AgentService
from web_server.utils.helpers import generate_session_id, save_session_metadata_to_db, generate_session_name
from web_server.config import DB_PATH
from agent_message import HumanMessageWithMeta as HumanMessage

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("")
async def list_sessions(current_session_id: str = ""):
    """列出所有会话"""
    session_service = get_session_service()
    session_service.load_existing_sessions()
    result = []
    for sid, session in session_service.sessions.items():
        result.append({
            "session_id": sid,
            "name": session.get("name", f"会话 {sid[:8]}"),
            "created_at": session["created_at"].isoformat(),
            "message_count": session.get("message_count", 0),
            "is_current": sid == current_session_id
        })
    return result


@router.post("/new")
async def new_session():
    """创建新会话"""
    session_service = get_session_service()
    
    for sid, session in session_service.sessions.items():
        print(f"会话 {sid} 状态是 {session.get('status')}")
        if session.get("status") == "init":
            return {"session_id": sid, "name": session.get("name", f"会话 {sid[:8]}")}
    
    session_id = generate_session_id()
    session_service.sessions[session_id] = {
        "agent": None,
        "config": {"configurable": {"thread_id": session_id}},
        "created_at": datetime.now(),
        "messages": [],
        "status": "init",
        "name": "新对话",
        "message_count": 0
    }
    return {"session_id": session_id, "name": "新对话"}


@router.post("/{session_id}/rename")
async def rename_session(session_id: str, new_name: str = ""):
    """重命名会话"""
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    
    if new_name and new_name.strip():
        session["name"] = new_name.strip()
    else:
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
    
    save_session_metadata_to_db(session_id, session["name"])
    return {"session_id": session_id, "name": session["name"]}


@router.get("/{session_id}/messages")
async def get_messages(session_id: str):
    """获取会话消息"""
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    print(f"获取会话消息: {session_id}, 消息数={len(session['messages'])}")
    
    if session.get("status") == "init":
        return {"messages": []}
    
    if session.get("messages"):
        formatted = MessageService.format_messages(session["messages"])
        return {"messages": formatted}
    
    agent = session["agent"]
    config = session["config"]
    state = agent.get_state(config)
    
    formatted = []
    print(f"获取会话消息: {session_id}, state.values.messages={len(state.values.get('messages', [])) if state and state.values else 0}")
    
    if state and state.values:
        raw_messages = state.values.get("messages", [])
        new_messages = []
        is_converted = all(hasattr(msg, "_meta_converted") for msg in raw_messages)
        if is_converted:
            new_messages = raw_messages
        else:
            for msg in raw_messages:
                if not hasattr(msg, "_meta_converted"):
                    from agent_message import convert_to_meta_message
                    msg = convert_to_meta_message(msg)
                new_messages.append(msg)
            from web_server.services.agent_service import AgentService
            await AgentService._update_state(agent, config, {"messages": new_messages})
        
        formatted = MessageService.format_messages(new_messages)
    
    print(f"获取会话消息: {session_id}, 格式化后消息数={len(formatted)}")
    return {"messages": formatted}


@router.delete("/{session_id}/messages/{msg_id}")
async def delete_message_by_id(session_id: str, msg_id: str):
    """删除指定消息及其之后的所有消息"""
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    agent = session["agent"]
    config = session["config"]
    state = agent.get_state(config)
    
    all_deleted_messages = []
    if state and state.values:
        raw_messages = state.values.get("messages", [])
        is_found = False
        for i, msg in enumerate(raw_messages):
            if hasattr(msg, "id") and msg.id == msg_id:
                is_found = True
                all_deleted_messages.extend(raw_messages[i:])
                raw_messages = raw_messages[:i]
                from web_server.services.agent_service import AgentService
                await AgentService._update_state(agent, config, {"messages": raw_messages})
                print(f"🗑️ 删除消息 {msg_id} 及其之后的所有消息 {len(all_deleted_messages)}条")
                print(f"剩余消息 {len(raw_messages)}条")
                break
        
        if not is_found:
            return {"message": f"未找到消息 {msg_id}"}
    
    session["messages"] = state.values.get("messages", [])
    print(f"更新session消息，剩余 {len(session["messages"])}条")
    return {
        "message": f"已删除消息 {msg_id} 及其之后的所有消息",
        "deleted_messages": all_deleted_messages
    }


@router.post("/switch")
async def switch_session(session_id: str = ""):
    """切换到指定会话"""
    if not session_id:
        return {"status": "error", "message": "session_id 不能为空"}
    session_service = get_session_service()
    session_service.get_or_create(session_id)
    return {"status": "ok", "session_id": session_id}


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """删除指定会话"""
    session_service = get_session_service()
    session_service.delete(session_id)
    
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"📋 数据库表: {tables}")
        
        for table in ["checkpoints", "checkpoint_writes", "checkpoint_blobs", "writes"]:
            if table in tables:
                cursor.execute(f"DELETE FROM {table} WHERE thread_id = ?", (session_id,))
        
        conn.commit()
        conn.close()
        print(f"🗑️ 会话 {session_id} 已从数据库删除")
    except Exception as e:
        print(f"⚠️ 删除数据库记录失败: {e}")
    
    return {"status": "success", "message": f"会话 {session_id} 已删除"}


@router.get("/{session_id}/context")
async def get_context_info(session_id: str):
    """获取会话的上下文使用情况"""
    from tools import check_balance_API
    
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    
    if session.get("status") == "init":
        return {"status": "error", "message": "会话尚未初始化"}
    
    agent = session["agent"]
    config = session["config"]
    print(f"开始获取上下文信息")
    
    state = agent.get_state(config)
    messages = []
    
    if state and state.values:
        messages = state.values.get("messages", [])
    
    status = ContextService.get_status(messages)
    
    if not session.get("name") or session["name"] == "新对话" or session["name"].startswith("会话"):
        first_human_msg = next((msg for msg in messages if isinstance(msg, HumanMessage)), None)
        if first_human_msg:
            session["name"] = generate_session_name(first_human_msg.content)
            save_session_metadata_to_db(session_id, session["name"])
        else:
            session["name"] = "新对话"
    
    status["session_name"] = session.get("name", "新对话")
    
    try:
        response = check_balance_API()
        if response.status_code == 200:
            data = response.json()
            balance_infos = data.get("balance_infos", [])
            result = "💰 DeepSeek 账户余额："
            if not balance_infos:
                result = "⚠️ 未获取到余额信息"
            else:
                for info in balance_infos:
                    total = info.get("total_balance", "0")
                    granted = info.get("granted_balance", "0")
                    topped_up = info.get("topped_up_balance", "0")
                    result += f"  总余额：{total} 元"
                    result += f"  赠送余额：{granted} 元"
                    result += f"  充值余额：{topped_up} 元"
            status["balanceInfo"] = result
    except:
        pass
    
    return {"session_id": session_id, **status}


@router.post("/{session_id}/context/compress")
async def compress_session_context(
    session_id: str,
    keep_recent: int = 20,
    include_summary: bool = True
):
    """手动压缩会话上下文"""
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    agent = session["agent"]
    config = session["config"]
    
    state = agent.get_state(config)
    if not state or not state.values:
        return {"status": "error", "message": "会话没有消息"}
    
    messages = state.values.get("messages", [])
    original_count = len(messages)
    
    if original_count == 0:
        return {"status": "error", "message": "会话没有消息可压缩"}
    
    suggestion = ContextService.get_suggestion(messages)
    compressed = ContextService.compress(messages, keep_recent, include_summary)
    
    return {
        "status": "success",
        "original_count": original_count,
        "compressed_count": len(compressed),
        "kept_recent": keep_recent,
        "suggestion": suggestion,
        "message": f"已从 {original_count} 条压缩到 {len(compressed)} 条消息，请刷新会话查看效果"
    }


@router.get("/{session_id}/context/suggestion")
async def get_compress_suggestion_api(session_id: str):
    """获取压缩建议"""
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    agent = session["agent"]
    config = session["config"]
    
    state = agent.get_state(config)
    messages = []
    
    if state and state.values:
        messages = state.values.get("messages", [])
    
    if not messages:
        return {"status": "error", "message": "会话没有消息"}
    
    status = ContextService.get_status(messages)
    suggestion = ContextService.get_suggestion(messages)
    
    return {
        "session_id": session_id,
        "status": status,
        "suggestion": suggestion
    }


@router.get("/{session_id}/context/compare")
async def compare_context(session_id: str):
    """比较完整历史和压缩后上下文的差异"""
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    agent = session["agent"]
    config = session["config"]
    
    state = agent.get_state(config)
    
    if not state or not state.values:
        return {"status": "error", "message": "会话没有消息"}
    
    raw_messages = state.values.get("messages", [])
    
    full_count = len(raw_messages)
    full_tokens = ContextService.count_tokens(raw_messages)
    
    SYSTEM_PROMPT = ""
    compressed, info = ContextService.compress_for_ai(raw_messages, SYSTEM_PROMPT)
    
    if not compressed:
        return {"status": "error", "message": "会话没有消息可压缩"}
    
    msg_type = compressed[0].__class__.__name__
    for suffix in ["WithMeta", "WithMeta_"]:
        if msg_type.endswith(suffix):
            msg_type = msg_type[:-len(suffix)]
            break
    
    return {
        "session_id": session_id,
        "full_history": {
            "message_count": full_count,
            "tokens": full_tokens,
            "messages": [
                {
                    "type": msg_type,
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
                    "type": msg_type,
                    "content_preview": str(getattr(msg, "content", ""))[:80] + "..."
                }
                for msg in compressed[:10]
            ] + (["..."] if len(compressed) > 10 else [])
        },
        "compression_info": info
    }


@router.post("/{session_id}/interrupt")
async def interrupt_session(session_id: str):
    """中断当前会话的执行"""
    from agent_core import set_interrupt
    set_interrupt(session_id, "interrupt")
    return {"status": "interrupted", "session_id": session_id}


@router.post("/{session_id}/resume")
async def resume_session(session_id: str):
    """恢复被中断的会话"""
    from agent_core import clear_interrupt
    clear_interrupt(session_id)
    return {"status": "resumed", "session_id": session_id}


@router.post("/{session_id}/cancel")
async def cancel_session(session_id: str):
    """取消当前会话的执行"""
    from agent_core import set_interrupt
    set_interrupt(session_id, "cancel")
    return {"status": "cancelled", "session_id": session_id}


@router.post("/{session_id}/context/reset")
async def reset_session_context(session_id: str):
    """重置会话上下文"""
    return {
        "status": "warning",
        "message": "重置功能需要实现 checkpoint 操作。建议手动创建新会话。",
        "suggestion": "请使用 /api/sessions/new 创建新会话"
    }