# src/data/clients/postgres_client.py

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config.settings import settings

# Single engine for the entire process
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=5,          # max persistent connections
    max_overflow=5,       # max extra connections under load
    pool_timeout=30,      # wait this long before raising error
    pool_pre_ping=True,   # check connection health before using
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session