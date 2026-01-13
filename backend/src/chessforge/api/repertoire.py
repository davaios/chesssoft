"""Repertoire API endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select

from chessforge.core.deps import CurrentUser, DbSession
from chessforge.models import RepertoireLine
from chessforge.schemas.repertoire import (
    RepertoireLineCreate,
    RepertoireLineRead,
    RepertoireLineUpdate,
    RepertoireStats,
    RepertoireTree,
    RepertoireTreeNode,
)
from chessforge.services.lichess import LichessService


class OpeningMove(BaseModel):
    """Suggested opening move with statistics."""

    san: str
    uci: str | None
    total_games: int
    white_wins: float
    draws: float
    black_wins: float
    average_rating: int | None


class OpeningSuggestions(BaseModel):
    """Opening suggestions for a position."""

    opening: str | None
    eco: str | None
    moves: list[OpeningMove]

router = APIRouter()


@router.get("/stats", response_model=RepertoireStats)
async def get_repertoire_stats(user: CurrentUser, session: DbSession) -> dict:
    """Get overall repertoire statistics."""
    result = await session.execute(
        select(RepertoireLine).where(RepertoireLine.user_id == user.id)
    )
    lines = list(result.scalars().all())

    white_lines = [l for l in lines if l.color == "white"]
    black_lines = [l for l in lines if l.color == "black"]

    # Calculate coverage (simplified - would need proper probability calc)
    white_coverage = (
        sum(float(l.coverage_prob or 0) for l in white_lines) / len(white_lines) * 100
        if white_lines
        else 0.0
    )
    black_coverage = (
        sum(float(l.coverage_prob or 0) for l in black_lines) / len(black_lines) * 100
        if black_lines
        else 0.0
    )

    # Count lines due for review
    due_today = sum(1 for l in lines if l.is_due_for_review)

    return {
        "white_lines": len(white_lines),
        "black_lines": len(black_lines),
        "white_coverage": round(white_coverage, 1),
        "black_coverage": round(black_coverage, 1),
        "total_due_today": due_today,
        "streak_days": 0,  # TODO: Calculate from study sessions
    }


@router.get("/suggestions", response_model=OpeningSuggestions)
async def get_opening_suggestions(
    user: CurrentUser,
    fen: str = Query(..., description="FEN position to get suggestions for"),
) -> dict:
    """Get opening move suggestions from the Lichess opening explorer."""
    lichess = LichessService()
    try:
        result = await lichess.get_opening_explorer(
            fen=fen,
            ratings=[1600, 1800, 2000, 2200],
            speeds=["blitz", "rapid", "classical"],
        )
        return result
    finally:
        await lichess.close()


@router.get("/tree/{color}", response_model=RepertoireTree)
async def get_repertoire_tree(
    color: str,
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """Get the full repertoire tree for a color."""
    if color not in ("white", "black"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Color must be 'white' or 'black'",
        )

    result = await session.execute(
        select(RepertoireLine).where(
            RepertoireLine.user_id == user.id,
            RepertoireLine.color == color,
        )
    )
    lines = list(result.scalars().all())

    # Build tree structure
    lines_by_id = {l.id: l for l in lines}
    root_lines = [l for l in lines if l.parent_id is None]

    def build_node(line: RepertoireLine) -> dict:
        children_lines = [l for l in lines if l.parent_id == line.id]
        return {
            "id": line.id,
            "fen": line.fen,
            "move_san": line.move_san,
            "engine_eval": float(line.engine_eval) if line.engine_eval else None,
            "coverage_prob": float(line.coverage_prob) if line.coverage_prob else None,
            "mastery_level": line.mastery_level,
            "children": [build_node(c) for c in children_lines],
        }

    root_moves = [build_node(l) for l in root_lines]

    # Calculate stats
    mastered = sum(1 for l in lines if l.mastery_level == "mastered")
    learning = sum(1 for l in lines if l.mastery_level in ("learning", "familiar"))
    new = sum(1 for l in lines if l.mastery_level == "new")

    coverage = (
        sum(float(l.coverage_prob or 0) for l in lines) / len(lines) * 100
        if lines
        else 0.0
    )

    return {
        "color": color,
        "total_lines": len(lines),
        "lines_mastered": mastered,
        "lines_learning": learning,
        "lines_new": new,
        "coverage_percentage": round(coverage, 1),
        "root_moves": root_moves,
    }


@router.get("/lines", response_model=list[RepertoireLineRead])
async def list_repertoire_lines(
    user: CurrentUser,
    session: DbSession,
    color: Optional[str] = None,
    fen: Optional[str] = None,
    due_only: bool = False,
) -> list[RepertoireLine]:
    """List repertoire lines with optional filtering."""
    query = select(RepertoireLine).where(RepertoireLine.user_id == user.id)

    if color:
        query = query.where(RepertoireLine.color == color)
    if fen:
        query = query.where(RepertoireLine.fen == fen)

    result = await session.execute(query)
    lines = list(result.scalars().all())

    if due_only:
        lines = [l for l in lines if l.is_due_for_review]

    return lines


@router.post("/lines", response_model=RepertoireLineRead, status_code=status.HTTP_201_CREATED)
async def create_repertoire_line(
    data: RepertoireLineCreate,
    user: CurrentUser,
    session: DbSession,
) -> RepertoireLine:
    """Add a new line to the repertoire."""
    # Check for duplicate
    result = await session.execute(
        select(RepertoireLine).where(
            RepertoireLine.user_id == user.id,
            RepertoireLine.color == data.color,
            RepertoireLine.fen == data.fen,
            RepertoireLine.move_san == data.move_san,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Line already exists",
        )

    # Validate parent if specified
    ply = 0
    if data.parent_id:
        result = await session.execute(
            select(RepertoireLine).where(
                RepertoireLine.id == data.parent_id,
                RepertoireLine.user_id == user.id,
            )
        )
        parent = result.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent line not found",
            )
        ply = parent.ply + 1

    line = RepertoireLine(
        user_id=user.id,
        color=data.color,
        fen=data.fen,
        move_san=data.move_san,
        move_uci=data.move_uci,
        parent_id=data.parent_id,
        ply=ply,
        annotation=data.annotation,
        priority=data.priority,
        srs_data={},
    )
    session.add(line)
    await session.flush()
    await session.refresh(line)
    return line


@router.get("/lines/{line_id}", response_model=RepertoireLineRead)
async def get_repertoire_line(
    line_id: str,
    user: CurrentUser,
    session: DbSession,
) -> RepertoireLine:
    """Get a specific repertoire line."""
    result = await session.execute(
        select(RepertoireLine).where(
            RepertoireLine.id == line_id,
            RepertoireLine.user_id == user.id,
        )
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Line not found",
        )
    return line


@router.patch("/lines/{line_id}", response_model=RepertoireLineRead)
async def update_repertoire_line(
    line_id: str,
    data: RepertoireLineUpdate,
    user: CurrentUser,
    session: DbSession,
) -> RepertoireLine:
    """Update a repertoire line."""
    result = await session.execute(
        select(RepertoireLine).where(
            RepertoireLine.id == line_id,
            RepertoireLine.user_id == user.id,
        )
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Line not found",
        )

    if data.annotation is not None:
        line.annotation = data.annotation
    if data.priority is not None:
        line.priority = data.priority
    if data.move_san is not None:
        line.move_san = data.move_san

    await session.flush()
    await session.refresh(line)
    return line


@router.delete("/lines/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repertoire_line(
    line_id: str,
    user: CurrentUser,
    session: DbSession,
) -> None:
    """Delete a repertoire line and its children."""
    result = await session.execute(
        select(RepertoireLine).where(
            RepertoireLine.id == line_id,
            RepertoireLine.user_id == user.id,
        )
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Line not found",
        )
    await session.delete(line)
