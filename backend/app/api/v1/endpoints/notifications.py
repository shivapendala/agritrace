from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationUnreadCount
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
def list_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all in-app notifications for the authenticated user."""
    return db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()


@router.get("/unread-count", response_model=NotificationUnreadCount)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get total count of unread notifications for the authenticated user."""
    count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.read == False
    ).count()
    return NotificationUnreadCount(unread_count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Mark a single notification as read. Validates recipient ownership permission."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    
    if notif.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to modify another user's notifications."
        )

    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/mark-all-read", response_model=dict)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Mark all unread notifications as read for current user."""
    updated = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.read == False
    ).update({"read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read", "updated_count": updated}
