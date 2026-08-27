from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.genealogy import OperationType

class BatchLineageBase(BaseModel):
    parent_batch_id: str
    child_batch_id: str
    operation_type: OperationType
    quantity_transferred: float

class BatchLineageCreate(BatchLineageBase):
    pass

class BatchLineageResponse(BatchLineageBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductTransformationBase(BaseModel):
    source_batch_id: str
    result_batch_id: str
    transformation_type: str
    yield_percentage: Optional[float] = None
    notes: Optional[str] = None

class ProductTransformationCreate(ProductTransformationBase):
    pass

class ProductTransformationResponse(ProductTransformationBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class BatchSplitRequest(BaseModel):
    quantities: List[float] = Field(..., description="Quantities for the new split batches")
    notes: Optional[str] = None

class BatchMergeRequest(BaseModel):
    source_batch_ids: List[str] = Field(..., description="List of batch IDs to merge from")
    notes: Optional[str] = None

class BatchTransformRequest(BaseModel):
    transformation_type: str
    yield_percentage: Optional[float] = None
    notes: Optional[str] = None
