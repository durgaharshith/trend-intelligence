"""Alerts API — Tier 2.2"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.alert_service import alert_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class CreateAlertRequest(BaseModel):
    keyword: str
    email: str   # using str instead of EmailStr to avoid extra dep


@router.get("/")
async def list_alerts(current_user: dict = Depends(get_current_user)):
    """List all active keyword alerts for the logged-in user."""
    alerts = await alert_service.list_alerts(user_id=current_user["user_id"])
    return {"alerts": alerts, "total": len(alerts)}


@router.post("/", status_code=201)
async def create_alert(body: CreateAlertRequest, current_user: dict = Depends(get_current_user)):
    """Create a new keyword alert. Will email when keyword starts trending."""
    if not body.keyword.strip():
        raise HTTPException(status_code=400, detail="Keyword cannot be empty")
    if "@" not in body.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    alert = await alert_service.create_alert(body.keyword, body.email, user_id=current_user["user_id"])
    return {"alert": alert, "message": f"Alert created for '{body.keyword}'"}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a keyword alert."""
    is_admin = current_user.get("role") == "admin"
    try:
        deleted = await alert_service.delete_alert(alert_id, user_id=current_user["user_id"], is_admin=is_admin)
        if not deleted:
            raise HTTPException(status_code=404, detail="Alert not found")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return {"message": "Alert deleted"}
