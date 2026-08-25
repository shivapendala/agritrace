import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class ReceiptStatus(str, enum.Enum):
    ACCEPTED = "ACCEPTED"
    PARTIALLY_ACCEPTED = "PARTIALLY_ACCEPTED"
    REJECTED_ON_DELIVERY = "REJECTED_ON_DELIVERY"


class RetailerProfile(Base):
    __tablename__ = "retailer_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    store_name = Column(String, nullable=False)
    store_code = Column(String, unique=True, index=True, nullable=False)
    address = Column(String, nullable=False)
    contact_phone = Column(String, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
    inventories = relationship("RetailInventory", back_populates="retailer", cascade="all, delete-orphan")


class RetailReceipt(Base):
    __tablename__ = "retail_receipts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    retailer_id = Column(String, ForeignKey("retailer_profiles.id", ondelete="CASCADE"), nullable=False)
    shipment_id = Column(String, ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    received_quantity = Column(Float, nullable=False)
    accepted_quantity = Column(Float, nullable=False)
    damaged_quantity = Column(Float, default=0.0, nullable=False)
    damage_reason = Column(String, nullable=True)
    status = Column(Enum(ReceiptStatus), default=ReceiptStatus.ACCEPTED, nullable=False)
    receipt_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    notes = Column(Text, nullable=True)

    retailer = relationship("RetailerProfile")
    shipment = relationship("Shipment")
    batch = relationship("Batch")


class RetailInventory(Base):
    __tablename__ = "retail_inventories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    retailer_id = Column(String, ForeignKey("retailer_profiles.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    received_quantity = Column(Float, nullable=False)
    current_quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False, default="KG")
    shelf_location = Column(String, default="Main Display A1", nullable=False)
    received_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    retailer = relationship("RetailerProfile", back_populates="inventories")
    batch = relationship("Batch")
