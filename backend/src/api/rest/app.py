from fastapi import FastAPI
from contextlib import asynccontextmanager

from src.api.rest.routes import auth, health, sourcing, job, application_router, resume_router, candidate_router , admin_router
from src.api.rest.middleware.cors import add_cors
from src.api.rest.middleware.error_handler import global_exception_handler
from src.api.rest.middleware.logging import LoggingMiddleware

from src.data.clients.postgres_client import engine
from src.data.models.postgres.base import Base

from src.observability.logging.logger import setup_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logger()

    
    async with engine.begin() as conn: # ← drop all tables on startup for clean slate
        await conn.run_sync(Base.metadata.create_all)   # ← create all tables
        # await conn.run_sync(Base.metadata.create_all)  # ← create all tables

    yield
 
    await engine.dispose()      # ← clean up all connections on shutdown


app = FastAPI(title="IntelliHire API", lifespan=lifespan)

# ── middleware ────────────────────────────────────────────────────────────────
app.add_middleware(LoggingMiddleware)
add_cors(app)

# ── routes ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,                  prefix="/auth")
app.include_router(health.router,                prefix="/health")
app.include_router(job.router)
app.include_router(candidate_router.router)
app.include_router(resume_router.router)
app.include_router(application_router.app_router)
app.include_router(sourcing.router)
app.include_router(admin_router.router)

# ── global error handler ──────────────────────────────────────────────────────
app.add_exception_handler(Exception, global_exception_handler)