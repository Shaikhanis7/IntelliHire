# src/data/clients/postgres_client.py

from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config.settings import settings

# Single engine for the entire process
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=5,        # max persistent connections
    max_overflow=5,     # max extra connections under load
    pool_timeout=30,    # wait this long before raising error
    pool_pre_ping=True, # check connection health before using
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db():
    """FastAPI Depends() session — tied to the request lifecycle."""
    async with AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def get_async_session():
    """
    Standalone session for use outside FastAPI's Depends() lifecycle.
    Used by background tasks (sourcing_tasks.py) that run after the HTTP
    response has already been returned.

    Usage:
        async with get_async_session() as db:
            await some_service(db, ...)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise