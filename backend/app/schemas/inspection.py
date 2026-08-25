from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.inspection import InspectionStatus, QualityGrade


class InspectionCreate(BaseModel):
    batch_id: str
    verified_weight: float = Field(..., gt=0)
    moisture_percentage: Optional[float] = Field(None, ge=0, le=100)
    temperature_celsius: Optional[float] = None
    quality_grade: QualityGrade = QualityGrade.A
    visual_condition: str = Field(..., min_length=2)
    contamination_status: str = Field(default="CLEAN")
    remarks: Optional[str] = None


class InspectionReviewAction(BaseModel):
    notes: Optional[str] = None


class InspectionResponse(BaseModel):
    id: str
    batch_id: str
    inspector_id: str
    inspection_date: datetime
    verified_weight: float
    moisture_percentage: Optional[float] = None
    temperature_celsius: Optional[float] = None
    quality_grade: QualityGrade
    visual_condition: str
    contamination_status: str
    remarks: Optional[str] = None
    approval_status: InspectionStatus
    created_at: datetime

    model_config = {"from_attributes": True}
