from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime,
    Float, Text, Boolean, ForeignKey
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.config import settings

# ── Sync engine (used only for init_db table creation) ──────────────────────
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Async engine (used for all runtime queries — Tier 4.1) ──────────────────
_async_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
if "6543" in _async_url and "prepared_statement_cache_size" not in _async_url:
    separator = "&" if "?" in _async_url else "?"
    _async_url += f"{separator}prepared_statement_cache_size=0"

async_engine = create_async_engine(_async_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()


# ── Models ───────────────────────────────────────────────────────────────────

class Trend(Base):
    __tablename__ = "trends"
    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String, unique=True, index=True)
    cluster_id = Column(String, index=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TrendSnapshot(Base):
    __tablename__ = "trend_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    trend_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    post_count = Column(Integer)
    score = Column(Float)
    engagement_rate = Column(Float)


class AISummary(Base):
    __tablename__ = "ai_summaries"
    id = Column(Integer, primary_key=True, index=True)
    trend_id = Column(Integer, index=True)
    snapshot_id = Column(Integer, index=True)
    summary_text = Column(Text)
    key_insights = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    groq_api_key = Column(String, nullable=True)
    active_sources = Column(String, default="hackernews,github,google-trends,newsapi,devto")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user", nullable=False)


class Watchlist(Base):
    __tablename__ = "watchlists"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    cluster_id = Column(String, index=True, nullable=False)
    cluster_title = Column(String, nullable=False)
    cluster_keyword = Column(String, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)


# ── Session helpers ───────────────────────────────────────────────────────────

from sqlalchemy import text

async def init_db():
    """Create tables (sync, runs once at startup)."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS groq_api_key VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS active_sources VARCHAR;"))
            conn.execute(text("UPDATE users SET active_sources = 'hackernews,github,google-trends,newsapi,devto' WHERE active_sources IS NULL;"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';"))
            conn.execute(text("UPDATE users SET role = 'user' WHERE role IS NULL;"))
            conn.execute(text("UPDATE users SET is_active = True WHERE is_active IS NULL;"))
            conn.commit()

            # Seed default admin user
            from app.services.auth_service import hash_password
            import datetime as dt_module
            now = dt_module.datetime.utcnow()
            admin_username = "firstimmortal"
            admin_email = "durgaharshithpigili@gmail.com"
            admin_password_hash = hash_password("24180416")

            # Check if user exists by email or username
            res = conn.execute(text("SELECT id FROM users WHERE email = :email;"), {"email": admin_email}).fetchone()
            if not res:
                res = conn.execute(text("SELECT id FROM users WHERE username = :username;"), {"username": admin_username}).fetchone()

            if res:
                conn.execute(
                    text("UPDATE users SET username = :username, email = :email, hashed_password = :password, role = 'admin', is_active = True, created_at = COALESCE(created_at, :now) WHERE id = :id;"),
                    {"username": admin_username, "email": admin_email, "password": admin_password_hash, "now": now, "id": res[0]}
                )
            else:
                conn.execute(
                    text("INSERT INTO users (username, email, hashed_password, role, active_sources, is_active, created_at) VALUES (:username, :email, :password, 'admin', 'hackernews,github,google-trends,newsapi,devto', True, :now);"),
                    {"username": admin_username, "email": admin_email, "password": admin_password_hash, "now": now}
                )
            conn.commit()
        except Exception:
            pass


async def get_async_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        yield session


def get_db():
    """Legacy sync session — kept for migration compatibility."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
