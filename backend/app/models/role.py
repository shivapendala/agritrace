import enum
from sqlalchemy import Column, String, Integer
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


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)

    def __repr__(self):
        return f"<Role {self.name}>"
