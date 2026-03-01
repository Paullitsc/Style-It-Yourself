"""
Entry point for the FastAPI application.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.supabase import close_supabase_clients

# Import routers that exist
from app.routers import validation, tryon, closet, recommendations, outfits, clothing_items


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
]



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name}...")
    yield
    # Shutdown
    await close_supabase_clients()
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description=API_DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=TAGS_METADATA,
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    openapi_url=settings.OPENAPI_URL,
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
    },
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # Use list property
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(validation.router)
app.include_router(tryon.router)
app.include_router(closet.router)
app.include_router(clothing_items.router)

app.include_router(recommendations.router)
app.include_router(outfits.router)


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
        "version": "1.0.0",
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
