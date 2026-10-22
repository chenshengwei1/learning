# logger.py
import logging
import os
import json
from datetime import datetime
from pathlib import Path
import hashlib
import builtins


LOG_DIR = Path(__file__).parent / "logs"
_loggers = {}

# ========== 配置 ==========
MAX_LOG_LENGTH = 500  # 每条日志最大字符数
MAX_TOOL_RESULT_LENGTH = 200  # 工具结果最大字符数
MAX_MESSAGES_LOG = 10  # 最多记录前几条消息
LOG_LEVEL = logging.INFO  # 改为 INFO，不记录 DEBUG

def get_logger(session_id: str = "default"):
    """获取指定会话的日志记录器"""
    LOG_DIR.mkdir(exist_ok=True)
    
    today = datetime.now().strftime("%Y-%m-%d")
    logger_name = f"LeaningAgent_{session_id}"
    
    if logger_name in _loggers:
        return _loggers[logger_name]
    
    logger = logging.getLogger(logger_name)
    logger.setLevel(LOG_LEVEL)  # 使用 INFO 级别
    
    if logger.handlers:
        _loggers[logger_name] = logger
        return logger
    
    # 文件 handler
    log_file = LOG_DIR / f"{session_id}_{today}.log"
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(LOG_LEVEL)
    
    # 控制台 handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(LOG_LEVEL)
    
    # 简化格式化器（减少冗余）
    file_formatter = logging.Formatter(
        '[%(asctime)s] %(message)s',
        datefmt='%H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    console_handler.setFormatter(file_formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    logger.info(f"📝 日志文件：{log_file}")
    
    _loggers[logger_name] = logger
    return logger


def setup_logger():
    return get_logger("default")


def truncate(text, max_length=MAX_LOG_LENGTH):
    """截断过长的文本"""
    text = str(text)
    if len(text) <= max_length:
        return text
    return text[:max_length] + f"... [截断，共{len(text)}字符]"


def log_user_message(logger, content):
    """记录用户输入（精简）"""
    preview = truncate(content, 100)
    print(f"👤 {preview}")
    logger.info(f"👤 用户: {preview}")


def log_api_request(logger, messages, tools=None):
    """记录 API 请求（精简）"""
    msg_count = len(messages)
    print(f"📤 API 请求: {msg_count} 条消息")
    
    # 只记录消息数量和类型摘要，不记录完整内容
    msg_summary = []
    for i, msg in enumerate(messages[:MAX_MESSAGES_LOG]):
        role = getattr(msg, 'type', getattr(msg, 'role', 'unknown'))
        content_len = len(str(getattr(msg, 'content', '')))
        has_tool_calls = hasattr(msg, 'tool_calls') and msg.tool_calls
        summary = f"{role}({content_len}字符)"
        if has_tool_calls:
            summary += f" + {len(msg.tool_calls)}个tool_calls"
        msg_summary.append(summary)
    
    logger.info(f"📤 API请求: {msg_count}条 [{', '.join(msg_summary)}]")
    
    if tools:
        tool_names = [t.get('function', {}).get('name', str(t)) for t in tools]
        logger.info(f"   可用工具: {', '.join(tool_names)}")

def log_compression(logger, before_count, after_count, before_tokens, after_tokens):
    """记录上下文压缩事件"""
    ratio = round((1 - after_tokens / before_tokens) * 100) if before_tokens > 0 else 0
    msg = f"📊 上下文压缩: {before_count} -> {after_count} 条, {before_tokens:,} -> {after_tokens:,} tokens (压缩 {ratio}%)"
    print(f"📊 {msg}")
    logger.info(msg)


def log_api_response(logger, response, duration_ms=None):
    """记录 API 响应（精简）"""
    content = getattr(response, 'content', '')
    tool_calls = getattr(response, 'tool_calls', None)
    
    if tool_calls:
        tool_names = [tc.get('name', 'unknown') for tc in tool_calls]
        print(f"📥 API响应: {len(tool_calls)}个工具调用 [{', '.join(tool_names)}]")
        logger.info(f"📥 API响应: {len(tool_calls)}个工具调用 [{', '.join(tool_names)}]")
    elif content:
        preview = truncate(content, 100)
        print(f"📥 API响应: {preview}")
        logger.info(f"📥 API响应: {preview}")
    else:
        logger.info(f"📥 API响应: (空)")


def log_tool_result(logger, tool_name, tool_args, result):
    """记录工具执行结果（精简）"""
    # 只记录工具名称和结果摘要
    result_preview = truncate(str(result), MAX_TOOL_RESULT_LENGTH)
    print(f"🔧 {tool_name}: {result_preview}")
    
    # 但记录到文件时稍微详细一点
    logger.info(f"🔧 {tool_name}: {result_preview}")


def log_error(logger, error_msg, context=""):
    """记录错误（保留完整信息）"""
    print(f"❌ {context}: {error_msg[:200]}")
    logger.error(f"❌ {context}: {error_msg}")


def format_messages(messages):
    """精简格式化（只用于文件日志）"""
    formatted = []
    for i, msg in enumerate(messages[:MAX_MESSAGES_LOG]):
        role = getattr(msg, 'type', getattr(msg, 'role', 'unknown'))
        content = getattr(msg, 'content', '')
        content_preview = truncate(content, 200)
        formatted.append(f"[{i}] {role}: {content_preview}")
    
    if len(messages) > MAX_MESSAGES_LOG:
        formatted.append(f"... 还有 {len(messages) - MAX_MESSAGES_LOG} 条消息")
    
    return "\n".join(formatted)