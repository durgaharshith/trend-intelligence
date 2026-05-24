from fastapi import APIRouter, HTTPException, Query
from app.services.cache import cache
from app.models import TrendResponse, TrendsListResponse, TrendSummaryResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/trends", tags=["trends"])


class WhyTrendingResponse(BaseModel):
    cluster_id: str
    trigger_event: str = ""
    target_audience: str = ""
    trend_momentum: str = "building"
    sentiment_driver: str = ""
    action_angle: str = ""
    confidence: str = "medium"


@router.get("/", response_model=TrendsListResponse)
async def get_trends(
    limit: int = Query(default=10, ge=1, le=100),
    source: Optional[str] = None,
    trend_type: Optional[str] = None,
    sort_by: str = Query(default="trend_score"),
    geo: Optional[str] = None,
):
    """Get current trending topics with filtering and sorting."""
    try:
        trends = await cache.get("current_trends")
        if not trends:
            return TrendsListResponse(trends=[], total=0, cached=False)

        # Filtering
        if source:
            source_lower = source.lower().strip()
            # A trend matches if the source is in its source list
            trends = [t for t in trends if source_lower in [s.lower() for s in t.get("sources", [])]]

        if trend_type:
            tt_lower = trend_type.lower().strip()
            trends = [t for t in trends if t.get("trend_type", "").lower() == tt_lower]

        if geo:
            geo_lower = geo.lower().strip()
            filtered_trends = []
            for t in trends:
                gt_posts = [p for p in t.get("posts", []) if p.get("source") == "google-trends"]
                if gt_posts:
                    if any(p.get("geo", "").lower() == geo_lower for p in gt_posts):
                        filtered_trends.append(t)
                else:
                    filtered_trends.append(t)
            trends = filtered_trends

        # Sorting
        if sort_by == "velocity":
            trends = sorted(trends, key=lambda x: x.get("velocity", 0.0), reverse=True)
        elif sort_by == "post_count":
            trends = sorted(trends, key=lambda x: x.get("post_count", 0), reverse=True)
        elif sort_by == "recency":
            trends = sorted(trends, key=lambda x: x.get("last_updated", ""), reverse=True)
        else:  # default trend_score
            trends = sorted(trends, key=lambda x: x.get("trend_score", 0.0), reverse=True)

        return TrendsListResponse(
            trends=[TrendResponse(**t) for t in trends[:limit]],
            total=len(trends),
            cached=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cluster_id}", response_model=TrendResponse)
async def get_trend_details(cluster_id: str):
    """Get detailed information about a specific trend cluster."""
    try:
        trend = await cache.get(f"trend:{cluster_id}")
        if not trend:
            all_trends = await cache.get("current_trends") or []
            trend = next((t for t in all_trends if t.get("cluster_id") == cluster_id), None)
        if not trend:
            raise HTTPException(status_code=404, detail="Trend not found")
        return TrendResponse(**trend)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{cluster_id}", response_model=TrendSummaryResponse)
async def get_trend_summary(cluster_id: str):
    """Get AI-generated summary and insights for a trend cluster."""
    try:
        summary = await cache.get(f"summary:{cluster_id}")
        insights = await cache.get(f"insights:{cluster_id}")
        if not summary:
            raise HTTPException(
                status_code=404,
                detail="Summary not yet available — AI analysis is still processing."
            )
        return TrendSummaryResponse(summary=summary, insights=insights)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/why/{cluster_id}", response_model=WhyTrendingResponse)
async def get_why_trending(cluster_id: str):
    """
    2.1 — Get deep 'Why Is This Trending?' explanation.
    Provides trigger event, audience, momentum, sentiment driver, and action angle.
    """
    try:
        why = await cache.get(f"why:{cluster_id}")
        if not why:
            raise HTTPException(
                status_code=404,
                detail="Analysis not yet available — check back after the next poll cycle."
            )
        return WhyTrendingResponse(cluster_id=cluster_id, **why)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fetch")
async def trigger_manual_fetch():
    """Trigger manual polling of all sources immediately."""
    from app.scheduler import poll_all_sources
    try:
        await poll_all_sources()
        return {"status": "success", "message": "Manual fetch completed and cache updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trends: {str(e)}")
