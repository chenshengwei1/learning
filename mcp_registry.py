# mcp_registry.py
import asyncio
import os
import threading
from pathlib import Path
from typing import Any, Dict, List

from langchain_mcp_adapters.client import MultiServerMCPClient

from pathlib import Path
from mcp_servers.async_tool_bridge import patch_async_tools


# 当前 .py 文件所在目录
BASE_DIR = Path(__file__).resolve().parent

# MCP Server 脚本的绝对路径
SERVER_SCRIPT = BASE_DIR / "mcp_servers" / "local_api_mcp_server.py"

'''

配置要求：
- 优先使用远程 Stream HTTP URL 直连；每个平台创建一个独立 MCP server。
- REDFOX_API_KEY 未写入配置时，从客户端已持久化的环境变量 REDFOX_API_KEY 或 Secret 读取，替换 YOUR_API_KEY 为实际的 API Key；读不到则在配置完成后提醒用户到 RedFoxHub 获取。
- REDFOX_API_KEY 必须在客户端重启后仍可读取，不要只在当前 shell 临时 export。
- 当前客户端不支持 Stream HTTP 时，改用本地 STDIO，按 node / python 环境安装对应 package。
- 配置完成后请做一次 MCP 连接测试。

参考配置：

Stream HTTP MCP URL 直连：
Streamable HTTP'''

# 配置：每个 MCP 服务一个 key，支持 stdio / streamable_http / sse
MCP_SERVERS: Dict[str, Dict[str, Any]] = {
    # 示例：本地脚本
    # "filesystem": {
    #     "command": "python",
    #     "args": [str(Path(__file__).parent / "fs_server.py")],
    #     "transport": "stdio",
    # },
    # 示例：远程 HTTP 服务
    # "context7": {
    #     "url": "https://mcp.context7.com/mcp",
    #     "transport": "streamable_http",
    # },
    "github": {
        "url": "https://api.githubcopilot.com/mcp/",
        "transport": "streamable_http",
        "headers": {
            "Authorization": f"Bearer {os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')}"
        },
    },
    "local_api": {
        "command": "python",
        "args": [str(SERVER_SCRIPT)],
        "transport": "stdio",
    },
    "local_http": {
        "transport": "http",
        "url": "http://localhost:3000/mcp"
    },
    "redfox-xiaohongshu-mcp": {
        "transport": "streamable_http",
        "url": "https://mcp.redfox.hk/xiaohongshu/mcp",
        "headers": {
            "REDFOX_API_KEY": "ak_cb77f6950b5c49e8bc26739becc270e3"
        }
    },
    "redfox-gongzhonghao-mcp": {
        "type": "streamable-http",
        "url": "https://mcp.redfox.hk/gongzhonghao/mcp",
        "headers": {
            "REDFOX_API_KEY": "ak_cb77f6950b5c49e8bc26739becc270e3"
        }
    },
    "redfox-kuaishou-mcp": {
        "type": "http",
        "url": "https://mcp.redfox.hk/kuaishou/mcp",
        "headers": {
            "REDFOX_API_KEY": "ak_cb77f6950b5c49e8bc26739becc270e3"
        }
    },
    "redfox-shipinhao-mcp": {
        "type": "http",
        "url": "https://mcp.redfox.hk/shipinhao/mcp",
        "headers": {
            "REDFOX_API_KEY": "ak_cb77f6950b5c49e8bc26739becc270e3"
        }
    },
    "redfox-bilibili-mcp": {
        "type": "http",
        "url": "https://mcp.redfox.hk/bilibili/mcp",
        "headers": {
            "REDFOX_API_KEY": "ak_cb77f6950b5c49e8bc26739becc270e3"
        }
    },
    "redfox-douyin-mcp": {
        "transport": "streamable_http",
        "url": "https://mcp.redfox.hk/douyin/mcp",
        "headers": {
            "REDFOX_API_KEY": "ak_cb77f6950b5c49e8bc26739becc270e3"
        }
    }
}

_mcp_tools: List = []
_mcp_dict_tools: Dict[str, Any] = {}
_loaded = False
import logging
logger = logging.getLogger(__name__)

_loading = False                    # 新增：是否正在加载
_load_lock = threading.Lock()       # 新增：防止并发重复加载
_failed_load_servers: Dict[str, str] = {}  # 新增：记录加载失败的服务及错误信息
_successful_load_servers: Dict[str, str] = {}  # 新增：记录加载成功的服务及信息
_skip_successful_service_flag = True  # 新增：是否跳过已成功加载的服务（用于 reload 时）

async def _load_mcp_tools_async() -> List:
    """异步连接所有配置的 MCP 服务，返回工具列表"""
    if not MCP_SERVERS:
        return []
    logger.debug(f"SERVER_SCRIPT args: {SERVER_SCRIPT}")
    logger.debug(f"正在连接 MCP 服务: {list(MCP_SERVERS.keys())}")
    try:
        tools = []
        for name, cfg in MCP_SERVERS.items():
            if _skip_successful_service_flag and name in _successful_load_servers:
                logger.debug(f"跳过已成功加载的 MCP [{name}]")
                continue
            try:
                logger.debug(f"正在连接 MCP [{name}] ...")
                client = MultiServerMCPClient({name: cfg})
                _tools = await client.get_tools()
                tools.extend(_tools)
                _mcp_dict_tools[name] = [k for k in _tools]
                _successful_load_servers[name] = "连接成功"
                logger.info(f"✅MCP [{name}] 连接成功")
            except Exception as e:
                _failed_load_servers[name] = str(e)
                logger.exception(f"MCP [{name}] 连接失败")
                logger.error(f"❌MCP [{name}] 连接失败: {type(e).__name__}: {e!r}")
        return tools
    except Exception as eg:
        logger.exception("MCP 工具加载失败")
        for e in eg.exceptions:
            logger.error(
                f"MCP 子异常: {type(e).__name__}: {e!r}"
            )
        return []


