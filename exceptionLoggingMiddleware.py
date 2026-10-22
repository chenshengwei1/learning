import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
import time

import logging

logger = logging.getLogger(__name__)


class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    """捕获所有请求级异常，记录完整堆栈，然后重新抛出给 FastAPI 的 handler"""

    async def dispatch(self, request: StarletteRequest, call_next):
        start = time.time()
        request_id = uuid.uuid4().hex[:8]
        request.state.request_id = request_id

        logger.info(f"➡️  [{request_id}] {request.method} {request.url.path}")

        try:
            response = await call_next(request)
        except Exception as exc:
            # 记录完整堆栈到日志文件
            logger.exception(
                f"💥 [{request_id}] {request.method} {request.url.path} "
                f"未处理异常: {type(exc).__name__}: {exc}"
            )
            # 重新抛出，交给下面的全局 handler 返回 JSON
            raise

        elapsed = (time.time() - start) * 1000
        logger.info(
            f"⬅️  [{request_id}] {request.method} {request.url.path} "
            f"-> {response.status_code} ({elapsed:.0f}ms)"
        )
        return response


