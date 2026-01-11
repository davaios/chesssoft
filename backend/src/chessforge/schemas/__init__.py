"""Pydantic schemas for API request/response validation."""

from chessforge.schemas.user import (
    UserCreate,
    UserRead,
    UserUpdate,
    Token,
    TokenPayload,
)
from chessforge.schemas.game import (
    GameRead,
    GameList,
    GameAnalysis,
)
from chessforge.schemas.repertoire import (
    RepertoireLineCreate,
    RepertoireLineRead,
    RepertoireLineUpdate,
    RepertoireTree,
)
from chessforge.schemas.study import (
    StudySessionCreate,
    StudySessionRead,
    StudyCardCreate,
    StudyCardRead,
    StudyCardAnswer,
)
from chessforge.schemas.platform import (
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
