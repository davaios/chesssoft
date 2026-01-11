"""ChessForge API - Main application entry point."""

import structlog
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from chessforge.config import settings
from chessforge.db import async_engine

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    logger.info("Starting ChessForge API", version="0.1.0", env=settings.app_env)
    yield
    # Shutdown
    logger.info("Shutting down ChessForge API")
    await async_engine.dispose()


app = FastAPI(
    title="ChessForge API",
    description="Integrated Chess Improvement System - API Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Welcome to ChessForge API",
        "docs": "/docs",
    }
