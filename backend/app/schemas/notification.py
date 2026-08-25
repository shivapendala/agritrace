from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationCreate(BaseModel):
    recipient_id: str
    type: str
    title: str
    message: str


class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationUnreadCount(BaseModel):
    unread_count: int
