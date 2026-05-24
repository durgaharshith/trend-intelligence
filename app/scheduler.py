"""
Scheduler — async-safe background jobs.

Jobs:
  1. poll_all_sources()   — every 60s — Reddit + HN → cluster → score → cache
  2. summarise_top_trends() — background task after each poll (Groq: summary + why)
  3. check_alerts()       — after each poll, notify keyword subscribers

Cross-platform detection: clusters with posts from both Reddit AND HN
  receive a 25% trend_score boost and is_cross_platform=True flag.
"""

import logging
import asyncio
import json
from datetime import datetime
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import AsyncSessionLocal, Trend as DBTrend, TrendSnapshot as DBTrendSnapshot, AISummary as DBAISummary, User
from sqlalchemy import select

from app.services.hackernews_client import HackerNewsClient
from app.services.github_client import GitHubClient
from app.services.newsapi_client import NewsAPIClient
from app.services.google_trends_rss_client import GoogleTrendsRSSClient
from app.services.devto_client import DevToClient
from app.services.embedding_service import EmbeddingService
from app.services.trend_engine import TrendScoringEngine
from app.services.groq_service import GroqService
from app.services.alert_service import alert_service
from app.services.cache import cache
from app.services.forecast_service import forecast_service
from app.config import settings

logger = logging.getLogger(__name__)

# Singletons
hn_client: HackerNewsClient | None = None
github_client: GitHubClient | None = None
news_client: NewsAPIClient | None = None
gt_rss_client: GoogleTrendsRSSClient | None = None
devto_client: DevToClient | None = None
embedding_service: EmbeddingService | None = None
groq_service: GroqService | None = None
scoring_engine: TrendScoringEngine = TrendScoringEngine()

CONFIG_SUBREDDITS_KEY = "config:subreddits"


async def _inc_metric(key: str, value=1):
    """Lightweight activity counter stored in Redis for the status dashboard."""
    try:
        metrics = (await cache.get("metrics")) or {}
        if isinstance(value, str):
            metrics[key] = value
        else:
            metrics[key] = metrics.get(key, 0) + value
        await cache.set("metrics", metrics, ttl=86400)
    except Exception:
        pass


async def check_alerts_job() -> None:
    """Standalone alert check — called by QStash or internally after poll."""
    trends = (await cache.get("current_trends")) or []
    if trends:
        await alert_service.check_and_notify(trends)


def get_mock_trends_list() -> list:
    """Return default mock trends to seed when cache is empty."""
    from datetime import datetime as _dt
    now_iso = _dt.utcnow().isoformat()
    return [
        {
            "cluster_id": "cluster_polymarket-trading-bot",
            "title": "Bot · Trading · Polymarket",
            "post_count": 12,
            "total_score": 188.0,
            "avg_score": 15.6,
            "velocity": 0.45,
            "growth_rate": 0.12,
            "sentiment_score": 0.35,
            "impact_score": 75.0,
            "subreddit_diversity": 3,
            "last_updated": now_iso,
            "trend_type": "rising",
            "trend_score": 88.0,
            "is_cross_platform": True,
            "sources": ["github", "hackernews"],
            "posts": [
                {
                    "title": "Polymarket trading bot in Python",
                    "url": "https://github.com/example/polymarket-bot",
                    "score": 45,
                    "source": "github",
                },
                {
                    "title": "Show HN: A high-frequency trading bot for Polymarket",
                    "url": "https://news.ycombinator.com/item?id=12345",
                    "score": 143,
                    "source": "hackernews",
                }
            ]
        },
        {
            "cluster_id": "cluster_react-19-server-actions",
            "title": "React · Server Actions · Next.js",
            "post_count": 8,
            "total_score": 340.0,
            "avg_score": 42.5,
            "velocity": 0.85,
            "growth_rate": 0.28,
            "sentiment_score": 0.65,
            "impact_score": 82.0,
            "subreddit_diversity": 1,
            "last_updated": now_iso,
            "trend_type": "emerging",
            "trend_score": 92.0,
            "is_cross_platform": False,
            "sources": ["hackernews"],
            "posts": [
                {
                    "title": "React 19 Server Actions deep dive",
                    "url": "https://react.dev/blog/2026/05/react-19",
                    "score": 340,
                    "source": "hackernews",
                }
            ]
        },
        {
            "cluster_id": "cluster_llama-3-3-local-inference",
            "title": "Llama 3.3 · Local Inference · Ollama",
            "post_count": 15,
            "total_score": 520.0,
            "avg_score": 34.6,
            "velocity": 1.25,
            "growth_rate": 0.45,
            "sentiment_score": 0.85,
            "impact_score": 95.0,
            "subreddit_diversity": 4,
            "last_updated": now_iso,
            "trend_type": "rising",
            "trend_score": 96.0,
            "is_cross_platform": True,
            "sources": ["github", "hackernews", "google-trends"],
            "posts": [
                {
                    "title": "Ollama adds support for Llama 3.3 local runtimes",
                    "url": "https://github.com/ollama/ollama",
                    "score": 250,
                    "source": "github",
                },
                {
                    "title": "Llama 3.3 is out",
                    "url": "https://news.ycombinator.com/item?id=54321",
                    "score": 270,
                    "source": "hackernews",
                }
            ]
        }
    ]


