"""Game synchronization service."""

import time
from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from chessforge.models import Game, PlatformAccount
from chessforge.services.chess_com import ChessComService
from chessforge.services.lichess import LichessService

logger = structlog.get_logger()


class GameSyncService:
    """Service for synchronizing games from external platforms."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._chess_com = ChessComService()
        self._lichess = LichessService()

    async def close(self) -> None:
        """Close platform service connections."""
        await self._chess_com.close()
        await self._lichess.close()

    async def sync_account(self, account: PlatformAccount) -> dict[str, Any]:
        """Sync games for a single platform account."""
        start_time = time.time()
        errors: list[str] = []
        new_games = 0

        try:
            if account.platform == "chess.com":
                new_games = await self._sync_chess_com(account, errors)
            elif account.platform == "lichess":
                new_games = await self._sync_lichess(account, errors)
            else:
                errors.append(f"Unknown platform: {account.platform}")

            # Update sync timestamp
            account.last_sync_at = datetime.now(timezone.utc)
            account.last_sync_error = errors[0] if errors else None

        except Exception as e:
            logger.exception("Sync failed", account_id=account.id, error=str(e))
            errors.append(str(e))
            account.last_sync_error = str(e)

        # Count total games
        result = await self.session.execute(
            select(Game).where(Game.user_id == account.user_id)
        )
        total_games = len(result.scalars().all())

        duration = time.time() - start_time
        return {
            "account_id": account.id,
            "new_games": new_games,
            "total_games": total_games,
            "errors": errors,
            "duration_seconds": round(duration, 2),
        }

    async def _sync_chess_com(
        self, account: PlatformAccount, errors: list[str]
    ) -> int:
        """Sync games from Chess.com."""
        # Update ratings
        stats = await self._chess_com.get_player_stats(account.username)
        if stats:
            account.ratings = self._chess_com.extract_ratings(stats)

        # Get recent games
        games = await self._chess_com.get_recent_games(
            account.username,
            since=account.last_sync_at,
        )

        new_count = 0
        for game_data in games:
            try:
                parsed = self._chess_com.parse_game_data(game_data, account.username)
                if await self._save_game(account.user_id, parsed):
                    new_count += 1
            except Exception as e:
                logger.warning("Failed to parse Chess.com game", error=str(e))
                errors.append(f"Parse error: {str(e)}")

        return new_count

    async def _sync_lichess(
        self, account: PlatformAccount, errors: list[str]
    ) -> int:
        """Sync games from Lichess."""
        # Create service with account token if available
        lichess = LichessService(token=account.access_token)

        try:
            # Update ratings
            user_data = await lichess.get_user(account.username)
            if user_data:
                account.ratings = lichess.extract_ratings(user_data)

            # Get recent games
            games = await lichess.get_games(
                account.username,
                since=account.last_sync_at,
                max_games=50,
            )

            new_count = 0
            for game_data in games:
                try:
                    parsed = lichess.parse_game_data(game_data, account.username)
                    if await self._save_game(account.user_id, parsed):
                        new_count += 1
                except Exception as e:
                    logger.warning("Failed to parse Lichess game", error=str(e))
                    errors.append(f"Parse error: {str(e)}")

            return new_count
        finally:
            await lichess.close()

    async def _save_game(self, user_id: str, game_data: dict[str, Any]) -> bool:
        """Save a game to the database, returns True if new."""
        # Check for duplicate
        result = await self.session.execute(
            select(Game).where(
                Game.platform == game_data["platform"],
                Game.platform_game_id == game_data["platform_game_id"],
            )
        )
        if result.scalar_one_or_none():
            return False

        # Create new game
        game = Game(
            user_id=user_id,
            platform=game_data["platform"],
            platform_game_id=game_data["platform_game_id"],
            pgn=game_data["pgn"],
            played_at=game_data["played_at"],
            time_control=game_data["time_control"],
            time_control_seconds=game_data.get("time_control_seconds"),
            increment_seconds=game_data.get("increment_seconds"),
            user_color=game_data["user_color"],
            result=game_data["result"],
            opponent_username=game_data["opponent_username"],
            opponent_rating=game_data.get("opponent_rating"),
            user_rating=game_data.get("user_rating"),
            opening_eco=game_data.get("opening_eco"),
            opening_name=game_data.get("opening_name"),
            analysis_status="pending",
        )
        self.session.add(game)
        return True
