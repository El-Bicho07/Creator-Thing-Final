import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.agent import router as agent_router
from api.routes import router
from config import settings
from db import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Creator Second Brain", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(agent_router)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "youtube_key": bool(settings.youtube_api_key),
        "groq_key": bool(settings.groq_api_key),
        "llm_model": settings.llm_model,
    }
