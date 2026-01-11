"""Study session and card schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class StudySessionCreate(BaseModel):
    """Schema for starting a study session."""

    session_type: str = Field(pattern="^(repertoire|tactics|endgame|review)$")
    max_cards: int = Field(default=20, ge=1, le=100)


class StudySessionRead(BaseModel):
    """Schema for study session response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    session_type: str
    started_at: datetime
    ended_at: Optional[datetime]
    cards_reviewed: int
    cards_correct: int
    cards_incorrect: int
    total_time_seconds: Optional[int]
    accuracy: float
    is_complete: bool


class StudySessionSummary(BaseModel):
    """Summary of a completed study session."""

    session_id: str
    session_type: str
    duration_minutes: float
    cards_reviewed: int
    accuracy: float
    streak_maintained: bool
    new_streak_days: int
    xp_earned: int


class StudyCardCreate(BaseModel):
    """Schema for generating a study card."""

    card_type: str
    source_id: Optional[str] = None
    source_type: Optional[str] = None
    fen: str
    correct_move: str


class StudyCardRead(BaseModel):
    """Schema for study card response (question)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    card_type: str
    fen: str
    # Note: correct_move is NOT included - client shouldn't see answer
    source_type: Optional[str]
    hint_available: bool = True


class StudyCardAnswer(BaseModel):
    """Schema for answering a study card."""

    user_move: str = Field(max_length=10)
    time_to_answer_ms: int = Field(ge=0)
    srs_rating: Optional[int] = Field(None, ge=0, le=3)  # 0=Again, 1=Hard, 2=Good, 3=Easy


class StudyCardResult(BaseModel):
    """Result after answering a study card."""

    is_correct: bool
    correct_move: str
    user_move: str
    explanation: Optional[str] = None
    next_review_days: Optional[int] = None


class DailyStudyGoal(BaseModel):
    """Daily study progress and goals."""

    cards_due_today: int
    cards_completed_today: int
    streak_days: int
    target_cards: int
    on_track: bool


class StudyHistory(BaseModel):
    """Historical study data for charts."""

    date: str  # ISO date
    cards_reviewed: int
    accuracy: float
    time_minutes: float
