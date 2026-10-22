# context_compressor.py
"""
上下文压缩器：将完整对话历史压缩为适合 AI 调用的精简上下文
支持：智能摘要、历史裁剪、Token 控制
"""

from typing import List, Dict, Any, Optional, Tuple
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from datetime import datetime
import tiktoken
import logging
logger = logging.getLogger(__name__)

import re


# ============ 配置 ============
ENCODING = tiktoken.get_encoding("cl100k_base")
MAX_CONTEXT_TOKENS = 1000000
TARGET_CONTEXT_TOKENS = MAX_CONTEXT_TOKENS * 0.75  # 目标使用率 75%

# 压缩配置
MAX_SUMMARY_TOKENS = 500       # 摘要最大 Token
KEEP_RECENT_COUNT = 15         # 保留的最近消息数
KEEP_IMPORTANT_COUNT = 5       # 保留的重要消息数（如包含工具调用）


def count_tokens(text: str) -> int:
    """估算 token 数量"""
    if not text:
        return 0
    try:
        return len(ENCODING.encode(str(text)))
    except Exception:
        return int(len(str(text)) / 2.5)


def count_messages_tokens(messages: List[BaseMessage]) -> int:
    """计算消息列表总 Token"""
    total = 0
    for msg in messages:
        content = getattr(msg, 'content', '')
        total += count_tokens(str(content))
        
        if hasattr(msg, 'tool_calls') and msg.tool_calls:
            for tc in msg.tool_calls:
                total += count_tokens(str(tc.get('args', {})))
                total += count_tokens(tc.get('name', ''))
    
    return total


# ============ 上下文压缩器 ============

class ContextCompressor:
    """
    上下文压缩器
    维护两个视图：
    1. full_history: 完整的对话历史（用户可见）
    2. compressed_context: 压缩后的上下文（发送给 AI）
    """
    
    def __init__(
        self,
        max_tokens: int = MAX_CONTEXT_TOKENS,
        target_tokens: int = TARGET_CONTEXT_TOKENS,
        keep_recent: int = KEEP_RECENT_COUNT,
        keep_important: int = KEEP_IMPORTANT_COUNT,
        max_summary_tokens: int = MAX_SUMMARY_TOKENS
    ):
        self.max_tokens = max_tokens
        self.target_tokens = target_tokens
        self.keep_recent = keep_recent
        self.keep_important = keep_important
        self.max_summary_tokens = max_summary_tokens
    
    def compress(
        self,
        messages: List[BaseMessage],
        system_prompt: Optional[str] = None
    ) -> Tuple[List[BaseMessage], Dict[str, Any]]:
        """
        压缩消息列表
        
        Args:
            messages: 完整的消息列表
            system_prompt: 系统提示词（可选）
            
        Returns:
            (compressed_messages, compression_info)
        """
        if not messages:
            return [], {'status': 'empty', 'message': '没有消息'}
        
        original_count = len(messages)
        original_tokens = count_messages_tokens(messages)
        
        # 如果 Token 未超限，直接返回
        if original_tokens <= self.target_tokens:
            return messages, {
                'status': 'no_compression',
                'original_count': original_count,
                'original_tokens': original_tokens,
                'message': f'Token 未超限 ({original_tokens}/{self.target_tokens})'
            }
        
        # 分离 SystemMessage
        system_messages = []
        other_messages = []
        
        for msg in messages:
            if isinstance(msg, SystemMessage):
                system_messages.append(msg)
            else:
                other_messages.append(msg)
        
        # 如果提供了 system_prompt，创建 SystemMessage
        if system_prompt and not system_messages:
            system_messages = [SystemMessage(content=system_prompt)]
        
        # 1. 标记重要消息（包含工具调用的消息）
        important_messages = []
        normal_messages = []
        
        for msg in other_messages:
            if self._is_important(msg):
                important_messages.append(msg)
            else:
                normal_messages.append(msg)
        
        # 2. 保留最近的消息
        recent_messages = normal_messages[-self.keep_recent:] if normal_messages else []
        older_messages = normal_messages[:-self.keep_recent] if normal_messages else []
        
        # 3. 从重要消息中保留最近的
        important_recent = important_messages[-self.keep_important:] if important_messages else []
        important_older = important_messages[:-self.keep_important] if important_messages else []
        
        # 4. 构建压缩后的消息列表
        compressed = list(system_messages)
        
        # 如果有被压缩的历史消息，添加摘要
        if older_messages or important_older:
            summary = self._generate_summary(older_messages + important_older)
            if summary:
                compressed.append(HumanMessage(
                    content=f"📌 [历史对话摘要]\n{summary}"
                ))
        
        # 添加重要消息（最近的重要消息）
        if important_recent:
            # 添加分隔提示
            compressed.append(HumanMessage(
                content="📋 [以下是涉及工具调用的关键对话]"
            ))
            compressed.extend(important_recent)
        
        # 添加最近的消息
        if recent_messages:
            compressed.append(HumanMessage(
                content=f"📝 [以下是最近的 {len(recent_messages)} 条对话]"
            ))
            compressed.extend(recent_messages)
        
        # 如果压缩后还是超限，进一步裁剪
        compressed_tokens = count_messages_tokens(compressed)
        if compressed_tokens > self.max_tokens:
            compressed = self._force_trim(compressed)
        
        compressed_tokens_final = count_messages_tokens(compressed)
        
        return compressed, {
            'status': 'compressed',
            'original_count': original_count,
            'original_tokens': original_tokens,
            'compressed_count': len(compressed),
            'compressed_tokens': compressed_tokens_final,
            'kept_recent': len(recent_messages),
            'kept_important': len(important_recent),
            'summary_tokens': self.max_summary_tokens,
            'compression_ratio': f"{round((1 - compressed_tokens_final / original_tokens) * 100)}%",
            'message': f'压缩完成: {original_count} -> {len(compressed)} 条消息'
        }
    
    def _is_important(self, msg: BaseMessage) -> bool:
        """判断消息是否重要（包含工具调用）"""
        if isinstance(msg, AIMessage):
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                return True
        if isinstance(msg, ToolMessage):
            return True
        return False
    
    def _generate_summary(self, messages: List[BaseMessage]) -> str:
        """
        生成对话摘要
        这里使用简单的统计摘要，实际可以调用 AI 生成摘要
        """
        if not messages:
            return ""
        
        # 统计消息类型
        human_count = sum(1 for m in messages if isinstance(m, HumanMessage))
        ai_count = sum(1 for m in messages if isinstance(m, AIMessage))
        tool_count = sum(1 for m in messages if isinstance(m, ToolMessage))
        
        # 提取关键话题（前几条用户消息）
        user_messages = [m for m in messages if isinstance(m, HumanMessage)]
        topics = []
        for i, msg in enumerate(user_messages[:3]):
            content = str(getattr(msg, 'content', ''))
            if len(content) > 50:
                topics.append(content[:50] + "...")
            elif content:
                topics.append(content)
        
        summary_parts = [
            f"共压缩了 {len(messages)} 条历史消息：",
            f"- 用户消息: {human_count} 条",
            f"- 助手回复: {ai_count} 条",
            f"- 工具调用: {tool_count} 条",
        ]
        
        if topics:
            summary_parts.append(f"\n主要话题：\n- " + "\n- ".join(topics))
        
        summary_parts.append("\n（以上为历史对话摘要，如需详细信息请询问用户）")
        
        return "\n".join(summary_parts)
    
    def _force_trim(self, messages: List[BaseMessage]) -> List[BaseMessage]:
        """强制裁剪消息（最后手段）"""
        # 保留 SystemMessage + 最近 10 条
        system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
        other_msgs = [m for m in messages if not isinstance(m, SystemMessage)]
        
        trimmed = system_msgs + other_msgs[-10:]
        
        # 如果还是超限，只保留最近 5 条
        if count_messages_tokens(trimmed) > self.max_tokens:
            trimmed = system_msgs + other_msgs[-5:]
        
        return trimmed


