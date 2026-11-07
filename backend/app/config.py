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
