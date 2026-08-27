import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class OperationType(str, enum.Enum):
    SPLIT = "SPLIT"
    MERGE = "MERGE"
    TRANSFORM = "TRANSFORM"

class BatchLineage(Base):
    __tablename__ = "batch_lineages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    child_batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    operation_type = Column(Enum(OperationType), nullable=False)
    quantity_transferred = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships can be added if needed
    # parent = relationship("Batch", foreign_keys=[parent_batch_id])
    # child = relationship("Batch", foreign_keys=[child_batch_id])

class ProductTransformation(Base):
    __tablename__ = "product_transformations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    result_batch_id = Column(String, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    transformation_type = Column(String, nullable=False) # e.g., "ROASTING", "PACKAGING"
    yield_percentage = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
