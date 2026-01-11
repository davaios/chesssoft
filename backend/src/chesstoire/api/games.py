"""Games API endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from chesstoire.core.deps import CurrentUser, DbSession
from chesstoire.models import Game
from chesstoire.schemas.game import GameDetail, GameFilter, GameList, GameRead

router = APIRouter()


@router.get("", response_model=GameList)
async def list_games(
    user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    platform: Optional[str] = None,
    time_control: Optional[str] = None,
    result: Optional[str] = None,
    color: Optional[str] = None,
    analyzed_only: bool = False,
) -> dict:
    """List user's games with filtering and pagination."""
    # Build query
    query = select(Game).where(Game.user_id == user.id)

    if platform:
        query = query.where(Game.platform == platform)
    if time_control:
        query = query.where(Game.time_control == time_control)
    if result:
        query = query.where(Game.result == result)
    if color:
        query = query.where(Game.user_color == color)
    if analyzed_only:
        query = query.where(Game.analysis_status == "completed")

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await session.scalar(count_query) or 0

    # Paginate
    query = query.order_by(Game.played_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await session.execute(query)
    games = list(result.scalars().all())

    return {
        "items": games,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/stats")
async def get_game_stats(user: CurrentUser, session: DbSession) -> dict:
    """Get aggregate statistics for user's games."""
    games_query = select(Game).where(Game.user_id == user.id)
    result = await session.execute(games_query)
    games = list(result.scalars().all())

    if not games:
        return {
            "total_games": 0,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "win_rate": 0.0,
            "avg_acpl": None,
            "by_time_control": {},
            "by_platform": {},
        }

    wins = sum(1 for g in games if g.result == "win")
    losses = sum(1 for g in games if g.result == "loss")
    draws = sum(1 for g in games if g.result == "draw")

    analyzed_games = [g for g in games if g.acpl is not None]
    avg_acpl = (
        sum(float(g.acpl) for g in analyzed_games) / len(analyzed_games)
        if analyzed_games
        else None
    )

    # Group by time control
    by_time_control: dict = {}
    for game in games:
        tc = game.time_control
        if tc not in by_time_control:
            by_time_control[tc] = {"total": 0, "wins": 0, "losses": 0, "draws": 0}
        by_time_control[tc]["total"] += 1
        if game.result == "win":
            by_time_control[tc]["wins"] += 1
        elif game.result == "loss":
            by_time_control[tc]["losses"] += 1
        else:
            by_time_control[tc]["draws"] += 1

    # Group by platform
    by_platform: dict = {}
    for game in games:
        p = game.platform
        if p not in by_platform:
            by_platform[p] = {"total": 0, "wins": 0}
        by_platform[p]["total"] += 1
        if game.result == "win":
            by_platform[p]["wins"] += 1

    return {
        "total_games": len(games),
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "win_rate": round(wins / len(games) * 100, 1) if games else 0.0,
        "avg_acpl": round(avg_acpl, 1) if avg_acpl else None,
        "by_time_control": by_time_control,
        "by_platform": by_platform,
    }


@router.get("/{game_id}", response_model=GameDetail)
async def get_game(game_id: str, user: CurrentUser, session: DbSession) -> Game:
    """Get a specific game with full details."""
    result = await session.execute(
        select(Game).where(Game.id == game_id, Game.user_id == user.id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found",
        )
    return game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(game_id: str, user: CurrentUser, session: DbSession) -> None:
    """Delete a specific game."""
    result = await session.execute(
        select(Game).where(Game.id == game_id, Game.user_id == user.id)
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found",
        )
    await session.delete(game)
