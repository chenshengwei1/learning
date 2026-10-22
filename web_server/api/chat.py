# web_server/api/chat.py
import json
import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse

from web_server.models import ChatRequest, ChatResponse
from web_server.services.session_service import get_session_service
from web_server.services.agent_service import AgentService
from web_server.utils.sanitizer import sanitize_input
from agent_message import HumanMessageWithMeta as HumanMessage, AIMessageWithMeta as AIMessage


router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """流式聊天接口"""
    print(f"📨 收到流式请求: message={request.message}, session_id={request.session_id}")
    request.message = sanitize_input(request.message)
    if not request.message:
        return JSONResponse(content={"error": "Empty message"}, status_code=400)
    
    print(f"📨 流式请求清洗后: message={request.message}, session_id={request.session_id}")
    
    return StreamingResponse(
        AgentService.stream_chat(request.session_id, request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/retry/stream/{session_id}")
async def retry_chat_stream(session_id: str):
    """流式重试接口"""
    session_service = get_session_service()
    session = session_service.get_or_create(session_id)
    agent = session["agent"]
    config = session["config"]
    
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
    
    messages_before_last_user = messages[:last_user_index]

    await AgentService._update_state(agent, config, {"messages": messages_before_last_user})
    
    # agent.update_state(
    #     config,
    #     {"messages": messages_before_last_user},
    #     update_as_replace=True
    # )
    print(f"📝 重试: 回滚到 {len(messages_before_last_user)} 条消息")
    
    return StreamingResponse(
        AgentService.stream_chat(session_id, last_user_content),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("")
async def chat(request: ChatRequest):
    """非流式聊天接口"""
    session_service = get_session_service()
    session_id = request.session_id
    
    if session_service.is_processing(session_id):
        print(f"⏳ 会话 {session_id} 正在处理，消息加入队列")
        queue = session_service.get_queue(session_id)
        await queue.put(request.message)
        return {"status": "queued", "message": "消息已加入队列，正在处理中..."}
    
    session_service.mark_processing(session_id)
    
    try:
        result = await process_message(request)
        
        queue = session_service.get_queue(session_id)
        while not queue.empty():
            next_message = await queue.get()
            print(f"📨 处理队列消息: {next_message}")
            result = await process_message(
                ChatRequest(message=next_message, session_id=session_id)
            )
        
        return result.model_dump()
    finally:
        session_service.mark_done(session_id)
        session_service.remove_queue(session_id)


async def process_message(request: ChatRequest):
    """实际处理消息的逻辑"""
    session_service = get_session_service()
    session = session_service.get_or_create(request.session_id, request.message)
    agent = session["agent"]
    config = session["config"]
    
    print(f"📊 process_message 前: {len(session['messages'])} 条")
    
    session["message_count"] = session.get("message_count", 0) + 1
    session["status"] = "in progress"
    
    state = agent.get_state(config)
    history_messages = []
    if state and state.values:
        history_messages = state.values.get("messages", [])
        print(f"📝 历史消息修复完成: {len(history_messages)} 条")
    
    state = agent.get_state(config)
    print(f"📊 invoke 前 history_messages: {len(history_messages)} 条")
    print(f"📊 invoke 前 state.values.messages: {len(state.values.get('messages', []))} 条")
    
    try:
        result = agent.invoke(
            {"messages": [HumanMessage(content=request.message)]},
            config=config
        )
        
        new_state = agent.get_state(config)
        print(f"📊 invoke 后: {len(new_state.values.get('messages', []))} 条")
        
        last_message = result["messages"][-1]
        
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
        
        session["used_tokens"] = session.get("used_tokens", 0) + token_usage.get("total_tokens", 0)
        
        max_tokens = 1000000
        used_tokens = session["used_tokens"]
        remaining_tokens = max(0, max_tokens - used_tokens)
        
        new_state = agent.get_state(config)
        if new_state and new_state.values:
            session["messages"] = new_state.values.get("messages", [])
        
        print(f"process message 后: {len(session['messages'])} 条")
        
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