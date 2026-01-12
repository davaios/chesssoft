"""API router aggregation."""

from fastapi import APIRouter

from chesstoire.api.auth import router as auth_router
from chesstoire.api.coach import router as coach_router
from chesstoire.api.games import router as games_router
from chesstoire.api.platforms import router as platforms_router
from chesstoire.api.repertoire import router as repertoire_router
from chesstoire.api.study import router as study_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(platforms_router, prefix="/platforms", tags=["Platform Accounts"])
api_router.include_router(games_router, prefix="/games", tags=["Games"])
api_router.include_router(repertoire_router, prefix="/repertoire", tags=["Repertoire"])
api_router.include_router(study_router, prefix="/study", tags=["Study"])
api_router.include_router(coach_router, prefix="/coach", tags=["Coach AI"])
