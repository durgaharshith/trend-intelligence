import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json


class TestRedditClient:
    @pytest.mark.asyncio
    async def test_get_access_token(self):
        from app.services.reddit_client import RedditClient
        
        client = RedditClient()
        # Mock the HTTP client
        with patch.object(client, 'http_client') as mock_http:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "access_token": "test_token",
                "expires_in": 3600
            }
            mock_http.post = AsyncMock(return_value=mock_response)
            
            token = await client.get_access_token()
            assert token == "test_token"


class TestEmbeddingService:
    def test_encode_texts(self):
        from app.services.embedding_service import EmbeddingService
        import numpy as np
        
        service = EmbeddingService()
        texts = ["Hello world", "Python programming"]
        embeddings = service.encode_texts(texts)
        
        assert isinstance(embeddings, np.ndarray)
        assert embeddings.shape[0] == 2
        assert embeddings.shape[1] == 384  # MiniLM dimension
    
    def test_cluster_embeddings(self):
        from app.services.embedding_service import EmbeddingService
        import numpy as np
        
        service = EmbeddingService()
        embeddings = np.random.rand(10, 384)
        
        labels = service.cluster_embeddings(embeddings)
        assert len(labels) == 10


class TestCacheService:
    @pytest.mark.asyncio
    async def test_cache_operations(self):
        from app.services.cache import RedisCache
        
        cache = RedisCache()
        await cache.connect()
        
        # Test set and get
        await cache.set("test_key", {"data": "value"}, ttl=60)
        value = await cache.get("test_key")
        
        assert value == {"data": "value"}


class TestGitHubClient:
    @pytest.mark.asyncio
    async def test_fetch_trending_repos(self):
        from app.services.github_client import GitHubClient
        client = GitHubClient()
        with patch.object(client, 'http_client') as mock_http:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "items": [
                    {
                        "id": 12345,
                        "full_name": "owner/repo",
                        "description": "A cool repo",
                        "stargazers_count": 500,
                        "html_url": "https://github.com/owner/repo",
                        "language": "Python",
                        "created_at": "2026-05-20T12:00:00Z",
                        "forks_count": 42
                    }
                ]
            }
            mock_http.get = AsyncMock(return_value=mock_response)
            repos = await client.fetch_trending_repos()
            assert len(repos) == 1
            assert repos[0]["source"] == "github"
            assert repos[0]["subreddit"] == "Python"
            assert repos[0]["score"] == 500


class TestNewsAPIClient:
    @pytest.mark.asyncio
    async def test_fetch_top_headlines(self):
        from app.services.newsapi_client import NewsAPIClient
        # We need a configured settings key mock
        with patch("app.config.settings.NEWSAPI_KEY", "test_key"):
            client = NewsAPIClient()
            with patch.object(client, 'http_client') as mock_http:
                mock_response = MagicMock()
                mock_response.json.return_value = {
                    "articles": [
                        {
                            "source": {"name": "TechCrunch"},
                            "title": "Startup raises money",
                            "description": "Details about funding",
                            "url": "https://techcrunch.com/article",
                            "publishedAt": "2026-05-22T15:30:00Z"
                        }
                    ]
                }
                mock_http.get = AsyncMock(return_value=mock_response)
                articles = await client.fetch_top_headlines()
                assert len(articles) == 1
                assert articles[0]["source"] == "newsapi"
                assert articles[0]["subreddit"] == "TechCrunch"


class TestGoogleTrendsRSSClient:
    @pytest.mark.asyncio
    async def test_fetch_trending_searches(self):
        from app.services.google_trends_rss_client import GoogleTrendsRSSClient
        client = GoogleTrendsRSSClient()
        xml_content = b"""
        <rss version="2.0" xmlns:ht="https://trends.google.com/trending/rss">
          <channel>
            <item>
              <title>AI Trend</title>
              <ht:approx_traffic>100,000+</ht:approx_traffic>
              <description>Context info</description>
              <ht:news_item>
                <ht:news_item_title>News title</ht:news_item_title>
                <ht:news_item_url>https://news.com/ai</ht:news_item_url>
              </ht:news_item>
            </item>
          </channel>
        </rss>
        """
        with patch.object(client, 'http_client') as mock_http:
            mock_response = MagicMock()
            mock_response.content = xml_content
            mock_http.get = AsyncMock(return_value=mock_response)
            searches = await client.fetch_trending_searches()
            assert len(searches) == 1
            assert searches[0]["source"] == "google-trends"
            assert searches[0]["score"] == 100000
            assert "AI Trend" in searches[0]["title"]


class TestDevToClient:
    @pytest.mark.asyncio
    async def test_fetch_trending_articles(self):
        from app.services.devto_client import DevToClient
        with patch("app.config.settings.DEVTO_API", "test_devto_key"):
            client = DevToClient()
            with patch.object(client, 'http_client') as mock_http:
                mock_response = MagicMock()
                mock_response.json.return_value = [
                    {
                        "id": 99999,
                        "title": "A tutorial on Python",
                        "public_reactions_count": 85,
                        "url": "https://dev.to/user/python-tutorial",
                        "published_timestamp": "2026-05-23T12:00:00Z",
                        "comments_count": 12,
                        "description": "Short description",
                        "tag_list": ["python", "learning"],
                    }
                ]
                mock_http.get = AsyncMock(return_value=mock_response)
                articles = await client.fetch_trending_articles()
                assert len(articles) == 1
                assert articles[0]["source"] == "devto"
                assert articles[0]["id"] == "devto_99999"
                assert articles[0]["score"] == 85
                assert articles[0]["subreddit"] == "python"
                assert articles[0]["num_comments"] == 12
                assert articles[0]["selftext"] == "Short description"