# ============ 便捷函数 ============

def compress_for_ai(
    messages: List[BaseMessage],
    system_prompt: Optional[str] = None,
    max_tokens: int = MAX_CONTEXT_TOKENS,
    target_tokens: int = TARGET_CONTEXT_TOKENS
) -> Tuple[List[BaseMessage], Dict[str, Any]]:
    """
    压缩消息用于 AI 调用
    
    Args:
        messages: 完整消息列表
        system_prompt: 系统提示词
        max_tokens: 最大 Token 限制
        target_tokens: 目标 Token 限制
        
    Returns:
        (compressed_messages, compression_info)
    """
    compressor = ContextCompressor(
        max_tokens=max_tokens,
        target_tokens=target_tokens
    )
    return compressor.compress(messages, system_prompt)


def get_full_history(messages: List[BaseMessage]) -> List[Dict[str, Any]]:
    """
    获取完整的对话历史（用于用户显示）
    
    Returns:
        格式化的消息列表
    """
    result = []
    for msg in messages:
        entry = {
            'type': msg.__class__.__name__,
            'content': getattr(msg, 'content', ''),
        }
        
        if isinstance(msg, HumanMessage):
            entry['role'] = 'user'
        elif isinstance(msg, AIMessage):
            entry['role'] = 'assistant'
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                entry['tool_calls'] = [
                    {'name': tc.get('name'), 'args': tc.get('args')}
                    for tc in msg.tool_calls
                ]
        elif isinstance(msg, ToolMessage):
            entry['role'] = 'tool'
            if hasattr(msg, 'tool_call_id'):
                entry['tool_call_id'] = msg.tool_call_id
        
        result.append(entry)
    
    return result

# 在文件末尾添加


# ============ 异常消息检测 ============

ERROR_PATTERNS = [
    r"❌ 调用模型时出错",
    r"Error code: \d+",
    r"\"error\".*\"message\"",
    r"API Key 认证失败",
    r"请求太频繁",
    r"tool_calls.*must be followed by tool messages",
    r"Messages with role 'tool'.*preceding message",
    r"context.*exceed",
    r"maximum context",
    r"traceback",
    r"Exception:",
    r"❌ 出错了",
    r"操作已取消",
    r"操作已中断",
]