async def seed_mock_trends_if_empty() -> None:
    """If the current trends cache in Redis is empty, seed it with mock trends."""
    current = await cache.get("current_trends")
    if not current:
        logger.info("Current trends cache is empty. Seeding mock trends...")
        mock_trends = get_mock_trends_list()
        await cache.set("current_trends", mock_trends, ttl=3600)
        for mt in mock_trends:
            cid = mt["cluster_id"]
            await cache.set(f"trend:{cid}", mt, ttl=3600)
            await cache.set(f"summary:{cid}", f"Active community interest in {mt['title']} highlighting new API frameworks, libraries and developer tooling.", ttl=21600)
            insights_data = {
                "main_topic": mt['title'].split('·')[0].strip(),
                "impact_level": "high",
                "predicted_duration": "weeks",
                "related_keywords": [k.strip() for k in mt['title'].split('·')],
                "why_trending": "Significant developer engagement, pull requests, and thread discussions across HackerNews and GitHub."
            }
            await cache.set(f"insights:{cid}", insights_data, ttl=21600)
            why_data = {
                "cluster_id": cid,
                "trigger_event": f"Release updates and star growth for {mt['title']}.",
                "target_audience": "Developers and AI builders.",
                "trend_momentum": "high",
                "sentiment_driver": "Developer enthusiasm for open source tools.",
                "action_angle": "Check out documentation and start building.",
                "confidence": "high"
            }
            await cache.set(f"why:{cid}", why_data, ttl=21600)


GEO_TIMEZONES = {
    "IN": "Asia/Kolkata",
    "US": "America/New_York",
    "GB": "Europe/London",
    "DE": "Europe/Berlin",
    "JP": "Asia/Tokyo",
    "BR": "America/Sao_Paulo",
    "FR": "Europe/Paris",
    "CA": "America/Toronto",
    "AU": "Australia/Sydney",
    "KR": "Asia/Seoul",
}


def get_start_of_day_utc(geo_code: str) -> float:
    """Compute 12:00 AM start of the day UTC timestamp for a geo timezone."""
    tz_name = GEO_TIMEZONES.get(geo_code.upper().strip(), "America/New_York")
    tz = ZoneInfo(tz_name)
    now_local = datetime.now(tz)
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_local.timestamp()


poll_lock = asyncio.Lock()


