from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.transport import TransportStatus


class VehicleCreate(BaseModel):
    license_plate: str = Field(..., min_length=3)
    vehicle_type: str = Field(default="REFRIGERATED_TRUCK")
    capacity_kg: float = Field(..., gt=0)
    is_temperature_controlled: bool = Field(default=True)
    min_temp_celsius: float = Field(default=2.0)
    max_temp_celsius: float = Field(default=8.0)


class VehicleResponse(BaseModel):
    id: str
    license_plate: str
    vehicle_type: str
    capacity_kg: float
    is_temperature_controlled: bool
    min_temp_celsius: float
    max_temp_celsius: float
    is_available: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DriverCreate(BaseModel):
    user_id: str
    license_number: str = Field(..., min_length=3)
    phone_number: str = Field(..., min_length=5)


class DriverResponse(BaseModel):
    id: str
    user_id: str
    license_number: str
    phone_number: str
    is_available: bool

    model_config = {"from_attributes": True}


class ShipmentCreate(BaseModel):
    batch_id: str
    origin_warehouse_id: Optional[str] = None
    destination_address: str = Field(..., min_length=3)
    min_temp_required: float = Field(default=2.0)
    max_temp_required: float = Field(default=8.0)
    notes: Optional[str] = None


class ShipmentAssign(BaseModel):
    vehicle_id: str
    driver_id: str


class ShipmentStatusUpdate(BaseModel):
    status: TransportStatus
    notes: Optional[str] = None


class TemperatureLogCreate(BaseModel):
    recorded_temp_celsius: float
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class TemperatureLogResponse(BaseModel):
    id: str
    shipment_id: str
    recorded_temp_celsius: float
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    is_breach: bool
    breach_message: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class ShipmentResponse(BaseModel):
    id: str
    tracking_number: str
    batch_id: str
    origin_warehouse_id: Optional[str] = None
    destination_address: str
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    status: TransportStatus
    min_temp_required: float
    max_temp_required: float
    pickup_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    temp_logs: List[TemperatureLogResponse] = []

    model_config = {"from_attributes": True}
