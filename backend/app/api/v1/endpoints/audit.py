from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN]))
) -> Any:
    """
    List enterprise audit logs with parametric filtering (Super Admin only).
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action.upper())
    if entity:
        query = query.filter(AuditLog.entity.ilike(f"%{entity}%"))
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    return query.order_by(AuditLog.timestamp.desc()).all()