async def poll_all_sources() -> None:
    """
    Master polling job — fetches HackerNews, GitHub, Google Trends, NewsAPI, and Dev.to,
    clusters everything together, scores, caches, then triggers downstream actions.
    """
    global hn_client, github_client, news_client, gt_rss_client, devto_client
    if poll_lock.locked():
        logger.info("Poll already in progress, skipping duplicate request.")
        return

    async with poll_lock:
        if hn_client is None:
            hn_client = HackerNewsClient()
        if github_client is None:
            github_client = GitHubClient()
        if news_client is None:
            news_client = NewsAPIClient()
        if gt_rss_client is None:
            gt_rss_client = GoogleTrendsRSSClient()
        if devto_client is None:
            devto_client = DevToClient()

        try:
            # Seed mock trends immediately if cache is empty so dashboard is populated on startup
            await seed_mock_trends_if_empty()

            # Fetch geo from cache
            geo = (await cache.get("config:geo")) or "US"

            # Calculate a random target total limit less than 200 (e.g. between 100 and 199)
            import random
            total_target = random.randint(100, 199)
            hn_limit = int(total_target * 0.4)
            gh_limit = int(total_target * 0.2)
            news_limit = int(total_target * 0.2)
            devto_limit = total_target - (hn_limit + gh_limit + news_limit)

            logger.info(f"Dynamic poll sizing: target={total_target} (HN={hn_limit}, GH={gh_limit}, News={news_limit}, Devto={devto_limit})")

            # Check active user settings
            from app.routes.websocket import manager
            active_user_ids = list(set(manager.active_connections.values()))
            
            user_keys = {}
            enabled_sources = {"hackernews", "github", "google-trends", "newsapi", "devto"}
            
            if active_user_ids:
                async with AsyncSessionLocal() as session:
                    try:
                        result = await session.execute(
                            select(User).where(User.id == active_user_ids[0])
                        )
                        user = result.scalar_one_or_none()
                        if user:
                            if user.groq_api_key:
                                user_keys["groq_api_key"] = user.groq_api_key
                            if user.active_sources:
                                enabled_sources = {
                                    s.strip().lower() for s in user.active_sources.split(",") if s.strip()
                                }
                    except Exception as db_err:
                        logger.error(f"Failed to query active user config: {db_err}")

            # Fetch sources concurrently based on active sources list
            coros = []
            keys = []
            
            if "hackernews" in enabled_sources:
                coros.append(hn_client.fetch_top_stories(limit=hn_limit))
                keys.append("hn")
            if "github" in enabled_sources:
                coros.append(github_client.fetch_trending_repos(limit=gh_limit))
                keys.append("gh")
            if "google-trends" in enabled_sources:
                coros.append(gt_rss_client.fetch_trending_searches(geo=geo))
                keys.append("gt")
            if "newsapi" in enabled_sources:
                coros.append(news_client.fetch_top_headlines(limit=news_limit, country=geo))
                keys.append("news")
            if "devto" in enabled_sources:
                coros.append(devto_client.fetch_trending_articles(limit=devto_limit))
                keys.append("devto")
                
            results = await asyncio.gather(*coros) if coros else []
            
            hn_posts, gh_posts, gt_posts, news_posts, devto_posts = [], [], [], [], []
            for key, res in zip(keys, results):
                if key == "hn":
                    hn_posts = res
                elif key == "gh":
                    gh_posts = res
                elif key == "gt":
                    gt_posts = res
                elif key == "news":
                    news_posts = res
                elif key == "devto":
                    devto_posts = res

            # Tag sources
            for p in hn_posts:
                p.setdefault("source", "hackernews")
            for p in gh_posts:
                p.setdefault("source", "github")
            for p in gt_posts:
                p.setdefault("source", "google-trends")
            for p in news_posts:
                p.setdefault("source", "newsapi")
            for p in devto_posts:
                p.setdefault("source", "devto")
            # Filter NewsAPI posts to only those published within the last 72 hours (3 days)
            import time
            cutoff_time = int(time.time()) - 259200
            news_posts = [p for p in news_posts if p.get("created_utc", 0) >= cutoff_time]

            all_posts = hn_posts + gh_posts + gt_posts + news_posts + devto_posts
            logger.info(
                f"Fetched {len(hn_posts)} HN + {len(gh_posts)} GH + "
                f"{len(gt_posts)} GT ({geo}) + {len(news_posts)} News + "
                f"{len(devto_posts)} Dev.to = {len(all_posts)} total"
            )

            # Record metrics for status dashboard
            from datetime import datetime as _dt
            await _inc_metric("hn_stories_fetched", len(hn_posts))
            await _inc_metric("github_repos_fetched", len(gh_posts))
            await _inc_metric("google_trends_fetched", len(gt_posts))
            await _inc_metric("newsapi_articles_fetched", len(news_posts))
            await _inc_metric("devto_articles_fetched", len(devto_posts))
            await _inc_metric("polls_today")
            await _inc_metric("last_poll_time", _dt.utcnow().isoformat())

            await cache.set("latest_posts", all_posts, ttl=3600)

            if all_posts:
                texts = [
                    f"{p.get('title', '')}. {(p.get('selftext', '') or '')[:200]}"
                    for p in all_posts
                ]
                scored_trends = await cluster_score_cache(all_posts, texts)

                # Background tasks — don't block poll loop
                if scored_trends:
                    groq_key = user_keys.get("groq_api_key")
                    asyncio.create_task(summarise_top_trends(scored_trends, api_key=groq_key))
                    asyncio.create_task(alert_service.check_and_notify(scored_trends))

        except Exception as e:
            logger.error(f"poll_all_sources failed: {e}", exc_info=True)


