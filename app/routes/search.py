"""Semantic search route — Tier 4.4"""
from fastapi import APIRouter, Query
from app.services.semantic_search import semantic_search_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/")
async def search(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(default=5, ge=1, le=20),
):
    """Semantic search across all current trends using AI embeddings."""
    results = await semantic_search_service.search(q, limit)
    return {"query": q, "results": results, "total": len(results)}
