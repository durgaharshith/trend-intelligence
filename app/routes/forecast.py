"""Forecast API — Tier 3.1"""

from fastapi import APIRouter, HTTPException
from app.services.forecast_service import forecast_service
from app.services.cache import cache
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


class ForecastPoint(BaseModel):
    timestamp: str
    predicted_score: float


class ForecastResponse(BaseModel):
    cluster_id: str
    trajectory: str          # rising | declining | stable | volatile
    slope: float             # points per hour
    r_squared: float         # 0-1 linear fit confidence
    peak_score: float
    estimated_peak_in_hours: Optional[float] = None
    estimated_fade_in_hours: Optional[float] = None
    forecast_points: List[ForecastPoint]
    confidence: str          # low | medium | high
    data_points: int
    generated_at: str
    cached: bool = False


@router.get("/{cluster_id}", response_model=ForecastResponse)
async def get_forecast(cluster_id: str):
    """
    Tier 3.1 — Get 24h trend forecast using linear regression.
    Predicts whether a trend is rising/declining/stable/volatile,
    estimates peak time, and projects scores for the next 24 hours.
    """
    try:
        # Check cached forecast first (6h TTL — forecasts don't change fast)
        cached = await cache.get(f"forecast:{cluster_id}")
        if cached:
            return ForecastResponse(**cached, cached=True)

        # Load history for regression
        snapshots = await cache.get(f"history:{cluster_id}") or []
        if len(snapshots) < 3:
            raise HTTPException(
                status_code=404,
                detail="Not enough history yet — need at least 3 poll cycles (~3 minutes)."
            )

        result = forecast_service.predict(cluster_id, snapshots)
        if not result:
            raise HTTPException(status_code=500, detail="Forecast computation failed")

        # Cache for 30 minutes (re-run as more data comes in)
        await cache.set(f"forecast:{cluster_id}", result, ttl=1800)
        return ForecastResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