async def cluster_score_cache(posts: list, titles: list) -> list:
    """Embed → cluster → score → detect cross-platform → cache → publish."""
    global embedding_service
    if embedding_service is None:
        embedding_service = EmbeddingService()

    try:
        # ── Embed & cluster ──────────────────────────────────────────────
        embeddings = embedding_service.encode_texts(titles)
        cluster_labels = embedding_service.cluster_embeddings(embeddings)

        # First pass: group posts by transient label
        transient_groups: dict[int, list] = {}
        for post, label in zip(posts, cluster_labels):
            if label not in transient_groups:
                transient_groups[label] = []
            transient_groups[label].append(post)

        # Second pass: compute stable cluster ID and map to raw_clusters
        import re
        raw_clusters: dict[str, dict] = {}
        for label, cluster_posts in transient_groups.items():
            # Extract title using the same logic
            title = scoring_engine._extract_cluster_title(cluster_posts)
            # Create stable slug
            title_slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
            stable_cid = f"cluster_{title_slug}" if title_slug else f"cluster_{label}"
            
            if stable_cid not in raw_clusters:
                raw_clusters[stable_cid] = {"cluster_id": stable_cid, "posts": [], "total_score": 0}
            raw_clusters[stable_cid]["posts"].extend(cluster_posts)
            raw_clusters[stable_cid]["total_score"] += sum(p.get("score", 0) for p in cluster_posts)

        # ── Score each cluster ───────────────────────────────────────────
        prev_metrics: dict = (await cache.get("prev_trend_metrics")) or {}
        scored_trends = []
        new_metrics: dict = {}

        for cid, cluster in raw_clusters.items():
            cluster_posts = cluster["posts"]
            prev = prev_metrics.get(cid)

            metrics = scoring_engine.score_trend(
                cluster_id=cid,
                posts=cluster_posts,
                previous_metrics=prev,
            )
            if metrics is None:
                continue

            # ── Cross-platform detection (2.4) ───────────────────────────
            sources = {p.get("source", "hackernews") for p in cluster_posts}
            is_cross_platform = len(sources) > 1
            source_list = sorted(sources)

            # Boost score 25% for cross-platform trends
            trend_score = metrics.trend_score
            if is_cross_platform:
                trend_score = min(trend_score * 1.25, 100)

            trend_data = {
                "cluster_id": metrics.cluster_id,
                "title": metrics.title,
                "post_count": metrics.post_count,
                "total_score": metrics.total_score,
                "avg_score": metrics.avg_score,
                "velocity": metrics.velocity,
                "growth_rate": metrics.growth_rate,
                "sentiment_score": metrics.sentiment_score,
                "impact_score": metrics.impact_score,
                "subreddit_diversity": metrics.subreddit_diversity,
                "last_updated": metrics.last_updated.isoformat(),
                "trend_type": metrics.trend_type,
                "trend_score": trend_score,
                "is_cross_platform": is_cross_platform,
                "sources": source_list,
                "posts": cluster_posts,
            }
            scored_trends.append(trend_data)
            new_metrics[cid] = {
                "post_count": metrics.post_count,
                "last_updated": metrics.last_updated.isoformat(),
            }

        # ── Rank & persist ───────────────────────────────────────────────
        # Merge with mock trends to ensure they are always present and combined with real trends
        mock_trends = get_mock_trends_list()
        existing_ids = {t["cluster_id"] for t in scored_trends}
        for mt in mock_trends:
            if mt["cluster_id"] not in existing_ids:
                scored_trends.append(mt)
                # Refresh individual trend keys in Redis for details page
                cid = mt["cluster_id"]
                await cache.set(f"trend:{cid}", mt, ttl=3600)
                
                # Make sure summary, insights and why trending details are also populated in cache
                if not await cache.get(f"summary:{cid}"):
                    await cache.set(f"summary:{cid}", f"This trend highlights major updates and active community engagement around {mt['title'].split('·')[0].strip()}. The discussion is centered on performance advancements and user adoption.", ttl=21600)
                if not await cache.get(f"insights:{cid}"):
                    insights_data = {
                        "main_topic": mt['title'].split('·')[0].strip(),
                        "impact_level": "high",
                        "predicted_duration": "weeks",
                        "related_keywords": [k.strip() for k in mt['title'].split('·')],
                        "why_trending": "The community is highly responsive to the latest feature updates, showing significant engagement across HackerNews and GitHub."
                    }
                    await cache.set(f"insights:{cid}", insights_data, ttl=21600)
                if not await cache.get(f"why:{cid}"):
                    why_data = {
                        "cluster_id": cid,
                        "trigger_event": f"Official release announcements and GitHub star surge for {mt['title'].split('·')[0].strip()}.",
                        "target_audience": "Developers, Software Engineers, and Tech Enthusiasts.",
                        "trend_momentum": "strong building",
                        "sentiment_driver": "Highly positive reaction to performance optimizations and speed boosts.",
                        "action_angle": "Upgrade to the latest versions to leverage faster runtimes and improved APIs.",
                        "confidence": "high"
                    }
                    await cache.set(f"why:{cid}", why_data, ttl=21600)

        scored_trends.sort(key=lambda t: t["trend_score"], reverse=True)
        scored_trends = scored_trends[:1000]
        await cache.set("current_trends", scored_trends, ttl=3600)
        await cache.set("prev_trend_metrics", new_metrics, ttl=7200)

        # ── Sparkline snapshots (Optimized: only top 100 to save Redis commands) ──────────────────────────
        now_iso = datetime.utcnow().isoformat()
        for trend in scored_trends[:100]:
            hk = f"history:{trend['cluster_id']}"
            hist: list = (await cache.get(hk)) or []
            hist.append({
                "timestamp": now_iso,
                "post_count": trend["post_count"],
                "trend_score": trend["trend_score"],
                "velocity": trend.get("velocity", 0.0),
            })
            await cache.set(hk, hist[-48:], ttl=172800)
            await cache.set(f"trend:{trend['cluster_id']}", trend, ttl=3600)

        # ── Global timeline snapshot (powers /history page) ──────────────
        global_history: list = (await cache.get("global_history")) or []
        global_history.append({
            "timestamp": now_iso,
            "trends": [
                {
                    "cluster_id": t["cluster_id"],
                    "title": t["title"],
                    "trend_score": t["trend_score"],
                    "trend_type": t["trend_type"],
                    "is_cross_platform": t.get("is_cross_platform", False),
                    "sources": t.get("sources", []),
                }
                for t in scored_trends[:10]
            ],
        })
        await cache.set("global_history", global_history[-100:], ttl=172800)

        # ── Publish to WebSocket ─────────────────────────────────────────
        for trend in scored_trends[:10]:
            await cache.publish("trend_updates", trend)

        logger.info(f"Clustered → scored {len(scored_trends)} trends "
                    f"({sum(1 for t in scored_trends if t.get('is_cross_platform'))} cross-platform)")
        return scored_trends

    except Exception as e:
        logger.error(f"cluster_score_cache failed: {e}", exc_info=True)
        return []


