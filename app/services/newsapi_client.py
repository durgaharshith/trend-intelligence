"""
NewsAPI client — Tier 4.

Fetches current top news headlines to provide external validation for trends.
Requires NEWSAPI_KEY from newsapi.org (free for developers).
Fails gracefully if key is missing or invalid.
"""

import logging
import httpx
from datetime import datetime
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class NewsAPIClient:
    def __init__(self):
        self.api_key = getattr(settings, "NEWSAPI_KEY", "")
        self.http_client = httpx.AsyncClient(timeout=10)

    async def fetch_top_headlines(self, limit: int = 50, country: str = "us") -> List[Dict[str, Any]]:
        """Fetch top headlines in technology and business category for external validation."""
        if not self.api_key or "your_" in self.api_key:
            logger.warning("NEWSAPI_KEY is not configured. News validation source will be empty.")
            return []

        url = "https://newsapi.org/v2/top-headlines"
        params = {
            "category": "technology",
            "country": country.lower(),
            "pageSize": min(limit, 100),
            "apiKey": self.api_key,
        }

        try:
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            articles = []
            for item in data.get("articles", []):
                # Parse date
                pub_str = item.get("publishedAt", "")
                created_utc = None
                if pub_str:
                    try:
                        # e.g. "2026-05-22T17:00:00Z"
                        from datetime import timezone
                        dt = datetime.strptime(pub_str[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
                        created_utc = int(dt.timestamp())
                    except ValueError:
                        pass

                title = item.get("title", "")
                if not title or "[Removed]" in title:
                    continue

                source_name = item.get("source", {}).get("name") or "News"

                articles.append({
                    "id": f"news_{hash(title) & 0xffffffff}",
                    "title": f"News: {title}",
                    "score": 100,  # Standard baseline score for verified news articles
                    "url": item.get("url", ""),
                    "subreddit": source_name,  # Source acts as category/subreddit
                    "created_utc": created_utc or int(datetime.utcnow().timestamp()),
                    "num_comments": 0,
                    "selftext": item.get("description") or item.get("content") or "",
                    "source": "newsapi",
                })
            logger.info(f"NewsAPI: fetched {len(articles)} articles")
            return articles
        except Exception as e:
            logger.error(f"NewsAPI fetch failed: {e}")
            return []

    async def close(self):
        await self.http_client.aclose()
