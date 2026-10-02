import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Instagram Voice Replicator"
    DEBUG: bool = True
    
    # Database Configuration (PostgreSQL + pgvector via psycopg v3)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://instagram_user:instagram_password@localhost:5432/instagram_voice"
    )
    
    # LLM Configuration
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    
    # Embedding Configuration
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "sentence-transformers")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
