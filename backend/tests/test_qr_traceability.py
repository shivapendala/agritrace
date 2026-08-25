from app.models.user import UserRole
from app.models.batch import BatchStatus
from app.models.inspection import QualityGrade


def create_user_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecretPassword123!",
        "full_name": f"Farmer {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "SecretPassword123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def setup_verified_batch(client):
    farmer_headers = create_user_token(client, "farmer_qr@agritrace.org", UserRole.FARMER)
    quality_headers = create_user_token(client, "officer_qr@agritrace.org", UserRole.QUALITY_OFFICER)

    farm = client.post("/api/v1/farms/", json={
        "name": "Green Valley Organic Farm",
        "location_address": "Green Valley Road 42",
        "total_area_hectares": 25.0,
        "soil_type": "Rich Loam",
        "irrigation_type": "Drip System"
    }, headers=farmer_headers).json()

    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Vine Ripe Tomatoes",
        "quantity": 800.0,
        "unit": "KG"
    }, headers=farmer_headers).json()

    batch_id = harvest["batch"]["id"]

    # Record & Approve Quality Inspection
    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 800.0,
        "quality_grade": QualityGrade.A.value,
        "visual_condition": "Grade A Premium"
    }, headers=quality_headers).json()
    client.put(f"/api/v1/inspections/{insp['id']}/approve", json={"notes": "Internal Secret Lab Note"}, headers=quality_headers)

    batch = client.get(f"/api/v1/batches/{batch_id}", headers=farmer_headers).json()
    return batch


def test_public_qr_verification_valid_batch(client):
    batch = setup_verified_batch(client)
    qr_code = batch["qr_code"]

    # Call PUBLIC Endpoint WITHOUT any auth headers!
    res = client.get(f"/api/v1/verify/{qr_code}")
    assert res.status_code == 200
    data = res.json()

    assert data["is_valid"] is True
    assert data["qr_code"] == qr_code
    assert data["batch_number"] == batch["batch_number"]
    assert data["product_name"] == "Vine Ripe Tomatoes"
    assert data["farmer_name"] == "Farmer FARMER"
    assert data["farm_name"] == "Green Valley Organic Farm"
    assert data["quality_grade"] == QualityGrade.A.value
    assert len(data["timeline"]) == 7


def test_public_qr_verification_by_batch_number(client):
    batch = setup_verified_batch(client)
    batch_num = batch["batch_number"]

    res = client.get(f"/api/v1/verify/{batch_num}")
    assert res.status_code == 200
    assert res.json()["batch_number"] == batch_num


def test_public_qr_verification_invalid_qr(client):
    res = client.get("/api/v1/verify/NON-EXISTENT-QR-CODE-999")
    assert res.status_code == 404
    assert "Invalid QR code" in res.json()["detail"]


def test_public_qr_verification_revoked_rejected_batch(client):
    farmer_headers = create_user_token(client, "farmer_rev@agritrace.org", UserRole.FARMER)
    quality_headers = create_user_token(client, "officer_rev@agritrace.org", UserRole.QUALITY_OFFICER)

    farm_res = client.post("/api/v1/farms/", json={
        "name": "Bad Farm",
        "location_address": "Bad Land 99",
        "total_area_hectares": 1.0,
        "soil_type": "Clay",
        "irrigation_type": "Rainfed"
    }, headers=farmer_headers)
    farm = farm_res.json()
    harvest = client.post("/api/v1/harvests/", json={"farm_id": farm["id"], "product_name": "Spoiled Berries", "quantity": 100.0}, headers=farmer_headers).json()
    batch_id = harvest["batch"]["id"]

    insp = client.post("/api/v1/inspections/", json={"batch_id": batch_id, "verified_weight": 100.0, "visual_condition": "Contaminated"}, headers=quality_headers).json()
    client.put(f"/api/v1/inspections/{insp['id']}/reject", json={"notes": "Pesticide Violation"}, headers=quality_headers)

    batch = client.get(f"/api/v1/batches/{batch_id}", headers=farmer_headers).json()

    res = client.get(f"/api/v1/verify/{batch['qr_code']}")
    assert res.status_code == 200
    assert res.json()["is_valid"] is False
    assert res.json()["current_status"] == BatchStatus.REJECTED.value


def test_private_information_protection_audit(client):
    batch = setup_verified_batch(client)
    res = client.get(f"/api/v1/verify/{batch['qr_code']}")
    data_str = str(res.json()).lower()

    # Verify sensitive keywords NEVER present in public JSON payload
    assert "secretpassword" not in data_str
    assert "phone" not in data_str
    assert "internal secret lab note" not in data_str
    assert "password" not in data_str


def test_complete_provenance_timeline(client):
    batch = setup_verified_batch(client)
    res = client.get(f"/api/v1/verify/{batch['qr_code']}")
    timeline = res.json()["timeline"]

    step_titles = [t["title"] for t in timeline]
    assert step_titles == [
        "Harvested",
        "Inspected",
        "Approved",
        "Stored",
        "Transported",
        "Retailer Received",
        "Available"
    ]
