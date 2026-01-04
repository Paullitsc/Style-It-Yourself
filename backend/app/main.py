"""
Entry point for the FastAPI application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers import recommendations, outfits, tryon, validation

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name}...")
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="Personal styling API with color-based recommendations and AI try-on",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(validation.router)
app.include_router(recommendations.router)
app.include_router(outfits.router)
app.include_router(tryon.router)


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )