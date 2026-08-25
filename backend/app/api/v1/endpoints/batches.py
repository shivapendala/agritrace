from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.batch import Batch, BatchStatus
from app.schemas.batch import BatchResponse, BatchStatusUpdate, BatchQuantityDeduct
from app.api.v1.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[BatchResponse])
def list_batches(
    status_filter: Optional[BatchStatus] = Query(None, alias="status"),
    farm_id: Optional[str] = Query(None),
    product_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List traceability batches with optional filters.
    """
    query = db.query(Batch)

    if status_filter:
        query = query.filter(Batch.status == status_filter)
    if farm_id:
        query = query.filter(Batch.farm_id == farm_id)
    if product_name:
        query = query.filter(Batch.product_name.ilike(f"%{product_name}%"))

    return query.order_by(Batch.created_at.desc()).all()


@router.get("/{identifier}", response_model=BatchResponse)
def get_batch_by_id_or_number(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get detailed batch information by UUID ID or Batch Number (e.g. TOM-2026-0001).
    """
    batch = db.query(Batch).filter(
        (Batch.id == identifier) | (Batch.batch_number == identifier)
    ).first()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch with identifier '{identifier}' not found."
        )

    return batch


@router.put("/{batch_id}/status", response_model=BatchResponse)
def update_batch_status(
    batch_id: str,
    status_in: BatchStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update batch lifecycle status and current location.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    batch.status = status_in.status
    if status_in.current_location:
        batch.current_location = status_in.current_location

    db.commit()
    db.refresh(batch)
    return batch


@router.post("/{batch_id}/deduct", response_model=BatchResponse)
def deduct_batch_quantity(
    batch_id: str,
    deduct_in: BatchQuantityDeduct,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Deduct quantity from remaining batch inventory with strict validation guards.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )

    if deduct_in.quantity_to_deduct > batch.remaining_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot deduct {deduct_in.quantity_to_deduct} {batch.unit}. Only {batch.remaining_quantity} {batch.unit} remaining in batch."
        )

    batch.remaining_quantity -= deduct_in.quantity_to_deduct
    if batch.remaining_quantity == 0:
        batch.status = BatchStatus.SOLD

    db.commit()
    db.refresh(batch)
    return batch
