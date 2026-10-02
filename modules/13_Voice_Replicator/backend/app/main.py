from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.api.routes import projects, posts, analysis, generation, validation, drafts

# Ensure tables are created
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass

app = FastAPI(
    title=settings.APP_NAME,
    description="Full-Stack AI Content Style Replication System for Instagram",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(projects.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(validation.router, prefix="/api")
app.include_router(drafts.router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    db_status = "unreachable"
    pgvector_status = "unavailable"
    
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
        try:
            res = db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'"))
            if res.fetchone():
                pgvector_status = "active"
            else:
                pgvector_status = "installed (extension unconfigured)"
        except Exception:
            pgvector_status = "sqlite_fallback"
    except Exception as e:
        db_status = f"unreachable ({e})"
    finally:
        db.close()

    llm_configured = bool(settings.LLM_API_KEY and settings.LLM_API_KEY != "your_gemini_api_key_here")

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "api": "online",
        "database": db_status,
        "pgvector": pgvector_status,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_configured": llm_configured
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
