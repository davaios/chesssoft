"""Base model configuration for SQLAlchemy."""

from datetime import datetime
from typing import Annotated
from uuid import uuid4

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, registry

# Type annotations for common column types
uuid_pk = Annotated[
    str,
    mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())),
]
created_at = Annotated[
    datetime,
    mapped_column(DateTime(timezone=True), server_default=func.now()),
]
updated_at = Annotated[
    datetime,
    mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    ),
]


class Base(DeclarativeBase):
    """Base class for all database models."""

    registry = registry()

    # Common columns for all models
    id: Mapped[uuid_pk]
    created_at: Mapped[created_at]
    updated_at: Mapped[updated_at]

    def __repr__(self) -> str:
        """Return string representation of model."""
        return f"<{self.__class__.__name__}(id={self.id})>"
