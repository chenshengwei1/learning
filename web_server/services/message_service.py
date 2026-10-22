# web_server/services/message_service.py
from typing import List, Dict, Any

from agent_message import (
    HumanMessageWithMeta as HumanMessage,
    AIMessageWithMeta as AIMessage,
    ToolMessageWithMeta as ToolMessage,
    convert_to_meta_message
)


class MessageService:
    """消息管理服务"""
    
    @staticmethod
    def format_messages(messages: List) -> List[Dict[str, Any]]:
        """格式化消息列表"""
        formatted = []
        for msg in messages:
            msg = convert_to_meta_message(msg)
            msg_id = getattr(msg, "id", None)
            msg_type = msg.__class__.__name__
            
            for suffix in ["WithMeta", "WithMeta_"]:
                if msg_type.endswith(suffix):
                    msg_type = msg_type[:-len(suffix)]
                    break
            
            if msg_type == "HumanMessage":
                role = "user"
            elif msg_type == "AIMessage":
                role = "assistant"
            elif msg_type == "ToolMessage":
                role = "tool"
            else:
                role = msg_type.lower()
            
            entry = {
                "role": role,
                "content": getattr(msg, "content", ""),
                "type": msg_type,
                "id": msg_id
            }
            
            if isinstance(msg, AIMessage):
                if hasattr(msg, "additional_kwargs"):
                    thinking = msg.additional_kwargs.get("reasoning_content", "")
                    if thinking:
                        entry["thinking"] = thinking
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    entry["tool_calls"] = [
                        {"name": tc.get("name", "unknown"), "args": tc.get("args", {}), "id": tc.get("id")}
                        for tc in msg.tool_calls
                    ]
            
            if isinstance(msg, ToolMessage) and hasattr(msg, "tool_call_id"):
                entry["tool_call_id"] = msg.tool_call_id
                if hasattr(msg, "name"):
                    entry["name"] = msg.name
                if hasattr(msg, "id"):
                    entry["id"] = msg.id
                if hasattr(msg, "additional_kwargs"):
                    entry["additional_kwargs"] = msg.additional_kwargs
            
            formatted.append(entry)
        
        return formatted
    
    @staticmethod
    def find_last_user_message(messages: List) -> tuple:
        """查找最后一条用户消息及其索引"""
        for i in range(len(messages) - 1, -1, -1):
            if isinstance(messages[i], HumanMessage):
                return i, messages[i].content
        return -1, None