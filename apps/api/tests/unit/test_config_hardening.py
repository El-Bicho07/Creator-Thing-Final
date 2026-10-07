"""Tests for configuration validation and production fail-closed behavior."""
import pytest
from app.core.config import Settings, validate_settings


def test_development_config_valid():
    """Development settings with default test credentials pass validation."""
    s = Settings(app_env="development")
    validate_settings(s)


def test_production_fails_on_insecure_db_url():
    """Production mode must fail when default database_url contains insecure credentials."""
    s = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://api_user:api_password@prod-host:5432/db",
        admin_database_url="postgresql+asyncpg://admin:secure_pass@prod-host:5432/db",
        supabase_jwt_secret="super-secret-key-12345",
    )
    with pytest.raises(RuntimeError, match="Insecure default DATABASE_URL"):
        validate_settings(s)


def test_production_fails_on_insecure_admin_db_url():
    """Production mode must fail when admin_database_url contains insecure credentials."""
    s = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://api_user:secure_pass@prod-host:5432/db",
        admin_database_url="postgresql+asyncpg://creator:changeme@prod-host:5432/db",
        supabase_jwt_secret="super-secret-key-12345",
    )
    with pytest.raises(RuntimeError, match="Insecure default ADMIN_DATABASE_URL"):
        validate_settings(s)


def test_production_fails_on_missing_jwt_secret():
    """Production mode must fail when SUPABASE_JWT_SECRET is unset or insecure."""
    s = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://api_user:secure_pass@prod-host:5432/db",
        admin_database_url="postgresql+asyncpg://admin:secure_pass@prod-host:5432/db",
        supabase_jwt_secret="",
    )
    with pytest.raises(RuntimeError, match="SUPABASE_JWT_SECRET must be securely set"):
        validate_settings(s)


def test_production_fails_on_missing_llm_api_key():
    """Production mode with live LLM provider must require corresponding API key."""
    s = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://api_user:secure_pass@prod-host:5432/db",
        admin_database_url="postgresql+asyncpg://admin:secure_pass@prod-host:5432/db",
        supabase_jwt_secret="super-secret-key-12345",
        llm_provider="gemini",
        gemini_api_key=None,
    )
    with pytest.raises(RuntimeError, match="GEMINI_API_KEY is required"):
        validate_settings(s)


def test_production_valid_config():
    """Valid production config passes validation."""
    s = Settings(
        app_env="production",
        database_url="postgresql+asyncpg://api_user:secure_pass@prod-host:5432/db",
        admin_database_url="postgresql+asyncpg://admin:secure_pass@prod-host:5432/db",
        supabase_jwt_secret="super-secret-key-12345",
        llm_provider="mock",
    )
    validate_settings(s)