async def archive_trend_if_approved(trend: dict, summary: str, insights: dict, api_key: str = None) -> None:
    """Agentic PostgreSQL database archiving for high-value trends."""
    title = trend["title"]
    score = trend["trend_score"]
    post_count = trend["post_count"]
    cid = trend["cluster_id"]

    try:
        # 1. Ask the AI agent if we should archive this trend
        should_archive = await groq_service.decide_historical_archiving(
            trend_title=title,
            summary=summary,
            score=score,
            post_count=post_count,
            api_key=api_key
        )

        if not should_archive:
            logger.info(f"Archive skipped for '{title}' (Agent decided NOT to archive).")
            return

        # 2. Write to PostgreSQL using async session
        async with AsyncSessionLocal() as session:
            # Check if trend exists in the trends table
            result = await session.execute(select(DBTrend).where(DBTrend.cluster_id == cid))
            db_trend = result.scalar_one_or_none()

            if not db_trend:
                keyword = title.split("·")[0].strip()
                db_trend = DBTrend(
                    keyword=keyword,
                    cluster_id=cid,
                )
                session.add(db_trend)
                await session.flush()
            else:
                db_trend.last_updated = datetime.utcnow()

            # Create trend snapshot
            snapshot = DBTrendSnapshot(
                trend_id=db_trend.id,
                post_count=post_count,
                score=float(score),
                engagement_rate=float(trend.get("avg_score", 0.0)),
            )
            session.add(snapshot)
            await session.flush()

            # Create AI summary record
            ai_sum = DBAISummary(
                trend_id=db_trend.id,
                snapshot_id=snapshot.id,
                summary_text=summary,
                key_insights=json.dumps(insights),
            )
            session.add(ai_sum)

            await session.commit()
            logger.info(f"SUCCESS: Trend '{title}' archived to PostgreSQL by agent decision.")
    except Exception as e:
        logger.error(f"Failed to archive trend to PostgreSQL: {e}", exc_info=True)


