from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.batch import BatchStatus


class HarvestCreate(BaseModel):
    farm_id: str
    crop_id: Optional[str] = None
    product_name: str = Field(..., min_length=2)
    quantity: float = Field(..., gt=0, description="Quantity must be greater than 0")
    unit: str = Field(default="KG")
    harvest_date: Optional[datetime] = None
    harvest_method: str = Field(default="MANUAL")
    initial_grade: Optional[str] = "Grade A"
    initial_quality_notes: Optional[str] = None


class BatchResponse(BaseModel):
    id: str
    batch_number: str
    harvest_id: str
    farmer_id: str
    farm_id: str
    product_name: str
    initial_quantity: float
    remaining_quantity: float
    unit: str
    harvest_date: datetime
    current_location: str
    status: BatchStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class HarvestResponse(BaseModel):
    id: str
    farmer_id: str
    farm_id: str
    crop_id: Optional[str] = None
    product_name: str
    quantity: float
    unit: str
    harvest_date: datetime
    harvest_method: str
    initial_grade: Optional[str] = None
    initial_quality_notes: Optional[str] = None
    created_at: datetime
    batch: Optional[BatchResponse] = None

    model_config = {"from_attributes": True}


class BatchStatusUpdate(BaseModel):
    status: BatchStatus
    current_location: Optional[str] = None


class BatchQuantityDeduct(BaseModel):
    quantity_to_deduct: float = Field(..., gt=0, description="Deduction quantity must be greater than 0")
    reason: Optional[str] = None
