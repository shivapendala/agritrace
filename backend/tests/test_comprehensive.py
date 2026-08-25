"""
Comprehensive Backend Test Suite - Phase 14
Tests all API endpoints with real business logic validation.
All tests verified against actual API contract.
"""
from app.models.user import UserRole
from app.models.batch import BatchStatus
from app.models.inspection import QualityGrade


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────
def register_and_login(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "ComprehensiveTest123!",
        "full_name": f"Test {role.value}",
        "role": role.value
    })
    res = client.post("/api/v1/auth/login", json={
        "email": email, "password": "ComprehensiveTest123!"
    }).json()
    return {"Authorization": f"Bearer {res['access_token']}"}


def create_farm(client, farmer_headers, name="Test Farm"):
    return client.post("/api/v1/farms/", json={
        "name": name,
        "location_address": "Farm Road 1, Agricultural Zone",
        "total_area_hectares": 15.0,
        "soil_type": "Sandy Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()


def create_harvest(client, farmer_headers, farm_id, product="Organic Tomatoes", qty=500.0):
    return client.post("/api/v1/harvests/", json={
        "farm_id": farm_id,
        "product_name": product,
        "quantity": qty,
        "unit": "KG"
    }, headers=farmer_headers).json()


def approve_batch(client, quality_headers, batch_id):
    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 400.0,
        "quality_grade": QualityGrade.A.value,
        "visual_condition": "Excellent - No defects"
    }, headers=quality_headers).json()
    client.put(f"/api/v1/inspections/{insp['id']}/approve",
               json={"notes": "Grade A - cleared for warehouse"}, headers=quality_headers)
    return insp


# ────────────────────────────────────────────────────────────────
# Authentication domain
# ────────────────────────────────────────────────────────────────
def test_auth_register_with_all_roles(client):
    for role in UserRole:
        res = client.post("/api/v1/auth/register", json={
            "email": f"phase14_{role.value}@agritrace.org",
            "password": "StrongPassword123!",
            "full_name": f"Phase14 {role.value}",
            "role": role.value
        })
        assert res.status_code == 201, f"Registration failed for role {role.value}: {res.json()}"
        data = res.json()
        assert data["role"] == role.value
        assert "hashed_password" not in data


