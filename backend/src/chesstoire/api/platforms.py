"""Platform account API endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from chesstoire.core.deps import CurrentUser, DbSession
from chesstoire.models import PlatformAccount
from chesstoire.schemas.platform import (
    PlatformAccountCreate,
    PlatformAccountRead,
    PlatformAccountUpdate,
    SyncResult,
)
from chesstoire.services import ChessComService, GameSyncService, LichessService

router = APIRouter()


@router.get("", response_model=list[PlatformAccountRead])
async def list_platform_accounts(user: CurrentUser, session: DbSession) -> list[PlatformAccount]:
    """List all connected platform accounts."""
    result = await session.execute(
        select(PlatformAccount).where(PlatformAccount.user_id == user.id)
    )
    return list(result.scalars().all())


@router.post("", response_model=PlatformAccountRead, status_code=status.HTTP_201_CREATED)
async def connect_platform_account(
    data: PlatformAccountCreate,
    user: CurrentUser,
    session: DbSession,
) -> PlatformAccount:
    """Connect a new platform account."""
    # Check if already connected
    result = await session.execute(
        select(PlatformAccount).where(
            PlatformAccount.user_id == user.id,
            PlatformAccount.platform == data.platform,
            PlatformAccount.username == data.username,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already connected",
        )

    # Verify account exists on platform
    if data.platform == "chess.com":
        service = ChessComService()
        try:
            profile = await service.get_player_profile(data.username)
            if not profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chess.com account not found",
                )
            stats = await service.get_player_stats(data.username)
            ratings = service.extract_ratings(stats) if stats else {}
        finally:
            await service.close()
    elif data.platform == "lichess":
        service = LichessService()
        try:
            user_data = await service.get_user(data.username)
            if not user_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Lichess account not found",
                )
            ratings = service.extract_ratings(user_data)
        finally:
            await service.close()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported platform",
        )

    # Create account
    account = PlatformAccount(
        user_id=user.id,
        platform=data.platform,
        username=data.username,
        ratings=ratings,
    )
    session.add(account)
    await session.flush()
    await session.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_platform_account(
    account_id: str,
    user: CurrentUser,
    session: DbSession,
) -> None:
    """Disconnect a platform account."""
    result = await session.execute(
        select(PlatformAccount).where(
            PlatformAccount.id == account_id,
            PlatformAccount.user_id == user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    await session.delete(account)


@router.patch("/{account_id}", response_model=PlatformAccountRead)
async def update_platform_account(
    account_id: str,
    data: PlatformAccountUpdate,
    user: CurrentUser,
    session: DbSession,
) -> PlatformAccount:
    """Update platform account settings."""
    result = await session.execute(
        select(PlatformAccount).where(
            PlatformAccount.id == account_id,
            PlatformAccount.user_id == user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    if data.sync_enabled is not None:
        account.sync_enabled = data.sync_enabled

    await session.flush()
    await session.refresh(account)
    return account


@router.post("/{account_id}/sync", response_model=SyncResult)
async def sync_platform_account(
    account_id: str,
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """Manually trigger game sync for a platform account."""
    result = await session.execute(
        select(PlatformAccount).where(
            PlatformAccount.id == account_id,
            PlatformAccount.user_id == user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    sync_service = GameSyncService(session)
    try:
        return await sync_service.sync_account(account)
    finally:
        await sync_service.close()
