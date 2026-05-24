import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Reddit API — DEPRECATED: No longer used as a data source
    REDDIT_CLIENT_ID: str = ""
    REDDIT_CLIENT_SECRET: str = ""
    REDDIT_USER_AGENT: str = ""

    # Developer adoption / news (Tier 4.5 replacements)
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    NEWSAPI_KEY: str = os.getenv("NEWSAPI_KEY", "")
    DEVTO_API: str = os.getenv("DEVTO_API", "")

    # Groq API
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Resend (email alerts)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

    # LangSearch Web Search API
    LANGSEARCH_API_KEY: str = os.getenv("LANGSEARCH_API_KEY", "")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@trendintelligence.app")

    # JWT auth (Tier 3.4) — change this in production!
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production-use-a-long-random-string")

    # QStash / internal job protection (Tier 4.5)
    # Set this in both Render env vars AND as a QStash custom header
    INTERNAL_SECRET: str = os.getenv("INTERNAL_SECRET", "")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_TOKEN: str = os.getenv("REDIS_TOKEN", "")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost/trends")

    # URLs
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    POLLING_INTERVAL_SECONDS: int = int(os.getenv("POLLING_INTERVAL_SECONDS", "60"))
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Auto-convert Upstash REST HTTPS URLs into TCP rediss:// standard protocol for redis-py
if settings.REDIS_URL.startswith(("http://", "https://")) and settings.REDIS_TOKEN:
    host = settings.REDIS_URL.replace("https://", "").replace("http://", "").split("/")[0]
    settings.REDIS_URL = f"rediss://default:{settings.REDIS_TOKEN}@{host}:6379"