def test_auth_login_returns_valid_jwt(client):
    client.post("/api/v1/auth/register", json={
        "email": "jwt_test@agritrace.org",
        "password": "StrongPassword123!",
        "full_name": "JWT Tester",
        "role": "FARMER"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "jwt_test@agritrace.org",
        "password": "StrongPassword123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "jwt_test@agritrace.org"


def test_auth_wrong_password_returns_401(client):
    client.post("/api/v1/auth/register", json={
        "email": "wrongpass@agritrace.org", "password": "Correct123!", "full_name": "X", "role": "FARMER"
    })
    res = client.post("/api/v1/auth/login", json={
        "email": "wrongpass@agritrace.org", "password": "WRONG_PASSWORD"
    })
    assert res.status_code == 401


def test_auth_me_requires_valid_token(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer INVALID_TOKEN"})
    assert res.status_code == 401


def test_auth_duplicate_email_returns_400(client):
    for _ in range(2):
        res = client.post("/api/v1/auth/register", json={
            "email": "duplicate@agritrace.org", "password": "Pass123!", "full_name": "Dup", "role": "CUSTOMER"
        })
    assert res.status_code == 400


# ────────────────────────────────────────────────────────────────
# Farmer & Farm domain
# ────────────────────────────────────────────────────────────────
def test_farmer_profile_update_and_read(client):
    """PUT /api/v1/farmers/me/profile updates address fields."""
    headers = register_and_login(client, "farmer_profile14@agritrace.org", UserRole.FARMER)

    # Update profile (address fields only — API contract)
    res = client.put("/api/v1/farmers/me/profile", json={
        "address": "4200 Harvest Lane",
        "city": "Agri City",
        "state": "CA",
        "postal_code": "94000",
        "country": "USA"
    }, headers=headers)
    assert res.status_code == 200, f"Profile update failed: {res.json()}"
    data = res.json()
    assert data["city"] == "Agri City"
    assert data["verification_status"] == "UNVERIFIED"

    # Read profile back
    me_res = client.get("/api/v1/farmers/me/profile", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["city"] == "Agri City"


def test_farm_full_crud_lifecycle(client):
    """Farm creation, update, and crop management lifecycle."""
    headers = register_and_login(client, "farmer_crud14@agritrace.org", UserRole.FARMER)

    # Create farm
    farm = create_farm(client, headers, name="CRUD Test Farm Alpha")
    assert farm["name"] == "CRUD Test Farm Alpha"
    farm_id = farm["id"]

    # Update farm
    upd_res = client.put(f"/api/v1/farms/{farm_id}", json={
        "name": "CRUD Test Farm Alpha — Updated",
        "total_area_hectares": 22.5
    }, headers=headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["total_area_hectares"] == 22.5

    # Add crop (CropCreate: name, variety, planting_date)
    crop_res = client.post(f"/api/v1/farms/{farm_id}/crops", json={
        "name": "Cherry Tomatoes",
        "variety": "San Marzano",
        "planting_date": "2026-01-15T00:00:00"
    }, headers=headers)
    assert crop_res.status_code == 201, f"Crop creation failed: {crop_res.json()}"
    assert crop_res.json()["name"] == "Cherry Tomatoes"

    # List crops
    crops = client.get(f"/api/v1/farms/{farm_id}/crops", headers=headers).json()
    assert len(crops) >= 1
    assert crops[0]["name"] == "Cherry Tomatoes"


def test_admin_farmer_verification_and_suspension(client):
    """Admin can verify and suspend farmer profiles."""
    farmer_h = register_and_login(client, "farm14_verify@agritrace.org", UserRole.FARMER)
    admin_h = register_and_login(client, "admin14_farmer@agritrace.org", UserRole.SUPER_ADMIN)

    # Create farmer profile
    client.put("/api/v1/farmers/me/profile", json={
        "address": "Verification Ave", "city": "TestCity"
    }, headers=farmer_h)

    # Admin lists farmers — should now see at least 1
    farmers = client.get("/api/v1/farmers/", headers=admin_h).json()
    assert len(farmers) >= 1
    profile_id = farmers[-1]["id"]

    # Verify (requires body with FarmerAdminAction)
    v_res = client.put(f"/api/v1/farmers/{profile_id}/verify",
                       json={"notes": "Verification complete"}, headers=admin_h)
    assert v_res.status_code == 200
    assert v_res.json()["verification_status"] == "VERIFIED"

    # Suspend
    s_res = client.put(f"/api/v1/farmers/{profile_id}/suspend",
                       json={"notes": "Account violation"}, headers=admin_h)
    assert s_res.status_code == 200
    assert s_res.json()["verification_status"] == "SUSPENDED"


# ────────────────────────────────────────────────────────────────
# Harvest & Batch domain
# ────────────────────────────────────────────────────────────────
def test_harvest_creates_unique_batch_number(client):
    """Each harvest creates a unique batch with correct initial state."""
    farmer_h = register_and_login(client, "farmer_batch14@agritrace.org", UserRole.FARMER)
    farm = create_farm(client, farmer_h)

    h1 = create_harvest(client, farmer_h, farm["id"], "Tomatoes")
    h2 = create_harvest(client, farmer_h, farm["id"], "Tomatoes")

    # Batch numbers must be unique
    assert h1["batch"]["batch_number"] != h2["batch"]["batch_number"]
    # Initial status is HARVESTED (moved to QUALITY_PENDING after inspection created)
    assert h1["batch"]["status"] == BatchStatus.HARVESTED.value
    # Remaining quantity should equal harvest quantity
    assert h1["batch"]["remaining_quantity"] == h1["quantity"]


def test_harvest_status_initial_state(client):
    farmer_h = register_and_login(client, "farmer_status14@agritrace.org", UserRole.FARMER)
    farm = create_farm(client, farmer_h)
    harvest = create_harvest(client, farmer_h, farm["id"], "Sweet Corn", 300.0)

    assert harvest["quantity"] == 300.0
    assert harvest["product_name"] == "Sweet Corn"
    assert harvest["batch"]["remaining_quantity"] == 300.0


def test_batch_list_filtering(client):
    farmer_h = register_and_login(client, "farmer_list14@agritrace.org", UserRole.FARMER)
    farm = create_farm(client, farmer_h)
    create_harvest(client, farmer_h, farm["id"], "Lettuce")

    batches = client.get("/api/v1/batches/?product_name=Lettuce", headers=farmer_h).json()
    assert len(batches) >= 1
    assert all("Lettuce" in b["product_name"] for b in batches)


def test_negative_quantity_harvest_rejected(client):
    """Negative quantity harvests must be rejected with 400/422."""
    farmer_h = register_and_login(client, "farmer_qty14@agritrace.org", UserRole.FARMER)
    farm = create_farm(client, farmer_h)

    res = client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Zero-Quantity Crop",
        "quantity": -50.0
    }, headers=farmer_h)
    assert res.status_code in [400, 422]


# ────────────────────────────────────────────────────────────────
# Quality Inspection domain
# ────────────────────────────────────────────────────────────────
def test_inspection_requires_quality_officer_role(client):
    farmer_h = register_and_login(client, "farmer_insp14@agritrace.org", UserRole.FARMER)
    farm = create_farm(client, farmer_h)
    harvest = create_harvest(client, farmer_h, farm["id"])
    batch_id = harvest["batch"]["id"]

    # Farmer attempting to create inspection (must fail 403)
    res = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id, "verified_weight": 100.0,
        "quality_grade": QualityGrade.A.value, "visual_condition": "Good"
    }, headers=farmer_h)
    assert res.status_code == 403


def test_quality_grade_enum_values(client):
    """All valid QualityGrade enum values should create inspections."""
    farmer_h = register_and_login(client, "farmer_grade14@agritrace.org", UserRole.FARMER)
    quality_h = register_and_login(client, "officer_grade14@agritrace.org", UserRole.QUALITY_OFFICER)
    farm = create_farm(client, farmer_h)

    for grade in [QualityGrade.A.value, QualityGrade.B.value, QualityGrade.C.value]:
        harvest = create_harvest(client, farmer_h, farm["id"], f"Crop for grade {grade}", 100.0)
        batch_id = harvest["batch"]["id"]
        insp_res = client.post("/api/v1/inspections/", json={
            "batch_id": batch_id,
            "verified_weight": 95.0,
            "quality_grade": grade,
            "visual_condition": f"Condition for grade {grade}"
        }, headers=quality_h)
        assert insp_res.status_code == 201, f"Inspection failed for grade '{grade}': {insp_res.json()}"


def test_rejected_batch_status_is_terminal(client):
    """After rejection, batch status must be REJECTED."""
    farmer_h = register_and_login(client, "farmer_reinsp14@agritrace.org", UserRole.FARMER)
    quality_h = register_and_login(client, "officer_reinsp14@agritrace.org", UserRole.QUALITY_OFFICER)
    farm = create_farm(client, farmer_h)
    harvest = create_harvest(client, farmer_h, farm["id"])
    batch_id = harvest["batch"]["id"]

    # First inspection → REJECTED
    insp = client.post("/api/v1/inspections/", json={
        "batch_id": batch_id,
        "verified_weight": 200.0,
        "quality_grade": QualityGrade.REJECTED.value,
        "visual_condition": "Heavily contaminated"
    }, headers=quality_h).json()
    client.put(f"/api/v1/inspections/{insp['id']}/reject",
               json={"notes": "Contamination"}, headers=quality_h)

    # Batch should now be REJECTED
    batch = client.get(f"/api/v1/batches/{batch_id}", headers=quality_h).json()
    assert batch["status"] == BatchStatus.REJECTED.value


# ────────────────────────────────────────────────────────────────
# Reports domain
# ────────────────────────────────────────────────────────────────
def test_analytics_overview_returns_10_kpis(client):
    admin_h = register_and_login(client, "admin_kpi14@agritrace.org", UserRole.SUPER_ADMIN)
    res = client.get("/api/v1/analytics/overview", headers=admin_h)
    assert res.status_code == 200
    data = res.json()
    required_keys = [
        "total_farmers", "total_farms", "total_batches", "approved_batches",
        "rejected_batches", "total_warehouse_stock_kg", "shipments_in_transit",
        "total_retailers", "verified_products_count", "temperature_alerts_count"
    ]
    for key in required_keys:
        assert key in data, f"Missing KPI metric: {key}"


def test_all_report_types_return_data(client):
    admin_h = register_and_login(client, "admin_report14@agritrace.org", UserRole.SUPER_ADMIN)
    farmer_h = register_and_login(client, "farmer_report14@agritrace.org", UserRole.FARMER)

    farm = create_farm(client, farmer_h)
    create_harvest(client, farmer_h, farm["id"], "Report Product", 200.0)

    for rt in ["harvest", "quality", "inventory", "temperature", "traceability"]:
        res = client.get(f"/api/v1/analytics/reports?report_type={rt}", headers=admin_h)
        assert res.status_code == 200, f"Report type '{rt}' failed: {res.json()}"
        assert isinstance(res.json(), list)


def test_csv_export_content_type(client):
    admin_h = register_and_login(client, "admin_csv14@agritrace.org", UserRole.SUPER_ADMIN)
    res = client.get("/api/v1/analytics/reports/export-csv?report_type=harvest", headers=admin_h)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Record ID" in res.text


# ────────────────────────────────────────────────────────────────
# Audit Log domain
# ────────────────────────────────────────────────────────────────
def test_audit_log_captures_login_event(client):
    admin_h = register_and_login(client, "admin_auditlog14@agritrace.org", UserRole.SUPER_ADMIN)
    logs = client.get("/api/v1/audit-logs?action=LOGIN", headers=admin_h).json()
    assert len(logs) >= 1
    assert all(l["action"] == "LOGIN" for l in logs)
    assert all(l["entity"] == "User" for l in logs)


def test_audit_log_non_admin_is_denied(client):
    quality_h = register_and_login(client, "quality_auditlog14@agritrace.org", UserRole.QUALITY_OFFICER)
    res = client.get("/api/v1/audit-logs", headers=quality_h)
    assert res.status_code == 403


def test_audit_log_entity_filter(client):
    admin_h = register_and_login(client, "admin_filter14@agritrace.org", UserRole.SUPER_ADMIN)
    farmer_h = register_and_login(client, "farmer_filter14@agritrace.org", UserRole.FARMER)

    farm = create_farm(client, farmer_h)
    create_harvest(client, farmer_h, farm["id"])

    logs = client.get("/api/v1/audit-logs?entity=Batch", headers=admin_h).json()
    assert len(logs) >= 1
    assert all("Batch" in l["entity"] for l in logs)
