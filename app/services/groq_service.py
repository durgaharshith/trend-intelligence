import json
import logging
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)

GROQ_MODEL = "llama-3.3-70b-versatile"


class GroqService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    def _chat_completion_with_fallback(self, prompt: str, max_tokens: int, api_key: str = None) -> str:
        """Call Groq completions API with automatic model fallback to handle rate limits (429)."""
        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]
        errors = []
        client = self.client
        if api_key:
            try:
                client = Groq(api_key=api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client with custom key: {e}")

        for model in models:
            try:
                completion = client.chat.completions.create(
                    model=model,
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}],
                )
                return completion.choices[0].message.content
            except Exception as e:
                logger.warning(f"Groq chat completion failed for model {model}: {e}")
                errors.append(f"{model}: {e}")
        raise Exception(f"All Groq models failed. Errors: {', '.join(errors)}")

    async def decide_historical_archiving(self, trend_title: str, summary: str, score: float, post_count: int, api_key: str = None) -> bool:
        """
        Agentic decision: Determine if this trend should be archived to the Postgres historical DB.
        Filters out noise and transient topics, preserving only trends with high developer impact or technical interest.
        """
        prompt = f"""You are a data archivist for a developer intelligence platform.
Your task is to decide if a trend is significant enough to be archived in the long-term historical PostgreSQL database.
We filter out noise (minor bugs, spam, random queries, transient chatter) to save storage and preserve database quality.

Trend Title: {trend_title}
Summary: {summary}
Trend Score: {score}
Post Count: {post_count}

Analyze the trend and decide if it is of long-term technical significance, developer interest, or industry impact.
Return ONLY a JSON object:
{{
  "should_archive": true or false,
  "reason": "a brief 1-sentence reason for your decision"
}}
No markdown, just the JSON."""
        try:
            raw = self._chat_completion_with_fallback(prompt, max_tokens=150, api_key=api_key)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw.strip())
            decision = data.get("should_archive", False)
            logger.info(f"Agentic archiving decision for '{trend_title}': {decision} (Reason: {data.get('reason')})")
            return decision
        except Exception as e:
            logger.error(f"Agentic archiving decision failed: {e}. Defaulting to True to avoid losing data.")
            return True

    async def summarize_trend(self, posts: list, max_tokens: int = 500, api_key: str = None) -> str:
        if not posts:
            return "No data available"

        posts_text = "\n".join([
            f"- {p.get('title', 'N/A')} (Score: {p.get('score', 0)}, Comments: {p.get('num_comments', 0)})"
            for p in posts[:10]
        ])

        prompt = f"""You are a trend analyst. Analyze these trending posts and provide a concise, insightful summary.

Posts:
{posts_text}

Provide a 2-3 sentence summary covering:
1. What the main topic is about
2. Why it is trending right now
3. Who this matters to

Be specific and insightful, not generic."""

        try:
            content = self._chat_completion_with_fallback(prompt, max_tokens=max_tokens, api_key=api_key)
            return content
        except Exception as e:
            logger.error(f"Groq summarize_trend failed: {e}")
            return "Unable to generate summary at this time."

    async def extract_insights(self, summary: str, posts: list, api_key: str = None) -> dict:
        prompt = f"""Based on this trend summary and posts, extract key insights.

Summary: {summary}
Top post titles: {[p.get('title', '') for p in posts[:5]]}

Return ONLY a valid JSON object:
{{
  "main_topic": "short topic label",
  "impact_level": "low" or "medium" or "high",
  "predicted_duration": "hours" or "days" or "weeks",
  "related_keywords": ["keyword1", "keyword2", "keyword3"],
  "why_trending": "one sentence root cause"
}}

No markdown — just the JSON."""

        try:
            content = self._chat_completion_with_fallback(prompt, max_tokens=300, api_key=api_key)
            raw = content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Groq insights JSON parse failed: {e}")
            return {
                "main_topic": "Unknown",
                "impact_level": "medium",
                "predicted_duration": "days",
                "related_keywords": [],
                "why_trending": "Unable to extract insights",
            }
        except Exception as e:
            logger.error(f"Groq extract_insights failed: {e}")
            return {}

    async def explain_why_trending(self, posts: list, summary: str, api_key: str = None) -> dict:
        """
        2.1 FEATURE — Deep 'Why Is This Trending?' analysis.
        Provides root cause, audience, momentum assessment, and action angle.
        This is the #1 market gap vs all competitors at the free tier.
        """
        posts_text = "\n".join([
            f"- {p.get('title', '')} (Score: {p.get('score', 0)}, Comments: {p.get('num_comments', 0)}, "
            f"Source: {p.get('source', 'reddit')})"
            for p in posts[:8]
        ])

        prompt = f"""You are a trend intelligence analyst. Explain PRECISELY why this is trending right now.

Summary: {summary}

Top posts:
{posts_text}

Return ONLY a JSON object with these fields:
{{
  "trigger_event": "The specific thing that caused this spike — be specific (name the news/launch/controversy/viral post)",
  "target_audience": "Exactly WHO cares about this and the precise reason it matters to them",
  "trend_momentum": "flash" or "building" or "peaked" or "fading",
  "sentiment_driver": "What emotion is driving engagement: excitement / concern / debate / humor / outrage / curiosity",
  "action_angle": "One concrete thing a marketer, creator, or investor could do with this information RIGHT NOW",
  "confidence": "low" or "medium" or "high"
}}

Be sharp and specific — avoid generic statements. No markdown, just the JSON."""

        try:
            content = self._chat_completion_with_fallback(prompt, max_tokens=400, api_key=api_key)
            raw = content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            parsed = json.loads(raw.strip())
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"Groq explain_why_trending JSON parse failed: {e}")
            return {
                "trigger_event": "Analysis unavailable",
                "target_audience": "",
                "trend_momentum": "building",
                "sentiment_driver": "curiosity",
                "action_angle": "",
                "confidence": "low",
            }
        except Exception as e:
            logger.error(f"Groq explain_why_trending failed: {e}")
            return {}

    async def generate_content_ideas(
        self,
        trend_title: str,
        posts: list,
        why_trending: str = "",
        max_tokens: int = 600,
        api_key: str = None,
    ) -> dict:
        """
        Tier 3.2 — Content Idea Generator.

        UNIQUE FEATURE: No competitor offers this at the free tier.
        Given a trending topic, generates 5 ready-to-use content ideas
        across different platforms — turning insight into execution.
        """
        posts_sample = "\n".join([
            f"- {p.get('title', '')} (Score: {p.get('score', 0)})"
            for p in posts[:6]
        ])

        prompt = f"""You are a content strategist specializing in trend-driven content.

Trending topic: "{trend_title}"
Why it's trending: {why_trending or "Unknown"}

Top posts driving this trend:
{posts_sample}

Create 5 platform-specific content ideas. Return ONLY a JSON object:
{{
  "blog_post": {{
    "title": "SEO-optimized blog post title (include the keyword)",
    "hook": "Opening sentence that grabs readers",
    "outline": ["Section 1", "Section 2", "Section 3"]
  }},
  "twitter_thread": {{
    "hook": "Tweet #1 — the hook that makes people want to read on",
    "points": ["Tweet 2", "Tweet 3", "Tweet 4 (conclusion + CTA)"]
  }},
  "reddit_comment": {{
    "subreddit": "best subreddit to post this in",
    "angle": "Unique perspective or value-add to contribute to this discussion"
  }},
  "linkedin_post": {{
    "framing": "Professional angle that makes this relevant for business/career",
    "cta": "Call-to-action that drives engagement"
  }},
  "youtube_short": {{
    "title": "YouTube Short title (<60 chars)",
    "hook": "Opening 3 seconds — what you say to hook the viewer",
    "key_point": "The single insight that makes this worth watching"
  }}
}}

Be specific and actionable — not generic. No markdown, just the JSON."""

        try:
            content = self._chat_completion_with_fallback(prompt, max_tokens=max_tokens, api_key=api_key)
            raw = content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Groq generate_content_ideas JSON parse failed: {e}")
            return {}
        except Exception as e:
            logger.error(f"Groq generate_content_ideas failed: {e}")
            return {}

    async def generate_social_context(
        self,
        trend_title: str,
        why_trending: str,
        articles: list,
        api_key: str = None
    ) -> str:
        """
        Generate at most 3 paragraphs of social media context with references/sources.
        """
        articles_text = ""
        if articles:
            articles_text = "\n".join([
                f"Source Title: {art.get('title', 'N/A')}\nSource URL: {art.get('url', 'N/A')}\nSnippet: {art.get('snippet', 'N/A')}\n"
                for art in articles
            ])
        else:
            articles_text = "No real-time web search articles available."

        prompt = f"""You are a content strategist. Using the following trending topic, description, and these real-time web search results (news articles with sources), write a highly engaging social media post context.
    
Trending Topic: "{trend_title}"
Why Trending: {why_trending or "N/A"}

Real-time Web Search Results:
{articles_text}

Requirements:
1. Write at most 3 paragraphs.
2. Provide a clear context summarizing this trend.
3. Integrate the web search sources organically, including their clickable markdown URLs (e.g. [React 19 Release Notes](https://react.dev/blog/react-19)).
4. Make it engaging, professional, and ready for a social media post (LinkedIn/Twitter style).
5. Output ONLY the post context. Do not include introductory text like 'Here is your context:' or markdown code blocks."""

        try:
            content = self._chat_completion_with_fallback(prompt, max_tokens=600, api_key=api_key)
            return content.strip()
        except Exception as e:
            logger.error(f"Groq generate_social_context failed: {e}")
            return "Unable to generate social media context at this time."

