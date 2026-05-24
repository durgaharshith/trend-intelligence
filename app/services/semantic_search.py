"""Semantic search — Tier 4.4 (numpy/Redis, no pgvector needed).
Uses existing sentence-transformers model (already loaded for clustering).
No new DB tables — works entirely from Redis-cached trend data.
"""
import logging
import numpy as np
from app.services.cache import cache

logger = logging.getLogger(__name__)

_embedding_service = None


def _get_embedding_service():
    global _embedding_service
    if _embedding_service is None:
        from app.services.embedding_service import EmbeddingService
        _embedding_service = EmbeddingService()
    return _embedding_service


class SemanticSearchService:
    async def search(self, query: str, limit: int = 5) -> list:
        """Embed query → cosine similarity against all cached trend titles."""
        trends = await cache.get("current_trends") or []
        if not trends:
            return []

        cache_key = f"search:{query.lower().strip()[:80]}"
        cached = await cache.get(cache_key)
        if cached:
            return cached[:limit]

        try:
            es = _get_embedding_service()
            titles = [t.get("title", "") for t in trends]
            all_texts = [query] + titles
            embeddings = es.encode_texts(all_texts)

            q_emb = np.array(embeddings[0])
            q_norm = np.linalg.norm(q_emb) + 1e-10

            results = []
            for i, trend in enumerate(trends):
                t_emb = np.array(embeddings[i + 1])
                similarity = float(np.dot(q_emb, t_emb) / (q_norm * (np.linalg.norm(t_emb) + 1e-10)))
                results.append({
                    "cluster_id": trend["cluster_id"],
                    "title": trend["title"],
                    "trend_score": trend.get("trend_score", 0),
                    "trend_type": trend.get("trend_type", "stable"),
                    "post_count": trend.get("post_count", 0),
                    "is_cross_platform": trend.get("is_cross_platform", False),
                    "similarity": round(similarity, 3),
                })

            results.sort(key=lambda x: x["similarity"], reverse=True)
            top = results[:limit]

            # Cache 5 minutes — fast repeated searches
            await cache.set(cache_key, top, ttl=300)
            return top

        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []


semantic_search_service = SemanticSearchService()
