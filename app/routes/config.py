"""Config API — Tier 2.5: runtime source configuration (legacy subreddit config kept for compatibility)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from app.services.cache import cache
from app.config import settings

router = APIRouter(prefix="/api/config", tags=["config"])

CONFIG_KEY = "config:subreddits"

SUBREDDIT_PRESETS = {
    "tech":        ["programming", "technology", "webdev", "MachineLearning", "artificial", "compsci", "devops"],
    "finance":     ["investing", "stocks", "cryptocurrency", "personalfinance", "economics", "wallstreetbets"],
    "gaming":      ["gaming", "games", "pcgaming", "PS5", "XboxSeriesX", "Steam", "nintendo"],
    "news":        ["worldnews", "news", "politics", "geopolitics", "UpliftingNews"],
    "science":     ["science", "Physics", "chemistry", "biology", "space", "Futurology", "singularity"],
    "entertainment": ["movies", "television", "Music", "netflix", "books", "Art"],
    "all":         ["all"],
}


class SubredditConfigRequest(BaseModel):
    subreddits: List[str]


# Default fallback (Reddit deprecated — kept for API compatibility)
_DEFAULT_SUBREDDITS = ["all"]


@router.get("/subreddits")
async def get_subreddits():
    """Get currently active subreddits (runtime config overrides defaults)."""
    runtime = await cache.get(CONFIG_KEY)
    return {
        "subreddits": runtime or _DEFAULT_SUBREDDITS,
        "source": "runtime" if runtime else "env",
        "presets": SUBREDDIT_PRESETS,
    }


@router.post("/subreddits")
async def set_subreddits(body: SubredditConfigRequest):
    """Update active subreddits. Takes effect on the next poll cycle."""
    cleaned = [s.strip().lstrip("r/") for s in body.subreddits if s.strip()]
    if not cleaned:
        cleaned = ["all"]
    await cache.set(CONFIG_KEY, cleaned, ttl=86400 * 7)  # 7-day TTL
    return {
        "subreddits": cleaned,
        "message": f"Watching {len(cleaned)} subreddit(s). Takes effect next poll.",
    }


@router.delete("/subreddits")
async def reset_subreddits():
    """Reset to .env default subreddits."""
    await cache.delete(CONFIG_KEY)
    return {"subreddits": _DEFAULT_SUBREDDITS, "message": "Reset to defaults"}


from fastapi import HTTPException

class GeoConfigRequest(BaseModel):
    geo: str

ALLOWED_GEOS = {"US", "IN", "GB", "DE", "JP", "BR", "FR", "CA", "AU", "KR"}

@router.get("/geo")
async def get_geo():
    """Get currently configured Google Trends RSS geo preference."""
    current = await cache.get("config:geo")
    return {"geo": current or "US", "allowed": list(ALLOWED_GEOS)}


@router.post("/geo")
async def set_geo(body: GeoConfigRequest):
    """Set Google Trends RSS geo preference."""
    geo_upper = body.geo.upper().strip()
    if geo_upper not in ALLOWED_GEOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid geo. Allowed geos: {sorted(list(ALLOWED_GEOS))}"
        )
    await cache.set("config:geo", geo_upper)
    
    # Trigger an immediate background poll to update the dashboard instantly
    from app.scheduler import trigger_immediate_poll
    trigger_immediate_poll()
    
    return {"geo": geo_upper, "message": f"Geo preference set to {geo_upper}."}


class UserSettingsUpdateRequest(BaseModel):
    groq_api_key: str | None = None
    active_sources: List[str] | None = None


from app.services.auth_service import get_current_user
from app.database import get_async_db, User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

@router.get("/user-settings")
async def get_user_settings(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "groq_api_key": user.groq_api_key or "",
        "active_sources": [s.strip().lower() for s in user.active_sources.split(",") if s.strip()] if user.active_sources else []
    }


@router.post("/user-settings")
async def update_user_settings(body: UserSettingsUpdateRequest, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
        
    if body.groq_api_key is not None:
        user.groq_api_key = body.groq_api_key.strip() or None
    if body.active_sources is not None:
        user.active_sources = ",".join(body.active_sources)
        
    await db.commit()
    
    # Trigger an immediate background poll to update the dashboard with new settings instantly
    from app.scheduler import trigger_immediate_poll
    trigger_immediate_poll()
    
    return {"message": "User settings updated successfully."}
