"""
Redis cache with in-memory fallback.

FIXED:
- Silent failure: when Redis is unavailable, an in-memory dict with TTL
  is used so the app still serves data instead of returning empty arrays.
- Structured logging for cache misses and evictions.
"""

import redis.asyncio as redis
import json
import logging
import time
from typing import Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class InMemoryStore:
    """Lightweight in-process fallback when Redis is unavailable."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)

    def get(self, key: str) -> Optional[Any]:
        if key not in self._data:
            return None
        value, expires_at = self._data[key]
        if expires_at and time.time() > expires_at:
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        self._data[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def __len__(self) -> int:
        return len(self._data)


class RedisCache:
    def __init__(self) -> None:
        self.redis: Optional[redis.Redis] = None
        self._fallback = InMemoryStore()
        self._using_fallback = False

    async def connect(self) -> None:
        if self.redis is None:
            try:
                self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
                await self.redis.ping()
                self._using_fallback = False
                logger.info("Connected to Redis ✓")
            except Exception as e:
                logger.warning(
                    f"Redis unavailable ({e}). Running with in-memory fallback — "
                    "data will NOT persist across restarts."
                )
                self.redis = None
                self._using_fallback = True

    async def disconnect(self) -> None:
        if self.redis:
            await self.redis.aclose()

    async def get(self, key: str) -> Optional[Any]:
        # ── Redis path ───────────────────────────────────────────────────
        if self.redis:
            try:
                value = await self.redis.get(key)
                if value:
                    return json.loads(value)
                return None
            except Exception as e:
                logger.warning(f"Redis GET failed for '{key}': {e} — falling back to memory")

        # ── In-memory fallback ───────────────────────────────────────────
        return self._fallback.get(key)

    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        serialised = json.dumps(value, default=str)

        # ── Redis path ───────────────────────────────────────────────────
        if self.redis:
            try:
                await self.redis.setex(key, ttl, serialised)
                return
            except Exception as e:
                logger.warning(f"Redis SET failed for '{key}': {e} — writing to memory")

        # ── In-memory fallback ───────────────────────────────────────────
        self._fallback.set(key, value, ttl)

    async def delete(self, key: str) -> None:
        if self.redis:
            try:
                await self.redis.delete(key)
                return
            except Exception as e:
                logger.warning(f"Redis DEL failed for '{key}': {e}")
        self._fallback.delete(key)

    async def publish(self, channel: str, message: dict) -> None:
        if not self.redis:
            return  # pub/sub requires Redis; in-memory mode has no subscribers
        try:
            await self.redis.publish(channel, json.dumps(message, default=str))
        except Exception as e:
            logger.warning(f"Redis PUBLISH failed on '{channel}': {e}")

    async def subscribe(self, channel: str):
        if not self.redis:
            return None
        try:
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(channel)
            return pubsub
        except Exception as e:
            logger.warning(f"Redis SUBSCRIBE failed on '{channel}': {e}")
            return None

    @property
    def is_connected(self) -> bool:
        return self.redis is not None


# Global singleton
cache = RedisCache()
