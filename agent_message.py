# agent_messages.py
"""
带元数据的消息类，继承自 LangChain 原生消息类。
使用方式：只需将 AIMessage 替换为 AIMessageWithMeta，其他代码完全不需要改动。
"""
from copy import copy

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage, BaseMessage
from typing import Any, Dict, Optional, List
import uuid
import time


# ============ 混入类 ============

class MessageMetadataMixin:
    """消息元数据混入类"""
    
    def __init__(self, *args, **kwargs):
        # 生成 ID
        if not kwargs.get("id"):
            class_name = self.__class__.__name__
            kwargs["id"] = f"{class_name}_{uuid.uuid4().hex[:8]}_{int(time.time())}"
        
        # 添加元数据
        if "additional_kwargs" not in kwargs:
            kwargs["additional_kwargs"] = {}
        
        if "_metadata" not in kwargs["additional_kwargs"]:
            kwargs["additional_kwargs"]["_metadata"] = {}
        
        if "created_at" not in kwargs["additional_kwargs"]["_metadata"]:
            kwargs["additional_kwargs"]["_metadata"]["created_at"] = time.time()
        
        kwargs["additional_kwargs"]["_metadata"]["updated_at"] = time.time()
        
        super().__init__(*args, **kwargs)

    def ensure_id(self):
        """确保 id 存在（用于反序列化后补救）"""
        if not getattr(self, "id", None):
            class_name = self.__class__.__name__
            self.id = f"{class_name}_{uuid.uuid4().hex[:8]}_{int(time.time() * 1000)}"
        return self.id
    
    def get_id(self) -> str:
        """安全获取 id，如果没有则生成"""
        return getattr(self, "id", None) or self.ensure_id()


# ============ 带元数据的消息类 ============
# 继承自原生消息类，所以 isinstance(..., AIMessage) 等判断全部有效

class HumanMessageWithMeta(MessageMetadataMixin, HumanMessage):
    pass


class AIMessageWithMeta(MessageMetadataMixin, AIMessage):
    pass


class ToolMessageWithMeta(MessageMetadataMixin, ToolMessage):
    pass


class SystemMessageWithMeta(MessageMetadataMixin, SystemMessage):
    pass


# ============ 工具函数 ============

def get_message_metadata(msg) -> dict:
    """获取消息的元数据"""
    metadata = {
        "id": getattr(msg, "id", None),
        "type": type(msg).__name__,
    }
    
    additional_kwargs = getattr(msg, "additional_kwargs", {})
    if "_metadata" in additional_kwargs:
        metadata.update(additional_kwargs["_metadata"])
    
    return metadata


def is_system_generated(msg) -> bool:
    """判断是否是系统生成的消息"""
    if not isinstance(msg, AIMessage):
        return False
    additional_kwargs = getattr(msg, "additional_kwargs", {})
    return additional_kwargs.get("is_system_message", False)


def print_message_info(msg):
    """打印消息信息（调试用）"""
    msg_type = type(msg).__name__
    msg_id = getattr(msg, "id", "无ID")
    content_preview = str(msg.content)[:50] if msg.content else "(空)"
    
    print(f"[{msg_type}] id={msg_id}, content={content_preview}...")
    
    if isinstance(msg, AIMessage):
        tool_calls = getattr(msg, "tool_calls", [])
        if tool_calls:
            print(f"  tool_calls: {[tc.get('name') for tc in tool_calls]}")
    
    if isinstance(msg, ToolMessage):
        print(f"  tool_call_id: {getattr(msg, 'tool_call_id', '无')}")


def convert_to_meta_message(msg: BaseMessage) -> BaseMessage:
    """将原生消息转换为带元数据的消息，保留原有的 id 和 created_at"""
    
    # 如果已经是带元数据的消息，直接返回
    if hasattr(msg, "_meta_converted") and msg._meta_converted:
        return msg
    
    # 如果已经是 WithMeta 类型（通过类名判断）
    if type(msg).__name__ in ["HumanMessageWithMeta", "AIMessageWithMeta", 
                               "ToolMessageWithMeta", "SystemMessageWithMeta"]:
        if not getattr(msg, "id", None):
            msg.id = f"{type(msg).__name__}_{uuid.uuid4().hex[:8]}_{int(time.time() * 1000)}"
        return msg

    # 2. 检查转换标记
    if hasattr(msg, "_meta_converted") and msg._meta_converted:
        return msg
    
    msg_type = type(msg)
     # 3. 深拷贝 additional_kwargs
    additional_kwargs = getattr(msg, "additional_kwargs", {}) or {}
    msg_id = getattr(msg, "id", None)
    
    # 4 处理 metadata
    if "_metadata" not in additional_kwargs:
        additional_kwargs["_metadata"] = {}
    
    # 如果已有 created_at，保留；否则创建
    if "created_at" not in additional_kwargs["_metadata"]:
        additional_kwargs["_metadata"]["created_at"] = time.time()
    
    additional_kwargs["_metadata"]["updated_at"] = time.time()
    
    # 创建新消息
    if msg_type == HumanMessage:
        new_msg = HumanMessageWithMeta(
            content=msg.content,
            additional_kwargs=additional_kwargs.copy(),
            id=msg_id,
        )
    elif msg_type == AIMessage:
        new_msg = AIMessageWithMeta(
            content=msg.content,
            tool_calls=getattr(msg, "tool_calls", []).copy(),
            additional_kwargs=additional_kwargs.copy(),
            id=msg_id,
        )
    elif msg_type == ToolMessage:
        new_msg = ToolMessageWithMeta(
            content=msg.content,
            tool_call_id=getattr(msg, "tool_call_id", ""),
            additional_kwargs=additional_kwargs.copy(),
            id=msg_id,
        )
    elif msg_type == SystemMessage:
        new_msg = SystemMessageWithMeta(
            content=msg.content,
            additional_kwargs=additional_kwargs.copy(),
            id=msg_id,
        )
    else:
        return msg
    
    new_msg._meta_converted = True
    return new_msg


def convert_messages_to_meta(messages: list) -> list:
    """批量转换消息"""
    return [convert_to_meta_message(msg) for msg in messages]