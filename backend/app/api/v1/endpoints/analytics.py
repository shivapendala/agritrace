import csv
import io
from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.role import UserRole
from app.models.farm import FarmerProfile, Farm
from app.models.batch import Harvest, Batch, BatchStatus
from app.models.inspection import QualityInspection, InspectionStatus, QualityGrade
from app.models.warehouse import Warehouse, InventoryItem
from app.models.transport import Shipment, TransportStatus, TemperatureLog
from app.models.retail import RetailerProfile, RetailReceipt, RetailInventory
from app.schemas.analytics import AnalyticsOverviewResponse, ReportRow
from app.api.v1.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get high-level supply chain analytics overview metrics across all 10 key performance indicators.
    """
    total_farmers = db.query(FarmerProfile).count()
    total_farms = db.query(Farm).count()
    total_batches = db.query(Batch).count()
    approved_batches = db.query(Batch).filter(Batch.status == BatchStatus.QUALITY_APPROVED).count()
    rejected_batches = db.query(Batch).filter(Batch.status == BatchStatus.REJECTED).count()
    
    total_stock_kg = db.query(func.sum(InventoryItem.current_quantity)).scalar() or 0.0
    shipments_in_transit = db.query(Shipment).filter(Shipment.status == TransportStatus.IN_TRANSIT).count()
    total_retailers = db.query(RetailerProfile).count()
    verified_products = db.query(Batch).filter(Batch.status.in_([BatchStatus.QUALITY_APPROVED, BatchStatus.IN_WAREHOUSE, BatchStatus.IN_TRANSIT, BatchStatus.AT_RETAILER, BatchStatus.SOLD])).count()
    temp_alerts = db.query(TemperatureLog).filter(TemperatureLog.is_breach == True).count()

    return AnalyticsOverviewResponse(
        total_farmers=total_farmers,
        total_farms=total_farms,
        total_batches=total_batches,
        approved_batches=approved_batches,
        rejected_batches=rejected_batches,
        total_warehouse_stock_kg=float(total_stock_kg),
        shipments_in_transit=shipments_in_transit,
        total_retailers=total_retailers,
        verified_products_count=verified_products,
        temperature_alerts_count=temp_alerts
    )


@router.get("/reports", response_model=List[ReportRow])
def generate_supply_chain_report(
    report_type: str = Query("harvest", description="harvest, quality, inventory, shipment, retailer, traceability, temperature"),
    farmer_id: Optional[str] = Query(None),
    product_name: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    batch_number: Optional[str] = Query(None),
    quality_grade: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Generate customizable supply chain analytics report with parametric filtering.
    """
    rows: List[ReportRow] = []

    if report_type == "harvest":
        query = db.query(Harvest)
        if farmer_id:
            query = query.filter(Harvest.farmer_id == farmer_id)
        if product_name:
            query = query.filter(Harvest.product_name.ilike(f"%{product_name}%"))
        
        harvests = query.order_by(Harvest.harvest_date.desc()).all()
        for h in harvests:
            b_num = h.batch.batch_number if h.batch else "NO-BATCH"
            rows.append(ReportRow(
                record_id=h.id,
                date=h.harvest_date.strftime("%Y-%m-%d"),
                type="Harvest Log",
                batch_number=b_num,
                product_name=h.product_name,
                details=f"Method: {h.harvest_method} | Initial Grade: {h.initial_grade or 'N/A'}",
                status="HARVESTED",
                metric_value=h.quantity
            ))

    elif report_type == "quality":
        query = db.query(QualityInspection)
        if quality_grade:
            query = query.filter(QualityInspection.quality_grade == quality_grade)
        
        inspections = query.order_by(QualityInspection.created_at.desc()).all()
        for insp in inspections:
            b = insp.batch
            if product_name and b and product_name.lower() not in b.product_name.lower():
                continue
            rows.append(ReportRow(
                record_id=insp.id,
                date=insp.inspection_date.strftime("%Y-%m-%d"),
                type="Quality Inspection",
                batch_number=b.batch_number if b else "N/A",
                product_name=b.product_name if b else "Product",
                details=f"Weight: {insp.verified_weight} KG | Moisture: {insp.moisture_percentage or 0}% | Temp: {insp.temperature_celsius or 0}°C",
                status=insp.approval_status.value,
                metric_value=insp.verified_weight
            ))

    elif report_type == "inventory":
        query = db.query(InventoryItem)
        if warehouse_id:
            query = query.filter(InventoryItem.warehouse_id == warehouse_id)
        
        items = query.order_by(InventoryItem.created_at.desc()).all()
        for item in items:
            b = item.batch
            wh_name = item.warehouse.name if item.warehouse else "Warehouse"
            rows.append(ReportRow(
                record_id=item.id,
                date=item.received_date.strftime("%Y-%m-%d"),
                type="Warehouse Stock",
                batch_number=b.batch_number if b else "N/A",
                product_name=b.product_name if b else "Product",
                details=f"Warehouse: {wh_name} | Location: {item.storage_location_id or 'General'}",
                status=item.status.value,
                metric_value=item.current_quantity
            ))

    elif report_type == "temperature":
        query = db.query(TemperatureLog).filter(TemperatureLog.is_breach == True)
        logs = query.order_by(TemperatureLog.timestamp.desc()).all()
        for l in logs:
            tr = l.shipment.tracking_number if l.shipment else "TRK-LOG"
            b = l.shipment.batch if l.shipment else None
            rows.append(ReportRow(
                record_id=l.id,
                date=l.timestamp.strftime("%Y-%m-%d %H:%M"),
                type="Temperature Warning Alert",
                batch_number=b.batch_number if b else "N/A",
                product_name=b.product_name if b else "Sensitive Product",
                details=l.breach_message or f"Recorded temp {l.recorded_temp_celsius}°C outside safety threshold",
                status="COLD_CHAIN_ALERT",
                metric_value=l.recorded_temp_celsius
            ))

    else: # Default Batch Traceability report
        query = db.query(Batch)
        if batch_number:
            query = query.filter(Batch.batch_number.ilike(f"%{batch_number}%"))
        if product_name:
            query = query.filter(Batch.product_name.ilike(f"%{product_name}%"))

        batches = query.order_by(Batch.created_at.desc()).all()
        for b in batches:
            rows.append(ReportRow(
                record_id=b.id,
                date=b.harvest_date.strftime("%Y-%m-%d"),
                type="Batch Traceability Passport",
                batch_number=b.batch_number,
                product_name=b.product_name,
                details=f"Location: {b.current_location} | QR: {b.qr_code}",
                status=b.status.value,
                metric_value=b.remaining_quantity
            ))

    return rows


@router.get("/reports/export-csv")
def export_report_csv(
    report_type: str = Query("harvest"),
    farmer_id: Optional[str] = Query(None),
    product_name: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    quality_grade: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Response:
    """
    Export supply chain analytics report to downloadable CSV file format.
    """
    rows = generate_supply_chain_report(
        report_type=report_type,
        farmer_id=farmer_id,
        product_name=product_name,
        warehouse_id=warehouse_id,
        quality_grade=quality_grade,
        db=db,
        current_user=current_user
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Record ID", "Date", "Report Type", "Batch Number", "Product Name", "Details", "Status", "Metric Value"])

    for r in rows:
        writer.writerow([r.record_id, r.date, r.type, r.batch_number, r.product_name, r.details, r.status, r.metric_value or 0])

    csv_data = output.getvalue()
    filename = f"agritrace_{report_type}_report_{datetime.now().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