def _run_async_in_thread(coro):
    """在新线程的事件循环中运行协程，返回结果"""
    result = {}
    def runner():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result["value"] = loop.run_until_complete(coro)
        except Exception as e:
            result["error"] = e
        finally:
            loop.close()

    t = threading.Thread(target=runner, daemon=True)
    t.start()
    t.join()
    if "error" in result:
        raise result["error"]
    return result["value"]

def get_mcp_dict() -> Dict[str, Any]:
    """
    返回 MCP 工具的字典形式，按 name 索引。
    如果工具未加载，则触发加载。
    """
    result = {}
    for name in _mcp_dict_tools.keys():
        tools = _mcp_dict_tools[name]
        if tools:
            t = tools[0]
            logger.debug(f"server={name}, 第一个元素 type={type(t)}, dir={[a for a in dir(t) if not a.startswith('_')][:20]}")
            logger.debug(f"server={name}, has name? {hasattr(t, 'name')}, value={getattr(t, 'name', '<无name属性>')!r}")
        result[name] = [getattr(t, "name", "unknown") for t in _mcp_dict_tools[name]]
    for name in MCP_SERVERS.keys():
        if name not in result:
            result[name] = ['未加载']
    return result

def get_mcp_tools() -> List:
    """
    同步获取所有 MCP 工具，只加载一次。
    可在模块导入时调用，或在 getTools() 中惰性调用。
    """
    global _mcp_tools, _loaded
    if _loaded:
        return _mcp_tools

    if not MCP_SERVERS:
        _loaded = True
        return []

    # 双重检查锁：防止预加载线程和请求线程同时触发加载
    with _load_lock:
        if _loaded:
            return _mcp_tools

        _loading = True
        try:
            t_mcp_tools = _run_async_in_thread(_load_mcp_tools_async())

            # ✅ 关键：为异步工具注入同步包装器
            t_mcp_tools = patch_async_tools(t_mcp_tools)
            _mcp_tools.extend(t_mcp_tools)  # 更新全局工具列表
            logger.info(f"✅ MCP 工具加载完成: 共 {len(_mcp_tools)} 个工具")
        except Exception as e:
            logger.error(f"MCP 工具加载失败: {e}")
            # _mcp_tools = []
        finally:
            _loading = False
            _loaded = True


    _loaded = True
    return _mcp_tools

def start_preload() -> threading.Thread:
    """
    启动后台预加载线程，立即返回，不阻塞调用方。
    返回线程对象，方便调用方决定是否 join（一般不 join）。
    """
    def _worker():
        try:
            get_mcp_tools()
        except Exception as e:
            logger.error(f"MCP 预加载线程异常: {e}", exc_info=True)

    t = threading.Thread(target=_worker, name="mcp-preload", daemon=True)
    t.start()
    logger.debug("🚀 MCP 工具后台预加载已启动")
    return t


def is_loaded() -> bool:
    """工具是否已加载完成"""
    return _loaded


def is_loading() -> bool:
    """工具是否正在加载"""
    return _loading

def reload_mcp_tools() -> Dict[str, Any]:
    """
    强制重新加载所有 MCP 工具（覆盖原有缓存）。
    用于 MCP 服务恢复后手动触发刷新。
    
    返回: {"success": bool, "tool_count": int, "tool_names": [...], "error": str | None}
    """
    global _loaded, _loading

    # 防止并发重载
    if not _load_lock.acquire(blocking=False):
        return {
            "success": False,
            "tool_count": 0,
            "tool_names": [],
            "error": "另一个加载任务正在进行中，请稍后再试",
        }

    try:
        _loading = True
        logger.info("🔄 开始强制重新加载 MCP 工具 ...")

        try:
            old_count = len(_mcp_tools)
            t_mcp_tools = _run_async_in_thread(_load_mcp_tools_async())
            t_mcp_tools = patch_async_tools(t_mcp_tools)
    
            _mcp_tools.extend(t_mcp_tools) # 更新全局工具列表
            _loaded = True

            tool_names = [getattr(t, "name", "unknown") for t in _mcp_tools]
            logger.info(
                f"✅ MCP 工具重新加载完成: {old_count} → {len(_mcp_tools)} 个工具"
            )
            return {
                "success": True,
                "tool_count": len(_mcp_tools),
                "tool_names": tool_names,
                "error": None,
            }
        except Exception as e:
            logger.error(f"❌ MCP 工具重新加载失败: {e}", exc_info=True)
            # 注意：失败时保留旧缓存，不清空，避免把原本可用的工具弄丢
            return {
                "success": False,
                "tool_count": len(_mcp_tools),
                "tool_names": [getattr(t, "name", "unknown") for t in _mcp_tools],
                "error": f"{type(e).__name__}: {e}",
            }
        finally:
            _loading = False
    finally:
        _load_lock.release()
