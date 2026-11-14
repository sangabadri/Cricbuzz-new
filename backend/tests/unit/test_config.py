"""
Unit tests for application configuration settings (backend/app/config.py).
Verifies environment variable parsing for CORS origins, database URLs, and defaults.
"""

from app.config import Settings


def test_cors_origins_default_fallback():
    settings = Settings()
    assert len(settings.CORS_ORIGINS) == 4
    assert "http://localhost:5173" in settings.CORS_ORIGINS


def test_cors_origins_comma_separated_parsing():
    settings = Settings(
        CORS_ORIGINS="http://localhost:5173, https://cricbuzz.example.com , https://api.cricbuzz.example.com "
    )
    assert settings.CORS_ORIGINS == [
        "http://localhost:5173",
        "https://cricbuzz.example.com",
        "https://api.cricbuzz.example.com",
    ]


def test_cors_origins_json_array_parsing():
    settings = Settings(
        CORS_ORIGINS='["http://localhost:3000", "https://staging.cricbuzz.app"]'
    )
    assert settings.CORS_ORIGINS == [
        "http://localhost:3000",
        "https://staging.cricbuzz.app",
    ]


def test_cors_origins_list_with_whitespace_stripping():
    settings = Settings(
        CORS_ORIGINS=["  http://localhost:5173  ", "https://app.cricbuzz.com  "]
    )
    assert settings.CORS_ORIGINS == [
        "http://localhost:5173",
        "https://app.cricbuzz.com",
    ]


def test_database_url_construction():
    settings = Settings(
        DB_USER="testuser",
        DB_PASSWORD="testpassword",
        DB_HOST="db.internal",
        DB_PORT=5433,
        DB_NAME="testdb",
    )
    assert (
        settings.database_url
        == "postgresql+psycopg://testuser:testpassword@db.internal:5433/testdb"
    )
