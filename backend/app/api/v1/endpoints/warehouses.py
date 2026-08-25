from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.warehouse import Warehouse, StorageZone, StorageLocation
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseResponse,
    StorageZoneCreate,
    StorageZoneResponse,
    StorageLocationCreate,
    StorageLocationResponse
)
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


@router.post("/", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    warehouse_in: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Create a new cold storage warehouse facility.
    """
    existing_wh = db.query(Warehouse).filter(Warehouse.code == warehouse_in.code).first()
    if existing_wh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Warehouse with code '{warehouse_in.code}' already exists."
        )

    warehouse = Warehouse(
        name=warehouse_in.name,
        code=warehouse_in.code,
        location_address=warehouse_in.location_address,
        manager_id=current_user.id,
        total_capacity_kg=warehouse_in.total_capacity_kg,
        occupied_capacity_kg=0.0,
        target_temperature_celsius=warehouse_in.target_temperature_celsius,
        is_cold_storage=warehouse_in.is_cold_storage,
        is_active=True
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.get("/", response_model=List[WarehouseResponse])
def list_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List all warehouses.
    """
    return db.query(Warehouse).all()


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get detailed warehouse information.
    """
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    return wh


@router.post("/{warehouse_id}/zones", response_model=StorageZoneResponse, status_code=status.HTTP_201_CREATED)
def create_storage_zone(
    warehouse_id: str,
    zone_in: StorageZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Create a new storage zone in a warehouse.
    """
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    zone = StorageZone(
        warehouse_id=wh.id,
        name=zone_in.name,
        code=zone_in.code,
        zone_type=zone_in.zone_type,
        temperature_celsius=zone_in.temperature_celsius,
        capacity_kg=zone_in.capacity_kg
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.post("/zones/{zone_id}/locations", response_model=StorageLocationResponse, status_code=status.HTTP_201_CREATED)
def create_storage_location(
    zone_id: str,
    loc_in: StorageLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Create a specific aisle/rack/shelf location within a storage zone.
    """
    zone = db.query(StorageZone).filter(StorageZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage zone not found")

    code = f"{loc_in.aisle}-{loc_in.rack}-{loc_in.shelf}"
    location = StorageLocation(
        zone_id=zone.id,
        aisle=loc_in.aisle,
        rack=loc_in.rack,
        shelf=loc_in.shelf,
        code=code
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location
