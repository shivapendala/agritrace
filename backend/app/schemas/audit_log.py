import json
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, field_validator


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    entity: str
    entity_id: str
    ip_address: Optional[str] = None
    metadata_json: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}
