from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    youtube_api_key: str = ""
    groq_api_key: str = ""

    # pg8000 is pure Python — Windows Smart App Control blocks psycopg's compiled driver
    database_url: str = "postgresql+pg8000://brain:brain@localhost:5433/brain"

    # Groq models — check console.groq.com/docs/models and override in .env if these change.
    llm_model: str = "openai/gpt-oss-120b"  # reasoning: analysis, answers, drift, composer
    llm_fast_model: str = "openai/gpt-oss-20b"  # bulk: promise verification

    # Agent token budget. Groq's free tier allows 8000 tokens per request-minute on gpt-oss-120b, and it
    # counts the output reservation too — so input context + max output must stay under that. Raise both
    # on a paid tier.
    agent_max_output_tokens: int = 1500
    agent_context_tokens: int = 4000  # older tool results are cleared from an agent's context beyond this

    whisper_model: str = "whisper-large-v3-turbo"  # for uploaded audio files

    # Optional http(s) proxy for transcript fetching if YouTube blocks your IP,
    # e.g. http://user:pass@proxy-host:port
    transcript_proxy: str = ""

    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384

    max_videos: int = 50  # per channel index run
    chunk_seconds: int = 45
    analysis_segment_chars: int = 18000  # transcript slice sent per analysis call

    frontend_origin: str = "http://localhost:3000"


settings = Settings()
