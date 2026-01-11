"""Chess.com API integration service."""

from datetime import datetime, timezone
from typing import Any, Optional

import httpx
import structlog

from chessforge.config import settings

logger = structlog.get_logger()


class ChessComService:
    """Service for interacting with Chess.com public API."""

    BASE_URL = settings.chesscom_api_base_url
    TIMEOUT = 30.0

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=self.TIMEOUT,
                headers={
                    "User-Agent": "ChessForge/1.0 (https://chessforge.app)",
                },
            )
        return self._client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get_player_profile(self, username: str) -> Optional[dict[str, Any]]:
        """Fetch player profile information."""
        client = await self._get_client()
        try:
            response = await client.get(f"/player/{username}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error("Failed to fetch Chess.com profile", username=username, error=str(e))
            return None

    async def get_player_stats(self, username: str) -> Optional[dict[str, Any]]:
        """Fetch player statistics and ratings."""
        client = await self._get_client()
        try:
            response = await client.get(f"/player/{username}/stats")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error("Failed to fetch Chess.com stats", username=username, error=str(e))
            return None

    async def get_game_archives(self, username: str) -> list[str]:
        """Get list of monthly game archive URLs."""
        client = await self._get_client()
        try:
            response = await client.get(f"/player/{username}/games/archives")
            response.raise_for_status()
            data = response.json()
            return data.get("archives", [])
        except httpx.HTTPError as e:
            logger.error("Failed to fetch game archives", username=username, error=str(e))
            return []

    async def get_monthly_games(
        self, username: str, year: int, month: int
    ) -> list[dict[str, Any]]:
        """Fetch games for a specific month."""
        client = await self._get_client()
        try:
            response = await client.get(f"/player/{username}/games/{year}/{month:02d}")
            response.raise_for_status()
            data = response.json()
            return data.get("games", [])
        except httpx.HTTPError as e:
            logger.error(
                "Failed to fetch monthly games",
                username=username,
                year=year,
                month=month,
                error=str(e),
            )
            return []

    async def get_recent_games(
        self, username: str, since: Optional[datetime] = None
    ) -> list[dict[str, Any]]:
        """Fetch recent games, optionally since a specific date."""
        archives = await self.get_game_archives(username)
        if not archives:
            return []

        # Get games from recent archives (last 2 months max for efficiency)
        all_games = []
        for archive_url in archives[-2:]:
            # Extract year/month from archive URL
            parts = archive_url.split("/")
            year, month = int(parts[-2]), int(parts[-1])

            games = await self.get_monthly_games(username, year, month)
            for game in games:
                # Filter by date if specified
                if since:
                    end_time = game.get("end_time", 0)
                    game_date = datetime.fromtimestamp(end_time, tz=timezone.utc)
                    if game_date <= since:
                        continue
                all_games.append(game)

        return all_games

    def parse_game_data(self, game: dict[str, Any], username: str) -> dict[str, Any]:
        """Parse Chess.com game data into our format."""
        white = game.get("white", {})
        black = game.get("black", {})

        is_white = white.get("username", "").lower() == username.lower()
        user_data = white if is_white else black
        opponent_data = black if is_white else white

        # Determine result
        user_result = user_data.get("result", "")
        if user_result == "win":
            result = "win"
        elif user_result in ("checkmated", "resigned", "timeout", "abandoned"):
            result = "loss"
        else:
            result = "draw"

        # Parse time control
        time_control = game.get("time_control", "")
        time_class = game.get("time_class", "rapid")

        return {
            "platform": "chess.com",
            "platform_game_id": game.get("uuid", str(game.get("end_time", ""))),
            "pgn": game.get("pgn", ""),
            "played_at": datetime.fromtimestamp(
                game.get("end_time", 0), tz=timezone.utc
            ),
            "time_control": time_class,
            "time_control_raw": time_control,
            "user_color": "white" if is_white else "black",
            "result": result,
            "opponent_username": opponent_data.get("username", "unknown"),
            "opponent_rating": opponent_data.get("rating"),
            "user_rating": user_data.get("rating"),
            "opening_eco": game.get("eco"),
            "opening_name": None,  # Not provided by Chess.com API
        }

    def extract_ratings(self, stats: dict[str, Any]) -> dict[str, Any]:
        """Extract ratings from stats response."""
        ratings = {}
        for time_control in ["chess_bullet", "chess_blitz", "chess_rapid", "chess_daily"]:
            if time_control in stats:
                tc_data = stats[time_control]
                key = time_control.replace("chess_", "")
                if key == "daily":
                    key = "classical"
                ratings[key] = {
                    "rating": tc_data.get("last", {}).get("rating", 0),
                    "games": tc_data.get("record", {}).get("win", 0)
                    + tc_data.get("record", {}).get("loss", 0)
                    + tc_data.get("record", {}).get("draw", 0),
                    "best": tc_data.get("best", {}).get("rating"),
                }
        if "tactics" in stats:
            ratings["puzzle"] = {
                "rating": stats["tactics"].get("highest", {}).get("rating", 0),
                "games": 0,
            }
        return ratings
