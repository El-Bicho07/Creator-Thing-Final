import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.db import engine, Base
from backend.app.routers import (
    ingest, analyze, ideas, clusters, insights, calendar, replies
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("comidea")

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ComIdea - Comment-to-Content Engine for Creators"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api
app.include_router(ingest.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(ideas.router, prefix="/api")
app.include_router(clusters.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(replies.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ComIdea API",
        "version": settings.VERSION,
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "your_anthropic_api_key_here")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
