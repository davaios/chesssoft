"""Game model for imported chess games and analysis."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from chessforge.models.base import Base

if TYPE_CHECKING:
    from chessforge.models.user import User


class GameResult(str, Enum):
    """Possible game results."""

    WIN = "win"
    LOSS = "loss"
    DRAW = "draw"


class Color(str, Enum):
    """Player color."""

    WHITE = "white"
    BLACK = "black"


class TimeControl(str, Enum):
    """Time control categories."""

    BULLET = "bullet"
    BLITZ = "blitz"
    RAPID = "rapid"
    CLASSICAL = "classical"
    CORRESPONDENCE = "correspondence"
    DAILY = "daily"


class Game(Base):
    """Imported chess game with analysis data.

    Stores the PGN, metadata, and engine analysis results
    for games imported from Chess.com or Lichess.
    """

    __tablename__ = "games"

    __table_args__ = (
        UniqueConstraint("platform", "platform_game_id", name="uq_platform_game"),
    )

    # Foreign key to user
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Platform reference
    platform: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    platform_game_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # Game data
    pgn: Mapped[str] = mapped_column(Text, nullable=False)
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    # Game metadata
    time_control: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    time_control_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    increment_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # User's perspective
    user_color: Mapped[str] = mapped_column(String(5), nullable=False)
    result: Mapped[str] = mapped_column(String(10), nullable=False)

    # Opponent info
    opponent_username: Mapped[str] = mapped_column(String(100), nullable=False)
    opponent_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    user_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Opening info (extracted from PGN or API)
    opening_eco: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    opening_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Analysis results (populated after engine analysis)
    acpl: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    accuracy: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

    # Detailed move-by-move analysis stored as JSON
    # Format: [{move: "e4", eval: 0.3, best: "e4", classification: "best"}, ...]
    analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Analysis status
    analysis_status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )
    analyzed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="games")

    @property
    def is_win(self) -> bool:
        """Check if user won the game."""
        return self.result == GameResult.WIN.value

    @property
    def is_loss(self) -> bool:
        """Check if user lost the game."""
        return self.result == GameResult.LOSS.value

    @property
    def is_analyzed(self) -> bool:
        """Check if game has been analyzed."""
        return self.analysis_status == "completed" and self.analysis is not None

    @property
    def move_count(self) -> int:
        """Get approximate number of moves from PGN."""
        if not self.analysis:
            return 0
        return len(self.analysis.get("moves", []))