def is_error_message(content: str) -> bool:
    """判断消息内容是否是错误信息"""
    if not content:
        return False
    
    content_lower = content.lower()
    for pattern in ERROR_PATTERNS:
        if re.search(pattern, content_lower, re.IGNORECASE):
            return True
    
    # 额外检查：如果消息以 "❌" 开头且包含 "错误" 或 "失败"
    if content.strip().startswith("❌") and ("错误" in content or "失败" in content or "出错" in content):
        return True
    
    # 检查是否是纯 JSON 错误（包含 error 字段）
    if content.strip().startswith("{") and '"error"' in content:
        return True
    
    return False


def is_tool_error_message(content: str) -> bool:
    """判断 ToolMessage 是否是错误结果"""
    if not content:
        return False
    
    error_indicators = ["工具执行出错", "未找到工具", "❌", "失败", "timeout", "超时"]
    for indicator in error_indicators:
        if indicator in content:
            return True
    return False


def filter_abnormal_conversation(messages: List[BaseMessage]) -> List[BaseMessage]:
    """
    过滤异常对话对（用户消息 + 对应的错误响应）
    
    策略：
    1. 遍历消息列表，标记所有异常消息
    2. 删除包含异常的 AI 消息及其对应的用户消息
    3. 删除孤立的错误 ToolMessage
    
    返回过滤后的消息列表
    """
    if not messages:
        return messages
    
    # 第一步：找出所有需要删除的消息索引
    to_remove = set()
    
    for i, msg in enumerate(messages):
        # 检查 AIMessage 是否是错误响应
        if isinstance(msg, AIMessage):
            content = getattr(msg, 'content', '')
            if is_error_message(content):
                to_remove.add(i)
                # 找前面的用户消息（HumanMessage）
                for j in range(i - 1, -1, -1):
                    if isinstance(messages[j], HumanMessage):
                        to_remove.add(j)
                        break
                # 如果前面还有 ToolMessage，也删除（工具错误）
                for j in range(i - 1, -1, -1):
                    if isinstance(messages[j], ToolMessage):
                        if is_tool_error_message(getattr(messages[j], 'content', '')):
                            to_remove.add(j)
                        # 继续往前找，直到不是 ToolMessage
                        if j > 0 and not isinstance(messages[j-1], ToolMessage):
                            break
        
        # 检查 ToolMessage 是否是错误结果（且没有对应的错误 AIMessage 被删除）
        if isinstance(msg, ToolMessage) and is_tool_error_message(getattr(msg, 'content', '')):
            # 检查前面是否有对应的 AIMessage
            has_matching_error = False
            for j in range(i - 1, -1, -1):
                if isinstance(messages[j], AIMessage):
                    if is_error_message(getattr(messages[j], 'content', '')):
                        has_matching_error = True
                        break
                    break
            # 如果没有匹配的错误 AIMessage，删除这个 ToolMessage
            if not has_matching_error:
                to_remove.add(i)
    
    # 第二步：构建过滤后的消息列表
    filtered = []
    for i, msg in enumerate(messages):
        if i not in to_remove:
            filtered.append(msg)
    
    # 第三步：如果有被删除的消息，记录日志
    removed_count = len(messages) - len(filtered)
    if removed_count > 0:
        logger.info(f"🧹 过滤异常对话: 删除了 {removed_count} 条异常消息")
        
        # 输出被删除的消息信息（用于调试）
        for i in sorted(to_remove):
            msg = messages[i]
            msg_type = msg.__class__.__name__
            content = getattr(msg, 'content', '')
            preview = content[:50] + '...' if len(str(content)) > 50 else content
            logger.info(f"   🗑️ 删除 [{i}] {msg_type}: {preview}")
    
    return filtered


def compress_with_filter(
    messages: List[BaseMessage],
    system_prompt: Optional[str] = None,
    max_tokens: int = MAX_CONTEXT_TOKENS,
    target_tokens: int = TARGET_CONTEXT_TOKENS
) -> Tuple[List[BaseMessage], Dict[str, Any]]:
    """
    先过滤异常对话，再压缩上下文
    
    Args:
        messages: 完整消息列表
        system_prompt: 系统提示词
        max_tokens: 最大 Token 限制
        target_tokens: 目标 Token 限制
        
    Returns:
        (compressed_messages, compression_info)
    """
    # 第一步：过滤异常对话
    filtered_messages = filter_abnormal_conversation(messages)
    
    # 第二步：压缩
    compressor = ContextCompressor(
        max_tokens=max_tokens,
        target_tokens=target_tokens
    )
    compressed, info = compressor.compress(filtered_messages, system_prompt)
    
    # 添加过滤信息到压缩信息中
    info['filtered_count'] = len(messages) - len(filtered_messages)
    info['filtered_messages'] = len(filtered_messages)
    
    return compressed, info