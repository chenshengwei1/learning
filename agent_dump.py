import json
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import Any, Set, Optional, Union, List, Dict
import types
import sys

def object_to_str(
    obj: Any,
    indent: int = 2,
    ensure_ascii: bool = False,
    max_depth: int = 10,
    include_class: bool = False,
    skip_private: bool = True,
    skip_failed: bool = True,
    max_str_len: int = 1000
) -> str:
    """
    将任意 Python 对象转换为 JSON 格式字符串（纯标准库）
    
    特性：
    - 自动跳过不可序列化的属性（文件句柄、数据库连接、函数等）
    - 处理循环引用
    - 深度限制防止递归爆炸
    - 属性处理失败时自动跳过，不影响整体
    - 支持 __slots__ 类
    - 支持自定义类的 __dict__
    
    Args:
        obj: 任意 Python 对象
        indent: 缩进空格数，默认2
        ensure_ascii: 是否转义非ASCII字符，默认False（显示中文）
        max_depth: 最大递归深度，默认10
        include_class: 是否在输出中包含类名
        skip_private: 是否跳过私有属性（以_开头），默认True
        skip_failed: 是否跳过处理失败的属性，默认True
        max_str_len: 字符串最大长度，超过则截断
    
    Returns:
        str: JSON 格式的字符串
    
    Examples:
        >>> class Person:
        ...     def __init__(self, name, age):
        ...         self.name = name
        ...         self.age = age
        ...         self.file = open('/dev/null')  # 不可序列化，会被跳过
        >>> p = Person("Alice", 30)
        >>> print(object_to_str(p))
        {
          "name": "Alice",
          "age": 30
        }
    """
    # 用于检测循环引用
    _seen_ids: Set[int] = set()
    # 用于记录跳过的属性（调试用）
    _skipped_props: List[Dict] = []
    # 当前深度
    _current_depth = 0
    
    def _is_serializable(value: Any) -> bool:
        """检查值是否可以被 JSON 序列化"""
        # 基本类型可以直接序列化
        if isinstance(value, (str, int, float, bool, type(None))):
            return True
        
        # 容器类型需要递归检查
        if isinstance(value, (dict, list, tuple, set, frozenset)):
            return True
        
        # 日期时间可以通过 default 处理
        if isinstance(value, (datetime, date, time, timedelta)):
            return True
        
        # Decimal 可以通过 default 处理
        if isinstance(value, Decimal):
            return True
        
        # 其他类型可能不可序列化
        return False
    
    def _get_safe_value(value: Any, depth: int = 0) -> Any:
        """安全获取值，如果失败则返回占位符"""
        try:
            return _convert(value, depth)
        except Exception as e:
            if skip_failed:
                return f"<属性处理失败: {type(value).__name__} - {str(e)[:50]}>"
            raise
    
    def _is_file_object(obj: Any) -> bool:
        """检测是否是文件对象"""
        # 检查常见的文件对象特征
        if hasattr(obj, 'read') and hasattr(obj, 'write') and hasattr(obj, 'close'):
            return True
        # 检查是否在 io 模块中
        if hasattr(obj, '__module__') and obj.__module__ in ('_io', 'io'):
            return True
        return False
    
    def _is_connection_object(obj: Any) -> bool:
        """检测是否是数据库连接对象"""
        # SQLite3
        if hasattr(obj, 'cursor') and hasattr(obj, 'execute') and hasattr(obj, 'commit'):
            return True
        # 通用数据库连接特征
        if hasattr(obj, 'connect') and hasattr(obj, 'close'):
            return True
        return False
    
    def _is_unserializable_type(obj: Any) -> bool:
        """检测是否是已知的不可序列化类型"""
        # 文件对象
        if _is_file_object(obj):
            return True
        
        # 数据库连接
        if _is_connection_object(obj):
            return True
        
        # 生成器
        if isinstance(obj, types.GeneratorType):
            return True
        
        # 协程
        if isinstance(obj, types.CoroutineType):
            return True
        
        # 函数/Lambda
        if isinstance(obj, (types.FunctionType, types.LambdaType, 
                           types.BuiltinFunctionType, types.MethodType)):
            return True
        
        # 类本身（type）
        if isinstance(obj, type):
            return True
        
        # 模块
        if isinstance(obj, types.ModuleType):
            return True
        
        # 锁对象（threading）
        if hasattr(obj, 'acquire') and hasattr(obj, 'release') and hasattr(obj, 'locked'):
            return True
        
        # 事件对象（threading）
        if hasattr(obj, 'wait') and hasattr(obj, 'set') and hasattr(obj, 'clear'):
            return True
        
        # 队列
        if hasattr(obj, 'put') and hasattr(obj, 'get') and hasattr(obj, 'qsize'):
            return True
        
        return False
    
    def _convert(obj: Any, depth: int = 0) -> Any:
        """递归转换对象"""
        nonlocal _current_depth
        _current_depth = depth
        
        # ========== 深度限制 ==========
        if depth > max_depth:
            return f"<达到最大深度 {max_depth}>"
        
        # ========== 处理 None ==========
        if obj is None:
            return None
        
        # ========== 检测不可序列化类型（直接跳过） ==========
        if _is_unserializable_type(obj):
            return f"<不可序列化: {obj.__class__.__name__ if hasattr(obj, '__class__') else type(obj).__name__}>"
        
        # ========== 循环引用检测 ==========
        obj_id = id(obj)
        if obj_id in _seen_ids:
            return f"<循环引用: {obj.__class__.__name__ if hasattr(obj, '__class__') else type(obj).__name__}>"
        
        # ========== 基本类型 ==========
        if isinstance(obj, (str, int, float, bool)):
            # 字符串长度限制
            if isinstance(obj, str) and len(obj) > max_str_len:
                return obj[:max_str_len] + f"...<截断 {len(obj) - max_str_len} 字符>"
            return obj
        
        # ========== bytes ==========
        if isinstance(obj, bytes):
            try:
                decoded = obj.decode('utf-8')
                if len(decoded) > max_str_len:
                    return decoded[:max_str_len] + f"...<截断 {len(decoded) - max_str_len} 字符>"
                return decoded
            except UnicodeDecodeError:
                hex_str = obj.hex()
                if len(hex_str) > 100:
                    hex_str = hex_str[:100] + "..."
                return f"<bytes: {hex_str}>"
        
        # ========== 日期时间 ==========
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, time):
            return obj.isoformat()
        if isinstance(obj, timedelta):
            return str(obj)
        
        # ========== 数字类型 ==========
        if isinstance(obj, Decimal):
            try:
                # 尝试转为 float，如果失败则转为字符串
                return float(obj)
            except (OverflowError, ValueError):
                return str(obj)
        if isinstance(obj, complex):
            return f"{obj.real}+{obj.imag}j"
        
        # ========== 字典 ==========
        if isinstance(obj, dict):
            result = {}
            for k, v in obj.items():
                # 跳过私有键（可选）
                if skip_private and isinstance(k, str) and k.startswith('_'):
                    continue
                
                # 键必须是字符串
                try:
                    key = str(k)
                except Exception:
                    key = f"<不可序列化键: {k}>"
                
                # 安全转换值
                result[key] = _get_safe_value(v, depth + 1)
            return result
        
        # ========== 列表/元组/集合 ==========
        if isinstance(obj, (list, tuple, set, frozenset)):
            result = []
            for item in obj:
                # 检查 item 是否可序列化
                if _is_unserializable_type(item):
                    result.append(f"<不可序列化: {type(item).__name__}>")
                else:
                    result.append(_get_safe_value(item, depth + 1))
            return result
        
        # ========== 添加到已见集合 ==========
        _seen_ids.add(obj_id)
        
        try:
            # ========== 自定义对象（有 __dict__） ==========
            if hasattr(obj, '__dict__'):
                result = {}
                if include_class:
                    result['__class__'] = obj.__class__.__name__
                
                # 遍历所有属性
                for key, value in vars(obj).items():
                    # 跳过私有属性（可选）
                    if skip_private and key.startswith('_'):
                        continue
                    
                    # 跳过不可序列化的属性
                    if _is_unserializable_type(value):
                        if skip_failed:
                            _skipped_props.append({
                                'object': obj.__class__.__name__,
                                'attribute': key,
                                'type': type(value).__name__
                            })
                            continue
                        else:
                            result[key] = f"<不可序列化: {type(value).__name__}>"
                            continue
                    
                    # 安全转换
                    result[key] = _get_safe_value(value, depth + 1)
                
                return result
            
            # ========== __slots__ 对象 ==========
            if hasattr(obj, '__slots__'):
                result = {}
                if include_class:
                    result['__class__'] = obj.__class__.__name__
                
                for slot in getattr(obj, '__slots__', []):
                    if not hasattr(obj, slot):
                        continue
                    
                    # 跳过私有属性
                    if skip_private and slot.startswith('_'):
                        continue
                    
                    value = getattr(obj, slot)
                    
                    # 跳过不可序列化的属性
                    if _is_unserializable_type(value):
                        if skip_failed:
                            _skipped_props.append({
                                'object': obj.__class__.__name__,
                                'attribute': slot,
                                'type': type(value).__name__
                            })
                            continue
                        else:
                            result[slot] = f"<不可序列化: {type(value).__name__}>"
                            continue
                    
                    result[slot] = _get_safe_value(value, depth + 1)
                
                return result
            
            # ========== 迭代器/生成器（转为列表或占位符） ==========
            if hasattr(obj, '__iter__') and not isinstance(obj, (str, dict, list, tuple, set)):
                try:
                    items = []
                    for item in obj:
                        if _is_unserializable_type(item):
                            items.append(f"<不可序列化: {type(item).__name__}>")
                        else:
                            items.append(_get_safe_value(item, depth + 1))
                    return items
                except Exception:
                    return f"<迭代器: {obj.__class__.__name__ if hasattr(obj, '__class__') else type(obj).__name__}>"
            
            # ========== 其他无法处理的对象 ==========
            try:
                str_val = str(obj)
                if len(str_val) > max_str_len:
                    return str_val[:max_str_len] + f"...<截断 {len(str_val) - max_str_len} 字符>"
                return str_val
            except Exception:
                return f"<无法转为字符串: {type(obj).__name__}>"
                
        except Exception as e:
            # 捕获转换过程中的所有异常
            return f"<转换异常: {type(obj).__name__} - {str(e)[:50]}>"
        finally:
            # 从已见集合中移除（允许在其他路径重新访问）
            if obj_id in _seen_ids:
                _seen_ids.remove(obj_id)
    
    try:
        # 执行转换
        data = _convert(obj)
        
        # 序列化为 JSON
        result = json.dumps(data, indent=indent, ensure_ascii=ensure_ascii, 
                           skipkeys=False, default=str)
        
        # 如果有跳过的属性，在末尾添加注释（仅在调试时）
        if _skipped_props and indent is not None:
            skip_info = f"\n// ⚠️ 跳过的属性: {len(_skipped_props)} 个"
            result += skip_info
        
        return result
        
    except Exception as e:
        # 最外层捕获
        return f'{{"error": "序列化失败: {str(e)}", "original": "{str(obj)[:100]}"}}'