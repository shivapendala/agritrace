from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User, UserRole


def notify_user(
    db: Session,
    recipient_id: str,
    notification_type: str,
    title: str,
    message: str
) -> Optional[Notification]:
    """Helper to dispatch an in-app notification to a single user."""
    if not recipient_id:
        return None
    notification = Notification(
        recipient_id=recipient_id,
        type=notification_type,
        title=title,
        message=message,
        read=False
    )
    db.add(notification)
    try:
        db.commit()
        db.refresh(notification)
        return notification
    except Exception:
        db.rollback()
        return None


def notify_roles(
    db: Session,
    roles: List[UserRole],
    notification_type: str,
    title: str,
    message: str
) -> List[Notification]:
    """Helper to dispatch an in-app notification to all users matching specified roles."""
    users = db.query(User).filter(User.role.in_(roles)).all()
    created = []
    for user in users:
        notif = Notification(
            recipient_id=user.id,
            type=notification_type,
            title=title,
            message=message,
            read=False
        )
        db.add(notif)
        created.append(notif)
    try:
        db.commit()
        for n in created:
            db.refresh(n)
        return created
    except Exception:
        db.rollback()
        return []
