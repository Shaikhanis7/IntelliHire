from fastapi import Request
from fastapi.responses import JSONResponse
from src.core.exceptions.auth_exceptions import (
    UserAlreadyExists,
    InvalidCredentials,
    InvalidToken
)
from src.observability.logging.logger import setup_logger

logger = setup_logger()


async def global_exception_handler(request: Request, exc: Exception):

    logger.error(f"Error: {str(exc)}")

    if isinstance(exc, UserAlreadyExists):
        return JSONResponse(status_code=400, content={"message": exc.message})

    if isinstance(exc, InvalidCredentials):
        return JSONResponse(status_code=401, content={"message": exc.message})

    if isinstance(exc, InvalidToken):
        return JSONResponse(status_code=401, content={"message": exc.message})

    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error"}
    )