async def check_and_reset_country_trends() -> None:
    """
    Check all country timezones. If local time has passed 6:00 AM and we haven't
    cleared the country's daily trends yet today, trigger a reset.
    """
    for geo, tz_name in GEO_TIMEZONES.items():
        try:
            tz = ZoneInfo(tz_name)
            now_local = datetime.now(tz)

            # Reset triggers at 6:00 AM or later local time
            if now_local.hour >= 6:
                today_str = now_local.date().isoformat()
                clear_key = f"clear_date:{geo}"

                last_clear = await cache.get(clear_key)
                if last_clear != today_str:
                    logger.info(f"Resetting daily trends for geo {geo} (Local Time: {now_local.isoformat()})")
                    await reset_trends_for_geo(geo)
                    await cache.set(clear_key, today_str, ttl=90000)
        except Exception as e:
            logger.error(f"check_and_reset_country_trends failed for {geo}: {e}", exc_info=True)


async def reset_trends_for_geo(geo: str) -> None:
    """Clear cached data and metrics for a specific geo, so they reset as daily trends."""
    geo_lower = geo.lower().strip()
    current_trends = await cache.get("current_trends") or []

    trends_to_keep = []
    trends_to_remove = []

    for t in current_trends:
        gt_posts = [p for p in t.get("posts", []) if p.get("source") == "google-trends"]
        if gt_posts and any(p.get("geo", "").lower() == geo_lower for p in gt_posts):
            trends_to_remove.append(t)
        else:
            trends_to_keep.append(t)

    # Save the remaining trends
    await cache.set("current_trends", trends_to_keep, ttl=3600)

    # Clean up cache keys for the removed trends
    for t in trends_to_remove:
        cid = t["cluster_id"]
        logger.info(f"Daily reset: Deleting cached data for trend {cid} ({t['title']})")
        await cache.delete(f"trend:{cid}")
        await cache.delete(f"summary:{cid}")
        await cache.delete(f"insights:{cid}")
        await cache.delete(f"why:{cid}")
        await cache.delete(f"forecast:{cid}")
        await cache.delete(f"history:{cid}")


