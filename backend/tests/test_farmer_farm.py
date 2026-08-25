from datetime import datetime, timezone
from app.models.user import UserRole
from app.models.farm import VerificationStatus, CropStatus


def create_test_user(client, email, password, full_name, role):
    payload = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role.value
    }
    client.post("/api/v1/auth/register", json=payload)
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def test_farmer_profile_creation_and_update(client):
    headers = create_test_user(client, "farmer_prof@agritrace.org", "Pass123!", "Farmer Green", UserRole.FARMER)

    # Get initial profile
    res1 = client.get("/api/v1/farmers/me/profile", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["verification_status"] == VerificationStatus.UNVERIFIED.value

    # Update profile
    update_payload = {
        "address": "123 Organic Way",
        "city": "Fresno",
        "state": "California",
        "postal_code": "93701",
        "country": "USA"
    }
    res2 = client.put("/api/v1/farmers/me/profile", json=update_payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["city"] == "Fresno"
    assert data2["address"] == "123 Organic Way"


def test_farm_creation_and_update(client):
    headers = create_test_user(client, "farmer_farm@agritrace.org", "Pass123!", "Farmer Brown", UserRole.FARMER)

    # Create farm
    farm_payload = {
        "name": "Green Valley Estate",
        "location_address": "Sector 4, Agricultural Zone",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "total_area_hectares": 25.5,
        "soil_type": "Loam",
        "irrigation_type": "Drip Irrigation"
    }
    res1 = client.post("/api/v1/farms/", json=farm_payload, headers=headers)
    assert res1.status_code == 201
    farm_data = res1.json()
    assert farm_data["name"] == farm_payload["name"]
    assert farm_data["total_area_hectares"] == 25.5
    farm_id = farm_data["id"]

    # Update farm
    update_payload = {
        "name": "Green Valley Organics Estate",
        "total_area_hectares": 30.0
    }
    res2 = client.put(f"/api/v1/farms/{farm_id}", json=update_payload, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["name"] == "Green Valley Organics Estate"
    assert res2.json()["total_area_hectares"] == 30.0


def test_crop_creation(client):
    headers = create_test_user(client, "farmer_crop@agritrace.org", "Pass123!", "Farmer Red", UserRole.FARMER)

    # Create farm
    farm_res = client.post("/api/v1/farms/", json={
        "name": "Sunshine Orchard",
        "location_address": "Route 6, Valley Road",
        "total_area_hectares": 12.0,
        "soil_type": "Sandy Loam",
        "irrigation_type": "Sprinkler"
    }, headers=headers).json()

    farm_id = farm_res["id"]

    # Add crop
    crop_payload = {
        "name": "Alphonso Mango",
        "variety": "Ratnagiri Premium",
        "planting_date": datetime.now(timezone.utc).isoformat(),
        "status": CropStatus.PLANTED.value
    }
    res = client.post(f"/api/v1/farms/{farm_id}/crops", json=crop_payload, headers=headers)
    assert res.status_code == 201
    crop_data = res.json()
    assert crop_data["name"] == crop_payload["name"]
    assert crop_data["variety"] == crop_payload["variety"]


def test_authorization_farmer_only(client):
    # Customer user attempts to create farm
    customer_headers = create_test_user(client, "customer_unauth@agritrace.org", "Pass123!", "Jane Cust", UserRole.CUSTOMER)

    res = client.post("/api/v1/farms/", json={
        "name": "Unauthorized Farm",
        "location_address": "Somewhere",
        "total_area_hectares": 10.0,
        "soil_type": "Clay",
        "irrigation_type": "Rainfed"
    }, headers=customer_headers)

    assert res.status_code == 403


def test_admin_farmer_verification_and_suspension(client):
    # Register farmer
    farmer_headers = create_test_user(client, "farmer_to_verify@agritrace.org", "Pass123!", "Farmer Mark", UserRole.FARMER)
    profile = client.get("/api/v1/farmers/me/profile", headers=farmer_headers).json()
    farmer_profile_id = profile["id"]

    # Register admin
    admin_headers = create_test_user(client, "admin_verify@agritrace.org", "Pass123!", "Super Admin V", UserRole.SUPER_ADMIN)

    # Verify farmer
    res_v = client.put(f"/api/v1/farmers/{farmer_profile_id}/verify", json={"notes": "Land documents verified"}, headers=admin_headers)
    assert res_v.status_code == 200
    assert res_v.json()["verification_status"] == VerificationStatus.VERIFIED.value

    # Suspend farmer
    res_s = client.put(f"/api/v1/farmers/{farmer_profile_id}/suspend", json={"notes": "Compliance violation"}, headers=admin_headers)
    assert res_s.status_code == 200
    assert res_s.json()["verification_status"] == VerificationStatus.SUSPENDED.value


def test_invalid_farm_data(client):
    headers = create_test_user(client, "farmer_invalid@agritrace.org", "Pass123!", "Farmer Invalid", UserRole.FARMER)

    # Negative total_area_hectares (should fail Pydantic validation 422)
    invalid_payload = {
        "name": "Invalid Farm",
        "location_address": "Test",
        "total_area_hectares": -5.0,
        "soil_type": "Clay",
        "irrigation_type": "Rainfed"
    }
    res = client.post("/api/v1/farms/", json=invalid_payload, headers=headers)
    assert res.status_code == 422
