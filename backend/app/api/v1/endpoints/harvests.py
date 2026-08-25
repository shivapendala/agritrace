from typing import Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.farm import FarmerProfile, Farm
from app.models.batch import Harvest, Batch, BatchStatus
from app.schemas.batch import HarvestCreate, HarvestResponse
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


def generate_unique_batch_number(db: Session, product_name: str) -> str:
    prefix = product_name[:3].upper() if len(product_name) >= 3 else product_name.upper().ljust(3, 'X')
    year = datetime.now(timezone.utc).year
    prefix_pattern = f"{prefix}-{year}-%"

    count = db.query(func.count(Batch.id)).filter(Batch.batch_number.like(prefix_pattern)).scalar() or 0
    seq = count + 1
    batch_number = f"{prefix}-{year}-{seq:04d}"

    # Ensure absolute uniqueness in case of race condition
    while db.query(Batch).filter(Batch.batch_number == batch_number).first():
        seq += 1
        batch_number = f"{prefix}-{year}-{seq:04d}"

    return batch_number


@router.post("/", response_model=HarvestResponse, status_code=status.HTTP_201_CREATED)
def record_harvest(
    harvest_in: HarvestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FARMER]))
) -> Any:
    """
    Record a new harvest and automatically generate a unique traceability batch.
    """
    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer_profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Farmer profile not initialized")

    farm = db.query(Farm).filter(Farm.id == harvest_in.farm_id, Farm.farmer_id == farmer_profile.id).first()
    if not farm and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found or not owned by farmer")

    harvest_date = harvest_in.harvest_date or datetime.now(timezone.utc)

    # 1. Create Harvest Record
    harvest = Harvest(
        farmer_id=farmer_profile.id,
        farm_id=harvest_in.farm_id,
        crop_id=harvest_in.crop_id,
        product_name=harvest_in.product_name,
        quantity=harvest_in.quantity,
        unit=harvest_in.unit,
        harvest_date=harvest_date,
        harvest_method=harvest_in.harvest_method,
        initial_grade=harvest_in.initial_grade,
        initial_quality_notes=harvest_in.initial_quality_notes
    )
    db.add(harvest)
    db.commit()
    db.refresh(harvest)

    # 2. Auto-generate Unique Batch
    batch_number = generate_unique_batch_number(db, harvest_in.product_name)
    batch = Batch(
        batch_number=batch_number,
        harvest_id=harvest.id,
        farmer_id=farmer_profile.id,
        farm_id=harvest_in.farm_id,
        product_name=harvest_in.product_name,
        initial_quantity=harvest_in.quantity,
        remaining_quantity=harvest_in.quantity,
        unit=harvest_in.unit,
        harvest_date=harvest_date,
        current_location=farm.location_address if farm else "Farm Gate",
        status=BatchStatus.HARVESTED
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    db.refresh(harvest)
    return harvest


@router.get("/", response_model=List[HarvestResponse])
def list_harvests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List recorded harvests.
    """
    if current_user.role == UserRole.SUPER_ADMIN:
        return db.query(Harvest).order_by(Harvest.created_at.desc()).all()

    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer_profile:
        return []
    return db.query(Harvest).filter(Harvest.farmer_id == farmer_profile.id).order_by(Harvest.created_at.desc()).all()
