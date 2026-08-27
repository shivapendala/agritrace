from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.api.v1 import deps
from app.models.batch import Batch
from app.models.genealogy import BatchLineage, OperationType, ProductTransformation
from app.schemas.genealogy import (
    BatchSplitRequest,
    BatchMergeRequest,
    BatchTransformRequest,
    BatchLineageResponse,
    ProductTransformationResponse
)
from app.schemas.batch import BatchResponse

router = APIRouter()

@router.post("/{id}/split", response_model=List[BatchResponse])
def split_batch(
    id: str,
    request: BatchSplitRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """
    Split a batch into multiple children batches.
    """
    parent_batch = db.query(Batch).filter(Batch.id == id).first()
    if not parent_batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    total_split_qty = sum(request.quantities)
    if parent_batch.remaining_quantity < total_split_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient quantity. Requested: {total_split_qty}, Available: {parent_batch.remaining_quantity}"
        )

    # Deduct from parent
    parent_batch.remaining_quantity -= total_split_qty

    new_batches = []
    for qty in request.quantities:
        # Create child batch
        child_batch = Batch(
            batch_number=f"{parent_batch.batch_number}-SPLIT-{uuid.uuid4().hex[:4].upper()}",
            harvest_id=parent_batch.harvest_id,
            farmer_id=parent_batch.farmer_id,
            farm_id=parent_batch.farm_id,
            product_name=parent_batch.product_name,
            initial_quantity=qty,
            remaining_quantity=qty,
            unit=parent_batch.unit,
            harvest_date=parent_batch.harvest_date,
            current_location=parent_batch.current_location,
            status=parent_batch.status
        )
        db.add(child_batch)
        db.flush() # get id

        # Create lineage record
        lineage = BatchLineage(
            parent_batch_id=parent_batch.id,
            child_batch_id=child_batch.id,
            operation_type=OperationType.SPLIT,
            quantity_transferred=qty
        )
        db.add(lineage)
        new_batches.append(child_batch)

    db.commit()
    return new_batches

@router.post("/merge", response_model=BatchResponse)
def merge_batches(
    request: BatchMergeRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """
    Merge multiple batches into one new batch.
    """
    if len(request.source_batch_ids) < 2:
        raise HTTPException(status_code=400, detail="Must provide at least two batches to merge")
        
    source_batches = db.query(Batch).filter(Batch.id.in_(request.source_batch_ids)).all()
    if len(source_batches) != len(request.source_batch_ids):
        raise HTTPException(status_code=404, detail="One or more source batches not found")
        
    # Check compatibility (e.g. same product name)
    product_names = set(b.product_name for b in source_batches)
    if len(product_names) > 1:
        raise HTTPException(status_code=400, detail="Cannot merge batches of different products")

    total_qty = sum(b.remaining_quantity for b in source_batches)
    base_batch = source_batches[0]

    # Create merged batch
    merged_batch = Batch(
        batch_number=f"MERGED-{uuid.uuid4().hex[:8].upper()}",
        product_name=base_batch.product_name,
        initial_quantity=total_qty,
        remaining_quantity=total_qty,
        unit=base_batch.unit,
        harvest_date=base_batch.harvest_date, # Approximation using first batch
        current_location=base_batch.current_location,
        status=base_batch.status
    )
    db.add(merged_batch)
    db.flush()

    for batch in source_batches:
        # Create lineage
        lineage = BatchLineage(
            parent_batch_id=batch.id,
            child_batch_id=merged_batch.id,
            operation_type=OperationType.MERGE,
            quantity_transferred=batch.remaining_quantity
        )
        db.add(lineage)
        
        # Zero out source batch quantity (or mark as fully transferred)
        batch.remaining_quantity = 0

    db.commit()
    db.refresh(merged_batch)
    return merged_batch

@router.post("/{id}/transform", response_model=BatchResponse)
def transform_batch(
    id: str,
    request: BatchTransformRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """
    Transform a batch (e.g., Raw -> Processed).
    """
    source_batch = db.query(Batch).filter(Batch.id == id).first()
    if not source_batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    new_qty = source_batch.remaining_quantity
    if request.yield_percentage is not None:
        new_qty = source_batch.remaining_quantity * (request.yield_percentage / 100.0)

    # Create transformed batch
    transformed_batch = Batch(
        batch_number=f"{source_batch.batch_number}-TR",
        product_name=f"{source_batch.product_name} ({request.transformation_type})",
        initial_quantity=new_qty,
        remaining_quantity=new_qty,
        unit=source_batch.unit,
        harvest_date=source_batch.harvest_date,
        current_location=source_batch.current_location,
        status=source_batch.status
    )
    db.add(transformed_batch)
    db.flush()

    transformation = ProductTransformation(
        source_batch_id=source_batch.id,
        result_batch_id=transformed_batch.id,
        transformation_type=request.transformation_type,
        yield_percentage=request.yield_percentage,
        notes=request.notes
    )
    db.add(transformation)
    
    lineage = BatchLineage(
        parent_batch_id=source_batch.id,
        child_batch_id=transformed_batch.id,
        operation_type=OperationType.TRANSFORM,
        quantity_transferred=source_batch.remaining_quantity
    )
    db.add(lineage)

    # Source batch depleted
    source_batch.remaining_quantity = 0
    
    db.commit()
    db.refresh(transformed_batch)
    return transformed_batch

@router.get("/{id}/genealogy", response_model=List[BatchLineageResponse])
def get_batch_genealogy(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """
    Get full ancestry tree (lineage) for a batch.
    Returns all lineage records where this batch is a child, and their parents, recursively.
    """
    # Recursive CTE or iterative approach
    # For simplicity, iterative BFS to find all ancestors
    ancestors = []
    queue = [id]
    visited = set([id])
    
    while queue:
        current_id = queue.pop(0)
        lineages = db.query(BatchLineage).filter(BatchLineage.child_batch_id == current_id).all()
        for lin in lineages:
            ancestors.append(lin)
            if lin.parent_batch_id not in visited:
                visited.add(lin.parent_batch_id)
                queue.append(lin.parent_batch_id)
                
    return ancestors

@router.get("/{id}/descendants", response_model=List[BatchLineageResponse])
def get_batch_descendants(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """
    Get all downstream descendant batches.
    """
    descendants = []
    queue = [id]
    visited = set([id])
    
    while queue:
        current_id = queue.pop(0)
        lineages = db.query(BatchLineage).filter(BatchLineage.parent_batch_id == current_id).all()
        for lin in lineages:
            descendants.append(lin)
            if lin.child_batch_id not in visited:
                visited.add(lin.child_batch_id)
                queue.append(lin.child_batch_id)
                
    return descendants
