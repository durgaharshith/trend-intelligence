from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from dotenv import load_dotenv
load_dotenv()

from app.config import settings
from app.scheduler import start_scheduler
from app.routes import health, trends
from app.routes import websocket as ws_routes
from app.routes import history as history_routes
from app.routes import alerts as alert_routes
from app.routes import config as config_routes
from app.routes import forecast as forecast_routes
from app.routes import content as content_routes
from app.routes import auth as auth_routes
from app.routes import watchlist as watchlist_routes
from app.routes import google_trends as google_trends_routes
from app.routes import feedback as feedback_routes
from app.routes import internal as internal_routes
from app.routes import export as export_routes
from app.routes import status as status_routes
from app.routes import search as search_routes
from app.routes import admin as admin_routes
from app.database import init_db
from app.services.cache import cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    logger.info("Starting Trend Intelligence API v4.0…")
    await init_db()
    await cache.connect()
    
    if settings.ENVIRONMENT != "testing":
        scheduler = start_scheduler()
        # Trigger an initial poll asynchronously on startup to populate cache/DB immediately
        from app.scheduler import poll_all_sources
        asyncio.create_task(poll_all_sources())
        logger.info("Startup complete.")
        yield
        scheduler.shutdown(wait=False)
    else:
        logger.info("Startup complete (Testing Mode — scheduler bypassed).")
        yield
        
    await cache.disconnect()


app = FastAPI(
    title="Trend Intelligence API",
    description="Real-time trend detection — HackerNews, GitHub, Google Trends, NewsAPI.",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        [settings.FRONTEND_URL] if settings.ENVIRONMENT == "production" else ["*"]
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── All routes ────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(trends.router)
app.include_router(ws_routes.router)
app.include_router(history_routes.router)
app.include_router(alert_routes.router)
app.include_router(config_routes.router)
app.include_router(forecast_routes.router)
app.include_router(content_routes.router)
app.include_router(auth_routes.router)
app.include_router(watchlist_routes.router)
app.include_router(google_trends_routes.router)
app.include_router(feedback_routes.router)
app.include_router(internal_routes.router)
app.include_router(export_routes.router)
app.include_router(status_routes.router)
app.include_router(search_routes.router)
app.include_router(admin_routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
