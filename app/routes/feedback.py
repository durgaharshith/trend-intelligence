"""Feedback email dispatch API — Tier 2.2"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx

from app.config import settings
from app.services.auth_service import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/feedback", tags=["feedback"])

RESEND_API_URL = "https://api.resend.com/emails"

class FeedbackRequest(BaseModel):
    message: str

@router.post("")
async def send_feedback(body: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    msg_text = body.message.strip()
    if not msg_text:
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")

    username = current_user.get("username", "Unknown")
    # For user email, retrieve from database or current_user context.
    # Note: decode_token returns {"user_id": ..., "username": ...}. It doesn't contain email!
    # So we should query the database to get the user's email address!
    from app.database import AsyncSessionLocal, User
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.id == current_user["user_id"])
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user_email = user.email

    resend_key = settings.RESEND_API_KEY
    subject = f"💬 New Feedback from {username} ({user_email})"
    
    html_body = f"""
<html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
  <div style="max-width:560px;margin:auto;background:#1e293b;border-radius:12px;padding:24px;border:1px solid #334155">
    <h2 style="color:#8b5cf6;margin:0 0 16px">💬 User Feedback Submitted</h2>
    <p>A user has submitted feedback from the Trend Intelligence dashboard.</p>
    <div style="background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #1f2937">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:8px">
        <strong>User:</strong> {username}<br>
        <strong>Email:</strong> {user_email}
      </div>
      <div style="font-size:14px;color:#f8fafc;white-space:pre-wrap;line-height:1.5">{msg_text}</div>
    </div>
    <p style="color:#64748b;font-size:11px;margin-top:20px">
      You can reply directly to this email to contact the user at {user_email}.
    </p>
  </div>
 </body></html>
"""

    if not resend_key or settings.ENVIRONMENT == "testing":
        logger.info(
            f"[DEV FEEDBACK] ({settings.ENVIRONMENT} environment / no key): '{subject}' | Message: {msg_text}"
        )
        return {"status": "success", "message": "Feedback logged in development/test mode."}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"Trend Intelligence Feedback <{settings.RESEND_FROM_EMAIL}>",
                    "to": [settings.ADMIN_EMAIL],
                    "reply_to": user_email,
                    "subject": subject,
                    "html": html_body,
                },
            )
            resp.raise_for_status()
            logger.info(f"Feedback email sent to admin {settings.ADMIN_EMAIL} from {user_email}")
            return {"status": "success", "message": "Feedback sent successfully."}
    except Exception as e:
        logger.error(f"Feedback email dispatch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send feedback email.")
