from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.batch import Batch, BatchStatus
from app.models.warehouse import Warehouse, InventoryItem, InventoryStatus
from app.schemas.warehouse import (
    InventoryReceive,
    InventoryMove,
    InventorySplit,
    InventoryAdjust,
    InventoryDispatch,
    InventoryResponse
)
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


@router.post("/receive", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def receive_inventory_batch(
    item_in: InventoryReceive,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Receive an approved batch into warehouse stock. Movement of REJECTED batches is forbidden.
    """
    batch = db.query(Batch).filter(Batch.id == item_in.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    # STAGE 6 REJECTION GUARD: Reject movement of defective / rejected batches
    if batch.status == BatchStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Movement or receiving of REJECTED batches into warehouse inventory is strictly forbidden."
        )

    warehouse = db.query(Warehouse).filter(Warehouse.id == item_in.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

    # Check capacity limit
    if warehouse.occupied_capacity_kg + item_in.quantity > warehouse.total_capacity_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Warehouse capacity exceeded. Available space: {warehouse.total_capacity_kg - warehouse.occupied_capacity_kg} KG."
        )

    inventory_item = InventoryItem(
        batch_id=batch.id,
        warehouse_id=warehouse.id,
        storage_location_id=item_in.storage_location_id,
        initial_quantity=item_in.quantity,
        current_quantity=item_in.quantity,
        unit=item_in.unit,
        expiry_date=item_in.expiry_date,
        status=InventoryStatus.IN_STOCK,
        notes=item_in.notes
    )

    # Update warehouse capacity & batch status
    warehouse.occupied_capacity_kg += item_in.quantity
    batch.status = BatchStatus.IN_WAREHOUSE
    batch.current_location = f"Warehouse: {warehouse.name}"

    db.add(inventory_item)
    db.commit()
    db.refresh(inventory_item)

    from app.services.notification_service import notify_user, notify_roles
    notify_roles(
        db,
        roles=[UserRole.WAREHOUSE_MANAGER],
        notification_type="BATCH_RECEIVED",
        title=f"Batch Received - Warehouse {warehouse.name}",
        message=f"Batch #{batch.batch_number} ({item_in.quantity} {item_in.unit}) stored in Warehouse {warehouse.name}."
    )
    if batch and batch.farmer and batch.farmer.user_id:
        notify_user(
            db,
            recipient_id=batch.farmer.user_id,
            notification_type="BATCH_RECEIVED",
            title=f"Batch Received in Warehouse",
            message=f"Your batch #{batch.batch_number} has been received into Warehouse {warehouse.name}."
        )

    return inventory_item


@router.get("/", response_model=List[InventoryResponse])
def list_inventory(
    warehouse_id: Optional[str] = Query(None),
    status_filter: Optional[InventoryStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List active inventory stock.
    """
    query = db.query(InventoryItem)
    if warehouse_id:
        query = query.filter(InventoryItem.warehouse_id == warehouse_id)
    if status_filter:
        query = query.filter(InventoryItem.status == status_filter)

    return query.order_by(InventoryItem.created_at.desc()).all()


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory_item(
    inventory_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get inventory item details.
    """
    item = db.query(InventoryItem).filter(InventoryItem.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return item


@router.put("/{inventory_id}/move", response_model=InventoryResponse)
def move_inventory_item(
    inventory_id: str,
    move_in: InventoryMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Relocate inventory to a new warehouse or storage location.
    """
    item = db.query(InventoryItem).filter(InventoryItem.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    target_wh = db.query(Warehouse).filter(Warehouse.id == move_in.target_warehouse_id).first()
    if not target_wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target warehouse not found")

    old_wh = db.query(Warehouse).filter(Warehouse.id == item.warehouse_id).first()
    if old_wh and old_wh.id != target_wh.id:
        old_wh.occupied_capacity_kg = max(0.0, old_wh.occupied_capacity_kg - item.current_quantity)
        target_wh.occupied_capacity_kg += item.current_quantity

    item.warehouse_id = target_wh.id
    if move_in.target_storage_location_id:
        item.storage_location_id = move_in.target_storage_location_id
    if move_in.notes:
        item.notes = f"{item.notes or ''} | Moved: {move_in.notes}".strip(" | ")

    # Update batch location text
    if item.batch:
        item.batch.current_location = f"Warehouse: {target_wh.name}"

    db.commit()
    db.refresh(item)
    return item


@router.post("/{inventory_id}/split", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def split_inventory_item(
    inventory_id: str,
    split_in: InventorySplit,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Split inventory stock into a separate allocation record.
    """
    parent_item = db.query(InventoryItem).filter(InventoryItem.id == inventory_id).first()
    if not parent_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    if split_in.split_quantity >= parent_item.current_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Split quantity ({split_in.split_quantity}) must be less than current stock ({parent_item.current_quantity})."
        )

    parent_item.current_quantity -= split_in.split_quantity

    new_item = InventoryItem(
        batch_id=parent_item.batch_id,
        warehouse_id=parent_item.warehouse_id,
        storage_location_id=split_in.new_storage_location_id or parent_item.storage_location_id,
        initial_quantity=split_in.split_quantity,
        current_quantity=split_in.split_quantity,
        unit=parent_item.unit,
        expiry_date=parent_item.expiry_date,
        status=InventoryStatus.IN_STOCK,
        notes=f"Split from parent allocation #{parent_item.id[:8]}. {split_in.notes or ''}".strip()
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.put("/{inventory_id}/adjust", response_model=InventoryResponse)
def adjust_inventory_quantity(
    inventory_id: str,
    adjust_in: InventoryAdjust,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Adjust stock count with reason logging. Prevents negative inventory.
    """
    item = db.query(InventoryItem).filter(InventoryItem.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    diff = adjust_in.new_quantity - item.current_quantity
    item.current_quantity = adjust_in.new_quantity
    item.notes = f"{item.notes or ''} | Adjustment ({diff:+.1f} {item.unit}): {adjust_in.reason}".strip(" | ")

    wh = db.query(Warehouse).filter(Warehouse.id == item.warehouse_id).first()
    if wh:
        wh.occupied_capacity_kg = max(0.0, wh.occupied_capacity_kg + diff)

    db.commit()
    db.refresh(item)
    return item


@router.post("/{inventory_id}/dispatch", response_model=InventoryResponse)
def dispatch_inventory_item(
    inventory_id: str,
    dispatch_in: InventoryDispatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Dispatch quantity for transport. Updates batch status to IN_TRANSIT.
    """
    item = db.query(InventoryItem).filter(InventoryItem.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    if dispatch_in.dispatch_quantity > item.current_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dispatch quantity ({dispatch_in.dispatch_quantity}) exceeds available stock ({item.current_quantity})."
        )

    item.current_quantity -= dispatch_in.dispatch_quantity
    if item.current_quantity == 0:
        item.status = InventoryStatus.DISPATCHED

    wh = db.query(Warehouse).filter(Warehouse.id == item.warehouse_id).first()
    if wh:
        wh.occupied_capacity_kg = max(0.0, wh.occupied_capacity_kg - dispatch_in.dispatch_quantity)

    # Update batch status to IN_TRANSIT & location to destination
    if item.batch:
        item.batch.status = BatchStatus.IN_TRANSIT
        item.batch.current_location = f"In Transit to {dispatch_in.destination_address}"

    db.commit()
    db.refresh(item)
    return item
