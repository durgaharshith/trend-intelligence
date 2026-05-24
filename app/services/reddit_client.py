import httpx
import logging
from app.config import settings
from datetime import datetime, timedelta
import base64

logger = logging.getLogger(__name__)


class RedditClient:
    def __init__(self):
        self.client_id = settings.REDDIT_CLIENT_ID
        self.client_secret = settings.REDDIT_CLIENT_SECRET
        self.user_agent = settings.REDDIT_USER_AGENT
        self.token = None
        self.token_expiry = None
        self.http_client = httpx.AsyncClient()
    
    async def get_access_token(self):
        if self.token and self.token_expiry and datetime.utcnow() < self.token_expiry:
            return self.token
        
        auth_string = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {auth_string}",
            "User-Agent": self.user_agent,
        }
        
        data = {
            "grant_type": "client_credentials",
        }
        
        try:
            response = await self.http_client.post(
                "https://www.reddit.com/api/v1/access_token",
                headers=headers,
                data=data,
            )
            response.raise_for_status()
            result = response.json()
            self.token = result["access_token"]
            self.token_expiry = datetime.utcnow() + timedelta(seconds=result["expires_in"] - 60)
            logger.info(f"Reddit token refreshed")
            return self.token
        except httpx.HTTPError as e:
            logger.error(f"Failed to get Reddit access token: {e}")
            raise
    
    async def fetch_posts(self, subreddit: str = "all", limit: int = 100):
        token = await self.get_access_token()
        headers = {
            "Authorization": f"bearer {token}",
            "User-Agent": self.user_agent,
        }
        
        endpoints = [
            f"https://oauth.reddit.com/r/{subreddit}/new",
            f"https://oauth.reddit.com/r/{subreddit}/hot",
        ]
        
        all_posts = []
        
        for endpoint in endpoints:
            try:
                response = await self.http_client.get(
                    endpoint,
                    headers=headers,
                    params={"limit": limit},
                )
                response.raise_for_status()
                data = response.json()
                
                posts = []
                for item in data.get("data", {}).get("children", []):
                    post = item.get("data", {})
                    posts.append({
                        "id": post.get("id"),
                        "title": post.get("title"),
                        "score": post.get("score"),
                        "url": post.get("url"),
                        "subreddit": post.get("subreddit"),
                        "created_utc": post.get("created_utc"),
                        "num_comments": post.get("num_comments"),
                        "selftext": post.get("selftext", "")[:500],
                    })
                
                all_posts.extend(posts)
                logger.info(f"Fetched {len(posts)} posts from {endpoint}")
            except httpx.HTTPError as e:
                logger.error(f"Failed to fetch from {endpoint}: {e}")
        
        return all_posts
    
    async def close(self):
        await self.http_client.aclose()
