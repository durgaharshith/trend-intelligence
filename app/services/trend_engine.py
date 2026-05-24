"""
Trend Scoring Engine — upgraded with VADER sentiment (Tier 3.3)

VADER (Valence Aware Dictionary and sEntiment Reasoner):
  - Specifically designed for social media text (Reddit/Twitter)
  - ~2MB, pure Python, no C++ compilation
  - Returns compound score: -1.0 (very negative) to +1.0 (very positive)
  - Falls back gracefully to keyword NLP if not installed

Other fixes:
  - Cluster title uses keyword frequency (from Tier 1.2)
  - Sentiment blends VADER (70%) + upvote ratio (30%)
"""

import logging
import re
from collections import Counter
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

# ── VADER (Tier 3.3) ─────────────────────────────────────────────────────────
_VADER_AVAILABLE = False
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _vader = SentimentIntensityAnalyzer()
    _VADER_AVAILABLE = True
    logger.info("VADER sentiment analyser loaded ✓")
except ImportError:
    logger.info("vaderSentiment not installed — using keyword NLP fallback")

# ── Fallback keyword lists ───────────────────────────────────────────────────
_POSITIVE_WORDS = {
    "love", "great", "awesome", "amazing", "best", "good", "excellent",
    "helpful", "success", "win", "breakthrough", "launch", "new", "better",
    "happy", "positive", "excited", "innovative", "revolutionary", "solved",
}
_NEGATIVE_WORDS = {
    "bad", "worst", "hate", "terrible", "broken", "fail", "failure", "bug",
    "issue", "problem", "crash", "danger", "warning", "scam", "fraud",
    "disappointed", "sucks", "awful", "disaster", "unsafe", "banned", "dead",
}

_STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "to", "of", "in", "on", "at", "by",
    "for", "with", "about", "from", "and", "or", "but", "not", "this",
    "that", "it", "its", "i", "my", "me", "we", "our", "you", "your",
    "he", "she", "they", "their", "what", "how", "why", "when", "where",
    "just", "more", "new", "get", "got", "so", "if", "as", "up", "out",
    "very", "all", "any", "now", "than", "no", "who", "into", "over",
}


@dataclass
class TrendMetrics:
    cluster_id: str
    title: str
    post_count: int
    total_score: int
    avg_score: float
    velocity: float
    growth_rate: float
    sentiment_score: float
    impact_score: float
    subreddit_diversity: int
    last_updated: datetime
    trend_type: str
    trend_score: float


