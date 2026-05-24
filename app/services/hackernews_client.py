"""
Hacker News client — Tier 2.4

Uses HN's Firebase API (no auth, no rate limits):
  https://hacker-news.firebaseio.com/v0/

Fetches top 100 stories concurrently with an asyncio semaphore to be polite.
Posts are tagged source='hackernews' so the clustering pipeline can detect
cross-platform trends (same topic on Reddit AND HN → big signal boost).
"""

import asyncio
import logging
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

HN_BASE = "https://hacker-news.firebaseio.com/v0"
HN_CONCURRENCY = 20   # parallel item fetches
HN_MAX_AGE_HOURS = 24  # ignore stories older than 24h


class HackerNewsClient:
    def __init__(self):
        self._client = httpx.AsyncClient(timeout=10)

    async def fetch_top_stories(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch top HN stories, normalised to the same shape as Reddit posts."""
        try:
            resp = await self._client.get(f"{HN_BASE}/topstories.json")
            resp.raise_for_status()
            top_ids: List[int] = resp.json()[:limit]
        except Exception as e:
            logger.error(f"HN top stories fetch failed: {e}")
            return []

        cutoff = datetime.utcnow() - timedelta(hours=HN_MAX_AGE_HOURS)
        sem = asyncio.Semaphore(HN_CONCURRENCY)

        async def fetch_item(item_id: int) -> Dict[str, Any] | None:
            async with sem:
                try:
                    r = await self._client.get(f"{HN_BASE}/item/{item_id}.json")
                    r.raise_for_status()
                    item = r.json()
                    if not item or item.get("type") != "story":
                        return None
                    # Filter stale stories
                    created = datetime.utcfromtimestamp(item.get("time", 0))
                    if created < cutoff:
                        return None
                    return self._normalise(item)
                except Exception:
                    return None

        results = await asyncio.gather(*[fetch_item(i) for i in top_ids])
        posts = [r for r in results if r is not None]
        logger.info(f"HN: fetched {len(posts)} recent stories")
        return posts

    def _normalise(self, item: dict) -> Dict[str, Any]:
        """Map HN item schema → unified post schema used by trend engine."""
        return {
            "id": str(item.get("id", "")),
            "title": item.get("title", ""),
            "score": item.get("score", 0),
            "url": item.get("url", ""),
            "subreddit": None,          # N/A for HN
            "created_utc": item.get("time"),
            "num_comments": item.get("descendants", 0),
            "selftext": "",
            "source": "hackernews",     # ← cross-platform detection key
            "hn_author": item.get("by", ""),
        }

    async def close(self):
        await self._client.aclose()
