"""
GitHub client — Tier 4.

Fetches recently created/trending repositories on GitHub to measure developer adoption.
API returns repositories created in the last 7 days sorted by stars.
"""

import logging
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class GitHubClient:
    def __init__(self):
        # We can support GITHUB_TOKEN optionally to increase rate limits
        self.token = getattr(settings, "GITHUB_TOKEN", "")
        self.http_client = httpx.AsyncClient(timeout=10)

    async def fetch_trending_repos(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch trending repos created in the last 7 days, sorted by stars."""
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        url = f"https://api.github.com/search/repositories"
        params = {
            "q": f"created:>{seven_days_ago}",
            "sort": "stars",
            "order": "desc",
            "per_page": min(limit, 100),
        }

        headers = {
            "User-Agent": "TrendIntelligence/1.0",
            "Accept": "application/vnd.github.v3+json",
        }
        if self.token:
            headers["Authorization"] = f"token {self.token}"

        try:
            response = await self.http_client.get(url, headers=headers, params=params)
            # If rate-limited or failed, raise and handle
            response.raise_for_status()
            data = response.json()

            repos = []
            for item in data.get("items", []):
                # Parse created date
                created_str = item.get("created_at", "")
                created_utc = None
                if created_str:
                    try:
                        # e.g. "2011-01-26T19:01:12Z"
                        dt = datetime.strptime(created_str, "%Y-%m-%dT%H:%M:%SZ")
                        created_utc = int(dt.timestamp())
                    except ValueError:
                        pass

                repos.append({
                    "id": f"gh_{item.get('id')}",
                    "title": f"GitHub: {item.get('full_name')} - {item.get('description') or ''}",
                    "score": item.get("stargazers_count", 0),
                    "url": item.get("html_url", ""),
                    "subreddit": item.get("language") or "Code",  # Language acts as category/subreddit
                    "created_utc": created_utc or int(datetime.utcnow().timestamp()),
                    "num_comments": item.get("forks_count", 0),   # forks as engagement indicator
                    "selftext": f"Language: {item.get('language') or 'None'} | Stars: {item.get('stargazers_count')} | Forks: {item.get('forks_count')} \n\n{item.get('description') or ''}",
                    "source": "github",
                })
            logger.info(f"GitHub: fetched {len(repos)} trending repositories")
            return repos
        except Exception as e:
            logger.error(f"GitHub fetch failed: {e}")
            return []

    async def close(self):
        await self.http_client.aclose()
