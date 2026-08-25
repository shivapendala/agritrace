from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.farm import FarmerProfile, Farm, Crop, VerificationStatus
from app.schemas.farmer import FarmCreate, FarmUpdate, FarmResponse, CropCreate, CropResponse
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


def get_or_create_farmer_profile(db: Session, user_id: str) -> FarmerProfile:
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    if not profile:
        profile = FarmerProfile(
            user_id=user_id,
            verification_status=VerificationStatus.UNVERIFIED
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.post("/", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
def create_farm(
    farm_in: FarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FARMER]))
) -> Any:
    """
    Create a new farm for authenticated farmer.
    """
    farmer_profile = get_or_create_farmer_profile(db, current_user.id)

    if farmer_profile.verification_status == VerificationStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your farmer account is currently suspended."
        )

    farm = Farm(
        farmer_id=farmer_profile.id,
        name=farm_in.name,
        location_address=farm_in.location_address,
        latitude=farm_in.latitude,
        longitude=farm_in.longitude,
        total_area_hectares=farm_in.total_area_hectares,
        soil_type=farm_in.soil_type,
        irrigation_type=farm_in.irrigation_type
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.get("/", response_model=List[FarmResponse])
def list_farms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List farms belonging to current farmer (or all farms if SUPER_ADMIN).
    """
    if current_user.role == UserRole.SUPER_ADMIN:
        return db.query(Farm).all()

    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer_profile:
        return []
    return db.query(Farm).filter(Farm.farmer_id == farmer_profile.id).all()


@router.get("/{farm_id}", response_model=FarmResponse)
def get_farm(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get farm details by ID.
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    return farm


@router.put("/{farm_id}", response_model=FarmResponse)
def update_farm(
    farm_id: str,
    farm_in: FarmUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FARMER]))
) -> Any:
    """
    Update farm parameters.
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")

    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer_profile or (farm.farmer_id != farmer_profile.id and current_user.role != UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this farm")

    update_data = farm_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(farm, field, value)

    db.commit()
    db.refresh(farm)
    return farm


@router.post("/{farm_id}/crops", response_model=CropResponse, status_code=status.HTTP_201_CREATED)
def add_crop_to_farm(
    farm_id: str,
    crop_in: CropCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FARMER]))
) -> Any:
    """
    Add a new crop to a farm.
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")

    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not farmer_profile or (farm.farmer_id != farmer_profile.id and current_user.role != UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add crops to this farm")

    crop = Crop(
        farm_id=farm.id,
        name=crop_in.name,
        variety=crop_in.variety,
        planting_date=crop_in.planting_date,
        expected_harvest_date=crop_in.expected_harvest_date,
        status=crop_in.status
    )
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop


@router.get("/{farm_id}/crops", response_model=List[CropResponse])
def list_crops_for_farm(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List all crops planted on a farm.
    """
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    return farm.crops
