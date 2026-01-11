"""Coach AI API endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select

from chessforge.core.deps import CurrentUser, DbSession
from chessforge.models import Game, RepertoireLine
from chessforge.services import CoachAIService

router = APIRouter()


class ExplainMoveRequest(BaseModel):
    """Request to explain a move."""

    fen: str
    played_move: str
    best_move: str
    eval_before: float
    eval_after: float


class ExplainMoveResponse(BaseModel):
    """Response with move explanation."""

    explanation: str


class ChatRequest(BaseModel):
    """Chat message request."""

    message: str
    context: Optional[str] = None
    conversation_history: Optional[list[dict]] = None


class ChatResponse(BaseModel):
    """Chat response."""

    response: str


class WeeklyPlanResponse(BaseModel):
    """Weekly improvement plan."""

    plan: str
    weaknesses: list[str]
    repertoire_gaps: list[str]


class OpeningExplanationRequest(BaseModel):
    """Request to explain an opening."""

    opening_name: str
    eco_code: Optional[str] = None
    player_color: str = "white"


class OpeningExplanationResponse(BaseModel):
    """Opening explanation response."""

    explanation: str


@router.post("/explain-move", response_model=ExplainMoveResponse)
async def explain_move(
    request: ExplainMoveRequest,
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """Get an AI explanation for why a move was suboptimal."""
    # Get user's approximate Elo from their games
    result = await session.execute(
        select(Game.user_rating)
        .where(Game.user_id == user.id, Game.user_rating.isnot(None))
        .order_by(Game.played_at.desc())
        .limit(10)
    )
    ratings = [r[0] for r in result.all() if r[0]]
    player_elo = int(sum(ratings) / len(ratings)) if ratings else 1500

    coach = CoachAIService()
    explanation = await coach.explain_move(
        fen=request.fen,
        played_move=request.played_move,
        best_move=request.best_move,
        eval_before=request.eval_before,
        eval_after=request.eval_after,
        player_elo=player_elo,
    )

    return {"explanation": explanation}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_coach(
    request: ChatRequest,
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """Have a conversation with the AI coach."""
    # Get user's approximate Elo
    result = await session.execute(
        select(Game.user_rating)
        .where(Game.user_id == user.id, Game.user_rating.isnot(None))
        .order_by(Game.played_at.desc())
        .limit(10)
    )
    ratings = [r[0] for r in result.all() if r[0]]
    player_elo = int(sum(ratings) / len(ratings)) if ratings else 1500

    coach = CoachAIService()
    response = await coach.chat(
        message=request.message,
        context=request.context,
        conversation_history=request.conversation_history,
        player_elo=player_elo,
    )

    return {"response": response}


@router.get("/weekly-plan", response_model=WeeklyPlanResponse)
async def get_weekly_plan(
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """Generate a personalized weekly improvement plan."""
    # Get recent games stats
    result = await session.execute(
        select(Game)
        .where(Game.user_id == user.id)
        .order_by(Game.played_at.desc())
        .limit(20)
    )
    recent_games = list(result.scalars().all())

    if not recent_games:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Play some games first to get a personalized plan",
        )

    # Calculate stats
    wins = sum(1 for g in recent_games if g.result == "win")
    losses = sum(1 for g in recent_games if g.result == "loss")
    avg_acpl = (
        sum(float(g.acpl) for g in recent_games if g.acpl)
        / len([g for g in recent_games if g.acpl])
        if any(g.acpl for g in recent_games)
        else None
    )

    recent_summary = f"""Last {len(recent_games)} games: {wins} wins, {losses} losses
Win rate: {wins / len(recent_games) * 100:.0f}%
Average ACPL: {avg_acpl:.1f if avg_acpl else 'N/A'}"""

    # Identify weaknesses based on games
    weaknesses = []
    if avg_acpl and avg_acpl > 50:
        weaknesses.append("Tactical accuracy needs improvement")
    if losses > wins:
        weaknesses.append("Consider playing more solid openings")

    # Opening losses
    opening_losses = [g for g in recent_games if g.result == "loss" and g.opening_name]
    if opening_losses:
        common_openings = {}
        for g in opening_losses:
            name = g.opening_name.split(":")[0] if g.opening_name else "Unknown"
            common_openings[name] = common_openings.get(name, 0) + 1
        worst_opening = max(common_openings, key=common_openings.get)
        if common_openings[worst_opening] >= 2:
            weaknesses.append(f"Struggling in {worst_opening}")

    # Get repertoire gaps
    result = await session.execute(
        select(RepertoireLine)
        .where(RepertoireLine.user_id == user.id)
    )
    lines = list(result.scalars().all())
    due_lines = [l for l in lines if l.is_due_for_review]
    repertoire_gaps = []
    if len(due_lines) > 10:
        repertoire_gaps.append(f"{len(due_lines)} repertoire lines need review")

    # Get player Elo
    ratings = [g.user_rating for g in recent_games if g.user_rating]
    player_elo = int(sum(ratings) / len(ratings)) if ratings else 1500

    # Generate plan
    coach = CoachAIService()
    plan = await coach.generate_weekly_plan(
        recent_games_summary=recent_summary,
        weaknesses=weaknesses,
        repertoire_gaps=repertoire_gaps,
        player_elo=player_elo,
    )

    return {
        "plan": plan,
        "weaknesses": weaknesses,
        "repertoire_gaps": repertoire_gaps,
    }


@router.post("/explain-opening", response_model=OpeningExplanationResponse)
async def explain_opening(
    request: OpeningExplanationRequest,
    user: CurrentUser,
    session: DbSession,
) -> dict:
    """Get an explanation of an opening's key ideas."""
    # Get user's approximate Elo
    result = await session.execute(
        select(Game.user_rating)
        .where(Game.user_id == user.id, Game.user_rating.isnot(None))
        .order_by(Game.played_at.desc())
        .limit(10)
    )
    ratings = [r[0] for r in result.all() if r[0]]
    player_elo = int(sum(ratings) / len(ratings)) if ratings else 1500

    coach = CoachAIService()
    explanation = await coach.explain_opening(
        opening_name=request.opening_name,
        eco_code=request.eco_code,
        player_color=request.player_color,
        player_elo=player_elo,
    )

    return {"explanation": explanation}
