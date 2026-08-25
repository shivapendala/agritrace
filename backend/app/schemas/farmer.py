from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.farm import VerificationStatus, CropStatus


class FarmerProfileCreate(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "India"


class FarmerProfileUpdate(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class CropCreate(BaseModel):
    name: str = Field(..., min_length=2)
    variety: Optional[str] = None
    planting_date: datetime
    expected_harvest_date: Optional[datetime] = None
    status: CropStatus = CropStatus.PLANTED


class CropResponse(BaseModel):
    id: str
    farm_id: str
    name: str
    variety: Optional[str] = None
    planting_date: datetime
    expected_harvest_date: Optional[datetime] = None
    status: CropStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class FarmCreate(BaseModel):
    name: str = Field(..., min_length=2)
    location_address: str = Field(..., min_length=3)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_area_hectares: float = Field(..., gt=0, description="Total area in hectares must be greater than 0")
    soil_type: str = Field(..., min_length=2)
    irrigation_type: str = Field(..., min_length=2)


class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_area_hectares: Optional[float] = Field(None, gt=0)
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    is_active: Optional[bool] = None


class FarmResponse(BaseModel):
    id: str
    farmer_id: str
    name: str
    location_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_area_hectares: float
    soil_type: str
    irrigation_type: str
    is_active: bool
    created_at: datetime
    crops: List[CropResponse] = []

    model_config = {"from_attributes": True}


class FarmerProfileResponse(BaseModel):
    id: str
    user_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    verification_status: VerificationStatus
    verification_notes: Optional[str] = None
    created_at: datetime
    farms: List[FarmResponse] = []

    model_config = {"from_attributes": True}


class FarmerAdminAction(BaseModel):
    notes: Optional[str] = None
