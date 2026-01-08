"""Application configuration."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "SIY API"
    debug: bool = False
    
    # Environment
    ENVIRONMENT: str = "development"
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()