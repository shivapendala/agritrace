import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    action: str,
    entity: str,
    entity_id: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[AuditLog]:
    """
    Helper service to create an immutable audit log entry for enterprise security auditing.
    """
    try:
        metadata_str = json.dumps(metadata) if metadata else None
        log_entry = AuditLog(
            user_id=user_id,
            action=action.upper(),
            entity=entity,
            entity_id=entity_id,
            ip_address=ip_address or "127.0.0.1",
            metadata_json=metadata_str
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as err:
        db.rollback()
        print(f"Error recording audit log: {err}")
        return None
