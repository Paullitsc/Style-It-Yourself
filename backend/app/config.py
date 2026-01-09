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

load_dotenv()
supUrl = os.getenv("SUPABASE_URL")
supKey = os.getenv("SUPABASE_KEY")
supServiceKey = os.getenv("SUPABASE_SERVICE_KEY")
supJwtSecret = os.getenv("SUPABASE_JWT_SECRET")

settings = Settings(SUPABASE_URL=supUrl, SUPABASE_KEY=supKey, SUPABASE_SERVICE_KEY=supServiceKey, SUPABASE_JWT_SECRET=supJwtSecret)