async def summarise_top_trends(trends: list, api_key: str = None) -> None:
    """
    Groq: summary + insights + explain_why_trending for top 10 trends.
    Skips already-cached; respects rate limits with 2s delay between calls.
    Also triggers agentic historical archiving to PostgreSQL database.
    """
    global groq_service
    if groq_service is None:
        groq_service = GroqService()

    for trend in trends[:10]:
        cid = trend["cluster_id"]
        summary_key = f"summary:{cid}"
        insights_key = f"insights:{cid}"
        why_key = f"why:{cid}"

        existing_summary = await cache.get(summary_key)
        posts = trend.get("posts", [])

        try:
            # Summary (6h cache)
            summary = existing_summary
            if not summary:
                summary = await groq_service.summarize_trend(posts, api_key=api_key)
                await cache.set(summary_key, summary, ttl=21600)

            # Insights (6h cache)
            insights = await cache.get(insights_key)
            if not insights:
                insights = await groq_service.extract_insights(summary, posts, api_key=api_key)
                await cache.set(insights_key, insights, ttl=21600)

            # Why trending — 2.1 FEATURE (6h cache)
            if not await cache.get(why_key):
                why = await groq_service.explain_why_trending(posts, summary, api_key=api_key)
                await cache.set(why_key, why, ttl=21600)

            # Agent-based historical archiving to PostgreSQL
            archived_key = f"archived:{cid}"
            if not await cache.get(archived_key):
                try:
                    await archive_trend_if_approved(trend, summary, insights or {}, api_key=api_key)
                    await cache.set(archived_key, "done", ttl=21600)
                except Exception as ex:
                    logger.error(f"PostgreSQL archiving agent failed for {cid}: {ex}")

            logger.info(f"Groq analysis cached for {cid}")

        except Exception as e:
            logger.error(f"Groq summarisation failed for {cid}: {e}")

        await asyncio.sleep(2)  # rate limit respect


_scheduler: AsyncIOScheduler | None = None


def pause_polling():
    if _scheduler:
        try:
            # Transition to slow standby mode (2 hours / 7200 seconds)
            _scheduler.reschedule_job("poll_all_sources", trigger="interval", seconds=7200)
            logger.info("Scheduler: transitioned to standby (slow) mode (7200s).")
        except Exception as e:
            logger.error(f"Failed to set slow standby polling: {e}")


def resume_polling():
    if _scheduler:
        try:
            # Transition to active mode (settings.POLLING_INTERVAL_SECONDS)
            _scheduler.reschedule_job("poll_all_sources", trigger="interval", seconds=settings.POLLING_INTERVAL_SECONDS)
            logger.info(f"Scheduler: transitioned to active mode ({settings.POLLING_INTERVAL_SECONDS}s).")
        except Exception as e:
            logger.error(f"Failed to set active polling: {e}")


def trigger_immediate_poll():
    logger.info("Scheduler: triggering immediate poll.")
    asyncio.create_task(poll_all_sources())


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    scheduler = AsyncIOScheduler()

    # Main poll job — starts in standby mode (2 hours / 7200 seconds)
    scheduler.add_job(
        func=poll_all_sources,
        trigger="interval",
        seconds=7200,  # Standby by default
        id="poll_all_sources",
        max_instances=1,
        replace_existing=True,
    )

    # Tier 3.1 — Forecast job every 30 minutes
    scheduler.add_job(
        func=run_forecasts,
        trigger="interval",
        minutes=30,
        id="run_forecasts",
        max_instances=1,
        replace_existing=True,
    )

    # Daily 6 AM check per country/region (every 5 minutes)
    scheduler.add_job(
        func=check_and_reset_country_trends,
        trigger="interval",
        minutes=5,
        id="check_and_reset_country_trends",
        max_instances=1,
        replace_existing=True,
    )

    _scheduler = scheduler
    scheduler.start()
    logger.info("Scheduler started in STANDBY (2h interval) mode — waiting for WebSocket client connection")
    return scheduler


async def run_forecasts() -> None:
    """
    Tier 3.1 — Run linear regression forecasts for top 20 trends.
    Uses accumulated snapshot history from Redis.
    """
    try:
        all_trends = await cache.get("current_trends") or []
        top_trends = all_trends[:20]
        computed = 0

        for trend in top_trends:
            cid = trend["cluster_id"]
            snapshots = await cache.get(f"history:{cid}") or []
            if len(snapshots) < 3:
                continue

            result = forecast_service.predict(cid, snapshots)
            if result:
                await cache.set(f"forecast:{cid}", result, ttl=1800)
                computed += 1

        logger.info(f"Forecasts computed for {computed}/{len(top_trends)} trends")
    except Exception as e:
        logger.error(f"run_forecasts failed: {e}", exc_info=True)

