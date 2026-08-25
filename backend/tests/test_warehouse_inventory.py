from app.models.user import UserRole
from app.models.batch import BatchStatus
from app.models.inspection import QualityGrade


def create_user_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": f"User {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def setup_approved_batch(client):
    farmer_headers = create_user_token(client, "farmer_wh@agritrace.org", UserRole.FARMER)
    quality_headers = create_user_token(client, "officer_wh@agritrace.org", UserRole.QUALITY_OFFICER)

    farm = client.post("/api/v1/farms/", json={
        "name": "Warehouse Test Farm",
        "location_address": "Farm Road 1",
        "total_area_hectares": 10.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()

    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Premium Apples",
        "quantity": 1000.0,
        "unit": "KG"
    }, headers=farmer_headers).json()

    batch_id = harvest["batch"]["id"]

    # Record & Approve Inspection
    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 1000.0,
        "quality_grade": QualityGrade.A.value,
        "visual_condition": "Grade A"
    }, headers=quality_headers).json()

    client.put(f"/api/v1/inspections/{insp['id']}/approve", json={"notes": "Approved for storage"}, headers=quality_headers)
    return batch_id


def test_warehouse_and_zone_creation(client):
    wh_headers = create_user_token(client, "wh_mgr1@agritrace.org", UserRole.WAREHOUSE_MANAGER)

    wh_res = client.post("/api/v1/warehouses/", json={
        "name": "Central Cold Hub A",
        "code": "WH-CENTRAL-A",
        "location_address": "Logistics Park, Zone 4",
        "total_capacity_kg": 50000.0,
        "target_temperature_celsius": 4.0,
        "is_cold_storage": True
    }, headers=wh_headers)

    assert wh_res.status_code == 201
    wh_data = wh_res.json()
    assert wh_data["code"] == "WH-CENTRAL-A"
    wh_id = wh_data["id"]

    # Create Zone
    zone_res = client.post(f"/api/v1/warehouses/{wh_id}/zones", json={
        "name": "Cold Room 1",
        "code": "CR-01",
        "capacity_kg": 20000.0
    }, headers=wh_headers)
    assert zone_res.status_code == 201
    zone_id = zone_res.json()["id"]

    # Create Location
    loc_res = client.post(f"/api/v1/warehouses/zones/{zone_id}/locations", json={
        "aisle": "A1",
        "rack": "R2",
        "shelf": "S3"
    }, headers=wh_headers)
    assert loc_res.status_code == 201
    assert loc_res.json()["code"] == "A1-R2-S3"


def test_inventory_receive_approved_batch(client):
    batch_id = setup_approved_batch(client)
    wh_headers = create_user_token(client, "wh_mgr2@agritrace.org", UserRole.WAREHOUSE_MANAGER)

    wh = client.post("/api/v1/warehouses/", json={
        "name": "North Logistics Cold Storage",
        "code": "WH-NORTH",
        "location_address": "North Hub",
        "total_capacity_kg": 10000.0
    }, headers=wh_headers).json()

    # Receive batch
    rec_res = client.post("/api/v1/inventory/receive", json={
        "batch_id": batch_id,
        "warehouse_id": wh["id"],
        "quantity": 1000.0,
        "unit": "KG"
    }, headers=wh_headers)

    assert rec_res.status_code == 201
    inv_data = rec_res.json()
    assert inv_data["current_quantity"] == 1000.0

    # Verify Batch status updated to IN_WAREHOUSE
    batch_res = client.get(f"/api/v1/batches/{batch_id}", headers=wh_headers).json()
    assert batch_res["status"] == BatchStatus.IN_WAREHOUSE.value


def test_inventory_receive_rejected_batch_forbidden(client):
    farmer_headers = create_user_token(client, "farmer_rej_wh@agritrace.org", UserRole.FARMER)
    quality_headers = create_user_token(client, "officer_rej_wh@agritrace.org", UserRole.QUALITY_OFFICER)
    wh_headers = create_user_token(client, "wh_mgr_rej@agritrace.org", UserRole.WAREHOUSE_MANAGER)

    farm = client.post("/api/v1/farms/", json={
        "name": "Defective Farm",
        "location_address": "Bad Land 2",
        "total_area_hectares": 5.0,
        "soil_type": "Clay",
        "irrigation_type": "Rainfed"
    }, headers=farmer_headers).json()

    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Spoiled Berries",
        "quantity": 200.0
    }, headers=farmer_headers).json()

    batch_id = harvest["batch"]["id"]

    # Reject batch in inspection
    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 200.0,
        "quality_grade": QualityGrade.REJECTED.value,
        "visual_condition": "Contaminated"
    }, headers=quality_headers).json()
    client.put(f"/api/v1/inspections/{insp['id']}/reject", json={"notes": "High mold content"}, headers=quality_headers)

    wh = client.post("/api/v1/warehouses/", json={
        "name": "South Storage Hub",
        "code": "WH-SOUTH",
        "location_address": "South Zone",
        "total_capacity_kg": 10000.0
    }, headers=wh_headers).json()

    # Attempt receiving REJECTED batch into warehouse (Must return 400 Bad Request)
    rec_res = client.post("/api/v1/inventory/receive", json={
        "batch_id": batch_id,
        "warehouse_id": wh["id"],
        "quantity": 200.0
    }, headers=wh_headers)

    assert rec_res.status_code == 400
    assert "strictly forbidden" in rec_res.json()["detail"]


