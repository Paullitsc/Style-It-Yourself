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
    ENABLE_REDOC: bool = False
    OPENAPI_URL: str = "/openapi.json"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Gemini
    GEMINI_API_KEY: str
    
    # CORS (comma-separated origins)
    CORS_ORIGINS: str = "http://localhost:3000"

    # Regex of additional allowed origins. Defaults to any Chrome extension so
    # the MV3 extension (origin chrome-extension://<id>) can call the API
    # without hard-coding its generated ID. Override in production to pin a
    # specific extension ID, e.g. r"chrome-extension://abcdef...".
    CORS_ORIGIN_REGEX: str = r"chrome-extension://.*"

    # Rate limiting. Counters live in Supabase so they are shared across Cloud
    # Run instances; see app/services/rate_limit.py.
    RATE_LIMIT_ENABLED: bool = True

    # Ceiling applied per client IP before authentication runs. Generous by
    # design: it exists to stop a junk-token flood from spending a Supabase
    # auth round-trip per request, not to police normal use.
    RATE_LIMIT_IP_PER_MINUTE: int = 100

    # Where to read the client IP from. Behind Cloud Run the socket peer is a
    # Google frontend, shared by every user, so limiting on it would throttle
    # everyone at once. True reads the left-most X-Forwarded-For entry instead.
    # Note that value is caller-supplied and therefore spoofable: the IP limit
    # is a speed bump, and the per-user limits are the real control.
    RATE_LIMIT_TRUST_FORWARDED_FOR: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS string into list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def cors_origin_regex_is_wildcard(self) -> bool:
        """Whether CORS_ORIGIN_REGEX still allows ANY Chrome extension.

        Combined with allow_credentials=True that means any extension on any
        user's machine is a permitted origin. Fine in development; in
        production it should be pinned to the published extension ID.
        """
        return self.CORS_ORIGIN_REGEX.strip() == r"chrome-extension://.*"

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
    
    class Config:
        env_file = ".env"
        case_sensitive = False

load_dotenv()
supUrl = os.getenv("SUPABASE_URL")
supKey = os.getenv("SUPABASE_KEY")
supServiceKey = os.getenv("SUPABASE_SERVICE_KEY")

settings = Settings(SUPABASE_URL=supUrl, SUPABASE_KEY=supKey, SUPABASE_SERVICE_KEY=supServiceKey)
