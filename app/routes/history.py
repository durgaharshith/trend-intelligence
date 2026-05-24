"""
History endpoint — trend snapshot data for sparklines and timeline.

GET /api/trends/{cluster_id}/history?hours=24
Returns a time-series list of snapshots for velocity sparkline charts.
"""

from fastapi import APIRouter, HTTPException, Query
from app.services.cache import cache
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/history", tags=["history"])


class SnapshotPoint(BaseModel):
    timestamp: str
    post_count: int
    trend_score: float
    velocity: float


class TrendHistoryResponse(BaseModel):
    cluster_id: str
    snapshots: List[SnapshotPoint]
    hours: int


@router.get("/", tags=["history"])
async def get_global_history():
    """
    Tier 2.3 — Returns the global timeline of top-10 trends over the last 100 poll cycles.
    Powers the /history page multi-line chart.
    """
    try:
        history = await cache.get("global_history") or []
        return {"snapshots": history, "total": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cluster_id}", response_model=TrendHistoryResponse)
async def get_trend_history(
    cluster_id: str,
    hours: int = Query(default=24, ge=1, le=168),
):
    """
    Get historical snapshots for a trend cluster.
    Powers the velocity sparkline on the detail page.
    Data is available after the first poll cycle.
    """
    try:
        history_key = f"history:{cluster_id}"
        snapshots = await cache.get(history_key) or []

        # Filter to requested window
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        filtered = [s for s in snapshots if s.get("timestamp", "") >= cutoff]

        return TrendHistoryResponse(
            cluster_id=cluster_id,
            snapshots=[SnapshotPoint(**s) for s in filtered],
            hours=hours,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
