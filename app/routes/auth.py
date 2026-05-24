"""Auth API — Tier 3.4 (async DB — Tier 4.1)"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_async_db, User
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user
)
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_async_db)):
    username_clean = body.username.strip().lower()
    email_clean = body.email.strip().lower()
    
    if len(username_clean) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    if "@" not in email_clean:
        raise HTTPException(400, "Invalid email")
    if not email_clean.endswith("@gmail.com"):
        raise HTTPException(400, "Only legitimate Gmail accounts (@gmail.com) are allowed")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if body.password != body.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    # Check username
    result = await db.execute(select(User).where(User.username == username_clean))
    if result.scalar_one_or_none():
        raise HTTPException(409, "Username already taken")

    # Check email
    result = await db.execute(select(User).where(User.email == email_clean))
    if result.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")

    user = User(
        username=username_clean,
        email=email_clean,
        hashed_password=hash_password(body.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id, user.username)

    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=15 * 60,
        samesite="lax",
        secure=is_prod
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=is_prod
    )

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat()
        },
        "access_token": access_token
    }


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_async_db)):
    username_clean = body.username.strip().lower()
    result = await db.execute(select(User).where(User.username == username_clean))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid username or password")

    access_token = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id, user.username)

    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=15 * 60,
        samesite="lax",
        secure=is_prod
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=is_prod
    )

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat()
        },
        "access_token": access_token
    }


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    try:
        user_info = decode_token(refresh_token)
        access_token = create_access_token(user_info["user_id"], user_info["username"])
        
        is_prod = settings.ENVIRONMENT == "production"
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=15 * 60,
            samesite="lax",
            secure=is_prod
        )
        return {"status": "refreshed", "access_token": access_token}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Refresh token invalid: {e}")


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    access_token = create_access_token(user.id, user.username)
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat()
        },
        "access_token": access_token
    }


class ProfileUpdateRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    password: str | None = None


@router.put("/profile")
async def update_profile(
    body: ProfileUpdateRequest,
    response: Response,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    updated = False
    if body.username is not None:
        username_clean = body.username.strip().lower()
        if len(username_clean) < 3:
            raise HTTPException(400, "Username must be at least 3 characters")
        if username_clean != user.username:
            unq_res = await db.execute(select(User).where(User.username == username_clean))
            if unq_res.scalar_one_or_none():
                raise HTTPException(409, "Username already taken")
            user.username = username_clean
            updated = True

    if body.email is not None:
        email_clean = body.email.strip().lower()
        if "@" not in email_clean:
            raise HTTPException(400, "Invalid email")
        if not email_clean.endswith("@gmail.com"):
            raise HTTPException(400, "Only legitimate Gmail accounts (@gmail.com) are allowed")
        if email_clean != user.email:
            unq_res = await db.execute(select(User).where(User.email == email_clean))
            if unq_res.scalar_one_or_none():
                raise HTTPException(409, "Email already registered")
            user.email = email_clean
            updated = True

    if body.password is not None:
        pw_clean = body.password
        if len(pw_clean) < 8:
            raise HTTPException(400, "Password must be at least 8 characters")
        user.hashed_password = hash_password(pw_clean)
        updated = True

    if updated:
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id, user.username)

    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=15 * 60,
        samesite="lax",
        secure=is_prod
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,
        samesite="lax",
        secure=is_prod
    )

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat()
        },
        "access_token": access_token
    }
