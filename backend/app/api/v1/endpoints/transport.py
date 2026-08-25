import random
from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.batch import Batch, BatchStatus
from app.models.transport import Vehicle, DriverProfile, Shipment, TemperatureLog, TransportStatus
from app.schemas.transport import (
    VehicleCreate,
    VehicleResponse,
    DriverCreate,
    DriverResponse,
    ShipmentCreate,
    ShipmentAssign,
    ShipmentStatusUpdate,
    TemperatureLogCreate,
    TemperatureLogResponse,
    ShipmentResponse
)
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


def generate_tracking_number() -> str:
    year = datetime.now(timezone.utc).year
    rand_seq = random.randint(1000, 9999)
    return f"TRK-{year}-{rand_seq}"


# VEHICLE ENDPOINTS
@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TRANSPORT_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Register a cold-chain fleet vehicle.
    """
    existing = db.query(Vehicle).filter(Vehicle.license_plate == vehicle_in.license_plate).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="License plate already registered")

    vehicle = Vehicle(
        license_plate=vehicle_in.license_plate,
        vehicle_type=vehicle_in.vehicle_type,
        capacity_kg=vehicle_in.capacity_kg,
        is_temperature_controlled=vehicle_in.is_temperature_controlled,
        min_temp_celsius=vehicle_in.min_temp_celsius,
        max_temp_celsius=vehicle_in.max_temp_celsius,
        is_available=True
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/vehicles", response_model=List[VehicleResponse])
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List transport vehicles.
    """
    return db.query(Vehicle).all()


# DRIVER ENDPOINTS
@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def register_driver(
    driver_in: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TRANSPORT_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Register a driver profile.
    """
    existing = db.query(DriverProfile).filter(DriverProfile.license_number == driver_in.license_number).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Driver license number already registered")

    driver = DriverProfile(
        user_id=driver_in.user_id,
        license_number=driver_in.license_number,
        phone_number=driver_in.phone_number,
        is_available=True
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.get("/drivers", response_model=List[DriverResponse])
def list_drivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List registered driver profiles.
    """
    return db.query(DriverProfile).all()


# SHIPMENT ENDPOINTS
@router.post("/shipments", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    shipment_in: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TRANSPORT_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Create a new transport shipment order.
    """
    batch = db.query(Batch).filter(Batch.id == shipment_in.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    tracking_num = generate_tracking_number()
    shipment = Shipment(
        tracking_number=tracking_num,
        batch_id=batch.id,
        origin_warehouse_id=shipment_in.origin_warehouse_id,
        destination_address=shipment_in.destination_address,
        min_temp_required=shipment_in.min_temp_required,
        max_temp_required=shipment_in.max_temp_required,
        notes=shipment_in.notes,
        status=TransportStatus.CREATED
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/shipments", response_model=List[ShipmentResponse])
def list_shipments(
    status_filter: Optional[TransportStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List transport shipments.
    """
    query = db.query(Shipment)
    if status_filter:
        query = query.filter(Shipment.status == status_filter)
    return query.order_by(Shipment.created_at.desc()).all()


@router.get("/shipments/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get detailed shipment record including cold chain telemetry logs.
    """
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment


@router.put("/shipments/{shipment_id}/assign", response_model=ShipmentResponse)
def assign_shipment_vehicle_and_driver(
    shipment_id: str,
    assign_in: ShipmentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TRANSPORT_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Assign vehicle and driver to shipment order. Sets status to ASSIGNED.
    """
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    vehicle = db.query(Vehicle).filter(Vehicle.id == assign_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    driver = db.query(DriverProfile).filter(DriverProfile.id == assign_in.driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

    shipment.vehicle_id = vehicle.id
    shipment.driver_id = driver.id
    shipment.status = TransportStatus.ASSIGNED

    db.commit()
    db.refresh(shipment)
    return shipment


@router.put("/shipments/{shipment_id}/status", response_model=ShipmentResponse)
def update_shipment_status(
    shipment_id: str,
    status_in: ShipmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.TRANSPORT_MANAGER, UserRole.DRIVER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Advance shipment status (PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED).
    """
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    shipment.status = status_in.status
    if status_in.notes:
        shipment.notes = f"{shipment.notes or ''} | {status_in.notes}".strip(" | ")

    if status_in.status == TransportStatus.PICKED_UP:
        shipment.pickup_date = datetime.now(timezone.utc)
    elif status_in.status == TransportStatus.DELIVERED:
        shipment.delivery_date = datetime.now(timezone.utc)

    # Link batch status
    if shipment.batch:
        if status_in.status in [TransportStatus.PICKED_UP, TransportStatus.IN_TRANSIT, TransportStatus.OUT_FOR_DELIVERY]:
            shipment.batch.status = BatchStatus.IN_TRANSIT
            shipment.batch.current_location = f"In Transit on Vehicle ({shipment.vehicle.license_plate if shipment.vehicle else 'Truck'})"
        elif status_in.status == TransportStatus.DELIVERED:
            shipment.batch.status = BatchStatus.AT_RETAILER
            shipment.batch.current_location = f"Delivered to {shipment.destination_address}"

    db.commit()
    db.refresh(shipment)
    return shipment


# TELEMETRY & BREACH ALERT ENDPOINT
@router.post("/shipments/{shipment_id}/telemetry", response_model=TemperatureLogResponse, status_code=status.HTTP_201_CREATED)
def record_temperature_telemetry(
    shipment_id: str,
    telemetry_in: TemperatureLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Record sensor temperature reading. Automatically checks for cold-chain threshold breaches and triggers alert!
    """
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    temp = telemetry_in.recorded_temp_celsius
    is_breach = False
    breach_msg = None

    # Check bounds
    if temp < shipment.min_temp_required or temp > shipment.max_temp_required:
        is_breach = True
        breach_msg = f"COLD CHAIN BREACH ALERT! Recorded {temp}°C outside safe threshold ({shipment.min_temp_required}°C - {shipment.max_temp_required}°C)."

    log_entry = TemperatureLog(
        shipment_id=shipment.id,
        recorded_temp_celsius=temp,
        location_lat=telemetry_in.location_lat,
        location_lng=telemetry_in.location_lng,
        is_breach=is_breach,
        breach_message=breach_msg
    )

    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
