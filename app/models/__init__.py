from pydantic import BaseModel, Field
from typing import List, Optional


class PostModel(BaseModel):
    id: Optional[str] = None
    title: str
    score: int = 0
    url: Optional[str] = None
    subreddit: Optional[str] = None
    created_utc: Optional[float] = None
    num_comments: int = 0
    selftext: Optional[str] = ""
    source: str = "reddit"          # "reddit" | "hackernews"
    hn_author: Optional[str] = None


class TrendResponse(BaseModel):
    cluster_id: str
    title: str
    post_count: int
    total_score: int
    avg_score: float
    velocity: float
    growth_rate: float
    sentiment_score: float
    subreddit_diversity: int
    last_updated: str
    trend_type: str
    trend_score: float
    impact_score: float = 0.0
    is_cross_platform: bool = False
    sources: List[str] = ["reddit"]
    posts: List[PostModel] = []


class TrendsListResponse(BaseModel):
    trends: List[TrendResponse]
    total: int
    cached: bool = True


class SummaryInsights(BaseModel):
    main_topic: str = ""
    impact_level: str = "medium"
    predicted_duration: str = "days"
    related_keywords: List[str] = []
    why_trending: str = ""


class TrendSummaryResponse(BaseModel):
    summary: str
    insights: Optional[SummaryInsights] = None
    generated_at: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    redis_connected: bool = False
    version: str = "2.0.0"
