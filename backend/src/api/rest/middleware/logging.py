from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import time

from src.observability.logging.logger import setup_logger

logger = setup_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        logger.info(f"Incoming request: {request.method} {request.url}")

        response = await call_next(request)

        duration = time.time() - start_time

        logger.info(
            f"Completed {request.method} {request.url} "
            f"Status: {response.status_code} "
            f"Time: {duration:.3f}s"
        )

        return response