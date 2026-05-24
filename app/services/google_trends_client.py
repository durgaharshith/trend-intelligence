"""
Google Trends Client — Tier 3.5

Uses pytrends (unofficial Google Trends API) to fetch search interest
for the top keyword from a trend cluster.

IMPORTANT:
  - pytrends has unofficial rate limits — cache all results for 4+ hours
  - Use conservative request spacing (2s between calls)
  - Fail gracefully — data is supplemental, not core
  - If rate-limited: return None, don't retry for 2h
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import functools

logger = logging.getLogger(__name__)

_PYTRENDS_AVAILABLE = False
try:
    from pytrends.request import TrendReq
    _PYTRENDS_AVAILABLE = True
except ImportError:
    logger.warning("pytrends not installed — Google Trends overlay disabled")

CACHE_TTL_MINUTES = 240    # 4 hours between Google Trends fetches
RATE_LIMIT_BACKOFF = 120   # 2 hours backoff if rate limited


class GoogleTrendsClient:
    def __init__(self):
        self._last_rate_limited: datetime | None = None
        self._lock = asyncio.Lock()

    async def fetch_interest(self, keyword: str, timeframe: str = "now 7-d") -> Optional[dict]:
        """
        Fetch relative search interest (0-100) for a keyword over the past 7 days.
        Returns a dict with time-series data, or None if unavailable.

        Results should be cached externally (in Redis) by the caller.
        """
        if not _PYTRENDS_AVAILABLE:
            return None

        # Check if we're in rate-limit backoff
        if self._last_rate_limited:
            elapsed = (datetime.utcnow() - self._last_rate_limited).total_seconds() / 60
            if elapsed < RATE_LIMIT_BACKOFF:
                logger.debug(f"Google Trends in rate-limit backoff ({elapsed:.0f}/{RATE_LIMIT_BACKOFF}min)")
                return None

        # Only one request at a time to be polite
        async with self._lock:
            return await asyncio.get_event_loop().run_in_executor(
                None,
                functools.partial(self._fetch_sync, keyword, timeframe)
            )

    def _fetch_sync(self, keyword: str, timeframe: str) -> Optional[dict]:
        """Synchronous pytrends call (run in executor to avoid blocking)."""
        try:
            pt = TrendReq(hl="en-US", tz=0, timeout=(10, 25), retries=1, backoff_factor=0.5)
            pt.build_payload([keyword], timeframe=timeframe, geo="")
            df = pt.interest_over_time()

            if df.empty or keyword not in df.columns:
                return None

            series = df[keyword].dropna()
            data_points = [
                {"timestamp": str(ts.isoformat()), "interest": int(v)}
                for ts, v in series.items()
            ]

            return {
                "keyword": keyword,
                "timeframe": timeframe,
                "data_points": data_points,
                "peak_interest": int(series.max()),
                "avg_interest": round(float(series.mean()), 1),
                "fetched_at": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "rate" in err_str or "too many" in err_str:
                self._last_rate_limited = datetime.utcnow()
                logger.warning(f"Google Trends rate-limited for keyword '{keyword}'")
            else:
                logger.error(f"Google Trends fetch failed for '{keyword}': {e}")
            return None


# Global singleton
google_trends_client = GoogleTrendsClient()
