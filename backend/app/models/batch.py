import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class BatchStatus(str, enum.Enum):
    HARVESTED = "HARVESTED"
    QUALITY_PENDING = "QUALITY_PENDING"
    QUALITY_APPROVED = "QUALITY_APPROVED"
    IN_WAREHOUSE = "IN_WAREHOUSE"
    IN_TRANSIT = "IN_TRANSIT"
    AT_RETAILER = "AT_RETAILER"
    SOLD = "SOLD"
    REJECTED = "REJECTED"


class Harvest(Base):
    __tablename__ = "harvests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    farmer_id = Column(String, ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False)
    farm_id = Column(String, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    crop_id = Column(String, ForeignKey("crops.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False, default="KG")
    harvest_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    harvest_method = Column(String, nullable=False, default="MANUAL")
    initial_grade = Column(String, nullable=True, default="Grade A")
    initial_quality_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    farm = relationship("Farm")
    farmer = relationship("FarmerProfile")
    batch = relationship("Batch", back_populates="harvest", uselist=False, cascade="all, delete-orphan")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_number = Column(String, unique=True, index=True, nullable=False)
    qr_code = Column(String, unique=True, index=True, nullable=False, default=lambda: f"QR-{uuid.uuid4().hex[:12].upper()}")
    harvest_id = Column(String, ForeignKey("harvests.id", ondelete="CASCADE"), unique=True, nullable=False)
    farmer_id = Column(String, ForeignKey("farmer_profiles.id", ondelete="CASCADE"), nullable=False)
    farm_id = Column(String, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    product_name = Column(String, nullable=False)
    initial_quantity = Column(Float, nullable=False)
    remaining_quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False, default="KG")
    harvest_date = Column(DateTime, nullable=False)
    current_location = Column(String, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.HARVESTED, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    harvest = relationship("Harvest", back_populates="batch")
    farm = relationship("Farm")
    farmer = relationship("FarmerProfile")
