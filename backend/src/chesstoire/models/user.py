"""User model for authentication and profile management."""

from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from chesstoire.models.base import Base

if TYPE_CHECKING:
    from chesstoire.models.game import Game
    from chesstoire.models.platform_account import PlatformAccount
    from chesstoire.models.repertoire import RepertoireLine
    from chesstoire.models.study import StudySession


class SubscriptionTier(str, Enum):
    """User subscription tiers."""

    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"
    COACH = "coach"


class User(Base):
    """User account model.

    Stores user authentication data, profile information, and subscription status.
    Users can have multiple platform accounts (Chess.com, Lichess) linked.
    """

    __tablename__ = "users"

    # Authentication
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Profile
    display_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Subscription
    subscription: Mapped[str] = mapped_column(
        String(20),
        default=SubscriptionTier.FREE.value,
        nullable=False,
    )

    # Coach relationship (for students)
    coach_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # User preferences and settings (flexible JSON storage)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Relationships
    platform_accounts: Mapped[list["PlatformAccount"]] = relationship(
        "PlatformAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    games: Mapped[list["Game"]] = relationship(
        "Game",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    repertoire_lines: Mapped[list["RepertoireLine"]] = relationship(
        "RepertoireLine",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    study_sessions: Mapped[list["StudySession"]] = relationship(
        "StudySession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    students: Mapped[list["User"]] = relationship(
        "User",
        back_populates="coach",
        remote_side="User.coach_id",
    )
    coach: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="students",
        remote_side="User.id",
        foreign_keys=[coach_id],
    )

    @property
    def is_coach(self) -> bool:
        """Check if user has coach subscription."""
        return self.subscription == SubscriptionTier.COACH.value

    @property
    def is_premium(self) -> bool:
        """Check if user has premium or higher subscription."""
        return self.subscription in {
            SubscriptionTier.PREMIUM.value,
            SubscriptionTier.COACH.value,
        }
