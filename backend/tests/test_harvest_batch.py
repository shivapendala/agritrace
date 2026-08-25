from datetime import datetime, timezone
from app.models.user import UserRole
from app.models.batch import BatchStatus


def create_farmer_and_farm(client, email):
    # Register & Login Farmer
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Farmer Batch Test",
        "role": UserRole.FARMER.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"}).json()
    headers = {"Authorization": f"Bearer {login_res['access_token']}"}

    # Create Farm
    farm_res = client.post("/api/v1/farms/", json={
        "name": "Batch Orchard",
        "location_address": "Highway 10, Sector A",
        "total_area_hectares": 15.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip Irrigation"
    }, headers=headers).json()

    return headers, farm_res["id"]


def test_harvest_and_batch_creation(client):
    headers, farm_id = create_farmer_and_farm(client, "harvest1@agritrace.org")

    harvest_payload = {
        "farm_id": farm_id,
        "product_name": "Tomato Premium",
        "quantity": 500.0,
        "unit": "KG",
        "harvest_method": "MANUAL",
        "initial_grade": "Grade A",
        "initial_quality_notes": "Fresh harvest, optimal moisture"
    }

    res = client.post("/api/v1/harvests/", json=harvest_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["product_name"] == "Tomato Premium"
    assert data["quantity"] == 500.0
    assert "batch" in data
    assert data["batch"]["batch_number"].startswith("TOM-")
    assert data["batch"]["initial_quantity"] == 500.0
    assert data["batch"]["remaining_quantity"] == 500.0
    assert data["batch"]["status"] == BatchStatus.HARVESTED.value


def test_unique_batch_number_sequence(client):
    headers, farm_id = create_farmer_and_farm(client, "seq_farmer@agritrace.org")

    # Record 1st harvest
    h1 = client.post("/api/v1/harvests/", json={
        "farm_id": farm_id,
        "product_name": "Mango Alphonso",
        "quantity": 100.0,
        "unit": "BOXES"
    }, headers=headers).json()

    # Record 2nd harvest
    h2 = client.post("/api/v1/harvests/", json={
        "farm_id": farm_id,
        "product_name": "Mango Alphonso",
        "quantity": 200.0,
        "unit": "BOXES"
    }, headers=headers).json()

    b1_num = h1["batch"]["batch_number"]
    b2_num = h2["batch"]["batch_number"]

    assert b1_num != b2_num
    assert b1_num.endswith("-0001")
    assert b2_num.endswith("-0002")


def test_quantity_validation_and_deduction(client):
    headers, farm_id = create_farmer_and_farm(client, "deduct_farmer@agritrace.org")

    # Negative quantity in harvest creation (should fail 422 validation)
    res_invalid = client.post("/api/v1/harvests/", json={
        "farm_id": farm_id,
        "product_name": "Wheat",
        "quantity": -50.0
    }, headers=headers)
    assert res_invalid.status_code == 422

    # Create valid harvest of 300 KG
    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm_id,
        "product_name": "Wheat Organic",
        "quantity": 300.0,
        "unit": "KG"
    }, headers=headers).json()

    batch_id = harvest["batch"]["id"]

    # Valid deduction of 100 KG
    res_deduct1 = client.post(f"/api/v1/batches/{batch_id}/deduct", json={"quantity_to_deduct": 100.0}, headers=headers)
    assert res_deduct1.status_code == 200
    assert res_deduct1.json()["remaining_quantity"] == 200.0

    # Over-deduction of 500 KG (exceeds 200 remaining, should return 400 Bad Request)
    res_over_deduct = client.post(f"/api/v1/batches/{batch_id}/deduct", json={"quantity_to_deduct": 500.0}, headers=headers)
    assert res_over_deduct.status_code == 400
    assert "Cannot deduct" in res_over_deduct.json()["detail"]


def test_status_changes(client):
    headers, farm_id = create_farmer_and_farm(client, "status_farmer@agritrace.org")

    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm_id,
        "product_name": "Organic Apple",
        "quantity": 1000.0,
        "unit": "KG"
    }, headers=headers).json()

    batch_id = harvest["batch"]["id"]

    # Transition to QUALITY_PENDING
    res1 = client.put(f"/api/v1/batches/{batch_id}/status", json={"status": BatchStatus.QUALITY_PENDING.value}, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == BatchStatus.QUALITY_PENDING.value

    # Transition to QUALITY_APPROVED & update location
    res2 = client.put(f"/api/v1/batches/{batch_id}/status", json={"status": BatchStatus.QUALITY_APPROVED.value, "current_location": "Central Lab A"}, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == BatchStatus.QUALITY_APPROVED.value
    assert res2.json()["current_location"] == "Central Lab A"


def test_harvest_authorization(client):
    # Customer user attempts to log harvest
    client.post("/api/v1/auth/register", json={
        "email": "cust_unauth_harvest@agritrace.org",
        "password": "Password123!",
        "full_name": "Customer User",
        "role": UserRole.CUSTOMER.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": "cust_unauth_harvest@agritrace.org", "password": "Password123!"}).json()
    cust_headers = {"Authorization": f"Bearer {login_res['access_token']}"}

    res = client.post("/api/v1/harvests/", json={
        "farm_id": "some-farm-id",
        "product_name": "Unauth Product",
        "quantity": 100.0
    }, headers=cust_headers)

    assert res.status_code == 403
