"""Platform account model for Chess.com and Lichess integration."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from chessforge.models.base import Base

if TYPE_CHECKING:
    from chessforge.models.user import User


class Platform(str, Enum):
    """Supported chess platforms."""

    CHESS_COM = "chess.com"
    LICHESS = "lichess"


class PlatformAccount(Base):
    """External chess platform account linked to a user.

    Stores connection details for Chess.com and Lichess accounts,
    including sync status and cached rating information.
    """

    __tablename__ = "platform_accounts"

    __table_args__ = (
        UniqueConstraint("platform", "username", name="uq_platform_username"),
    )

    # Foreign key to user
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Platform details
    platform: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)

    # OAuth tokens (for Lichess)
    access_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Sync status
    sync_enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_sync_error: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Cached ratings (updated on sync)
    ratings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="platform_accounts")

    @property
    def is_lichess(self) -> bool:
        """Check if this is a Lichess account."""
        return self.platform == Platform.LICHESS.value

    @property
    def is_chess_com(self) -> bool:
        """Check if this is a Chess.com account."""
        return self.platform == Platform.CHESS_COM.value

    @property
    def needs_reauth(self) -> bool:
        """Check if OAuth token needs refresh (Lichess only)."""
        if not self.is_lichess or not self.token_expires_at:
            return False
        return datetime.now(self.token_expires_at.tzinfo) >= self.token_expires_at
