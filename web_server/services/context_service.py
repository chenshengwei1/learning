# web_server/services/context_service.py
from typing import List, Dict, Any

from context_manager import get_context_status, compress_messages, get_compress_suggestion
from context_compressor import compress_for_ai, count_messages_tokens
from agent_message import HumanMessageWithMeta as HumanMessage


class ContextService:
    """上下文管理服务"""
    
    @staticmethod
    def get_status(messages: List) -> Dict[str, Any]:
        """获取上下文状态"""
        return get_context_status(messages)
    
    @staticmethod
    def get_suggestion(messages: List) -> Dict[str, Any]:
        """获取压缩建议"""
        return get_compress_suggestion(messages)
    
    @staticmethod
    def compress(messages: List, keep_recent: int = 20, include_summary: bool = True) -> List:
        """压缩消息"""
        return compress_messages(messages, keep_recent, include_summary)
    
    @staticmethod
    def compress_for_ai(messages: List, system_prompt: str = "") -> tuple:
        """为AI压缩上下文"""
        return compress_for_ai(messages, system_prompt)
    
    @staticmethod
    def count_tokens(messages: List) -> int:
        """计算消息token数"""
        return count_messages_tokens(messages)
    
    @staticmethod
    def get_auto_name(messages: List) -> str:
        """从消息中提取会话名称"""
        for msg in messages:
            if isinstance(msg, HumanMessage):
                return msg.content
        return None