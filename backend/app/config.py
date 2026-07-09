"""Application configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # App
    app_name: str = "SIY API"
    debug: bool = False
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # API documentation
    ENABLE_REDOC: bool = False
    OPENAPI_URL: str = "/openapi.json"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str
    
    # Gemini
    GEMINI_API_KEY: str
    
    # CORS (comma-separated origins)
    CORS_ORIGINS: str = "http://localhost:3000"

    # Regex of additional allowed origins. Defaults to any Chrome extension so
    # the MV3 extension (origin chrome-extension://<id>) can call the API
    # without hard-coding its generated ID. Override in production to pin a
    # specific extension ID, e.g. r"chrome-extension://abcdef...".
    CORS_ORIGIN_REGEX: str = r"chrome-extension://.*"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS string into list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def is_development(self) -> bool:
        """Whether the app is running in a development-like environment."""
        return self.debug or self.ENVIRONMENT.lower() in {"development", "dev", "local"}

    @property
    def docs_enabled(self) -> bool:
        """
        Whether interactive API docs should be enabled.

        Default behavior:
        - Enabled in development
        - Disabled in production
        """
        return self.is_development

    @property
    def docs_url(self) -> str | None:
        """Swagger UI path (None disables Swagger UI)."""
        return "/docs" if self.docs_enabled else None

    @property
    def redoc_url(self) -> str | None:
        """ReDoc path (None disables ReDoc)."""
        if self.docs_enabled and self.ENABLE_REDOC:
            return "/redoc"
        return None


settings = Settings()
