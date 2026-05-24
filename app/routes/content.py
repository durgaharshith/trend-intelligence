"""Content Idea Generator API — Tier 3.2"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services.groq_service import GroqService
from app.services.langsearch_client import LangSearchClient
from app.services.cache import cache

router = APIRouter(prefix="/api/content", tags=["content"])
groq_service = GroqService()

RATE_LIMIT_KEY = "content_ratelimit"
MAX_REQUESTS_PER_HOUR = 5


class ContentIdeasRequest(BaseModel):
    cluster_id: str
    trend_title: str
    why_trending: str = ""


class BlogPost(BaseModel):
    title: str = ""
    hook: str = ""
    outline: list[str] = []


class TwitterThread(BaseModel):
    hook: str = ""
    points: list[str] = []


class RedditComment(BaseModel):
    subreddit: str = ""
    angle: str = ""


class LinkedInPost(BaseModel):
    framing: str = ""
    cta: str = ""


class YouTubeShort(BaseModel):
    title: str = ""
    hook: str = ""
    key_point: str = ""


class ContentIdeasResponse(BaseModel):
    cluster_id: str
    blog_post: BlogPost = BlogPost()
    twitter_thread: TwitterThread = TwitterThread()
    reddit_comment: RedditComment = RedditComment()
    linkedin_post: LinkedInPost = LinkedInPost()
    youtube_short: YouTubeShort = YouTubeShort()
    social_context: str = ""
    cached: bool = False


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/ideas", response_model=ContentIdeasResponse)
async def generate_content_ideas(body: ContentIdeasRequest, request: Request):
    """
    Tier 3.2 — Generate 5 platform-specific content ideas for a trending topic.
    Rate limited to 5 requests/hour per IP. Results cached 2h per cluster.
    """
    ip = _get_client_ip(request)
    rate_key = f"{RATE_LIMIT_KEY}:{ip}"

    # ── Check cache first ──────────────────────────────────────────────────
    cached_result = await cache.get(f"content_ideas:{body.cluster_id}")
    if cached_result:
        return ContentIdeasResponse(**cached_result, cached=True)

    # ── Rate limit ──────────────────────────────────────────────────────────
    current_count = (await cache.get(rate_key)) or 0
    if current_count >= MAX_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached: {MAX_REQUESTS_PER_HOUR} requests per hour per IP."
        )

    # Increment rate limit counter (reset every hour)
    await cache.set(rate_key, current_count + 1, ttl=3600)

    # ── Fetch posts for context ─────────────────────────────────────────────
    all_trends = await cache.get("current_trends") or []
    trend = next((t for t in all_trends if t.get("cluster_id") == body.cluster_id), None)
    posts = trend.get("posts", []) if trend else []

    # ── Fetch LangSearch results ──────────────────────────────────────────
    lang_client = LangSearchClient()
    try:
        articles = await lang_client.fetch_search_results(body.trend_title)
    except Exception:
        articles = []
    finally:
        await lang_client.close()

    # ── Generate via Groq ───────────────────────────────────────────────────
    try:
        ideas = await groq_service.generate_content_ideas(
            trend_title=body.trend_title,
            posts=posts,
            why_trending=body.why_trending,
        )
        if not ideas:
            raise HTTPException(status_code=500, detail="Content generation failed — try again")

        social_context = await groq_service.generate_social_context(
            trend_title=body.trend_title,
            why_trending=body.why_trending,
            articles=articles,
        )

        result = {
            "cluster_id": body.cluster_id,
            "blog_post": ideas.get("blog_post", {}),
            "twitter_thread": ideas.get("twitter_thread", {}),
            "reddit_comment": ideas.get("reddit_comment", {}),
            "linkedin_post": ideas.get("linkedin_post", {}),
            "youtube_short": ideas.get("youtube_short", {}),
            "social_context": social_context,
        }

        # Cache result for 2h (same trend → same ideas)
        await cache.set(f"content_ideas:{body.cluster_id}", result, ttl=7200)
        return ContentIdeasResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

