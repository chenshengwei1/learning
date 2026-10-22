# context_manager.py
"""
上下文管理器：监控和管理对话上下文的 Token 使用情况
支持：Token 估算、预警、自动压缩
"""

import tiktoken
from typing import List, Dict, Any, Optional
from datetime import datetime
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
import logging
logger = logging.getLogger(__name__)

# ============ 配置 ============
# DeepSeek 使用 cl100k_base 编码（与 GPT-4 相同）
ENCODING = tiktoken.get_encoding("cl100k_base")

# 上下文限制（DeepSeek 当前为 64K）
MAX_CONTEXT_TOKENS = 1000000  # 1M

# 预警阈值
WARNING_THRESHOLD = 0.70   # 70%
CAUTION_THRESHOLD = 0.85   # 85%
DANGER_THRESHOLD = 0.95    # 95%

# 自动压缩时保留的最近消息数
KEEP_RECENT_MESSAGES = 20

# ============ Token 计算 ============

def count_tokens(text: str) -> int:
    """
    估算文本的 token 数量
    
    Args:
        text: 要估算的文本
        
    Returns:
        token 数量
    """
    if not text:
        return 0
    try:
        return len(ENCODING.encode(str(text)))
    except Exception:
        # 如果 tiktoken 失败，使用粗略估算（中文约 1.5 字符/token，英文约 4 字符/token）
        # 混合估算：平均 2.5 字符/token
        return int(len(str(text)) / 2.5)


def count_message_tokens(msg: BaseMessage) -> int:
    """
    计算单条消息的 token 数量
    
    Args:
        msg: 消息对象
        
    Returns:
        token 数量
    """
    total = 0
    
    # 计算 content
    content = getattr(msg, 'content', '')
    if content:
        total += count_tokens(str(content))
    
    # 如果是 AIMessage 且有 tool_calls，额外计算
    if isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls') and msg.tool_calls:
        for tc in msg.tool_calls:
            # 工具名称
            name = tc.get('name', '')
            if name:
                total += count_tokens(name)
            # 工具参数
            args = tc.get('args', {})
            if args:
                total += count_tokens(str(args))
            # tool_call_id
            tc_id = tc.get('id', '')
            if tc_id:
                total += count_tokens(tc_id)
    
    # 如果是 ToolMessage，计算 tool_call_id
    if isinstance(msg, ToolMessage) and hasattr(msg, 'tool_call_id') and msg.tool_call_id:
        total += count_tokens(msg.tool_call_id)
    
    # SystemMessage 和 HumanMessage 的额外元数据
    if hasattr(msg, 'additional_kwargs') and msg.additional_kwargs:
        total += count_tokens(str(msg.additional_kwargs))
    
    return total


def count_messages_tokens(messages: List[BaseMessage]) -> Dict[str, Any]:
    """
    计算消息列表的 token 使用情况
    
    Args:
        messages: 消息列表
        
    Returns:
        包含统计信息的字典
    """
    if not messages:
        return {
            'total_tokens': 0,
            'message_count': 0,
            'messages': [],
            'usage_percent': 0.0
        }
    
    total_tokens = 0
    message_stats = []
    
    logger.info(f"开始get_context_status")

    for i, msg in enumerate(messages):
        msg_tokens = count_message_tokens(msg)
        total_tokens += msg_tokens

        logger.info(f"开始i算{i}")
        
        # 获取消息类型
        msg_type = msg.__class__.__name__
        content = getattr(msg, 'content', '')
        content_str = str(content) if content else ''
        
        # 获取角色
        role = getattr(msg, 'type', msg_type.lower())
        
        # 获取 tool_call_id（如果是 ToolMessage）
        tool_call_id = None
        if isinstance(msg, ToolMessage) and hasattr(msg, 'tool_call_id'):
            tool_call_id = msg.tool_call_id
        
        # 获取 tool_calls（如果是 AIMessage）
        tool_calls_count = 0
        if isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls') and msg.tool_calls:
            tool_calls_count = len(msg.tool_calls)
        
        message_stats.append({
            'index': i,
            'type': msg_type,
            'role': role,
            'tokens': msg_tokens,
            'tool_call_id': tool_call_id,
            'tool_calls_count': tool_calls_count,
            'content_preview': content_str[:80] + '...' if len(content_str) > 80 else content_str,
            'content_length': len(content_str)
        })
    
    usage_percent = round(total_tokens / MAX_CONTEXT_TOKENS * 100, 2)

    logger.info(f"End of count_messages_tokens {usage_percent}")
    
    return {
        'total_tokens': total_tokens,
        'message_count': len(messages),
        'messages': message_stats,
        'usage_percent': usage_percent,
        'max_tokens': MAX_CONTEXT_TOKENS,
        'remaining_tokens': max(0, MAX_CONTEXT_TOKENS - total_tokens)
    }


