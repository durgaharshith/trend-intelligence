"""
LangSearch Web Search Client.
Fetches real-time web search results (articles/sources) for a trending topic.
Requires LANGSEARCH_API_KEY from langsearch.com.
Fails gracefully if key is missing or invalid.
"""

import logging
import httpx
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class LangSearchClient:
    def __init__(self):
        self.api_key = getattr(settings, "LANGSEARCH_API_KEY", "")
        self.http_client = httpx.AsyncClient(timeout=10)

    async def fetch_search_results(self, query: str) -> List[Dict[str, Any]]:
        """Fetch web search results using LangSearch Web Search API."""
        if not self.api_key or "your_" in self.api_key:
            logger.warning("LANGSEARCH_API_KEY is not configured. Web search results will be empty.")
            return []

        url = "https://api.langsearch.com/v1/web-search"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "query": query,
            "freshness": "oneWeek",
            "summary": True
        }

        try:
            response = await self.http_client.post(url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()

            # Parse results based on LangSearch/Bing format
            web_pages = data.get("data", {}).get("webPages", {}).get("value", [])
            articles = []
            for page in web_pages:
                title = page.get("name", "")
                page_url = page.get("url", "")
                snippet = page.get("summary") or page.get("snippet") or ""
                if title and page_url:
                    articles.append({
                        "title": title,
                        "url": page_url,
                        "snippet": snippet
                    })

            logger.info(f"LangSearch: fetched {len(articles)} search results for query: '{query}'")
            return articles
        except Exception as e:
            logger.error(f"LangSearch fetch failed: {e}")
            return []

    async def close(self):
        await self.http_client.aclose()
