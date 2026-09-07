"""Application configuration."""
import os

from pydantic_settings import BaseSettings
from dotenv import load_dotenv

class Settings(BaseSettings):
    # App
    app_name: str = "SIY API"
    app_version: str = "1.0.0"
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

    # Observability. Both of these default per environment (see the log_level
    # and log_format properties); set them explicitly only to override.
    #
    # LOG_LEVEL: standard level name (DEBUG, INFO, WARNING, ERROR, CRITICAL).
    # LOG_FORMAT: "json" or "console". JSON is what Cloud Logging parses, so
    # production wants it; console is readable in a terminal.
    LOG_LEVEL: str = ""
    LOG_FORMAT: str = ""

    # Sentry. Unset means disabled, which is the right default for local dev
    # and for tests -- no DSN, no network calls, no noise.
    SENTRY_DSN: str = ""

    # Fraction of requests traced for performance monitoring. 0.0 means errors
    # only, which is what the free tier comfortably affords. Note that turning
    # this up also starts recording Gemini call spans, since sentry-sdk
    # auto-enables its google-genai integration.
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

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

    @property
    def log_level(self) -> str:
        """Effective log level name.

        Development wants DEBUG so the prompt-building and color-extraction
        lines are visible while working; production wants INFO so per-request
        noise stays bounded. ``LOG_LEVEL`` overrides either.
        """
        if self.LOG_LEVEL.strip():
            return self.LOG_LEVEL.strip().upper()
        return "DEBUG" if self.is_development else "INFO"

    @property
    def log_format(self) -> str:
        """Effective log format: ``"json"`` or ``"console"``.

        JSON in production because Cloud Run forwards stdout to Cloud Logging,
        which lifts ``severity`` and ``message`` out of a JSON line and leaves
        anything else as an unparsed text blob at default severity.
        """
        chosen = self.LOG_FORMAT.strip().lower()
        if chosen in {"json", "console"}:
            return chosen
        return "console" if self.is_development else "json"

    @property
    def sentry_enabled(self) -> bool:
        """Whether error reporting should be initialized."""
        return bool(self.SENTRY_DSN.strip())

    class Config:
        env_file = ".env"
        case_sensitive = False
        # Ignore unknown keys rather than refusing to start. Deployment reads
        # this file with `set -a; source backend/.env`, and platforms inject
        # their own variables; a key this class does not model is not a reason
        # to take the API down at boot.
        extra = "ignore"

load_dotenv()
supUrl = os.getenv("SUPABASE_URL")
supKey = os.getenv("SUPABASE_KEY")
supServiceKey = os.getenv("SUPABASE_SERVICE_KEY")

settings = Settings(SUPABASE_URL=supUrl, SUPABASE_KEY=supKey, SUPABASE_SERVICE_KEY=supServiceKey)
