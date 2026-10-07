"""Centralized application settings.

Everything environment-driven lives here. Feature code must import `settings`
rather than reading `os.environ`, and must never hard-code model names or
embedding dimensions.
"""
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------ Database
    database_url: str = (
        "postgresql+asyncpg://api_user:api_password@localhost:5432/creator_platform"
    )

    # Database role used ONLY by offline operational tooling (migrations,
    # re-embedding, reconciliation). It must bypass RLS so that it can see every
    # creator's rows in one pass.
    #
    # The application NEVER uses this. The API deliberately connects as the
    # non-superuser `api_user`, so an application bug cannot read another
    # creator's data. Do not point the API at this URL.
    admin_database_url: str = (
        "postgresql+asyncpg://creator:changeme@localhost:5432/creator_platform"
    )

    # ------------------------------------------------------------- Supabase Auth
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # ==================================================================
    # Embedding Service  (ADR-002 -- Phase 2 selection)
    #
    # Selected model : intfloat/multilingual-e5-base
    # Dimension      : 768
    # Query prefix   : "query: "
    # Document prefix: "passage: "
    # Similarity     : cosine
    # Normalization  : L2
    #
    # The `query:`/`passage:` prefixes are MANDATORY for E5 retrieval and are
    # applied inside app/ai/embedding/e5.py. Feature code never sees them.
    # ==================================================================
    embedding_model: str = "intfloat/multilingual-e5-base"
    embedding_revision: Optional[str] = "d128750597153bb5987e10b1c3493a34e5a4502a"
    embedding_dimension: int = 768
    embedding_device: str = "cpu"
    embedding_batch_size: int = 16
    embedding_max_seq_length: int = 512
    embedding_normalize: bool = True
    embedding_query_prefix: str = "query: "
    embedding_document_prefix: str = "passage: "
    # Provenance stamp written alongside every stored vector.
    embedding_version: str = "e5-base-v1"

    # ==================================================================
    # LLM Gateway  (ADR-003)
    # ==================================================================
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # No production provider credential exists yet (ADR-006), so the gateway
    # defaults to the deterministic mock adapter. Switching to a live provider
    # is a configuration change only -- no feature code changes.
    llm_provider: str = "mock"
    llm_default_provider: str = "mock"
    llm_default_model: str = "mock-deterministic"
    llm_fallback_providers: List[str] = []

    llm_default_timeout: float = 30.0
    llm_max_attempts: int = 3
    llm_retry_delays: List[float] = [1.0, 2.0, 4.0]

    llm_cache_enabled: bool = True
    llm_cache_ttl_seconds: int = 86400
    llm_cache_max_entries: int = 512

    llm_daily_token_limit_per_user: int = 1_000_000
    llm_per_feature_rate_limit: dict[str, int] = {}

    # ------------------------------------------------------------- Prompt assets
    prompts_dir: str = "/packages/prompts"

    # ----------------------------------------------------------- External APIs
    youtube_api_key: Optional[str] = None
    instagram_app_id: Optional[str] = None
    instagram_app_secret: Optional[str] = None

    # ------------------------------------------------------------ Observability
    sentry_dsn: Optional[str] = None

    # ------------------------------------------------------------------- App
    app_env: str = "development"
    log_level: str = "debug"
    port: int = 8000


settings = Settings()

# --- Fail fast on a configuration that cannot work. -----------------------
if settings.embedding_dimension <= 0:
    raise RuntimeError("EMBEDDING_DIMENSION must be a positive integer")
if not settings.embedding_normalize:
    # Cosine similarity against un-normalised vectors silently changes ranking.
    raise RuntimeError(
        "EMBEDDING_NORMALIZE must be true: pgvector vector_cosine_ops assumes "
        "L2-normalised embeddings"
    )