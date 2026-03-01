"""Application configuration."""
import os

from pydantic_settings import BaseSettings
from dotenv import load_dotenv

class Settings(BaseSettings):
    # App
    app_name: str = "SIY API"
    debug: bool = False
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # API documentation
    ENABLE_DOCS: bool | None = None
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
        - Can be overridden via ENABLE_DOCS
        """
        if self.ENABLE_DOCS is not None:
            return self.ENABLE_DOCS
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False

load_dotenv()
supUrl = os.getenv("SUPABASE_URL")
supKey = os.getenv("SUPABASE_KEY")
supServiceKey = os.getenv("SUPABASE_SERVICE_KEY")
supJwtSecret = os.getenv("SUPABASE_JWT_SECRET")

settings = Settings(SUPABASE_URL=supUrl, SUPABASE_KEY=supKey, SUPABASE_SERVICE_KEY=supServiceKey, SUPABASE_JWT_SECRET=supJwtSecret)
