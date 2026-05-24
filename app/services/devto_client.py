"""
Dev.to client — Tier 4.

Fetches top/trending articles on Dev.to (Forem API) to capture developer-centric discussions.
Requires DEVTO_API key.
"""

import logging
import httpx
from datetime import datetime
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class DevToClient:
    def __init__(self):
        self.api_key = getattr(settings, "DEVTO_API", "")
        self.http_client = httpx.AsyncClient(timeout=10)

    async def fetch_trending_articles(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch popular articles from the last 3 days (top=3) from Dev.to."""
        if not self.api_key or "your_" in self.api_key:
            logger.warning("DEVTO_API is not configured. Dev.to validation source will be empty.")
            return []

        url = "https://dev.to/api/articles"
        params = {
            "top": 3,
            "per_page": min(limit, 100),
        }
        headers = {
            "User-Agent": "TrendIntelligence/1.0",
            "accept": "application/vnd.forem.api-v1+json",
            "api-key": self.api_key,
        }

        try:
            response = await self.http_client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

            articles = []
            for item in data:
                # Parse created date
                pub_str = item.get("published_timestamp", "")
                created_utc = None
                if pub_str:
                    try:
                        # e.g. "2026-05-22T17:00:00Z"
                        dt = datetime.strptime(pub_str[:19], "%Y-%m-%dT%H:%M:%S")
                        created_utc = int(dt.timestamp())
                    except ValueError:
                        pass

                title = item.get("title", "")
                if not title:
                    continue

                tags = item.get("tag_list", [])
                subreddit = tags[0] if tags else "dev.to"

                articles.append({
                    "id": f"devto_{item.get('id')}",
                    "title": f"Dev.to: {title}",
                    "score": item.get("public_reactions_count", 0),
                    "url": item.get("url", ""),
                    "subreddit": subreddit,
                    "created_utc": created_utc or int(datetime.utcnow().timestamp()),
                    "num_comments": item.get("comments_count", 0),
                    "selftext": item.get("description") or "",
                    "source": "devto",
                })
            logger.info(f"Dev.to: fetched {len(articles)} articles")
            return articles
        except Exception as e:
            logger.error(f"Dev.to fetch failed: {e}")
            return []

    async def close(self):
        await self.http_client.aclose()
