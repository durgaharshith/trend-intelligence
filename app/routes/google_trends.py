"""Google Trends overlay API — Tier 3.5"""

from fastapi import APIRouter, HTTPException
from app.services.google_trends_client import google_trends_client
from app.services.cache import cache

router = APIRouter(prefix="/api/google-trends", tags=["google-trends"])

CACHE_TTL = 4 * 60 * 60   # 4 hours — pytrends has unofficial rate limits


@router.get("/{keyword}")
async def get_google_interest(keyword: str):
    """
    Tier 3.5 — Get Google search interest for a keyword (last 7 days).
    Used to overlay Reddit/HN trend score with real-world search demand.
    Cached for 4 hours to avoid Google Trends rate limits.
    """
    cache_key = f"google_trends:{keyword.lower().replace(' ', '_')}"

    # Serve cached result first
    cached = await cache.get(cache_key)
    if cached:
        return {**cached, "cached": True}

    result = await google_trends_client.fetch_interest(keyword)
    if not result:
        raise HTTPException(
            status_code=503,
            detail="Google Trends data temporarily unavailable — rate limit or pytrends not installed."
        )

    await cache.set(cache_key, result, ttl=CACHE_TTL)
    return {**result, "cached": False}
