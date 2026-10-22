# agent_log.py
import os
import logging
from datetime import datetime

os.makedirs("logs", exist_ok=True)

logger = logging.getLogger(__name__)

# ============ 日志控制 开始 ============

# 每个模块当前想要的"输出到 debug_xxx.log 的最低级别"
# 例如 {"agent_core": "DEBUG", "agent_core_middleware": "INFO"}
_module_levels = {}

# 系统运行中出现过的所有 logger 名字（供页面展示）
_seen_modules = set()

_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}


def _level_value(name):
    return logging.getLevelName(name) if isinstance(name, int) is False else name


def set_module_level(module_name, level_name):
    """设置某个模块输出到 debug_xxx.log 的级别。level_name in _LEVELS"""
    level_name = level_name.upper()
    if level_name not in _LEVELS:
        raise ValueError(f"非法级别: {level_name}")
    _module_levels[module_name] = level_name
    logging.getLogger().info("模块 %s 的 debug 级别设为 %s", module_name, level_name)


def remove_module_level(module_name):
    """取消某个模块的 debug 输出"""
    _module_levels.pop(module_name, None)


def list_module_levels():
    """返回 {模块名: 级别}，包含所有出现过的模块"""
    # 合并"出现过的模块"和"已配置的模块"
    all_mods = _seen_modules | set(_module_levels.keys())
    return {m: _module_levels.get(m, "OFF") for m in sorted(all_mods)}


def list_seen_modules():
    return sorted(_seen_modules)


class ModuleLevelFilter(logging.Filter):
    """只放行：模块在 _module_levels 中，且记录级别 >= 设定级别"""

    def filter(self, record):
        # 记录出现过的模块
        _seen_modules.add(record.name)

        level_name = _module_levels.get(record.name)
        if not level_name:
            return False
        want = logging.getLevelName(level_name)   # 字符串 -> 数值
        return record.levelno >= want


class MaxLevelFilter(logging.Filter):
    def __init__(self, level):
        super().__init__()
        self.level = level

    def filter(self, record):
        return record.levelno < self.level


def setup_logging():
    root = logging.getLogger()
    if getattr(root, "_agent_log_configured", False):
        return
    root._agent_log_configured = True
    root.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        '%(asctime)s - [%(name)s.%(funcName)s] - %(levelname)s - %(message)s'
    )
    today = datetime.now().strftime("%Y-%m-%d")

    # 1) 全量 -> app_xxx.log
    fh = logging.FileHandler(f'logs/app_{today}.log', encoding='utf-8')
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    root.addHandler(fh)

    # 2) ERROR+ -> error_xxx.log
    eh = logging.FileHandler(f'logs/error_{today}.log', encoding='utf-8')
    eh.setLevel(logging.ERROR)
    eh.setFormatter(fmt)
    root.addHandler(eh)

    # 3) 指定模块+级别 -> debug_xxx.log
    dh = logging.FileHandler(f'logs/debug_{today}.log', encoding='utf-8')
    dh.setLevel(logging.DEBUG)
    dh.setFormatter(fmt)
    dh.addFilter(ModuleLevelFilter())
    root.addHandler(dh)

    # 4) console -> INFO 及以上
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    root.addHandler(ch)

    logger.info("日志系统初始化完成")


# 默认配置（可留空，全靠运行时设置）
set_module_level("agent_core", "DEBUG")
set_module_level("agent_core_middleware", "DEBUG")


# ============ 日志控制 结束 ============