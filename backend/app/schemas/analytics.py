from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class AnalyticsOverviewResponse(BaseModel):
    total_farmers: int
    total_farms: int
    total_batches: int
    approved_batches: int
    rejected_batches: int
    total_warehouse_stock_kg: float
    shipments_in_transit: int
    total_retailers: int
    verified_products_count: int
    temperature_alerts_count: int


class ReportFilterParams(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    farmer_id: Optional[str] = None
    product_name: Optional[str] = None
    warehouse_id: Optional[str] = None
    retailer_id: Optional[str] = None
    batch_number: Optional[str] = None
    quality_grade: Optional[str] = None


class ReportRow(BaseModel):
    record_id: str
    date: str
    type: str
    batch_number: str
    product_name: str
    details: str
    status: str
    metric_value: Optional[float] = None
