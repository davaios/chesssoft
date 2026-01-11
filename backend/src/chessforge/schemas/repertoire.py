"""Repertoire-related Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SRSData(BaseModel):
    """Spaced repetition system data."""

    ease_factor: float = 2.5
    interval: int = 0  # Days until next review
    repetitions: int = 0
    next_review: Optional[datetime] = None
    last_review: Optional[datetime] = None


class MasterStats(BaseModel):
    """Statistics from master game database."""

    total_games: int = 0
    white_wins: float = 0.0  # Percentage
    draws: float = 0.0
    black_wins: float = 0.0
    avg_elo: Optional[int] = None


class RepertoireLineCreate(BaseModel):
    """Schema for creating a repertoire line."""

    color: str = Field(pattern="^(white|black)$")
    fen: str = Field(max_length=100)
    move_san: str = Field(max_length=10)
    move_uci: Optional[str] = Field(None, max_length=10)
    parent_id: Optional[str] = None
    annotation: Optional[str] = None
    priority: int = 0


class RepertoireLineRead(BaseModel):
    """Schema for repertoire line response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    color: str
    fen: str
    move_san: str
    move_uci: Optional[str]
    parent_id: Optional[str]
    ply: int
    annotation: Optional[str]
    priority: int
    coverage_prob: Optional[float]
    expected_in_games: Optional[int]
    engine_eval: Optional[float]
    master_stats: Optional[MasterStats]
    srs_data: SRSData
    source: str
    created_at: datetime
    updated_at: datetime


class RepertoireLineUpdate(BaseModel):
    """Schema for updating a repertoire line."""

    annotation: Optional[str] = None
    priority: Optional[int] = None
    move_san: Optional[str] = Field(None, max_length=10)


class RepertoireTreeNode(BaseModel):
    """A node in the repertoire tree structure."""

    id: str
    fen: str
    move_san: str
    engine_eval: Optional[float]
    coverage_prob: Optional[float]
    mastery_level: str
    children: list["RepertoireTreeNode"] = []


class RepertoireTree(BaseModel):
    """Full repertoire tree for a color."""

    color: str
    total_lines: int
    lines_mastered: int
    lines_learning: int
    lines_new: int
    coverage_percentage: float
    root_moves: list[RepertoireTreeNode]


class RepertoireStats(BaseModel):
    """Overall repertoire statistics."""

    white_lines: int
    black_lines: int
    white_coverage: float
    black_coverage: float
    total_due_today: int
    streak_days: int
