import enum
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AuthenticityStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    SUSPICIOUS = "SUSPICIOUS"
    REVOKED = "REVOKED"
    UNKNOWN = "UNKNOWN"


class PublicTimelineStep(BaseModel):
    step_number: int
    title: str
    description: str
    timestamp: Optional[datetime] = None
    is_completed: bool


class PublicProductVerificationResponse(BaseModel):
    is_valid: bool
    authenticity_status: AuthenticityStatus
    status_explanation: str
    qr_code: str
    batch_number: str
    product_name: str
    quantity: float
    unit: str
    current_status: str
    current_location: str

    # Public Farmer & Farm Info (Strictly excludes phone, email, password)
    farmer_name: str
    farm_name: str
    farm_address: str
    origin_region: str

    # Public Quality Info
    harvest_date: datetime
    quality_grade: Optional[str] = "Grade A"
    inspection_status: Optional[str] = "APPROVED"

    # Public Logistics & Retail Info
    warehouse_name: Optional[str] = None
    transport_tracking_number: Optional[str] = None
    retailer_name: Optional[str] = None

    # Provenance Lifecycle Timeline
    timeline: List[PublicTimelineStep]
