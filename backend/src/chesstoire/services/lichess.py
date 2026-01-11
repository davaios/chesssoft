"""Lichess API integration service."""

from datetime import datetime, timezone
from typing import Any, Optional

import httpx
import structlog

from chesstoire.config import settings

logger = structlog.get_logger()


class LichessService:
    """Service for interacting with Lichess API."""

    BASE_URL = settings.lichess_api_base_url
    TIMEOUT = 30.0

    def __init__(self, token: Optional[str] = None) -> None:
        self._token = token or settings.lichess_api_token
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            headers = {"Accept": "application/json"}
            if self._token:
                headers["Authorization"] = f"Bearer {self._token}"

            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                timeout=self.TIMEOUT,
                headers=headers,
            )
        return self._client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get_user(self, username: str) -> Optional[dict[str, Any]]:
        """Fetch user profile and ratings."""
        client = await self._get_client()
        try:
            response = await client.get(f"/user/{username}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error("Failed to fetch Lichess user", username=username, error=str(e))
            return None

    async def get_games(
        self,
        username: str,
        since: Optional[datetime] = None,
        max_games: int = 100,
        rated: bool = True,
    ) -> list[dict[str, Any]]:
        """Fetch user games as NDJSON stream."""
        client = await self._get_client()
        params: dict[str, Any] = {
            "max": max_games,
            "rated": str(rated).lower(),
            "pgnInJson": "true",
            "clocks": "false",
            "evals": "false",
            "opening": "true",
        }
        if since:
            params["since"] = int(since.timestamp() * 1000)

        games = []
        try:
            # Use streaming for NDJSON response
            async with client.stream(
                "GET",
                f"/games/user/{username}",
                params=params,
                headers={"Accept": "application/x-ndjson"},
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        import json

                        games.append(json.loads(line))
        except httpx.HTTPError as e:
            logger.error("Failed to fetch Lichess games", username=username, error=str(e))

        return games

    def parse_game_data(self, game: dict[str, Any], username: str) -> dict[str, Any]:
        """Parse Lichess game data into our format."""
        players = game.get("players", {})
        white = players.get("white", {})
        black = players.get("black", {})

        white_user = white.get("user", {}).get("name", "").lower()
        is_white = white_user == username.lower()

        user_data = white if is_white else black
        opponent_data = black if is_white else white

        # Determine result
        winner = game.get("winner")
        if winner is None:
            result = "draw"
        elif (winner == "white" and is_white) or (winner == "black" and not is_white):
            result = "win"
        else:
            result = "loss"

        # Parse time control
        speed = game.get("speed", "rapid")
        clock = game.get("clock", {})

        # Get opening info
        opening = game.get("opening", {})

        return {
            "platform": "lichess",
            "platform_game_id": game.get("id", ""),
            "pgn": game.get("pgn", ""),
            "played_at": datetime.fromtimestamp(
                game.get("createdAt", 0) / 1000, tz=timezone.utc
            ),
            "time_control": speed,
            "time_control_seconds": clock.get("initial"),
            "increment_seconds": clock.get("increment"),
            "user_color": "white" if is_white else "black",
            "result": result,
            "opponent_username": opponent_data.get("user", {}).get("name", "anonymous"),
            "opponent_rating": opponent_data.get("rating"),
            "user_rating": user_data.get("rating"),
            "opening_eco": opening.get("eco"),
            "opening_name": opening.get("name"),
        }

    def extract_ratings(self, user_data: dict[str, Any]) -> dict[str, Any]:
        """Extract ratings from user profile."""
        perfs = user_data.get("perfs", {})
        ratings = {}

        mapping = {
            "bullet": "bullet",
            "blitz": "blitz",
            "rapid": "rapid",
            "classical": "classical",
            "puzzle": "puzzle",
        }

        for lichess_key, our_key in mapping.items():
            if lichess_key in perfs:
                perf = perfs[lichess_key]
                ratings[our_key] = {
                    "rating": perf.get("rating", 0),
                    "games": perf.get("games", 0),
                }

        return ratings
