"""Platform account schemas for Chess.com and Lichess integration."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RatingData(BaseModel):
    """Rating data for a time control."""

    rating: int
    games: int
    best: Optional[int] = None


class PlatformRatings(BaseModel):
    """All ratings for a platform account."""

    bullet: Optional[RatingData] = None
    blitz: Optional[RatingData] = None
    rapid: Optional[RatingData] = None
    classical: Optional[RatingData] = None
    puzzle: Optional[RatingData] = None


class PlatformAccountCreate(BaseModel):
    """Schema for linking a platform account."""

    platform: str = Field(pattern="^(chess\\.com|lichess)$")
    username: str = Field(min_length=1, max_length=100)


class PlatformAccountRead(BaseModel):
    """Schema for platform account response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    platform: str
    username: str
    sync_enabled: bool
    last_sync_at: Optional[datetime]
    last_sync_error: Optional[str]
    ratings: PlatformRatings
    created_at: datetime


class PlatformAccountUpdate(BaseModel):
    """Schema for updating platform account settings."""

    sync_enabled: Optional[bool] = None


class SyncStatus(BaseModel):
    """Current sync status for a platform account."""

    account_id: str
    platform: str
    username: str
    last_sync_at: Optional[datetime]
    games_synced: int
    sync_in_progress: bool
    next_sync_at: Optional[datetime]
    error: Optional[str] = None


class SyncResult(BaseModel):
    """Result of a sync operation."""

    account_id: str
    new_games: int
    total_games: int
    errors: list[str]
    duration_seconds: float
