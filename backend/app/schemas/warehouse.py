from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.warehouse import InventoryStatus


class StorageLocationCreate(BaseModel):
    aisle: str = Field(..., min_length=1)
    rack: str = Field(..., min_length=1)
    shelf: str = Field(..., min_length=1)


class StorageLocationResponse(BaseModel):
    id: str
    zone_id: str
    aisle: str
    rack: str
    shelf: str
    code: str

    model_config = {"from_attributes": True}


class StorageZoneCreate(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(..., min_length=2)
    zone_type: str = Field(default="COLD_ROOM")
    temperature_celsius: float = Field(default=4.0)
    capacity_kg: float = Field(..., gt=0)


class StorageZoneResponse(BaseModel):
    id: str
    warehouse_id: str
    name: str
    code: str
    zone_type: str
    temperature_celsius: float
    capacity_kg: float
    locations: List[StorageLocationResponse] = []

    model_config = {"from_attributes": True}


class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(..., min_length=2)
    location_address: str = Field(..., min_length=3)
    total_capacity_kg: float = Field(..., gt=0)
    target_temperature_celsius: float = Field(default=4.0)
    is_cold_storage: bool = Field(default=True)


class WarehouseResponse(BaseModel):
    id: str
    name: str
    code: str
    location_address: str
    manager_id: Optional[str] = None
    total_capacity_kg: float
    occupied_capacity_kg: float
    target_temperature_celsius: float
    is_cold_storage: bool
    is_active: bool
    created_at: datetime
    zones: List[StorageZoneResponse] = []

    model_config = {"from_attributes": True}


class InventoryReceive(BaseModel):
    batch_id: str
    warehouse_id: str
    storage_location_id: Optional[str] = None
    quantity: float = Field(..., gt=0)
    unit: str = Field(default="KG")
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None


class InventoryMove(BaseModel):
    target_warehouse_id: str
    target_storage_location_id: Optional[str] = None
    notes: Optional[str] = None


class InventorySplit(BaseModel):
    split_quantity: float = Field(..., gt=0)
    new_storage_location_id: Optional[str] = None
    notes: Optional[str] = None


class InventoryAdjust(BaseModel):
    new_quantity: float = Field(..., ge=0, description="New quantity cannot be negative")
    reason: str = Field(..., min_length=2)


class InventoryDispatch(BaseModel):
    dispatch_quantity: float = Field(..., gt=0)
    destination_address: str = Field(..., min_length=3)
    notes: Optional[str] = None


class InventoryResponse(BaseModel):
    id: str
    batch_id: str
    warehouse_id: str
    storage_location_id: Optional[str] = None
    initial_quantity: float
    current_quantity: float
    unit: str
    received_date: datetime
    expiry_date: Optional[datetime] = None
    status: InventoryStatus
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
