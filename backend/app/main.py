"""
Entry point for the FastAPI application.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.observability import configure_logging, get_request_id, init_sentry

# Before anything else, and deliberately at import time rather than in the
# lifespan hook below. Uvicorn configures its own loggers in Config.__init__
# and only imports this module afterwards, so configuring here wins that race;
# lifespan runs later still and would leave every record emitted while the
# routers and services import unformatted. Sentry has a harder requirement --
# its Starlette integration patches the framework, so it has to run before the
# FastAPI object is built.
configure_logging()
init_sentry()

from app.middleware.rate_limit import IPRateLimitMiddleware  # noqa: E402
from app.middleware.request_context import (  # noqa: E402
    REQUEST_ID_HEADER,
    RequestContextMiddleware,
)
from app.services.supabase import close_supabase_clients  # noqa: E402

logger = logging.getLogger(__name__)

# Import routers that exist
from app.routers import validation, tryon, closet, recommendations, outfits, clothing_items, extension  # noqa: E402


API_DESCRIPTION = """
Personal styling API for closet management, recommendation generation, and AI try-on.

Authentication:
- Protected endpoints require a Supabase access token in the `Authorization` header.
- Use `Bearer <access_token>` in Swagger's **Authorize** dialog.

""".strip()

TAGS_METADATA = [
    {
        "name": "system",
        "description": "Service health and metadata endpoints.",
    },
    {
        "name": "recommendations",
        "description": "Generate outfit recommendations from a base clothing item.",
    },
    {
        "name": "validation",
        "description": "Validate compatibility for items and complete outfits.",
    },
    {
        "name": "closet",
        "description": "Retrieve closet data and find closet items matching recommendations.",
    },
    {
        "name": "clothing-items",
        "description": "Create, list, and delete clothing items for an authenticated user.",
    },
    {
        "name": "outfits",
        "description": "Save and manage outfits for an authenticated user.",
    },
    {
        "name": "try-on",
        "description": "AI-powered try-on generation and photo upload endpoints.",
    },
    {
        "name": "extension",
        "description": "Chrome extension capture endpoints: analyze, import, and match products.",
    },
]



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(
        "Starting %s",
        settings.app_name,
        extra={
            "version": settings.app_version,
            "environment": settings.ENVIRONMENT,
            "log_level": settings.log_level,
        },
    )
    if not settings.is_development and settings.cors_origin_regex_is_wildcard:
        logger.warning(
            "CORS_ORIGIN_REGEX still allows ANY Chrome extension origin "
            "(%s) with allow_credentials=True. Pin it to the published "
            "extension ID: CORS_ORIGIN_REGEX=chrome-extension://<id>",
            settings.CORS_ORIGIN_REGEX,
        )
    yield
    # Shutdown
    await close_supabase_clients()
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description=API_DESCRIPTION,
    version=settings.app_version,
    lifespan=lifespan,
    openapi_tags=TAGS_METADATA,
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    # Gate the schema behind docs_enabled too, so production (docs off)
    # does not expose /openapi.json alongside the disabled /docs and /redoc.
    openapi_url=settings.OPENAPI_URL if settings.docs_enabled else None,
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
    },
)

# Middleware order matters, and Starlette runs the most recently added one
# OUTERMOST. Read the three below bottom-up to get the request order:
#
#   CORS -> RequestContext -> IPRateLimit -> routes
#
# CORS stays outside everything so a 429 or a 500 still carries the headers a
# browser needs in order to read it. RequestContext sits outside the rate
# limiter so a rejected request is still assigned an id, still logged, and
# still answers with X-Request-ID.
app.add_middleware(IPRateLimitMiddleware)

# Correlation id + the single access line per request. See
# app/middleware/request_context.py.
app.add_middleware(RequestContextMiddleware)

# CORS middleware. `allow_origin_regex` additionally permits the Chrome
# extension origin (chrome-extension://<id>) without hard-coding its ID.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # Use list property
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Without this the browser hides X-Request-ID from page scripts, so the
    # frontend could never show a user the reference for a failed request.
    expose_headers=[REQUEST_ID_HEADER],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Answer an unhandled exception with something the caller can quote.

    Starlette would otherwise return a bare `Internal Server Error` text body.
    The id in `detail` is the point: the frontend renders that string verbatim,
    so the user ends up holding the exact token that finds their request in the
    logs and in Sentry.

    Not logged here. This handler runs inside ServerErrorMiddleware, which is
    outside RequestContextMiddleware (already logging the failed request) and
    which re-raises afterwards so uvicorn still prints the traceback.
    """
    request_id = get_request_id()
    detail = "Internal server error."
    headers = {}
    if request_id:
        detail = f"{detail} Reference: {request_id}"
        # ServerErrorMiddleware sends this response itself, bypassing the
        # send-wrapper that would normally attach the header.
        headers[REQUEST_ID_HEADER] = request_id

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail, "request_id": request_id},
        headers=headers,
    )


# Include routers
app.include_router(validation.router)
app.include_router(tryon.router)
app.include_router(closet.router)
app.include_router(clothing_items.router)

app.include_router(recommendations.router)
app.include_router(outfits.router)
app.include_router(extension.router)


@app.get(
    "/",
    tags=["system"],
    status_code=status.HTTP_200_OK,
    summary="Get service metadata",
    description="Returns API name, version, and runtime health indicator.",
    responses={
        200: {
            "description": "Service metadata returned successfully.",
            "content": {
                "application/json": {
                    "example": {
                        "name": "SIY API",
                        "version": "1.0.0",
                        "status": "healthy",
                    }
                }
            },
        }
    },
)
async def root():
    """Root endpoint - health check."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "healthy",
    }


@app.get(
    "/health",
    tags=["system"],
    status_code=status.HTTP_200_OK,
    summary="Liveness health check",
    description="Simple liveness endpoint for uptime checks and load balancers.",
    responses={
        200: {
            "description": "Service is healthy.",
            "content": {"application/json": {"example": {"status": "ok"}}},
        }
    },
)
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
