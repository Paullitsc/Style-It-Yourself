from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "SIY API"
    debug: bool = False
    
    # Supabase
    supabase_url: str
    supabase_key: str  # anon/public key
    supabase_service_key: str  # service role key for admin ops
    
    # Gemini API (for AI try-on)
    gemini_api_key: str
    gemini_api_url: str = "https://generativelanguage.googleapis.com/v1beta"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()