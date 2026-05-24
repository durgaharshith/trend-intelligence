"""
Alert service — Tier 2.2

Stores keyword alerts in Redis (simple, no DB migration needed for MVP).
Checks every poll cycle whether any active trend matches a keyword.
Sends email via Resend API (httpx POST — no extra dependency needed).

Alert Redis structure:
  Key: "alerts"
  Value: JSON list of alert objects
  Each alert: { id, keyword, email, created_at, last_triggered, active }
"""

import uuid
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any

import httpx

from app.services.cache import cache
from app.config import settings

logger = logging.getLogger(__name__)

ALERTS_KEY = "alerts"
COOLDOWN_HOURS = 6      # don't re-notify for the same keyword within 6h
RESEND_API_URL = "https://api.resend.com/emails"


class AlertService:
    # ── CRUD ────────────────────────────────────────────────────────────

    async def list_alerts(self, user_id: int | None = None) -> List[Dict[str, Any]]:
        alerts = (await cache.get(ALERTS_KEY)) or []
        if user_id is not None:
            alerts = [a for a in alerts if a.get("user_id") == user_id]
        return alerts

    async def create_alert(self, keyword: str, email: str, user_id: int) -> Dict[str, Any]:
        alerts = (await cache.get(ALERTS_KEY)) or []
        alert = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "keyword": keyword.lower().strip(),
            "email": email.strip(),
            "created_at": datetime.utcnow().isoformat(),
            "last_triggered": None,
            "active": True,
        }
        alerts.append(alert)
        await cache.set(ALERTS_KEY, alerts, ttl=86400 * 30)  # 30-day TTL
        logger.info(f"Alert created: '{keyword}' → {email} for User {user_id}")
        return alert

    async def delete_alert(self, alert_id: str, user_id: int, is_admin: bool = False) -> bool:
        alerts = (await cache.get(ALERTS_KEY)) or []
        alert = next((a for a in alerts if a["id"] == alert_id), None)
        if not alert:
            return False
        
        # Security check: User must own the alert or be an admin
        if not is_admin and alert.get("user_id") != user_id:
            raise PermissionError("Not authorized to delete this alert")

        new_alerts = [a for a in alerts if a["id"] != alert_id]
        await cache.set(ALERTS_KEY, new_alerts, ttl=86400 * 30)
        return True

    # ── Matching & notification ──────────────────────────────────────────

    async def check_and_notify(self, trends: List[Dict[str, Any]]) -> None:
        """Called after each poll. Match trends → alerts → send emails."""
        alerts = await self.list_alerts()
        if not alerts:
            return

        active_alerts = [a for a in alerts if a.get("active")]
        if not active_alerts:
            return

        updated = False
        for alert in active_alerts:
            keyword = alert["keyword"]

            # Cooldown check — don't spam
            last = alert.get("last_triggered")
            if last:
                try:
                    last_dt = datetime.fromisoformat(last)
                    if datetime.utcnow() - last_dt < timedelta(hours=COOLDOWN_HOURS):
                        continue
                except ValueError:
                    pass

            # Find matching trends
            matching = [
                t for t in trends
                if keyword in t.get("title", "").lower()
                or any(keyword in p.get("title", "").lower() for p in t.get("posts", []))
            ]

            if matching:
                top_trend = matching[0]
                await self._send_email(
                    to=alert["email"],
                    keyword=keyword,
                    trend=top_trend,
                )
                alert["last_triggered"] = datetime.utcnow().isoformat()
                updated = True
                logger.info(f"Alert fired: '{keyword}' → {alert['email']}")

        if updated:
            await cache.set(ALERTS_KEY, alerts, ttl=86400 * 30)

    # ── Email dispatch ───────────────────────────────────────────────────

    async def _send_email(self, to: str, keyword: str, trend: dict) -> None:
        resend_key = settings.RESEND_API_KEY
        if not resend_key:
            # No key configured — just log (dev mode)
            logger.info(
                f"[DEV] Alert email (no RESEND_API_KEY): '{keyword}' → {to} | Trend: {trend.get('title')}"
            )
            return

        subject = f"🚨 Trend Alert: '{keyword}' is trending!"
        top_posts = "\n".join([
            f"  • {p.get('title', 'N/A')} (Score: {p.get('score', 0)})"
            for p in trend.get("posts", [])[:3]
        ])

        html_body = f"""
<html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
  <div style="max-width:560px;margin:auto;background:#1e293b;border-radius:12px;padding:24px;border:1px solid #334155">
    <h2 style="color:#3b82f6;margin:0 0 16px">🚨 Trend Alert</h2>
    <p>Your keyword <strong style="color:#f8fafc">"{keyword}"</strong> is now trending on Trend Intelligence.</p>
    <div style="background:#0f172a;border-radius:8px;padding:16px;margin:16px 0">
      <div style="font-size:18px;font-weight:bold;color:#f8fafc;margin-bottom:8px">{trend.get("title", "")}</div>
      <div style="color:#64748b;font-size:12px">Trend Score: {trend.get("trend_score", 0):.0f}/100 · Type: {trend.get("trend_type", "")} · {trend.get("post_count", 0)} posts</div>
    </div>
    <p style="color:#94a3b8;font-size:13px">Top posts:</p>
    <pre style="background:#0f172a;padding:12px;border-radius:6px;font-size:12px;color:#94a3b8">{top_posts}</pre>
    <a href="{settings.FRONTEND_URL}/trends/{trend.get('cluster_id','')}"
       style="display:inline-block;background:#3b82f6;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:12px">
      View Full Trend →
    </a>
    <p style="color:#475569;font-size:11px;margin-top:20px">You won't receive another alert for this keyword for {COOLDOWN_HOURS} hours.</p>
  </div>
</body></html>
"""

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    RESEND_API_URL,
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": f"Trend Intelligence <{settings.RESEND_FROM_EMAIL}>",
                        "to": [to],
                        "subject": subject,
                        "html": html_body,
                    },
                )
                resp.raise_for_status()
                logger.info(f"Alert email sent to {to} (Resend ID: {resp.json().get('id')})")
        except Exception as e:
            logger.error(f"Alert email send failed: {e}")


# Global singleton
alert_service = AlertService()
