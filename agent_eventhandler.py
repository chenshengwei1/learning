# 导入带元数据的消息类
from typing import Any, Dict
import time

from agent_message import (
    HumanMessageWithMeta as HumanMessage,  # 替换原生的 HumanMessage
    AIMessageWithMeta as AIMessage,        # 替换原生的 AIMessage
    ToolMessageWithMeta as ToolMessage,    # 替换原生的 ToolMessage
    SystemMessageWithMeta as SystemMessage,  # 替换原生的 SystemMessage
    convert_to_meta_message)

from agent_dump import object_to_str

import logging
logger = logging.getLogger(__name__)          # 例如 "pkg.my_module"

def formatMessage(msg):
    msg_type = msg.__class__.__name__
    if msg_type == "HumanMessage":
        role = "user"
    elif msg_type == "AIMessage" or msg.type == "ai":
        role = "assistant"
    elif msg_type == "ToolMessage":
        role = "tool"
    else:
        role = msg_type.lower()
    msg_id = getattr(msg, "id", None)
    
    entry = {
        "role": role,
        "content": getattr(msg, "content", ""),
        "type": msg_type,
        "id": msg_id
    }
    
    if isinstance(msg, AIMessage) or msg.type == "ai":
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
    
    return entry

def handler_tool (data, context: Dict[str, Any], *args, **kwargs):
    current_tool_call = None
    name = context['name']
    tool_calls = context['tool_calls']
    for tc in tool_calls:
        if tc.get("name") == name:
            current_tool_call = tc
            break
    tool_call_id = None
    tool_calls_args = None
    if current_tool_call:
        print(f"📡 工具开始: {name}, id={current_tool_call.get('id')}")
        tool_call_id = current_tool_call.get("id")
        tool_calls_args = current_tool_call.get("args")

    yield {
        "type": "tool",
        "tool": name,
        "args": tool_calls_args,
        "id": tool_call_id,
        "tool_call_id": tool_call_id,
        "timestamp": time.time(),
        "tool_calls": tool_calls
    }

def handler_chain_start (data, context: Dict[str, Any], *args, **kwargs):
    name = context['name']
    if name == "agent" or name == "tools" or name == "model":
        yield {
            "type": "node_start",
            "node": name,
            "timestamp": time.time()
        }
        logger.info(f"🔧 {name} 节点开始")
def handler_chain_end (data, context: Dict[str, Any], *args, **kwargs):
    # print("on_chain_end")
    name = context['name']
    tool_calls_buffer = context['tool_calls_buffer']
    # yield {
    #     "type": "test_node_end",
    #     "node": name,
    #     "timestamp": time.time(),
    #     "data":data
    # }
    if name == "model" or name == "agent":
        output = data.get("output", {})
        messages_out = extract_messages(output)
        next_tool_call = []
        # 检查是否有 token 统计
        token_usage = {}
        thinking = ""
        content = ''
        last_msg = None
        if messages_out:
            last_msg = messages_out[-1]
            
            if hasattr(last_msg, "additional_kwargs"):
                token_usage = last_msg.additional_kwargs.get("token_usage", {})
            
            # 提取思考内容（DeepSeek）
            
            if hasattr(last_msg, "additional_kwargs"):
                thinking = last_msg.additional_kwargs.get("reasoning_content", "")
            
            content = last_msg.content

            if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                for call in last_msg.tool_calls:
                    tool_calls_buffer.append(call)
                    next_tool_call.append(call)
                
            logger.debug(f"📊 Agent 节点完成, token: {token_usage.get('total_tokens', 0)}")
            logger.debug(f"📊 Agent 节点完成, tool_calls_buffer: {next_tool_call}")
        logger.debug(f"📊 Agent 节点完成, last_msg: {last_msg}")
        logger.debug(f"📊 Agent 节点完成, output: {output}")
        yield {
            "type": "node_end",
            "node": name,
            "token_usage": token_usage,
            "thinking": thinking,
            "content" : content,
            "timestamp": time.time(),
            "ref":output,
            "message": formatMessage(last_msg if messages_out else AIMessage(content = 'dump message'))
        }

        if next_tool_call:
            yield {
                "type": "tool_calls_decision",
                "tool_calls": next_tool_call,
                "timestamp": time.time()
            }

    elif name == "tools":
        output = data.get("output", {})
        messages_out = extract_messages(output)

        # ✅ 取最后一个 ToolMessage（当前工具结果）
        current_tool_msg = None
        if messages_out:
            current_tool_msg = messages_out[-1]
        
        yield {
            "type": "node_end",
            "node": "tools",
            "tool": name,
            "id": data.get("id", ""),
            "tool_call_id": data.get("tool_call_id", ""),
            "timestamp": time.time(),
            "ref":output,
            "message": formatMessage(current_tool_msg if current_tool_msg else ToolMessage(content = 'dump message', tool_call_id=f'dump-{time.time()}'))
        }
    elif name == "agent" or name == "tools" or name == "model":
        yield {
            "type": "node_end",
            "node": name,
            "id": data.get("id", ""),
            "ref":output,
            "timestamp": time.time()
        }
def handler_chat_model_stream(data, context: dict, *args, **kwargs):
    # print("on_chain_stream")
    chunk = data.get("chunk", {})
    tool_calls_buffer = context['tool_calls_buffer']
    name = context['name']
    
    # ✅ 处理 thinking (reasoning_content)
    if hasattr(chunk, "additional_kwargs"):
        thinking = chunk.additional_kwargs.get("reasoning_content", "")
        if thinking:
            yield {
                "type": "thinking",
                "content": thinking,
                "timestamp": time.time()
            }
    if hasattr(chunk, "content") and chunk.content:
        yield {
            "type": "content",
            "name": name,
            "content": chunk.content,
            "timestamp": time.time()
        }
    
    # 如果包含 tool_calls
    # 累积 tool_calls（过滤空 name）
    if hasattr(chunk, "tool_calls") and chunk.tool_calls:
        for call in chunk.tool_calls:
            # tool_calls_buffer.append(call)
            pass

def extract_messages(output):
    """
    兼容两种 output 结构：
    A: [{"goto": [...], "update": {"messages": [...]}}, ...]
    B: {"messages": [...]}
    返回合并后的 messages 列表（A 会合并多个 update 里的 messages）
    """
    # 形态 B：直接是 dict
    if isinstance(output, dict):
        return output.get("messages", [])
    
    # 形态 A：list of {"goto": ..., "update": {...}}
    if isinstance(output, list):
        result = []
        for item in output:
            msgs = _extract_messages_from_item(item)
            if msgs:
                result.extend(msgs)
        return result
    
    # 兜底
    return []

def _extract_messages_from_item(item):
    """从单个 item 中提取 messages，兼容 Command / dict / 对象"""
    if item is None:
        return []

    # 1) Command 对象：有 .update
    if hasattr(item, "update"):
        update = item.update
        if isinstance(update, dict):
            return update.get("messages", [])
        # update 也可能是带 messages 属性的对象
        if hasattr(update, "messages"):
            return update.messages or []

    # 2) dict：{"goto": ..., "update": {...}} 或 {"messages": [...]}
    if isinstance(item, dict):
        update = item.get("update")
        if isinstance(update, dict) and update.get("messages"):
            return update["messages"]
        if item.get("messages"):
            return item["messages"]

    # 3) 对象：直接有 .messages 属性
    if hasattr(item, "messages"):
        return item.messages or []

    return []