"""Spaced Repetition System (SM-2 algorithm) implementation."""

from datetime import datetime, timedelta, timezone
from typing import Any


class SRSService:
    """Implementation of the SM-2 spaced repetition algorithm.

    The SM-2 algorithm uses:
    - ease_factor: How easy the card is (starts at 2.5)
    - interval: Days until next review
    - repetitions: Number of successful reviews in a row

    User ratings:
    - 0 (Again): Complete blackout, reset
    - 1 (Hard): Correct but with difficulty
    - 2 (Good): Correct with some hesitation
    - 3 (Easy): Perfect response
    """

    MIN_EASE_FACTOR = 1.3
    DEFAULT_EASE_FACTOR = 2.5

    @staticmethod
    def calculate_next_review(
        srs_data: dict[str, Any],
        rating: int,
    ) -> dict[str, Any]:
        """Calculate the next review date based on user rating.

        Args:
            srs_data: Current SRS state with ease_factor, interval, repetitions
            rating: User rating 0-3 (Again, Hard, Good, Easy)

        Returns:
            Updated SRS data with new interval and next_review date
        """
        ease_factor = srs_data.get("ease_factor", SRSService.DEFAULT_EASE_FACTOR)
        interval = srs_data.get("interval", 0)
        repetitions = srs_data.get("repetitions", 0)

        now = datetime.now(timezone.utc)

        if rating == 0:  # Again - complete reset
            repetitions = 0
            interval = 0
            # Decrease ease factor
            ease_factor = max(SRSService.MIN_EASE_FACTOR, ease_factor - 0.2)

        elif rating == 1:  # Hard - correct but difficult
            # Keep repetitions but don't increase interval much
            if repetitions == 0:
                interval = 1
            else:
                interval = max(1, int(interval * 1.2))
            ease_factor = max(SRSService.MIN_EASE_FACTOR, ease_factor - 0.15)
            repetitions += 1

        elif rating == 2:  # Good - standard progression
            if repetitions == 0:
                interval = 1
            elif repetitions == 1:
                interval = 6
            else:
                interval = int(interval * ease_factor)
            repetitions += 1

        else:  # Easy (3) - accelerated progression
            if repetitions == 0:
                interval = 4
            elif repetitions == 1:
                interval = 10
            else:
                interval = int(interval * ease_factor * 1.3)
            ease_factor = min(3.0, ease_factor + 0.15)
            repetitions += 1

        next_review = now + timedelta(days=interval)

        return {
            "ease_factor": round(ease_factor, 2),
            "interval": interval,
            "repetitions": repetitions,
            "next_review": next_review.isoformat(),
            "last_review": now.isoformat(),
        }

    @staticmethod
    def is_due(srs_data: dict[str, Any]) -> bool:
        """Check if a card is due for review."""
        next_review = srs_data.get("next_review")
        if not next_review:
            return True

        if isinstance(next_review, str):
            next_review_dt = datetime.fromisoformat(next_review.replace("Z", "+00:00"))
        else:
            next_review_dt = next_review

        return datetime.now(timezone.utc) >= next_review_dt

    @staticmethod
    def get_mastery_level(srs_data: dict[str, Any]) -> str:
        """Determine mastery level based on SRS data."""
        interval = srs_data.get("interval", 0)
        if interval == 0:
            return "new"
        elif interval < 7:
            return "learning"
        elif interval < 30:
            return "familiar"
        else:
            return "mastered"

    @staticmethod
    def get_retention_estimate(srs_data: dict[str, Any]) -> float:
        """Estimate current retention percentage based on time since last review.

        Uses a simplified forgetting curve model.
        """
        last_review = srs_data.get("last_review")
        if not last_review:
            return 0.0

        if isinstance(last_review, str):
            last_review_dt = datetime.fromisoformat(last_review.replace("Z", "+00:00"))
        else:
            last_review_dt = last_review

        days_since = (datetime.now(timezone.utc) - last_review_dt).days
        interval = srs_data.get("interval", 1) or 1

        # Simplified forgetting curve: retention = e^(-days/interval)
        import math
        retention = math.exp(-days_since / interval)
        return round(retention * 100, 1)
