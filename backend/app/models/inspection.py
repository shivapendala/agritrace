import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class InspectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REQUIRES_REINSPECTION = "REQUIRES_REINSPECTION"


class QualityGrade(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    REJECTED = "REJECTED"


class QualityInspection(Base):
    __tablename__ = "quality_inspections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    inspector_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    inspection_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    verified_weight = Column(Float, nullable=False)
    moisture_percentage = Column(Float, nullable=True)
    temperature_celsius = Column(Float, nullable=True)
    quality_grade = Column(Enum(QualityGrade), nullable=False, default=QualityGrade.A)
    visual_condition = Column(String, nullable=False)
    contamination_status = Column(String, nullable=False, default="CLEAN")
    remarks = Column(Text, nullable=True)
    approval_status = Column(Enum(InspectionStatus), nullable=False, default=InspectionStatus.PENDING)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    batch = relationship("Batch", backref="inspections")
    inspector = relationship("User", foreign_keys=[inspector_id])
