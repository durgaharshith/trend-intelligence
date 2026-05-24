"""
Google Trends RSS client — Tier 4.

Fetches daily trending searches from Google Trends RSS feed (geo=US).
Extremely reliable, zero auth keys required, no rate limit risk (standard XML RSS).
"""

import logging
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class GoogleTrendsRSSClient:
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=10)

    async def fetch_trending_searches(self, geo: str = "US") -> List[Dict[str, Any]]:
        """Fetch daily trending searches from Google Trends RSS."""
        url = f"https://trends.google.com/trending/rss?geo={geo}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        try:
            response = await self.http_client.get(url, headers=headers)
            response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(response.content)
            channel = root.find("channel")
            if channel is None:
                return []

            trends = []
            ns = {
                "ht": "https://trends.google.com/trending/rss"
            }

            for item in channel.findall("item"):
                title_el = item.find("title")
                title = title_el.text if title_el is not None else ""
                if not title:
                    continue

                # Parse search traffic volume as score
                traffic_el = item.find("ht:approx_traffic", ns)
                traffic_str = traffic_el.text if traffic_el is not None else "1,000+"
                score = self._parse_traffic(traffic_str)

                # Get news context description and links
                desc_el = item.find("description")
                desc = desc_el.text if desc_el is not None else ""

                news_item = item.find("ht:news_item", ns)
                link = ""
                if news_item is not None:
                    url_el = news_item.find("ht:news_item_url", ns)
                    if url_el is not None:
                        link = url_el.text or ""

                if not link:
                    link_el = item.find("link")
                    link = link_el.text if link_el is not None else f"https://trends.google.com/trends/explore?q={title}"

                trends.append({
                    "id": f"gt_{hash(title) & 0xffffffff}",
                    "title": title,
                    "score": score,
                    "url": link,
                    "subreddit": "Google Search",  # category label
                    "created_utc": int(datetime.utcnow().timestamp()),
                    "num_comments": 0,
                    "selftext": f"Search Volume: {traffic_str}\n\n{desc}",
                    "source": "google-trends",
                    "geo": geo,
                })

            logger.info(f"Google Trends RSS: fetched {len(trends)} trending searches")
            return trends
        except Exception as e:
            logger.error(f"Google Trends RSS fetch failed: {e}")
            return []

    def _parse_traffic(self, traffic_str: str) -> int:
        """Convert '100,000+' -> 100000."""
        try:
            clean = traffic_str.replace("+", "").replace(",", "").strip()
            return int(clean)
        except Exception:
            return 1000

    async def close(self):
        await self.http_client.aclose()
