"""Study session API endpoints."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from chesstoire.core.deps import CurrentUser, DbSession
from chesstoire.models import RepertoireLine, StudyCard, StudySession
from chesstoire.schemas.study import (
    DailyStudyGoal,
    StudyCardAnswer,
    StudyCardRead,
    StudyCardResult,
    StudySessionCreate,
    StudySessionRead,
    StudySessionSummary,
)
from chesstoire.services.srs import SRSService

router = APIRouter()


@router.get("/daily", response_model=DailyStudyGoal)
async def get_daily_goal(user: CurrentUser, session: DbSession) -> dict:
    """Get today's study progress and goals."""
    today = datetime.now(timezone.utc).date()

    # Get due cards
    result = await session.execute(
        select(RepertoireLine).where(RepertoireLine.user_id == user.id)
    )
    lines = list(result.scalars().all())
    due_lines = [l for l in lines if SRSService.is_due(l.srs_data)]

    # Get today's completed cards
    result = await session.execute(
        select(StudySession).where(
            StudySession.user_id == user.id,
            func.date(StudySession.started_at) == today,
        )
    )
    today_sessions = list(result.scalars().all())
    completed_today = sum(s.cards_reviewed for s in today_sessions)

    # TODO: Calculate streak from consecutive days with study sessions
    streak_days = 0

    target = 20  # Default daily target

    return {
        "cards_due_today": len(due_lines),
        "cards_completed_today": completed_today,
        "streak_days": streak_days,
        "target_cards": target,
        "on_track": completed_today >= target or len(due_lines) == 0,
    }


@router.post("/sessions", response_model=StudySessionRead, status_code=status.HTTP_201_CREATED)
async def start_study_session(
    data: StudySessionCreate,
    user: CurrentUser,
    session: DbSession,
) -> StudySession:
    """Start a new study session."""
    study_session = StudySession(
        user_id=user.id,
        session_type=data.session_type,
        started_at=datetime.now(timezone.utc),
    )
    session.add(study_session)
    await session.flush()
    await session.refresh(study_session)
    return study_session


@router.get("/sessions", response_model=list[StudySessionRead])
async def list_study_sessions(
    user: CurrentUser,
    session: DbSession,
    limit: int = Query(10, ge=1, le=50),
) -> list[StudySession]:
    """List recent study sessions."""
    result = await session.execute(
        select(StudySession)
        .where(StudySession.user_id == user.id)
        .order_by(StudySession.started_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


@router.post("/sessions/{session_id}/end", response_model=StudySessionSummary)
async def end_study_session(
    session_id: str,
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """End a study session and get summary."""
    result = await session.execute(
        select(StudySession).where(
            StudySession.id == session_id,
            StudySession.user_id == user.id,
        )
    )
    study_session = result.scalar_one_or_none()
    if not study_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if study_session.ended_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session already ended",
        )

    now = datetime.now(timezone.utc)
    study_session.ended_at = now
    study_session.total_time_seconds = int((now - study_session.started_at).total_seconds())

    await session.flush()

    return {
        "session_id": study_session.id,
        "session_type": study_session.session_type,
        "duration_minutes": round(study_session.total_time_seconds / 60, 1),
        "cards_reviewed": study_session.cards_reviewed,
        "accuracy": study_session.accuracy,
        "streak_maintained": True,  # TODO: Calculate properly
        "new_streak_days": 1,
        "xp_earned": study_session.cards_correct * 10,  # Simple XP calculation
    }


@router.get("/sessions/{session_id}/next-card", response_model=Optional[StudyCardRead])
async def get_next_card(
    session_id: str,
    user: CurrentUser,
    session: DbSession,
) -> Optional[dict]:
    """Get the next card to study in the session."""
    # Verify session
    result = await session.execute(
        select(StudySession).where(
            StudySession.id == session_id,
            StudySession.user_id == user.id,
        )
    )
    study_session = result.scalar_one_or_none()
    if not study_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if study_session.ended_at:
        return None

    # Get due repertoire lines
    result = await session.execute(
        select(RepertoireLine).where(RepertoireLine.user_id == user.id)
    )
    lines = list(result.scalars().all())
    due_lines = [l for l in lines if SRSService.is_due(l.srs_data)]

    if not due_lines:
        return None

    # Get cards already shown in this session
    result = await session.execute(
        select(StudyCard.source_id).where(StudyCard.session_id == session_id)
    )
    shown_ids = {row[0] for row in result.all()}

    # Find next unshown due line
    next_line = None
    for line in due_lines:
        if line.id not in shown_ids:
            next_line = line
            break

    if not next_line:
        return None

    # Create study card
    card = StudyCard(
        session_id=session_id,
        card_type="repertoire_line",
        source_id=next_line.id,
        source_type="repertoire_line",
        fen=next_line.fen,
        correct_move=next_line.move_san,
        shown_at=datetime.now(timezone.utc),
    )
    session.add(card)
    await session.flush()
    await session.refresh(card)

    return {
        "id": card.id,
        "card_type": card.card_type,
        "fen": card.fen,
        "source_type": card.source_type,
        "hint_available": True,
    }


@router.post("/cards/{card_id}/answer", response_model=StudyCardResult)
async def answer_card(
    card_id: str,
    data: StudyCardAnswer,
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """Submit an answer for a study card."""
    # Get the card
    result = await session.execute(select(StudyCard).where(StudyCard.id == card_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found",
        )

    # Verify ownership through session
    result = await session.execute(
        select(StudySession).where(
            StudySession.id == card.session_id,
            StudySession.user_id == user.id,
        )
    )
    study_session = result.scalar_one_or_none()
    if not study_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Check answer
    is_correct = data.user_move.lower().replace(" ", "") == card.correct_move.lower().replace(" ", "")

    # Update card
    card.user_move = data.user_move
    card.is_correct = is_correct
    card.answered_at = datetime.now(timezone.utc)
    card.time_to_answer_ms = data.time_to_answer_ms
    card.srs_rating = data.srs_rating

    # Update session stats
    study_session.cards_reviewed += 1
    if is_correct:
        study_session.cards_correct += 1
    else:
        study_session.cards_incorrect += 1

    # Update SRS data for the source line
    if card.source_type == "repertoire_line" and card.source_id:
        result = await session.execute(
            select(RepertoireLine).where(RepertoireLine.id == card.source_id)
        )
        line = result.scalar_one_or_none()
        if line:
            # Use provided rating or derive from correctness
            rating = data.srs_rating if data.srs_rating is not None else (2 if is_correct else 0)
            line.srs_data = SRSService.calculate_next_review(line.srs_data, rating)
            next_interval = line.srs_data.get("interval", 0)

    await session.flush()

    return {
        "is_correct": is_correct,
        "correct_move": card.correct_move,
        "user_move": data.user_move,
        "explanation": None,  # TODO: Generate with AI
        "next_review_days": next_interval if card.source_type == "repertoire_line" else None,
    }