# ============ 上下文状态 ============

def get_context_status(messages: List[BaseMessage]) -> Dict[str, Any]:
    """
    获取上下文状态和预警级别
    
    Args:
        messages: 消息列表
        
    Returns:
        包含状态信息的字典
    """

    logger.info(f"开始get_context_status")
    stats = count_messages_tokens(messages)
    usage = stats['usage_percent']
    
    # 判断预警级别
    if usage >= DANGER_THRESHOLD * 100:
        level = 'danger'
        level_icon = '🔴'
        level_color = '#e74c3c'
        message = f'⚠️ 上下文使用率达到 {usage:.1f}%，即将超出限制！建议压缩或重置。'
        action_suggested = 'compress'
    elif usage >= CAUTION_THRESHOLD * 100:
        level = 'caution'
        level_icon = '🟠'
        level_color = '#f39c12'
        message = f'⚡ 上下文使用率达到 {usage:.1f}%，建议注意。'
        action_suggested = 'monitor'
    elif usage >= WARNING_THRESHOLD * 100:
        level = 'warning'
        level_icon = '🟡'
        level_color = '#f1c40f'
        message = f'📊 上下文使用率达到 {usage:.1f}%'
        action_suggested = 'monitor'
    else:
        level = 'normal'
        level_icon = '🟢'
        level_color = '#2ecc71'
        message = f'✅ 上下文使用率 {usage:.1f}%，状态正常'
        action_suggested = 'none'
    
    stats['level'] = level
    stats['level_icon'] = level_icon
    stats['level_color'] = level_color
    stats['level_message'] = message
    stats['action_suggested'] = action_suggested
    stats['thresholds'] = {
        'warning': int(WARNING_THRESHOLD * 100),
        'caution': int(CAUTION_THRESHOLD * 100),
        'danger': int(DANGER_THRESHOLD * 100)
    }

    format_context_status(stats)
    
    return stats


def should_compress(messages: List[BaseMessage]) -> bool:
    """
    判断是否应该自动压缩上下文
    
    Args:
        messages: 消息列表
        
    Returns:
        True 表示需要压缩
    """
    stats = count_messages_tokens(messages)
    return stats['usage_percent'] >= DANGER_THRESHOLD * 100


