import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer
from app.db.session import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    FARMER = "FARMER"
    QUALITY_OFFICER = "QUALITY_OFFICER"
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER"
    TRANSPORT_MANAGER = "TRANSPORT_MANAGER"
    DRIVER = "DRIVER"
    RETAILER = "RETAILER"
    CUSTOMER = "CUSTOMER"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    phone_number = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
