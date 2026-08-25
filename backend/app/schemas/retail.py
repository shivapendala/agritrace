from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.retail import ReceiptStatus


class RetailerProfileCreate(BaseModel):
    store_name: str = Field(..., min_length=2)
    store_code: str = Field(..., min_length=2)
    address: str = Field(..., min_length=3)
    contact_phone: str = Field(..., min_length=5)


class RetailerProfileResponse(BaseModel):
    id: str
    user_id: str
    store_name: str
    store_code: str
    address: str
    contact_phone: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RetailReceiptCreate(BaseModel):
    shipment_id: str
    received_quantity: float = Field(..., gt=0)
    accepted_quantity: float = Field(..., ge=0)
    damaged_quantity: float = Field(default=0.0, ge=0)
    damage_reason: Optional[str] = None
    notes: Optional[str] = None


class RetailReceiptResponse(BaseModel):
    id: str
    retailer_id: str
    shipment_id: str
    batch_id: str
    received_quantity: float
    accepted_quantity: float
    damaged_quantity: float
    damage_reason: Optional[str] = None
    status: ReceiptStatus
    receipt_date: datetime
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class RetailInventoryResponse(BaseModel):
    id: str
    retailer_id: str
    batch_id: str
    received_quantity: float
    current_quantity: float
    unit: str
    shelf_location: str
    received_date: datetime

    model_config = {"from_attributes": True}