def get_compress_suggestion(messages: List[BaseMessage]) -> Dict[str, Any]:
    """
    获取压缩建议
    
    Args:
        messages: 消息列表
        
    Returns:
        压缩建议信息
    """
    stats = count_messages_tokens(messages)
    current_count = len(messages)
    
    # 建议保留的消息数
    if current_count <= 10:
        suggested_keep = current_count
    elif current_count <= 20:
        suggested_keep = max(5, current_count // 2)
    else:
        suggested_keep = 20
    
    # 计算压缩后的预估 Token
    # 简化估算：假设每条消息平均 token 数
    avg_tokens_per_msg = stats['total_tokens'] / current_count if current_count > 0 else 0
    estimated_after_compress = int(suggested_keep * avg_tokens_per_msg)
    
    return {
        'current_message_count': current_count,
        'suggested_keep_count': suggested_keep,
        'estimated_tokens_after': estimated_after_compress,
        'estimated_usage_after': round(estimated_after_compress / MAX_CONTEXT_TOKENS * 100, 2)
    }


# ============ 压缩功能 ============

def compress_messages(
    messages: List[BaseMessage], 
    keep_recent: int = KEEP_RECENT_MESSAGES,
    include_summary: bool = True
) -> List[BaseMessage]:
    """
    压缩消息列表
    
    策略：
    1. 保留所有 SystemMessage
    2. 如果消息数量超过 keep_recent，保留最近的 N 条
    3. 可选：添加压缩摘要提示
    
    Args:
        messages: 消息列表
        keep_recent: 保留的最近消息数
        include_summary: 是否添加压缩摘要提示
        
    Returns:
        压缩后的消息列表
    """
    if not messages:
        return messages
    
    if len(messages) <= keep_recent:
        return messages
    
    # 分离 SystemMessage
    system_messages = [msg for msg in messages if isinstance(msg, SystemMessage)]
    other_messages = [msg for msg in messages if not isinstance(msg, SystemMessage)]
    
    # 保留最近的 N 条消息
    recent_messages = other_messages[-keep_recent:]
    
    # 计算被压缩的消息数
    compressed_count = len(other_messages) - keep_recent
    
    if compressed_count <= 0:
        return messages
    
    # 构建压缩后的消息列表
    result = list(system_messages)
    
    # 添加摘要提示
    if include_summary and compressed_count > 0:
        # 尝试从被压缩的消息中提取一些信息
        # 统计被压缩消息的类型分布
        human_count = sum(1 for m in other_messages[:-keep_recent] if isinstance(m, HumanMessage))
        ai_count = sum(1 for m in other_messages[:-keep_recent] if isinstance(m, AIMessage))
        tool_count = sum(1 for m in other_messages[:-keep_recent] if isinstance(m, ToolMessage))
        
        summary_msg = HumanMessage(
            content=f"""📌 上下文压缩提示：
- 之前的 {compressed_count} 条消息（包含 {human_count} 条用户消息、{ai_count} 条助手回复、{tool_count} 条工具调用）已被压缩。
- 以下是最近的 {keep_recent} 条消息，请基于这些继续对话。
- 如果需要了解更早的上下文，请询问用户或重新说明需求。"""
        )
        result.append(summary_msg)
    
    # 添加最近的消息
    result.extend(recent_messages)
    
    return result


def get_compression_summary(messages: List[BaseMessage]) -> Dict[str, Any]:
    """
    获取压缩前和压缩后的对比信息
    
    Args:
        messages: 原始消息列表
        
    Returns:
        对比信息
    """
    before_stats = count_messages_tokens(messages)
    
    compressed = compress_messages(messages)
    after_stats = count_messages_tokens(compressed)
    
    return {
        'before': {
            'message_count': before_stats['message_count'],
            'tokens': before_stats['total_tokens'],
            'usage_percent': before_stats['usage_percent']
        },
        'after': {
            'message_count': after_stats['message_count'],
            'tokens': after_stats['total_tokens'],
            'usage_percent': after_stats['usage_percent']
        },
        'reduction': {
            'message_count': before_stats['message_count'] - after_stats['message_count'],
            'tokens': before_stats['total_tokens'] - after_stats['total_tokens'],
            'usage_percent': before_stats['usage_percent'] - after_stats['usage_percent']
        }
    }


# ============ 格式化输出 ============

def format_context_status(status: Dict[str, Any]) -> str:
    """
    格式化上下文状态为可读字符串
    
    Args:
        status: get_context_status 返回的状态字典
        
    Returns:
        格式化的字符串
    """
    lines = [
        f"{status['level_icon']} 上下文状态: {status['level_message']}",
        f"   📝 消息数: {status['message_count']}",
        f"   🔢 Tokens: {status['total_tokens']:,} / {status['max_tokens']:,}",
        f"   📊 使用率: {status['usage_percent']:.1f}%",
        f"   ⏳ 剩余: {status.get('remaining_tokens', 0):,} tokens",
        f"   🎯 阈值: 警告 {status['thresholds']['warning']}% | 注意 {status['thresholds']['caution']}% | 危险 {status['thresholds']['danger']}%"
    ]

    from tools import check_balance
    try:
        resp = check_balance.invoke()
        status['balance'] = resp
    except Exception as e:
        pass
    
    # 添加消息详情（只显示前5条）
    if status.get('messages'):
        lines.append("   📋 消息详情:")
        for msg in status['messages'][:5]:
            lines.append(f"      [{msg['index']}] {msg['type']}: {msg['tokens']} tokens - {msg['content_preview']}")
        if len(status['messages']) > 5:
            lines.append(f"      ... 还有 {len(status['messages']) - 5} 条")
    
    return "\n".join(lines)