from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
from app.database import get_async_db, User
from app.services.auth_service import get_current_admin, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminUserResponse(BaseModel):
    id: int
    username: Optional[str]
    email: str
    role: str
    active_sources: str
    is_active: bool
    created_at: str


class AdminUserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    active_sources: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_async_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(User).order_by(User.id.asc()))
    users = result.scalars().all()
    
    response_users = []
    for u in users:
        response_users.append(
            AdminUserResponse(
                id=u.id,
                username=u.username,
                email=u.email,
                role=u.role,
                active_sources=u.active_sources,
                is_active=u.is_active if u.is_active is not None else True,
                created_at=u.created_at.isoformat() if u.created_at else datetime.utcnow().isoformat()
            )
        )
    return response_users


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    body: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update Username
    if body.username is not None:
        username_clean = body.username.strip().lower()
        if len(username_clean) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        if username_clean != user.username:
            unq_res = await db.execute(select(User).where(User.username == username_clean))
            if unq_res.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Username already taken")
            user.username = username_clean

    # Update Email
    if body.email is not None:
        email_clean = body.email.strip().lower()
        if "@" not in email_clean:
            raise HTTPException(status_code=400, detail="Invalid email")
        if not email_clean.endswith("@gmail.com"):
            raise HTTPException(status_code=400, detail="Only legitimate Gmail accounts (@gmail.com) are allowed")
        if email_clean != user.email:
            unq_res = await db.execute(select(User).where(User.email == email_clean))
            if unq_res.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Email already registered")
            user.email = email_clean

    # Update Password
    if body.password is not None and body.password != "":
        if len(body.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        user.hashed_password = hash_password(body.password)

    # Update Role
    if body.role is not None:
        if body.role not in ["admin", "user"]:
            raise HTTPException(status_code=400, detail="Invalid role value")
        # Safety: Cannot demote the currently logged-in admin who is making this request
        if user_id == admin.id and body.role != "admin":
            raise HTTPException(status_code=400, detail="Cannot demote yourself from admin")
        user.role = body.role

    # Update Active Sources
    if body.active_sources is not None:
        sources_str = ",".join(body.active_sources)
        user.active_sources = sources_str

    # Update Is Active
    if body.is_active is not None:
        # Safety: Cannot deactivate yourself
        if user_id == admin.id and not body.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        active_sources=user.active_sources,
        is_active=user.is_active if user.is_active is not None else True,
        created_at=user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat()
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    admin: User = Depends(get_current_admin)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}
