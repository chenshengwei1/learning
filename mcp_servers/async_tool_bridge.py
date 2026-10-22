import asyncio
import concurrent.futures
import atexit
import functools
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)

# 全局线程池：当调用线程已有事件循环运行时，用这个池子在新线程中执行异步代码
_SYNC_TOOL_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=10, 
    thread_name_prefix="mcp-sync-tool"
)

# 程序退出时优雅关闭线程池
atexit.register(lambda: _SYNC_TOOL_EXECUTOR.shutdown(wait=False))


def _make_sync_tool_wrapper(coro: Callable[..., Any], tool_name: str) -> Callable[..., Any]:
    """
    为异步 coroutine 创建一个同步包装器。
    
    核心逻辑：
    - 如果没有运行中的事件循环，直接用 asyncio.run() 执行。
    - 如果已有事件循环在运行，提交到全局线程池，在新线程中用 asyncio.run() 执行，
      避免 "asyncio.run() cannot be called from a running event loop" 错误。
    """
    @functools.wraps(coro)
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        try:
            if loop is not None and loop.is_running():
                # 已有事件循环运行 → 新线程中执行
                future = _SYNC_TOOL_EXECUTOR.submit(
                    asyncio.run, coro(*args, **kwargs)
                )
                return future.result()
            else:
                # 没有运行中的事件循环 → 直接执行
                return asyncio.run(coro(*args, **kwargs))
        except Exception as e:
            logger.error(f"通过同步包装器调用 MCP 工具 '{tool_name}' 失败: {e}", exc_info=True)
            raise

    return sync_wrapper


def patch_async_tools(tools: list) -> list:
    """
    为所有只有 coroutine 没有 func 的工具注入同步包装器。
    直接修改传入的 tool 对象的 func 属性。
    """
    patched_count = 0
    for tool in tools:
        # 只处理 coroutine 存在但 func 缺失的工具
        if getattr(tool, "func", None) is None and getattr(tool, "coroutine", None) is not None:
            tool_name = getattr(tool, "name", "unknown")
            tool.func = _make_sync_tool_wrapper(tool.coroutine, tool_name)
            patched_count += 1
            logger.debug(f"🔧 已为工具 '{tool_name}' 注入同步包装器")

    if patched_count:
        logger.debug(f"✅ 共为 {patched_count} 个异步工具注入了同步包装器")
    else:
        logger.debug("所有工具已具备同步实现，无需注入")

    return tools