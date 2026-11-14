import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables
    or an optional .env file, with sensible development defaults.
    """
    # Database connection parameters
    DB_USER: str = "cricuser"
    DB_PASSWORD: str = "cricpass"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "cricbuzz"
    DB_ECHO: bool = False  # Set to True to print raw SQL queries for debugging

    # App metadata
    APP_NAME: str = "Cricbuzz API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Redis distributed cache & pub/sub settings
    REDIS_URL: str | None = None
    RATE_LIMITING_ENABLED: bool = True
    RATE_LIMIT_PUBLIC_PER_MINUTE: int = 60
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    TRUSTED_PROXIES: list[str] = ["127.0.0.1", "localhost"]

    # Authentication & JWT settings
    JWT_SECRET_KEY: str = "cricbuzz-dev-jwt-secret-key-32-chars-minimum-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    REFRESH_COOKIE_NAME: str = "cricbuzz_refresh_token"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str] | set[str] | tuple[str, ...]) -> list[str]:
        """
        Parses CORS origins from either a JSON array string, comma-separated string,
        or sequence of origin strings. Trims whitespace and strips empty entries.
        """
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    parsed = json.loads(v_stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(item).strip() for item in v if str(item).strip()]
        return v

    # Pydantic Settings configuration: automatically reads from a .env file if present
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra environment variables not defined here
    )

    @property
    def database_url(self) -> str:
        """
        Dynamically constructs the asynchronous PostgreSQL connection URL
        using the psycopg driver: postgresql+psycopg://user:password@host:port/dbname
        """
        return (
            f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


# Singleton instance shared across the entire application
settings = Settings()
