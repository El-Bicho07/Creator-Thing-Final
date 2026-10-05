from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.db import init_db
from app.core.errors import register_error_handlers

from app.features.start.router import router as start_router
from app.features.today.router import router as today_router
from app.features.studio.router import router as studio_router
from app.features.coach.router import router as coach_router
from app.features.growth.router import router as growth_router
from app.features.library.router import router as library_router
from app.features.memory.router import router as memory_router
from app.features.voice.router import router as voice_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting Creator Platform API...")
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down Creator Platform API...")


app = FastAPI(
    title="Creator Platform SaaS API",
    description="Unified backend for Solo Creator OS",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "creator-platform-api"}


@app.get("/api/health")
async def api_health_check():
    return {"status": "ok", "service": "creator-platform-api", "version": "0.1.0"}

app.include_router(start_router, prefix="/api")
app.include_router(today_router, prefix="/api")
app.include_router(studio_router, prefix="/api")
app.include_router(coach_router, prefix="/api")
app.include_router(growth_router, prefix="/api")
app.include_router(library_router, prefix="/api")

# Phase 2: shared platform services
app.include_router(memory_router, prefix="/api")
app.include_router(voice_router, prefix="/api")