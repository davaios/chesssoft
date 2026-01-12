"""Pydantic schemas for API request/response validation."""

from chesstoire.schemas.user import (
    UserCreate,
    UserRead,
    UserUpdate,
    Token,
    TokenPayload,
)
from chesstoire.schemas.game import (
    GameRead,
    GameList,
    GameAnalysis,
)
from chesstoire.schemas.repertoire import (
    RepertoireLineCreate,
    RepertoireLineRead,
    RepertoireLineUpdate,
    RepertoireTree,
)
from chesstoire.schemas.study import (
    StudySessionCreate,
    StudySessionRead,
    StudyCardCreate,
    StudyCardRead,
    StudyCardAnswer,
)
from chesstoire.schemas.platform import (
    PlatformAccountCreate,
    PlatformAccountRead,
)

__all__ = [
    # User
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "Token",
    "TokenPayload",
    # Game
    "GameRead",
    "GameList",
    "GameAnalysis",
    # Repertoire
    "RepertoireLineCreate",
    "RepertoireLineRead",
    "RepertoireLineUpdate",
    "RepertoireTree",
    # Study
    "StudySessionCreate",
    "StudySessionRead",
    "StudyCardCreate",
    "StudyCardRead",
    "StudyCardAnswer",
    # Platform
    "PlatformAccountCreate",
    "PlatformAccountRead",
]
