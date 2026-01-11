"""Repertoire model for opening lines and study progress."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from chessforge.models.base import Base

if TYPE_CHECKING:
    from chessforge.models.user import User


class RepertoireLine(Base):
    """A single line/position in the user's opening repertoire.

    Represents a node in the repertoire tree. Each line stores:
    - The position (FEN) and the move to play
    - SRS (spaced repetition) data for practice
    - Coverage probability (how often this position occurs)
    - Annotations and priority
    """

    __tablename__ = "repertoire_lines"

    __table_args__ = (
        UniqueConstraint("user_id", "color", "fen", "move_san", name="uq_user_position_move"),
    )

    # Foreign key to user
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Color this line is for
    color: Mapped[str] = mapped_column(String(5), nullable=False, index=True)

    # Position identifier
    fen: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # The move to play in this position
    move_san: Mapped[str] = mapped_column(String(10), nullable=False)
    move_uci: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Tree structure
    parent_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("repertoire_lines.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Depth in the opening (move number)
    ply: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # User annotations
    annotation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Priority for study (higher = more important)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Coverage probability (0.0 to 1.0)
    # Represents likelihood of reaching this position in a game
    coverage_prob: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)

    # Expected occurrence: "1 in X games"
    expected_in_games: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Engine evaluation of this move
    engine_eval: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)

    # Statistics from master database
    master_stats: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # SRS (Spaced Repetition System) data
    # Format: {ease_factor, interval, repetitions, next_review, last_review}
    srs_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Source of this line (manual, imported, suggested)
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="repertoire_lines")
    parent: Mapped[Optional["RepertoireLine"]] = relationship(
        "RepertoireLine",
        back_populates="children",
        remote_side="RepertoireLine.id",
    )
    children: Mapped[list["RepertoireLine"]] = relationship(
        "RepertoireLine",
        back_populates="parent",
        cascade="all, delete-orphan",
    )

    @property
    def is_white(self) -> bool:
        """Check if this line is for white pieces."""
        return self.color == "white"

    @property
    def is_due_for_review(self) -> bool:
        """Check if this line needs to be reviewed based on SRS data."""
        from datetime import datetime, timezone

        next_review = self.srs_data.get("next_review")
        if not next_review:
            return True
        return datetime.now(timezone.utc).isoformat() >= next_review

    @property
    def mastery_level(self) -> str:
        """Get mastery level based on SRS interval."""
        interval = self.srs_data.get("interval", 0)
        if interval == 0:
            return "new"
        elif interval < 7:
            return "learning"
        elif interval < 30:
            return "familiar"
        else:
            return "mastered"
