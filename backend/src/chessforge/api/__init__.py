"""API router aggregation."""

from fastapi import APIRouter

from chessforge.api.auth import router as auth_router
from chessforge.api.games import router as games_router
from chessforge.api.platforms import router as platforms_router
from chessforge.api.repertoire import router as repertoire_router
from chessforge.api.study import router as study_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(platforms_router, prefix="/platforms", tags=["Platform Accounts"])
api_router.include_router(games_router, prefix="/games", tags=["Games"])
api_router.include_router(repertoire_router, prefix="/repertoire", tags=["Repertoire"])
api_router.include_router(study_router, prefix="/study", tags=["Study"])
