from typing import Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.batch import Batch, BatchStatus
from app.models.transport import Shipment, TransportStatus
from app.models.retail import RetailerProfile, RetailReceipt, RetailInventory, ReceiptStatus
from app.schemas.retail import (
    RetailerProfileCreate,
    RetailerProfileResponse,
    RetailReceiptCreate,
    RetailReceiptResponse,
    RetailInventoryResponse
)
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


@router.post("/profile", response_model=RetailerProfileResponse, status_code=status.HTTP_201_CREATED)
def create_retailer_profile(
    profile_in: RetailerProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RETAILER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Register a retail store profile.
    """
    existing = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
    if existing:
        return existing

    profile = RetailerProfile(
        user_id=current_user.id,
        store_name=profile_in.store_name,
        store_code=profile_in.store_code,
        address=profile_in.address,
        contact_phone=profile_in.contact_phone,
        is_verified=True
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/profile/me", response_model=RetailerProfileResponse)
def get_my_retailer_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current logged-in retailer profile.
    """
    profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Retailer profile not found")
    return profile


@router.post("/receipts", response_model=RetailReceiptResponse, status_code=status.HTTP_201_CREATED)
def confirm_delivery_receipt(
    receipt_in: RetailReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RETAILER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Confirm receipt of incoming shipment, verify quantity, log damaged products, and add to retail stock.
    """
    shipment = db.query(Shipment).filter(Shipment.id == receipt_in.shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    batch = db.query(Batch).filter(Batch.id == shipment.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated batch not found")

    retailer = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
    if not retailer:
        # Auto-create fallback profile if missing
        retailer = RetailerProfile(
            user_id=current_user.id,
            store_name=f"{current_user.full_name}'s Supermarket",
            store_code=f"STORE-{current_user.id[:6].upper()}",
            address=shipment.destination_address,
            contact_phone="+1-800-RETAIL",
            is_verified=True
        )
        db.add(retailer)
        db.commit()
        db.refresh(retailer)

    # Determine status
    if receipt_in.accepted_quantity <= 0:
        receipt_status = ReceiptStatus.REJECTED_ON_DELIVERY
    elif receipt_in.damaged_quantity > 0:
        receipt_status = ReceiptStatus.PARTIALLY_ACCEPTED
    else:
        receipt_status = ReceiptStatus.ACCEPTED

    receipt = RetailReceipt(
        retailer_id=retailer.id,
        shipment_id=shipment.id,
        batch_id=batch.id,
        received_quantity=receipt_in.received_quantity,
        accepted_quantity=receipt_in.accepted_quantity,
        damaged_quantity=receipt_in.damaged_quantity,
        damage_reason=receipt_in.damage_reason,
        status=receipt_status,
        notes=receipt_in.notes
    )

    # Update Shipment & Batch lifecycle status
    shipment.status = TransportStatus.DELIVERED
    if receipt_status in [ReceiptStatus.ACCEPTED, ReceiptStatus.PARTIALLY_ACCEPTED]:
        batch.status = BatchStatus.AT_RETAILER
        batch.current_location = f"Retail Store: {retailer.store_name}"

        # Create Retail Inventory Record
        retail_inv = RetailInventory(
            retailer_id=retailer.id,
            batch_id=batch.id,
            received_quantity=receipt_in.accepted_quantity,
            current_quantity=receipt_in.accepted_quantity,
            unit=batch.unit,
            shelf_location="Produce Display A1"
        )
        db.add(retail_inv)

    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    from app.services.notification_service import notify_user, notify_roles
    notify_user(
        db,
        recipient_id=current_user.id,
        notification_type="RETAILER_RECEIPT",
        title="Delivery Receipt Confirmed",
        message=f"Confirmed receipt for Batch #{batch.batch_number if batch else ''}. Accepted Qty: {receipt_in.accepted_quantity} {batch.unit if batch else 'KG'}."
    )
    notify_roles(
        db,
        roles=[UserRole.TRANSPORT_MANAGER, UserRole.SUPER_ADMIN],
        notification_type="RETAILER_RECEIPT",
        title=f"Retail Delivery Verified - #{shipment.tracking_number}",
        message=f"Retailer confirmed delivery for shipment #{shipment.tracking_number}."
    )

    return receipt


@router.get("/receipts", response_model=List[RetailReceiptResponse])
def list_retail_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List retailer delivery receipts.
    """
    return db.query(RetailReceipt).order_by(RetailReceipt.receipt_date.desc()).all()


@router.get("/inventory", response_model=List[RetailInventoryResponse])
def list_retail_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List retail store inventory stock.
    """
    return db.query(RetailInventory).order_by(RetailInventory.received_date.desc()).all()