class TrendScoringEngine:
    """
    Proprietary trend detection algorithm.

    Scoring weights:
      Growth velocity   30%
      Engagement growth 20%
      Engagement rate   15%
      Cross-community   15%
      GitHub Impact     10%
      Sentiment strength 10%
    """

    def __init__(self):
        self.min_posts_for_trend = 1
        self.min_engagement_for_controversial = 10

    def score_trend(
        self,
        cluster_id: str,
        posts: List[Dict[str, Any]],
        previous_metrics: Optional[Dict[str, Any]] = None,
        current_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Optional[TrendMetrics]:
        post_count = len(posts)
        if post_count < self.min_posts_for_trend:
            return None

        total_score = sum(p.get("score", 0) for p in posts)
        avg_score = total_score / post_count
        total_comments = sum(p.get("num_comments", 0) for p in posts)
        engagement_rate = total_comments / post_count

        title = self._extract_cluster_title(posts)

        subreddits = {p.get("subreddit", "") for p in posts if p.get("subreddit")}
        subreddit_diversity = len(subreddits)

        velocity = 0.0
        growth_rate = 0.0
        if previous_metrics:
            prev_count = previous_metrics.get("post_count", 0)
            try:
                prev_updated = datetime.fromisoformat(previous_metrics["last_updated"])
            except (KeyError, ValueError):
                prev_updated = datetime.utcnow()

            time_diff = (datetime.utcnow() - prev_updated).total_seconds() / 60
            if time_diff > 0:
                velocity = (post_count - prev_count) / time_diff
                if prev_count > 0:
                    growth_rate = ((post_count - prev_count) / prev_count) * 100

        # Source-specific metrics
        text_posts = [p for p in posts if p.get("source") in ("hackernews", "newsapi", "google-trends", "devto")]
        sentiment_score = self._analyze_sentiment(text_posts) if text_posts else 0.0
        
        github_posts = [p for p in posts if p.get("source") == "github"]
        impact_score = self._calculate_impact_score(github_posts) if github_posts else 0.0

        sources = {p.get("source") for p in posts if p.get("source")}
        source_diversity = len(sources)
        is_new = previous_metrics is None

        trend_type = self._classify_trend(
            velocity=velocity,
            growth_rate=growth_rate,
            post_count=post_count,
            engagement_rate=engagement_rate,
            source_diversity=source_diversity,
            is_new=is_new,
        )

        trend_score = self._calculate_composite_score(
            velocity=velocity,
            growth_rate=growth_rate,
            engagement_rate=engagement_rate,
            subreddit_diversity=subreddit_diversity,
            sentiment_strength=abs(sentiment_score),
            impact_score=impact_score,
            trend_type=trend_type,
        )

        return TrendMetrics(
            cluster_id=cluster_id,
            title=title,
            post_count=post_count,
            total_score=int(total_score),
            avg_score=float(avg_score),
            velocity=float(velocity),
            growth_rate=float(growth_rate),
            sentiment_score=float(sentiment_score),
            impact_score=float(impact_score),
            subreddit_diversity=subreddit_diversity,
            last_updated=datetime.utcnow(),
            trend_type=trend_type,
            trend_score=float(trend_score),
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    def _extract_cluster_title(self, posts: List[Dict[str, Any]]) -> str:
        """Top-3 keyword frequency label across all post titles."""
        all_words: list[str] = []
        for post in posts:
            title = post.get("title", "")
            words = re.findall(r"\b[a-z]{3,}\b", title.lower())
            all_words.extend(w for w in words if w not in _STOP_WORDS)

        if not all_words:
            return posts[0].get("title", "Unknown Trend") if posts else "Unknown Trend"

        top_keywords = [word for word, _ in Counter(all_words).most_common(3)]
        if top_keywords:
            return " · ".join(k.capitalize() for k in top_keywords)
        return posts[0].get("title", "Unknown Trend")

    def _analyze_sentiment(self, posts: List[Dict[str, Any]]) -> float:
        """
        Tier 3.3: VADER sentiment (if available) blended with upvote ratio.
        Returns -1.0 to +1.0.
        """
        if not posts:
            return 0.0

        # Signal 1: upvote ratio
        scores = [p.get("score", 0) for p in posts]
        positive_votes = sum(1 for s in scores if s > 0)
        negative_votes = sum(1 for s in scores if s < 0)
        ratio_sentiment = (positive_votes - negative_votes) / len(scores)

        if _VADER_AVAILABLE:
            # VADER on post title + selftext (first 300 chars)
            vader_scores = []
            for post in posts:
                text = post.get("title", "") + " " + post.get("selftext", "")[:300]
                vs = _vader.polarity_scores(text)
                vader_scores.append(vs["compound"])

            vader_sentiment = sum(vader_scores) / len(vader_scores)
            # Blend: 70% VADER, 30% upvote ratio
            return max(-1.0, min(1.0, vader_sentiment * 0.7 + ratio_sentiment * 0.3))

        else:
            # Fallback: keyword NLP + upvote ratio (from Tier 1)
            keyword_signals = []
            for post in posts:
                text = (post.get("title", "") + " " + post.get("selftext", "")).lower()
                pos_hits = sum(1 for w in _POSITIVE_WORDS if w in text)
                neg_hits = sum(1 for w in _NEGATIVE_WORDS if w in text)
                total_hits = pos_hits + neg_hits
                if total_hits > 0:
                    keyword_signals.append((pos_hits - neg_hits) / total_hits)

            keyword_sentiment = (
                sum(keyword_signals) / len(keyword_signals) if keyword_signals else 0.0
            )
            return max(-1.0, min(1.0, ratio_sentiment * 0.6 + keyword_sentiment * 0.4))

    def _classify_trend(
        self,
        velocity: float,
        growth_rate: float,
        post_count: int,
        engagement_rate: float,
        source_diversity: int,
        is_new: bool = False,
    ) -> str:
        # Cross-Community: Appears in multiple different platforms (e.g. HN and GitHub)
        if source_diversity > 1:
            return "cross_community"
        
        # Rising: Strong growth or high velocity
        # Tuned for 60s polling across 4 sources — growth > 10% or velocity > 0.2 is significant
        if (growth_rate > 10 and velocity > 0.2) or (is_new and post_count >= 4):
            return "rising"
        
        # Emerging: New trend or moderate growth
        # Moderate growth between 3% and 10%, or brand new with 2-3 posts
        if (3 < growth_rate <= 10) or (is_new and 2 <= post_count < 4):
            return "emerging"
            
        # Controversial: High engagement (comments/average score) relative to post count
        if engagement_rate > self.min_engagement_for_controversial and post_count >= 2:
            return "controversial"
            
        # Declining: Negative growth
        if growth_rate < -3:
            return "declining"
            
        # Otherwise: Stable
        return "stable"

    def _calculate_impact_score(self, github_posts: List[Dict[str, Any]]) -> float:
        """GitHub-specific: normalize stars/forks into 0-100 impact score."""
        if not github_posts:
            return 0.0
        total_stars = sum(p.get("score", 0) for p in github_posts)
        # GitHub forks are mapped to num_comments
        total_forks = sum(p.get("num_comments", 0) for p in github_posts)
        
        # Log-scale normalization
        star_impact = min(np.log1p(total_stars) / np.log1p(10000) * 100, 100.0)
        fork_impact = min(np.log1p(total_forks) / np.log1p(1000) * 100, 100.0)
        
        return float(star_impact * 0.7 + fork_impact * 0.3)

    def _calculate_composite_score(
        self,
        velocity: float,
        growth_rate: float,
        engagement_rate: float,
        subreddit_diversity: int,
        sentiment_strength: float,
        impact_score: float,
        trend_type: str,
    ) -> float:
        velocity_score   = min(velocity * 10, 100)
        growth_score     = min(max(growth_rate, 0) / 0.5, 100)
        engagement_score = min(engagement_rate * 10, 100)
        diversity_score  = min(subreddit_diversity * 20, 100)
        sentiment_score  = min(sentiment_strength * 100, 100)

        composite = (
            velocity_score   * 0.30
            + growth_score   * 0.20
            + engagement_score * 0.15
            + diversity_score  * 0.15
            + impact_score     * 0.10
            + sentiment_score  * 0.10
        )

        if trend_type == "controversial":
            composite = min(composite + 5, 100)
        if trend_type == "emerging":
            composite = min(composite + 3, 100)

        return float(composite)

    def rank_trends(self, trends: List[TrendMetrics]) -> List[TrendMetrics]:
        return sorted(trends, key=lambda t: t.trend_score, reverse=True)

    def filter_active_trends(
        self,
        trends: List[TrendMetrics],
        min_score: float = 20.0,
        max_trends: int = 50,
    ) -> List[TrendMetrics]:
        return [t for t in trends if t.trend_score >= min_score][:max_trends]
