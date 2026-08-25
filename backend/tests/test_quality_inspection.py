from app.models.user import UserRole
from app.models.batch import BatchStatus
from app.models.inspection import InspectionStatus, QualityGrade


def create_user_and_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": f"User {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def setup_test_batch(client):
    farmer_headers = create_user_and_token(client, "farmer_insp@agritrace.org", UserRole.FARMER)

    farm = client.post("/api/v1/farms/", json={
        "name": "Quality Farm",
        "location_address": "Lab Zone 1",
        "total_area_hectares": 20.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()

    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Organic Tomatoes",
        "quantity": 1000.0,
        "unit": "KG"
    }, headers=farmer_headers).json()

    return harvest["batch"]["id"]


def test_inspection_creation(client):
    batch_id = setup_test_batch(client)
    quality_headers = create_user_and_token(client, "officer1@agritrace.org", UserRole.QUALITY_OFFICER)

    inspection_payload = {
        "batch_id": batch_id,
        "verified_weight": 995.0,
        "moisture_percentage": 12.5,
        "temperature_celsius": 18.0,
        "quality_grade": QualityGrade.A.value,
        "visual_condition": "Excellent color, no pest damage",
        "contamination_status": "CLEAN",
        "remarks": "Lab test passed all safety parameters"
    }

    res = client.post("/api/v1/inspections/", json=inspection_payload, headers=quality_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["batch_id"] == batch_id
    assert data["quality_grade"] == QualityGrade.A.value
    assert data["approval_status"] == InspectionStatus.PENDING.value

    # Verify batch status moved to QUALITY_PENDING
    batch_res = client.get(f"/api/v1/batches/{batch_id}", headers=quality_headers).json()
    assert batch_res["status"] == BatchStatus.QUALITY_PENDING.value


def test_inspection_review(client):
    batch_id = setup_test_batch(client)
    quality_headers = create_user_and_token(client, "officer_review@agritrace.org", UserRole.QUALITY_OFFICER)

    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 1000.0,
        "quality_grade": QualityGrade.A.value,
        "visual_condition": "Good"
    }, headers=quality_headers).json()

    insp_id = insp["id"]

    res = client.get(f"/api/v1/inspections/{insp_id}", headers=quality_headers)
    assert res.status_code == 200
    assert res.json()["id"] == insp_id


def test_inspection_approval_workflow(client):
    batch_id = setup_test_batch(client)
    quality_headers = create_user_and_token(client, "officer_approve@agritrace.org", UserRole.QUALITY_OFFICER)

    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 1000.0,
        "quality_grade": QualityGrade.A.value,
        "visual_condition": "Grade A Premium"
    }, headers=quality_headers).json()

    insp_id = insp["id"]

    # Approve inspection
    app_res = client.put(f"/api/v1/inspections/{insp_id}/approve", json={"notes": "All checks verified"}, headers=quality_headers)
    assert app_res.status_code == 200
    assert app_res.json()["approval_status"] == InspectionStatus.APPROVED.value

    # Batch status MUST be QUALITY_APPROVED
    batch_res = client.get(f"/api/v1/batches/{batch_id}", headers=quality_headers).json()
    assert batch_res["status"] == BatchStatus.QUALITY_APPROVED.value


def test_inspection_rejection_workflow(client):
    batch_id = setup_test_batch(client)
    quality_headers = create_user_and_token(client, "officer_reject@agritrace.org", UserRole.QUALITY_OFFICER)

    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 950.0,
        "quality_grade": QualityGrade.REJECTED.value,
        "visual_condition": "High pesticide residue detected"
    }, headers=quality_headers).json()

    insp_id = insp["id"]

    # Reject inspection
    rej_res = client.put(f"/api/v1/inspections/{insp_id}/reject", json={"notes": "Pesticide limit violation"}, headers=quality_headers)
    assert rej_res.status_code == 200
    assert rej_res.json()["approval_status"] == InspectionStatus.REJECTED.value

    # Batch status MUST be REJECTED (blocked from warehouse)
    batch_res = client.get(f"/api/v1/batches/{batch_id}", headers=quality_headers).json()
    assert batch_res["status"] == BatchStatus.REJECTED.value


def test_inspection_reinspection_workflow(client):
    batch_id = setup_test_batch(client)
    quality_headers = create_user_and_token(client, "officer_reinspect@agritrace.org", UserRole.QUALITY_OFFICER)

    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 980.0,
        "quality_grade": QualityGrade.B.value,
        "visual_condition": "Borderline moisture content"
    }, headers=quality_headers).json()

    insp_id = insp["id"]

    res = client.put(f"/api/v1/inspections/{insp_id}/reinspect", json={"notes": "Re-test moisture in 24 hours"}, headers=quality_headers)
    assert res.status_code == 200
    assert res.json()["approval_status"] == InspectionStatus.REQUIRES_REINSPECTION.value


def test_inspection_authorization_guards(client):
    batch_id = setup_test_batch(client)
    farmer_headers = create_user_and_token(client, "farmer_unauth_insp@agritrace.org", UserRole.FARMER)

    # Farmer attempts to create inspection (403 Forbidden)
    res = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 1000.0,
        "visual_condition": "Unauth"
    }, headers=farmer_headers)

    assert res.status_code == 403
