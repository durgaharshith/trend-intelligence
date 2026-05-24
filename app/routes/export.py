"""CSV Export — Tier 4.3. In-memory, no disk write, works on ephemeral filesystem."""
import csv
import io
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.cache import cache

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/trends.csv")
async def export_trends_csv():
    """Download all current trends as CSV."""
    trends = await cache.get("current_trends") or []

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "cluster_id", "title", "trend_score", "trend_type",
            "post_count", "velocity", "growth_rate", "sentiment_score",
            "subreddit_diversity", "is_cross_platform", "sources", "last_updated",
        ])
        buf.seek(0)
        yield buf.getvalue()
        buf.truncate(0); buf.seek(0)

        for t in trends:
            writer.writerow([
                t.get("cluster_id", ""),
                t.get("title", ""),
                round(t.get("trend_score", 0), 2),
                t.get("trend_type", ""),
                t.get("post_count", 0),
                round(t.get("velocity", 0), 4),
                round(t.get("growth_rate", 0), 2),
                round(t.get("sentiment_score", 0), 3),
                t.get("subreddit_diversity", 0),
                t.get("is_cross_platform", False),
                "|".join(t.get("sources", ["reddit"])),
                t.get("last_updated", ""),
            ])
            buf.seek(0)
            yield buf.getvalue()
            buf.truncate(0); buf.seek(0)

    filename = f"trends-{datetime.utcnow().strftime('%Y%m%d-%H%M')}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
