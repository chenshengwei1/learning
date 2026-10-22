# web_server/services/agent_service.py
from typing import Dict, Any, AsyncGenerator, List
import asyncio
import json
import time

from langgraph.errors import GraphRecursionError
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.checkpoint.sqlite import SqliteSaver

from agent_core import stream_agent
from agent_message import (
    HumanMessageWithMeta as HumanMessage,
    AIMessageWithMeta as AIMessage,
)

from web_server.services.session_service import get_session_service
from web_server.services.message_service import MessageService
from web_server.utils.sanitizer import sanitize_input


class AgentService:
    """Agent 服务"""
    
    @staticmethod
    async def stream_chat(session_id: str, message: str) -> AsyncGenerator[str, None]:
        """流式聊天"""
        session_service = get_session_service()
        session = session_service.get_or_create(session_id, message)
        config = session["config"]
        agent = session["agent"]
        
        message = sanitize_input(message)
        
        print(f"📨 流式处理: message={message}, session_id={session_id}")
        print(f"📊 流式处理前: 历史消息数={len(session['messages'])}, 累计已消耗={session.get('used_tokens', 0)}")
        print("=" * 100)

        session["status"] = "in progress"
        
        try:
            req_message = HumanMessage(content=message)
            yield f"data: {json.dumps({'type': 'start', 'session_id': session_id, 'human_message': {'content': message, 'type': 'HumanMessage', 'id': req_message.id}})}\n\n"
            await asyncio.sleep(0.01)
            
            async for event in stream_agent(
                [req_message],
                config,
                session_id
            ):
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0.01)
            
            state = agent.get_state(config)
            if state and state.values:
                session['messages'] = state.values.get("messages", [])
                session['used_tokens'] = state.values.get("used_tokens", 0)
            
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"
            
        except GraphRecursionError as e:
            print(f"⚠️ GraphRecursionError: {e}")
            state = agent.get_state(config)
            if state and state.values:
                messages = state.values.get("messages", [])
                if messages:
                    last_msg = messages[-1]
                    if isinstance(last_msg, AIMessage) and hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                        last_msg.tool_calls = []
                        await AgentService._update_state(agent, config, {"messages": messages})
                        print("🧹 已清除不完整的 tool_calls")
                        session['messages'] = messages
            
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
            print(f"📊 流式处理后: 历史消息数={len(session['messages'])}, 累计已消耗={session.get('used_tokens', 0)}")
            print("=" * 100)
    
    @staticmethod
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
    
    @staticmethod
    def get_state_messages(session_id: str) -> List:
        """获取会话状态中的消息"""
        session_service = get_session_service()
        session = session_service.get(session_id)
        if not session:
            return []
        
        agent = session["agent"]
        config = session["config"]
        state = agent.get_state(config)
        
        if state and state.values:
            return state.values.get("messages", [])
        return []