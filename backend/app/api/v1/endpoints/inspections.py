from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.batch import Batch, BatchStatus
from app.models.inspection import QualityInspection, InspectionStatus, QualityGrade
from app.schemas.inspection import InspectionCreate, InspectionReviewAction, InspectionResponse
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


@router.post("/", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def create_inspection(
    inspection_in: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.QUALITY_OFFICER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Record a new quality inspection for a batch.
    """
    batch = db.query(Batch).filter(Batch.id == inspection_in.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    inspection = QualityInspection(
        batch_id=batch.id,
        inspector_id=current_user.id,
        verified_weight=inspection_in.verified_weight,
        moisture_percentage=inspection_in.moisture_percentage,
        temperature_celsius=inspection_in.temperature_celsius,
        quality_grade=inspection_in.quality_grade,
        visual_condition=inspection_in.visual_condition,
        contamination_status=inspection_in.contamination_status,
        remarks=inspection_in.remarks,
        approval_status=InspectionStatus.PENDING
    )

    # Set batch status to QUALITY_PENDING
    batch.status = BatchStatus.QUALITY_PENDING

    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection


@router.get("/", response_model=List[InspectionResponse])
def list_inspections(
    batch_id: Optional[str] = Query(None),
    approval_status: Optional[InspectionStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List quality inspections with optional filters.
    """
    query = db.query(QualityInspection)

    if batch_id:
        query = query.filter(QualityInspection.batch_id == batch_id)
    if approval_status:
        query = query.filter(QualityInspection.approval_status == approval_status)

    return query.order_by(QualityInspection.created_at.desc()).all()


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get inspection details by ID.
    """
    inspection = db.query(QualityInspection).filter(QualityInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    return inspection


@router.put("/{inspection_id}/approve", response_model=InspectionResponse)
def approve_inspection(
    inspection_id: str,
    action: InspectionReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.QUALITY_OFFICER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Approve quality inspection and mark batch as QUALITY_APPROVED for warehouse entry.
    """
    inspection = db.query(QualityInspection).filter(QualityInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")

    inspection.approval_status = InspectionStatus.APPROVED
    if action.notes:
        inspection.remarks = f"{inspection.remarks or ''} | Approval Notes: {action.notes}".strip(" | ")

    batch = db.query(Batch).filter(Batch.id == inspection.batch_id).first()
    if batch:
        batch.status = BatchStatus.QUALITY_APPROVED

    db.commit()
    db.refresh(inspection)

    from app.services.notification_service import notify_user, notify_roles
    if batch and batch.farmer and batch.farmer.user_id:
        notify_user(
            db,
            recipient_id=batch.farmer.user_id,
            notification_type="QUALITY_APPROVED",
            title=f"Quality Approved - Batch #{batch.batch_number}",
            message=f"Batch #{batch.batch_number} ({batch.product_name}) passed quality inspection with Grade {inspection.quality_grade.value}."
        )
    notify_roles(
        db,
        roles=[UserRole.WAREHOUSE_MANAGER],
        notification_type="QUALITY_APPROVED",
        title="Approved Batch Ready for Warehouse",
        message=f"Batch #{batch.batch_number if batch else ''} approved for warehouse receiving."
    )

    return inspection


@router.put("/{inspection_id}/reject", response_model=InspectionResponse)
def reject_inspection(
    inspection_id: str,
    action: InspectionReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.QUALITY_OFFICER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Reject quality inspection and mark batch as REJECTED (blocked from normal inventory).
    """
    inspection = db.query(QualityInspection).filter(QualityInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")

    inspection.approval_status = InspectionStatus.REJECTED
    inspection.quality_grade = QualityGrade.REJECTED
    if action.notes:
        inspection.remarks = f"{inspection.remarks or ''} | Rejection Reason: {action.notes}".strip(" | ")

    batch = db.query(Batch).filter(Batch.id == inspection.batch_id).first()
    if batch:
        batch.status = BatchStatus.REJECTED

    db.commit()
    db.refresh(inspection)

    from app.services.notification_service import notify_user
    if batch and batch.farmer and batch.farmer.user_id:
        notify_user(
            db,
            recipient_id=batch.farmer.user_id,
            notification_type="QUALITY_REJECTED",
            title=f"Quality Rejected - Batch #{batch.batch_number}",
            message=f"Batch #{batch.batch_number} ({batch.product_name}) failed quality inspection and has been rejected."
        )

    return inspection


@router.put("/{inspection_id}/reinspect", response_model=InspectionResponse)
def request_reinspection(
    inspection_id: str,
    action: InspectionReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.QUALITY_OFFICER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Flag inspection for re-testing/reinspection.
    """
    inspection = db.query(QualityInspection).filter(QualityInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")

    inspection.approval_status = InspectionStatus.REQUIRES_REINSPECTION
    if action.notes:
        inspection.remarks = f"{inspection.remarks or ''} | Reinspection Notes: {action.notes}".strip(" | ")

    batch = db.query(Batch).filter(Batch.id == inspection.batch_id).first()
    if batch:
        batch.status = BatchStatus.QUALITY_PENDING

    db.commit()
    db.refresh(inspection)
    return inspection
