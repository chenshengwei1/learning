def isProperty(obj, property_name):
    """
    通用属性检查函数 - 支持任何对象
    
    Args:
        obj: 任何对象（None、int、str、list、dict、自定义对象等）
        property_name: 属性名（字符串）
    
    Returns:
        bool: 属性是否存在
    """
    # 处理 None
    if obj is None:
        return False
    
    # 处理字典
    if isinstance(obj, dict):
        return property_name in obj
    
    # 处理列表、元组、集合（检查是否包含该值，但这里属性名是字符串，所以返回 False）
    if isinstance(obj, (list, tuple, set)):
        return False
    
    # 处理字符串（检查是否有该属性，str 有 lower、upper 等）
    if isinstance(obj, str):
        return hasattr(obj, property_name)
    
    # 处理其他对象（使用 hasattr）
    try:
        return hasattr(obj, property_name)
    except Exception:
        return False