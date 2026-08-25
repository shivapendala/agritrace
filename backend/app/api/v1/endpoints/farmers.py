from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.farm import FarmerProfile, VerificationStatus
from app.schemas.farmer import FarmerProfileUpdate, FarmerProfileResponse, FarmerAdminAction
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/me/profile", response_model=FarmerProfileResponse)
def get_my_farmer_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FARMER]))
) -> Any:
    """
    Get current farmer profile details.
    """
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        profile = FarmerProfile(
            user_id=current_user.id,
            verification_status=VerificationStatus.UNVERIFIED
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/me/profile", response_model=FarmerProfileResponse)
def update_my_farmer_profile(
    profile_in: FarmerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.FARMER]))
) -> Any:
    """
    Update farmer contact and location address profile details.
    """
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not profile:
        profile = FarmerProfile(user_id=current_user.id, verification_status=VerificationStatus.UNVERIFIED)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/", response_model=List[FarmerProfileResponse])
def list_all_farmers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN]))
) -> Any:
    """
    List all farmer profiles (Super Admin only).
    """
    profiles = db.query(FarmerProfile).all()
    return profiles


@router.put("/{farmer_id}/verify", response_model=FarmerProfileResponse)
def verify_farmer(
    farmer_id: str,
    action: FarmerAdminAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Approve and verify a farmer profile (Super Admin only).
    """
    profile = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    profile.verification_status = VerificationStatus.VERIFIED
    if action.notes:
        profile.verification_notes = action.notes

    db.commit()
    db.refresh(profile)

    from app.services.notification_service import notify_user
    notify_user(
        db,
        recipient_id=profile.user_id,
        notification_type="FARMER_VERIFICATION",
        title="Profile Verification Approved",
        message="Your farmer profile has been verified by System Super Admin."
    )

    from app.services.audit_service import log_audit
    log_audit(db, action="FARMER_VERIFICATION", entity="FarmerProfile", entity_id=profile.id, user_id=current_user.id, metadata={"farmer_user_id": profile.user_id})

    return profile


@router.put("/{farmer_id}/suspend", response_model=FarmerProfileResponse)
def suspend_farmer(
    farmer_id: str,
    action: FarmerAdminAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Suspend a farmer profile (Super Admin only).
    """
    profile = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    profile.verification_status = VerificationStatus.SUSPENDED
    if action.notes:
        profile.verification_notes = action.notes

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{farmer_id}/history", response_model=FarmerProfileResponse)
def get_farmer_history(
    farmer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN]))
) -> Any:
    """
    View complete farm and crop activity history for a farmer (Super Admin only).
    """
    profile = db.query(FarmerProfile).filter(FarmerProfile.id == farmer_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")
    return profile
