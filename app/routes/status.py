"""Status / monitoring dashboard API — Tier 4.2"""
from fastapi import APIRouter
from datetime import datetime
from app.services.cache import cache
from app.config import settings

router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("/")
async def get_status():
    """System health + activity metrics for the monitoring dashboard."""
    metrics = (await cache.get("metrics")) or {}

    # Test Redis connectivity
    try:
        await cache.set("_ping", 1, ttl=5)
        redis_ok = True
    except Exception:
        redis_ok = False

    trends = await cache.get("current_trends") or []
    cross_platform = sum(1 for t in trends if t.get("is_cross_platform"))

    return {
        "status": "healthy",
        "version": "4.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "redis": {
            "connected": redis_ok,
            "mode": "upstash" if settings.REDIS_URL.startswith("https") else "local",
        },
        "scheduler": {
            "mode": "qstash" if settings.INTERNAL_SECRET else "apscheduler",
            "last_poll": metrics.get("last_poll_time"),
            "last_forecast": metrics.get("last_forecast_time"),
            "polls_today": metrics.get("polls_today", 0),
        },
        "trends": {
            "count": len(trends),
            "cross_platform": cross_platform,
            "sources": ["hackernews", "github", "google-trends", "newsapi", "devto"],
        },
        "activity": {
            "groq_calls_today": metrics.get("groq_calls_today", 0),
            "alerts_fired_today": metrics.get("alerts_fired_today", 0),
            "content_ideas_today": metrics.get("content_ideas_today", 0),
            "hn_stories_fetched": metrics.get("hn_stories_fetched", 0),
            "github_repos_fetched": metrics.get("github_repos_fetched", 0),
            "google_trends_fetched": metrics.get("google_trends_fetched", 0),
            "newsapi_articles_fetched": metrics.get("newsapi_articles_fetched", 0),
            "devto_articles_fetched": metrics.get("devto_articles_fetched", 0),
        },
        "features": {
            "groq_ai": bool(settings.GROQ_API_KEY),
            "email_alerts": bool(settings.RESEND_API_KEY),
            "qstash_scheduler": bool(settings.INTERNAL_SECRET),
            "google_trends": True,
            "devto_api": bool(settings.DEVTO_API),
        },
    }
