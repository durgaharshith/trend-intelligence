import pytest
import os
import asyncio
from dotenv import load_dotenv

# Load real credentials from local .env
load_dotenv()

@pytest.mark.asyncio
async def test_live_database_connection():
    """Test live connection to Supabase PostgreSQL using SQLAlchemy async engine."""
    from sqlalchemy.ext.asyncio import create_async_engine
    import sqlalchemy as sa
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url or "project-ref" in db_url:
        pytest.skip("DATABASE_URL is not configured.")

    _async_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    test_engine = create_async_engine(_async_url)

    try:
        async with test_engine.connect() as conn:
            result = await conn.execute(sa.text("SELECT 1"))
            val = result.scalar()
            assert val == 1, "Database query returned incorrect value."
            print("\nSUCCESS: Supabase DB: Live connection successful!")
    except Exception as e:
        pytest.fail(f"Supabase DB connection failed: {e}")
    finally:
        await test_engine.dispose()


@pytest.mark.asyncio
async def test_live_redis_connection():
    """Test live connection and read/write operations on Upstash Redis."""
    from app.services.cache import cache
    
    redis_url = os.getenv("REDIS_URL")
    if not redis_url or "your-db" in redis_url:
        pytest.skip("REDIS_URL is not configured.")

    try:
        await cache.connect()
        await cache.set("live_test_key", "connection_ok", ttl=10)
        val = await cache.get("live_test_key")
        assert val == "connection_ok", "Redis read/write mismatch."
        print("SUCCESS: Upstash Redis: Live ping & write successful!")
    except Exception as e:
        pytest.fail(f"Redis connection failed: {e}")
    finally:
        await cache.disconnect()


@pytest.mark.asyncio
async def test_live_groq_api():
    """Test live call to Groq API using configured GROQ_API_KEY."""
    from app.services.groq_service import GroqService
    
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key or "gsk_" not in groq_key:
        pytest.skip("GROQ_API_KEY is not configured.")

    try:
        service = GroqService()
        # Test basic explanation generation (uses mock prompt but triggers live call)
        explanation = await service.explain_why_trending(
            posts=[{"title": "Test post details", "selftext": "Context info", "score": 100}],
            summary="This is a test summary for a trending topic."
        )
        assert explanation is not None
        assert "target_audience" in explanation or "action_angle" in explanation
        print("SUCCESS: Groq API: Successfully authenticated and generated content!")
    except Exception as e:
        pytest.fail(f"Groq API call failed: {e}")


@pytest.mark.asyncio
async def test_live_github_api():
    """Test live call to GitHub API using GITHUB_TOKEN if configured."""
    from app.services.github_client import GitHubClient
    
    client = GitHubClient()
    try:
        repos = await client.fetch_trending_repos(limit=2)
        assert isinstance(repos, list)
        # Even without token, public search API should work
        print("SUCCESS: GitHub API: Successfully fetched trending repositories!")
    except Exception as e:
        pytest.fail(f"GitHub API connection failed: {e}")
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_live_newsapi():
    """Test live call to NewsAPI using NEWSAPI_KEY."""
    from app.services.newsapi_client import NewsAPIClient
    
    news_key = os.getenv("NEWSAPI_KEY")
    if not news_key or "your_" in news_key:
        pytest.skip("NEWSAPI_KEY is not configured.")

    client = NewsAPIClient()
    try:
        articles = await client.fetch_top_headlines(limit=2)
        assert isinstance(articles, list)
        print("SUCCESS: NewsAPI: Successfully authenticated and fetched headlines!")
    except Exception as e:
        pytest.fail(f"NewsAPI connection failed: {e}")
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_live_resend_api():
    """Test Resend API validation (sends no email, just authenticates)."""
    import httpx
    
    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key or "re_" not in resend_key:
        pytest.skip("RESEND_API_KEY is not configured.")

    # Validate key by making a dummy call to the email sending endpoint.
    # An invalid API key will return 401 Unauthorized.
    # A valid API key with restricted "Sending access" will bypass authentication and return 422/400 (Validation Error).
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json"
            }
            # Post empty body to trigger validation
            response = await client.post("https://api.resend.com/emails", headers=headers, json={})
            
            # If key is valid, it gets past auth and fails on payload validation (422 or 400)
            # If key is invalid, it fails on auth (401)
            assert response.status_code != 401, "Resend API key is invalid (401 Unauthorized)."
            assert response.status_code in [400, 422], f"Unexpected Resend API response: {response.status_code}"
            print("SUCCESS: Resend API: Key validation successful!")
    except Exception as e:
        pytest.fail(f"Resend API authentication failed: {e}")
