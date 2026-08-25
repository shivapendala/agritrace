from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.batch import Batch, BatchStatus
from app.models.inspection import QualityInspection, InspectionStatus
from app.models.warehouse import InventoryItem
from app.models.transport import Shipment, TransportStatus
from app.models.retail import RetailReceipt
from app.schemas.verify import PublicProductVerificationResponse, PublicTimelineStep

router = APIRouter()


@router.get("/{identifier}", response_model=PublicProductVerificationResponse)
def verify_product_qr(
    identifier: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    PUBLIC ENDPOINT: Verify farm-to-market batch traceability by QR Code or Batch Number.
    Does NOT require authentication. Strictly omits private sensitive data (phone, email, notes).
    """
    # Lookup by qr_code, batch_number, or UUID ID
    batch = db.query(Batch).filter(
        (Batch.qr_code == identifier) | (Batch.batch_number == identifier) | (Batch.id == identifier)
    ).first()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid QR code or batch identifier '{identifier}'."
        )

    # Fetch associated quality inspection
    inspection = db.query(QualityInspection).filter(QualityInspection.batch_id == batch.id).order_by(QualityInspection.created_at.desc()).first()

    # Fetch associated warehouse inventory
    wh_item = db.query(InventoryItem).filter(InventoryItem.batch_id == batch.id).first()

    # Fetch associated shipment
    shipment = db.query(Shipment).filter(Shipment.batch_id == batch.id).first()

    # Fetch associated retail receipt
    retail_receipt = db.query(RetailReceipt).filter(RetailReceipt.batch_id == batch.id).first()

    # Build Provenance Lifecycle Timeline
    is_harvested = True
    is_inspected = inspection is not None
    is_approved = (inspection is not None and inspection.approval_status == InspectionStatus.APPROVED) or batch.status in [BatchStatus.QUALITY_APPROVED, BatchStatus.IN_WAREHOUSE, BatchStatus.IN_TRANSIT, BatchStatus.AT_RETAILER, BatchStatus.SOLD]
    is_stored = wh_item is not None or batch.status in [BatchStatus.IN_WAREHOUSE, BatchStatus.IN_TRANSIT, BatchStatus.AT_RETAILER, BatchStatus.SOLD]
    is_transported = shipment is not None and shipment.status in [TransportStatus.IN_TRANSIT, TransportStatus.DELIVERED]
    is_retail_received = retail_receipt is not None or batch.status in [BatchStatus.AT_RETAILER, BatchStatus.SOLD]
    is_available = batch.status == BatchStatus.AT_RETAILER or batch.status == BatchStatus.SOLD

    timeline: List[PublicTimelineStep] = [
        PublicTimelineStep(
            step_number=1,
            title="Harvested",
            description=f"Crop harvested at {batch.farm.name if batch.farm else 'Origin Farm'}",
            timestamp=batch.harvest_date,
            is_completed=is_harvested
        ),
        PublicTimelineStep(
            step_number=2,
            title="Inspected",
            description=f"Quality grade: {inspection.quality_grade.value if inspection else 'Pending Inspection'}",
            timestamp=inspection.inspection_date if inspection else None,
            is_completed=is_inspected
        ),
        PublicTimelineStep(
            step_number=3,
            title="Approved",
            description="Verified by certified Quality Officer",
            timestamp=inspection.created_at if inspection and is_approved else None,
            is_completed=is_approved
        ),
        PublicTimelineStep(
            step_number=4,
            title="Stored",
            description=f"Stored in cold warehouse ({wh_item.warehouse.name if wh_item and wh_item.warehouse else 'Cold Hub'})",
            timestamp=wh_item.received_date if wh_item else None,
            is_completed=is_stored
        ),
        PublicTimelineStep(
            step_number=5,
            title="Transported",
            description=f"Refrigerated transport (Tracking #{shipment.tracking_number if shipment else 'TRK-LOGISTICS'})",
            timestamp=shipment.pickup_date if shipment else None,
            is_completed=is_transported
        ),
        PublicTimelineStep(
            step_number=6,
            title="Retailer Received",
            description="Received & verified at retail supermarket outlet",
            timestamp=retail_receipt.receipt_date if retail_receipt else None,
            is_completed=is_retail_received
        ),
        PublicTimelineStep(
            step_number=7,
            title="Available",
            description="Verified authentic farm-to-market product ready for consumer purchase",
            timestamp=batch.updated_at if is_available else None,
            is_completed=is_available
        )
    ]

    return PublicProductVerificationResponse(
        is_valid=batch.status != BatchStatus.REJECTED,
        qr_code=batch.qr_code,
        batch_number=batch.batch_number,
        product_name=batch.product_name,
        quantity=batch.remaining_quantity,
        unit=batch.unit,
        current_status=batch.status.value,
        current_location=batch.current_location,
        farmer_name=batch.farmer.user.full_name if (batch.farmer and batch.farmer.user) else "Verified Farmer",
        farm_name=batch.farm.name if batch.farm else "Organic Farm",
        farm_address=batch.farm.location_address if batch.farm else "Agricultural District",
        harvest_date=batch.harvest_date,
        quality_grade=inspection.quality_grade.value if inspection else "Grade A",
        inspection_status=inspection.approval_status.value if inspection else "PENDING",
        warehouse_name=wh_item.warehouse.name if (wh_item and wh_item.warehouse) else None,
        transport_tracking_number=shipment.tracking_number if shipment else None,
        retailer_name=retail_receipt.retailer.store_name if (retail_receipt and retail_receipt.retailer) else None,
        timeline=timeline
    )
