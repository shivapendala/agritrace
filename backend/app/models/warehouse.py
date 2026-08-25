import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class InventoryStatus(str, enum.Enum):
    IN_STOCK = "IN_STOCK"
    DISPATCHED = "DISPATCHED"
    SPLIT = "SPLIT"
    EXPIRED = "EXPIRED"


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    location_address = Column(String, nullable=False)
    manager_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    total_capacity_kg = Column(Float, nullable=False)
    occupied_capacity_kg = Column(Float, default=0.0, nullable=False)
    target_temperature_celsius = Column(Float, default=4.0, nullable=False)
    is_cold_storage = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    manager = relationship("User", foreign_keys=[manager_id])
    zones = relationship("StorageZone", back_populates="warehouse", cascade="all, delete-orphan")
    inventories = relationship("InventoryItem", back_populates="warehouse")


class StorageZone(Base):
    __tablename__ = "storage_zones"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    warehouse_id = Column(String, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    zone_type = Column(String, nullable=False, default="COLD_ROOM")
    temperature_celsius = Column(Float, default=4.0, nullable=False)
    capacity_kg = Column(Float, nullable=False)

    # Relationships
    warehouse = relationship("Warehouse", back_populates="zones")
    locations = relationship("StorageLocation", back_populates="zone", cascade="all, delete-orphan")


class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    zone_id = Column(String, ForeignKey("storage_zones.id", ondelete="CASCADE"), nullable=False)
    aisle = Column(String, nullable=False)
    rack = Column(String, nullable=False)
    shelf = Column(String, nullable=False)
    code = Column(String, nullable=False)

    # Relationships
    zone = relationship("StorageZone", back_populates="locations")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    storage_location_id = Column(String, ForeignKey("storage_locations.id", ondelete="SET NULL"), nullable=True)
    initial_quantity = Column(Float, nullable=False)
    current_quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False, default="KG")
    received_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    status = Column(Enum(InventoryStatus), default=InventoryStatus.IN_STOCK, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    batch = relationship("Batch")
    warehouse = relationship("Warehouse", back_populates="inventories")
    location = relationship("StorageLocation")
