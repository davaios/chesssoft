"""Coach AI service using Claude API for chess explanations."""

from typing import Optional

import anthropic
import structlog

from chessforge.config import settings

logger = structlog.get_logger()


class CoachAIService:
    """AI-powered chess coach using Claude for explanations and analysis."""

    SYSTEM_PROMPT = """You are an experienced chess coach helping players improve.
Your explanations should be:
- Clear and pedagogical, appropriate for the player's level
- Focused on concepts and principles, not just moves
- Encouraging while being honest about mistakes
- Concise (under 150 words unless asked for more detail)

When analyzing positions:
- Explain the key ideas and plans for both sides
- Point out tactical and strategic themes
- Suggest what the player should focus on improving

When explaining moves:
- Compare the played move to better alternatives
- Explain WHY the better move is stronger
- Give a memorable principle the player can apply elsewhere"""

    def __init__(self) -> None:
        self._client: Optional[anthropic.AsyncAnthropic] = None

    def _get_client(self) -> anthropic.AsyncAnthropic:
        """Get or create Anthropic client."""
        if self._client is None:
            if not settings.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        return self._client

    async def explain_move(
        self,
        fen: str,
        played_move: str,
        best_move: str,
        eval_before: float,
        eval_after: float,
        player_elo: int = 1500,
    ) -> str:
        """Generate an explanation for why a move was suboptimal.

        Args:
            fen: Position before the move (FEN notation)
            played_move: The move that was played (SAN)
            best_move: The engine's best move (SAN)
            eval_before: Evaluation before the move
            eval_after: Evaluation after the move
            player_elo: Player's approximate rating for tailored explanation

        Returns:
            Natural language explanation of the mistake
        """
        centipawn_loss = int((eval_before - eval_after) * 100)

        prompt = f"""Analyze this chess position and explain the mistake.

Position (FEN): {fen}
Move played: {played_move}
Better move: {best_move}
Evaluation change: {eval_before:+.2f} → {eval_after:+.2f} ({centipawn_loss} centipawns lost)
Player level: ~{player_elo} Elo

Explain why {best_move} is better than {played_move}. Focus on the concept or principle involved,
not just calculation. Give advice the player can remember and apply in similar positions."""

        try:
            client = self._get_client()
            message = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=300,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.error("Coach AI explanation failed", error=str(e))
            return f"The move {best_move} was stronger than {played_move}. Analysis unavailable."

    async def analyze_game_summary(
        self,
        pgn: str,
        result: str,
        acpl: float,
        blunders: int,
        mistakes: int,
        player_color: str,
        player_elo: int = 1500,
    ) -> str:
        """Generate a summary analysis of a completed game.

        Args:
            pgn: Full game in PGN format
            result: Game result (win/loss/draw)
            acpl: Average centipawn loss
            blunders: Number of blunders
            mistakes: Number of mistakes
            player_color: Color the player had (white/black)
            player_elo: Player's approximate rating

        Returns:
            Summary analysis with improvement suggestions
        """
        prompt = f"""Analyze this chess game and provide feedback.

PGN:
{pgn}

Statistics:
- Result: {result} (playing as {player_color})
- Average Centipawn Loss: {acpl:.1f}
- Blunders: {blunders}
- Mistakes: {mistakes}
- Player level: ~{player_elo} Elo

Provide:
1. A brief assessment of how the game went (2-3 sentences)
2. The most important lesson from this game
3. One specific thing to practice based on the errors made"""

        try:
            client = self._get_client()
            message = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=400,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.error("Coach AI game analysis failed", error=str(e))
            return "Game analysis unavailable. Please try again later."

    async def generate_weekly_plan(
        self,
        recent_games_summary: str,
        weaknesses: list[str],
        repertoire_gaps: list[str],
        player_elo: int = 1500,
    ) -> str:
        """Generate a personalized weekly improvement plan.

        Args:
            recent_games_summary: Summary of recent game performance
            weaknesses: List of identified weaknesses
            repertoire_gaps: Opening lines that need work
            player_elo: Player's approximate rating

        Returns:
            Weekly study plan with specific recommendations
        """
        prompt = f"""Create a weekly chess improvement plan for this player.

Recent Performance:
{recent_games_summary}

Identified Weaknesses:
{chr(10).join(f"- {w}" for w in weaknesses) if weaknesses else "- None identified yet"}

Repertoire Gaps:
{chr(10).join(f"- {g}" for g in repertoire_gaps) if repertoire_gaps else "- Repertoire coverage is good"}

Player level: ~{player_elo} Elo

Create a 7-day plan with:
- Specific daily focus areas (15-30 min each)
- Recommended exercises or practice types
- A realistic goal for the week"""

        try:
            client = self._get_client()
            message = await client.messages.create(
                model="claude-3-5-sonnet-20241022",  # Use Sonnet for more complex planning
                max_tokens=600,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.error("Coach AI weekly plan failed", error=str(e))
            return "Weekly plan generation unavailable. Please try again later."

    async def chat(
        self,
        message: str,
        context: Optional[str] = None,
        conversation_history: Optional[list[dict]] = None,
        player_elo: int = 1500,
    ) -> str:
        """Have a conversation with the AI coach.

        Args:
            message: User's message/question
            context: Optional context (current position FEN, game PGN, etc.)
            conversation_history: Previous messages in the conversation
            player_elo: Player's approximate rating

        Returns:
            Coach's response
        """
        messages = []

        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history)

        # Build the user message with optional context
        user_content = message
        if context:
            user_content = f"Context: {context}\n\nQuestion: {message}"

        messages.append({"role": "user", "content": user_content})

        system = f"{self.SYSTEM_PROMPT}\n\nThe player is approximately {player_elo} Elo rated."

        try:
            client = self._get_client()
            response = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=500,
                system=system,
                messages=messages,
            )
            return response.content[0].text
        except Exception as e:
            logger.error("Coach AI chat failed", error=str(e))
            return "I'm having trouble responding right now. Please try again."

    async def explain_opening(
        self,
        opening_name: str,
        eco_code: Optional[str] = None,
        player_color: str = "white",
        player_elo: int = 1500,
    ) -> str:
        """Explain an opening's key ideas and plans.

        Args:
            opening_name: Name of the opening
            eco_code: Optional ECO code
            player_color: Which color plays this opening
            player_elo: Player's approximate rating

        Returns:
            Explanation of the opening
        """
        prompt = f"""Explain the {opening_name}{f' ({eco_code})' if eco_code else ''} for a {player_elo} Elo player playing {player_color}.

Cover:
1. The main ideas and strategic goals
2. Key pawn structures to understand
3. Typical piece placements
4. Common mistakes to avoid
5. What to aim for in the middlegame

Keep it practical and memorable."""

        try:
            client = self._get_client()
            message = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=500,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.error("Coach AI opening explanation failed", error=str(e))
            return f"Unable to explain {opening_name}. Please try again later."
