"""Internal QStash webhook endpoints — Tier 4.5
Solves Render free tier 'sleep' problem.
QStash (external HTTP scheduler) wakes the server and triggers jobs.
Protected by X-Internal-Secret header.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from app.config import settings

router = APIRouter(prefix="/api/internal", tags=["internal"])


async def verify_secret(x_internal_secret: str = Header(default="")):
    if settings.INTERNAL_SECRET and x_internal_secret != settings.INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/poll", dependencies=[Depends(verify_secret)])
async def trigger_poll(bg: BackgroundTasks):
    """QStash: every 60s → Reddit + HN poll."""
    from app.scheduler import poll_all_sources
    bg.add_task(poll_all_sources)
    return {"status": "poll triggered"}


@router.post("/forecast", dependencies=[Depends(verify_secret)])
async def trigger_forecast(bg: BackgroundTasks):
    """QStash: every 30min → forecast computation."""
    from app.scheduler import run_forecasts
    bg.add_task(run_forecasts)
    return {"status": "forecast triggered"}


@router.post("/alerts", dependencies=[Depends(verify_secret)])
async def trigger_alerts(bg: BackgroundTasks):
    """QStash: every 60s → alert keyword matching."""
    from app.scheduler import check_alerts_job
    bg.add_task(check_alerts_job)
    return {"status": "alerts triggered"}
