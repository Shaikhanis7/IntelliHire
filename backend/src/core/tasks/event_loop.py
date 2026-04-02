"""
src/core/tasks/event_loop.py

Windows-safe persistent event loop for Celery workers.

ROOT CAUSE of 'Event loop is closed':
  asyncpg binds its connection pool to the event loop that was
  active when the engine was first created. If that loop closes
  (as asyncio.run() does after every task), asyncpg tries to
  cancel connections on a dead loop and crashes.

FIX:
  1. Keep ONE persistent event loop per worker process.
  2. Create the SQLAlchemy async engine ONCE on that same loop
     and reuse it — never let the loop close between tasks.
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from src.config.settings import settings

_loop: asyncio.AbstractEventLoop | None = None
_engine = None
_session_factory = None


def get_worker_loop() -> asyncio.AbstractEventLoop:
    """Return the persistent worker loop, creating it if needed."""
    global _loop
    if _loop is None or _loop.is_closed():
        _loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_loop)
    return _loop


def get_worker_session_factory():
    """
    Return a session factory bound to the persistent engine.
    Engine is created once on the persistent loop — never recreated.
    """
    global _engine, _session_factory
    if _engine is None:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=2,         # small — each worker process has its own
            max_overflow=2,
        )
        _session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


def run_async(coro):
    """Run a coroutine on the persistent worker loop."""
    return get_worker_loop().run_until_complete(coro)