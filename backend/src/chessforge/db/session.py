"""Async database session configuration."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from chessforge.config import settings

# Create async engine with connection pooling
async_engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# Session factory for creating new sessions
async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions.

    Usage in FastAPI:
        @app.get("/users")
        async def get_users(session: AsyncSession = Depends(get_async_session)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
