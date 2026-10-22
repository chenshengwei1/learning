# web_server/utils/sanitizer.py
import re


def sanitize_input(user_input: str) -> str:
    """清洗用户输入，防止prompt注入"""
    dangerous_patterns = [
        r"忽略.*指令", r"ignore.*instruction",
        r"system.*prompt", r"之前.*设定"
    ]
    for pattern in dangerous_patterns:
        user_input = re.sub(pattern, "", user_input, flags=re.IGNORECASE)
    
    max_len = 2000
    if len(user_input) > max_len:
        user_input = user_input[:max_len] + "...(截断)"
    
    user_input = ''.join(ch for ch in user_input if ord(ch) >= 32 or ch in '\n\r\t')
    
    return user_input.strip()