def test_inventory_stock_movement(client):
    batch_id = setup_approved_batch(client)
    wh_headers = create_user_token(client, "wh_mgr_move@agritrace.org", UserRole.WAREHOUSE_MANAGER)

    wh1 = client.post("/api/v1/warehouses/", json={"name": "WH 1", "code": "WH-1", "location_address": "Addr 1", "total_capacity_kg": 5000.0}, headers=wh_headers).json()
    wh2 = client.post("/api/v1/warehouses/", json={"name": "WH 2", "code": "WH-2", "location_address": "Addr 2", "total_capacity_kg": 5000.0}, headers=wh_headers).json()

    inv = client.post("/api/v1/inventory/receive", json={"batch_id": batch_id, "warehouse_id": wh1["id"], "quantity": 500.0}, headers=wh_headers).json()

    # Move inventory to WH 2
    move_res = client.put(f"/api/v1/inventory/{inv['id']}/move", json={"target_warehouse_id": wh2["id"], "notes": "Cold room balancing"}, headers=wh_headers)
    assert move_res.status_code == 200
    assert move_res.json()["warehouse_id"] == wh2["id"]


def test_inventory_split_and_adjustment(client):
    batch_id = setup_approved_batch(client)
    wh_headers = create_user_token(client, "wh_mgr_split@agritrace.org", UserRole.WAREHOUSE_MANAGER)

    wh = client.post("/api/v1/warehouses/", json={"name": "WH Split", "code": "WH-SPLIT", "location_address": "Addr S", "total_capacity_kg": 5000.0}, headers=wh_headers).json()
    inv = client.post("/api/v1/inventory/receive", json={"batch_id": batch_id, "warehouse_id": wh["id"], "quantity": 800.0}, headers=wh_headers).json()

    # Split 300 KG into new item
    split_res = client.post(f"/api/v1/inventory/{inv['id']}/split", json={"split_quantity": 300.0}, headers=wh_headers)
    assert split_res.status_code == 201
    assert split_res.json()["current_quantity"] == 300.0

    # Adjust parent inventory
    adj_res = client.put(f"/api/v1/inventory/{inv['id']}/adjust", json={"new_quantity": 480.0, "reason": "Slight moisture loss"}, headers=wh_headers)
    assert adj_res.status_code == 200
    assert adj_res.json()["current_quantity"] == 480.0


def test_negative_inventory_and_over_dispatch_protection(client):
    batch_id = setup_approved_batch(client)
    wh_headers = create_user_token(client, "wh_mgr_dispatch@agritrace.org", UserRole.WAREHOUSE_MANAGER)

    wh = client.post("/api/v1/warehouses/", json={"name": "WH Disp", "code": "WH-DISP", "location_address": "Addr D", "total_capacity_kg": 5000.0}, headers=wh_headers).json()
    inv = client.post("/api/v1/inventory/receive", json={"batch_id": batch_id, "warehouse_id": wh["id"], "quantity": 250.0}, headers=wh_headers).json()

    # Over-dispatch of 300 KG (exceeds 250 available) -> 400 Bad Request
    res_over = client.post(f"/api/v1/inventory/{inv['id']}/dispatch", json={"dispatch_quantity": 300.0, "destination_address": "Retail Store 1"}, headers=wh_headers)
    assert res_over.status_code == 400

    # Valid dispatch of 250 KG -> moves batch status to IN_TRANSIT
    res_valid = client.post(f"/api/v1/inventory/{inv['id']}/dispatch", json={"dispatch_quantity": 250.0, "destination_address": "Retail Store 1"}, headers=wh_headers)
    assert res_valid.status_code == 200
    assert res_valid.json()["current_quantity"] == 0.0

    batch_res = client.get(f"/api/v1/batches/{batch_id}", headers=wh_headers).json()
    assert batch_res["status"] == BatchStatus.IN_TRANSIT.value


def test_warehouse_authorization_guards(client):
    farmer_headers = create_user_token(client, "farmer_wh_unauth@agritrace.org", UserRole.FARMER)

    # Farmer attempts to create warehouse (403 Forbidden)
    res = client.post("/api/v1/warehouses/", json={
        "name": "Unauth WH",
        "code": "UNAUTH-WH",
        "location_address": "Addr",
        "total_capacity_kg": 1000.0
    }, headers=farmer_headers)

    assert res.status_code == 403
