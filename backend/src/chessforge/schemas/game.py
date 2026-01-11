"""Game-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MoveAnalysis(BaseModel):
    """Analysis data for a single move."""

    move_number: int
    color: str
    move_san: str
    move_uci: str
    eval_before: Optional[float] = None
    eval_after: Optional[float] = None
    best_move: Optional[str] = None
    classification: str  # best, excellent, good, inaccuracy, mistake, blunder
    centipawn_loss: Optional[int] = None


class GameAnalysis(BaseModel):
    """Full analysis data for a game."""

    acpl: float
    accuracy: float
    moves: list[MoveAnalysis]
    critical_positions: list[str]  # FENs of key positions
    opening_deviation_ply: Optional[int] = None


class GameRead(BaseModel):
    """Schema for game response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    platform: str
    platform_game_id: str
    played_at: datetime
    time_control: str
    user_color: str
    result: str
    opponent_username: str
    opponent_rating: Optional[int]
    user_rating: Optional[int]
    opening_eco: Optional[str]
    opening_name: Optional[str]
    acpl: Optional[float]
    accuracy: Optional[float]
    analysis_status: str
    analyzed_at: Optional[datetime]
    created_at: datetime


class GameDetail(GameRead):
    """Detailed game response including PGN and analysis."""

    pgn: str
    analysis: Optional[GameAnalysis] = None


class GameList(BaseModel):
    """Paginated list of games."""

    items: list[GameRead]
    total: int
    page: int
    per_page: int
    pages: int


class GameFilter(BaseModel):
    """Filter parameters for game queries."""

    platform: Optional[str] = None
    time_control: Optional[str] = None
    result: Optional[str] = None
    color: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    min_rating: Optional[int] = None
    max_rating: Optional[int] = None
    analyzed_only: bool = False
