"""Study session and card models for tracking practice progress."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from chesstoire.models.base import Base

if TYPE_CHECKING:
    from chesstoire.models.user import User


class SessionType(str, Enum):
    """Types of study sessions."""

    REPERTOIRE = "repertoire"  # Practicing opening lines
    TACTICS = "tactics"  # Solving tactical puzzles
    ENDGAME = "endgame"  # Practicing endgame positions
    REVIEW = "review"  # Mixed review from past errors


class CardType(str, Enum):
    """Types of study cards."""

    REPERTOIRE_LINE = "repertoire_line"  # Opening line to memorize
    TACTICAL_PUZZLE = "tactical_puzzle"  # Tactical exercise
    CRITICAL_POSITION = "critical_position"  # Position from own game
    ENDGAME_DRILL = "endgame_drill"  # Endgame technique


class StudySession(Base):
    """A practice session tracking overall progress.

    Records the start/end time, cards reviewed, and accuracy
    for a single study session.
    """

    __tablename__ = "study_sessions"

    # Foreign key to user
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Session timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Session type
    session_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Statistics
    cards_reviewed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cards_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cards_incorrect: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Time spent in seconds
    total_time_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Session metadata
    metadata: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="study_sessions")
    cards: Mapped[list["StudyCard"]] = relationship(
        "StudyCard",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    @property
    def accuracy(self) -> float:
        """Calculate session accuracy percentage."""
        if self.cards_reviewed == 0:
            return 0.0
        return (self.cards_correct / self.cards_reviewed) * 100

    @property
    def is_complete(self) -> bool:
        """Check if session has ended."""
        return self.ended_at is not None

    @property
    def duration_minutes(self) -> Optional[float]:
        """Get session duration in minutes."""
        if not self.total_time_seconds:
            return None
        return self.total_time_seconds / 60


class StudyCard(Base):
    """Individual study card within a session.

    Tracks the specific position/puzzle, user response, timing,
    and whether the answer was correct.
    """

    __tablename__ = "study_cards"

    # Foreign key to session
    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("study_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Card type and reference
    card_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # Reference to the source (repertoire_line_id, game_id, etc.)
    source_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)
    source_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Position data
    fen: Mapped[str] = mapped_column(String(100), nullable=False)
    correct_move: Mapped[str] = mapped_column(String(10), nullable=False)

    # User's response
    user_move: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(nullable=True)

    # Timing
    shown_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    answered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    time_to_answer_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # SRS rating given by user (0=Again, 1=Hard, 2=Good, 3=Easy)
    srs_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Additional context
    hint_shown: Mapped[bool] = mapped_column(default=False, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    session: Mapped["StudySession"] = relationship("StudySession", back_populates="cards")

    @property
    def was_answered(self) -> bool:
        """Check if the card was answered."""
        return self.answered_at is not None
