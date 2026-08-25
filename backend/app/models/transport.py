import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class TransportStatus(str, enum.Enum):
    CREATED = "CREATED"
    ASSIGNED = "ASSIGNED"
    PICKED_UP = "PICKED_UP"
    IN_TRANSIT = "IN_TRANSIT"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    license_plate = Column(String, unique=True, index=True, nullable=False)
    vehicle_type = Column(String, nullable=False, default="REFRIGERATED_TRUCK")
    capacity_kg = Column(Float, nullable=False)
    is_temperature_controlled = Column(Boolean, default=True, nullable=False)
    min_temp_celsius = Column(Float, default=2.0, nullable=False)
    max_temp_celsius = Column(Float, default=8.0, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    shipments = relationship("Shipment", back_populates="vehicle")


class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    license_number = Column(String, unique=True, nullable=False)
    phone_number = Column(String, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)

    user = relationship("User")
    shipments = relationship("Shipment", back_populates="driver")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tracking_number = Column(String, unique=True, index=True, nullable=False)
    batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    origin_warehouse_id = Column(String, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    destination_address = Column(String, nullable=False)
    vehicle_id = Column(String, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    driver_id = Column(String, ForeignKey("driver_profiles.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(TransportStatus), default=TransportStatus.CREATED, nullable=False)
    min_temp_required = Column(Float, default=2.0, nullable=False)
    max_temp_required = Column(Float, default=8.0, nullable=False)
    pickup_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    batch = relationship("Batch")
    origin_warehouse = relationship("Warehouse")
    vehicle = relationship("Vehicle", back_populates="shipments")
    driver = relationship("DriverProfile", back_populates="shipments")
    temp_logs = relationship("TemperatureLog", back_populates="shipment", cascade="all, delete-orphan")


class TemperatureLog(Base):
    __tablename__ = "temperature_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    shipment_id = Column(String, ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    recorded_temp_celsius = Column(Float, nullable=False)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    is_breach = Column(Boolean, default=False, nullable=False)
    breach_message = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    shipment = relationship("Shipment", back_populates="temp_logs")
