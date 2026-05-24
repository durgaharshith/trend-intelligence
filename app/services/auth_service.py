"""
Auth Service — Tier 3.4

Lightweight JWT authentication using python-jose + passlib/bcrypt.
Users stored in PostgreSQL (users table).

Features:
  - Email + password registration / login
  - 7-day JWT access tokens
  - Dependency injection helper: get_current_user()
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        username = payload.get("username")
        if not user_id or not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"user_id": int(user_id), "username": username}
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token invalid or expired: {e}")


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency — extracts and validates JWT from HTTP-only access_token cookie.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated (missing access_token)")
    return decode_token(token)


async def get_optional_user(request: Request) -> Optional[dict]:
    """Like get_current_user but returns None instead of raising for unauthenticated requests."""
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        return decode_token(token)
    except HTTPException:
        return None


async def get_current_admin(request: Request) -> "User":
    """
    Dependency to verify the current user exists and has the admin role.
    """
    current_user = await get_current_user(request)
    from app.database import AsyncSessionLocal, User
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == current_user["user_id"]))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin privileges required")
        return user

