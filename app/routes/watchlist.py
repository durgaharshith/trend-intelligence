"""Watchlist API — Tier 3.4 (async DB — Tier 4.1)"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from app.database import get_async_db, Watchlist
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


class AddWatchlistRequest(BaseModel):
    cluster_id: str
    cluster_title: str
    cluster_keyword: str = ""


@router.get("/")
async def get_watchlist(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user["user_id"])
        .order_by(Watchlist.added_at.desc())
    )
    items = result.scalars().all()
    return {
        "watchlist": [
            {
                "id": i.id,
                "cluster_id": i.cluster_id,
                "cluster_title": i.cluster_title,
                "cluster_keyword": i.cluster_keyword,
                "added_at": i.added_at.isoformat(),
            }
            for i in items
        ],
        "total": len(items),
    }


@router.post("/", status_code=201)
async def add_to_watchlist(
    body: AddWatchlistRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    existing = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user["user_id"],
            Watchlist.cluster_id == body.cluster_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Already in watchlist")

    item = Watchlist(
        user_id=current_user["user_id"],
        cluster_id=body.cluster_id,
        cluster_title=body.cluster_title,
        cluster_keyword=body.cluster_keyword,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"message": f"'{body.cluster_title}' added", "id": item.id}


@router.delete("/{item_id}")
async def remove_from_watchlist(
    item_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(Watchlist).where(
            Watchlist.id == item_id,
            Watchlist.user_id == current_user["user_id"],
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Removed"}
