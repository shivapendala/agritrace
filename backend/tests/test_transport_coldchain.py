from app.models.user import UserRole
from app.models.batch import BatchStatus
from app.models.transport import TransportStatus


def create_user_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": f"User {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def setup_batch(client):
    farmer_headers = create_user_token(client, "farmer_trans@agritrace.org", UserRole.FARMER)
    farm = client.post("/api/v1/farms/", json={
        "name": "Transport Test Farm",
        "location_address": "Route 66",
        "total_area_hectares": 12.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()

    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Fresh Strawberries",
        "quantity": 300.0
    }, headers=farmer_headers).json()

    return harvest["batch"]["id"]


def test_vehicle_and_driver_registration(client):
    tm_headers = create_user_token(client, "tm1@agritrace.org", UserRole.TRANSPORT_MANAGER)
    driver_headers = create_user_token(client, "driver_user1@agritrace.org", UserRole.DRIVER)

    # Register Vehicle
    v_res = client.post("/api/v1/transport/vehicles", json={
        "license_plate": "TRK-COLD-01",
        "capacity_kg": 5000.0,
        "min_temp_celsius": 2.0,
        "max_temp_celsius": 8.0
    }, headers=tm_headers)
    assert v_res.status_code == 201
    assert v_res.json()["license_plate"] == "TRK-COLD-01"

    # Get driver profile user ID from current me
    me = client.get("/api/v1/auth/me", headers=driver_headers).json()

    # Register Driver
    d_res = client.post("/api/v1/transport/drivers", json={
        "user_id": me["id"],
        "license_number": "DL-998877",
        "phone_number": "+1234567890"
    }, headers=tm_headers)
    assert d_res.status_code == 201
    assert d_res.json()["license_number"] == "DL-998877"


def test_shipment_creation_and_assignment(client):
    batch_id = setup_batch(client)
    tm_headers = create_user_token(client, "tm_assign@agritrace.org", UserRole.TRANSPORT_MANAGER)
    driver_headers = create_user_token(client, "driver_user2@agritrace.org", UserRole.DRIVER)
    me = client.get("/api/v1/auth/me", headers=driver_headers).json()

    # Setup Vehicle & Driver
    vehicle = client.post("/api/v1/transport/vehicles", json={"license_plate": "TRK-9000", "capacity_kg": 3000.0}, headers=tm_headers).json()
    driver = client.post("/api/v1/transport/drivers", json={"user_id": me["id"], "license_number": "DL-001122", "phone_number": "555-0100"}, headers=tm_headers).json()

    # Create Shipment
    ship_res = client.post("/api/v1/transport/shipments", json={
        "batch_id": batch_id,
        "destination_address": "HyperMarket Central, Block 4",
        "min_temp_required": 2.0,
        "max_temp_required": 8.0
    }, headers=tm_headers)
    assert ship_res.status_code == 201
    shipment = ship_res.json()
    assert shipment["status"] == TransportStatus.CREATED.value

    # Assign Vehicle & Driver
    ass_res = client.put(f"/api/v1/transport/shipments/{shipment['id']}/assign", json={
        "vehicle_id": vehicle["id"],
        "driver_id": driver["id"]
    }, headers=tm_headers)
    assert ass_res.status_code == 200
    assert ass_res.json()["status"] == TransportStatus.ASSIGNED.value


def test_shipment_status_lifecycle(client):
    batch_id = setup_batch(client)
    tm_headers = create_user_token(client, "tm_lifecycle@agritrace.org", UserRole.TRANSPORT_MANAGER)

    shipment = client.post("/api/v1/transport/shipments", json={
        "batch_id": batch_id,
        "destination_address": "Retail Store 9"
    }, headers=tm_headers).json()

    ship_id = shipment["id"]

    # Picked up -> status IN_TRANSIT
    p_res = client.put(f"/api/v1/transport/shipments/{ship_id}/status", json={"status": TransportStatus.PICKED_UP.value}, headers=tm_headers)
    assert p_res.status_code == 200
    assert p_res.json()["status"] == TransportStatus.PICKED_UP.value

    batch_check1 = client.get(f"/api/v1/batches/{batch_id}", headers=tm_headers).json()
    assert batch_check1["status"] == BatchStatus.IN_TRANSIT.value

    # Delivered -> status DELIVERED & batch AT_RETAILER
    d_res = client.put(f"/api/v1/transport/shipments/{ship_id}/status", json={"status": TransportStatus.DELIVERED.value}, headers=tm_headers)
    assert d_res.status_code == 200
    assert d_res.json()["status"] == TransportStatus.DELIVERED.value

    batch_check2 = client.get(f"/api/v1/batches/{batch_id}", headers=tm_headers).json()
    assert batch_check2["status"] == BatchStatus.AT_RETAILER.value


def test_temperature_telemetry_normal_and_breach(client):
    batch_id = setup_batch(client)
    tm_headers = create_user_token(client, "tm_temp@agritrace.org", UserRole.TRANSPORT_MANAGER)

    shipment = client.post("/api/v1/transport/shipments", json={
        "batch_id": batch_id,
        "destination_address": "Cold Hub",
        "min_temp_required": 2.0,
        "max_temp_required": 8.0
    }, headers=tm_headers).json()

    ship_id = shipment["id"]

    # Normal Reading: 5.5°C
    t1 = client.post(f"/api/v1/transport/shipments/{ship_id}/telemetry", json={"recorded_temp_celsius": 5.5}, headers=tm_headers).json()
    assert t1["is_breach"] is False

    # Temperature Breach Reading: 11.2°C (exceeds max 8.0°C) -> MUST TRIGGER BREACH ALERT
    t2 = client.post(f"/api/v1/transport/shipments/{ship_id}/telemetry", json={"recorded_temp_celsius": 11.2}, headers=tm_headers).json()
    assert t2["is_breach"] is True
    assert "COLD CHAIN BREACH ALERT" in t2["breach_message"]


def test_transport_authorization_guards(client):
    farmer_headers = create_user_token(client, "farmer_unauth_trans@agritrace.org", UserRole.FARMER)

    # Farmer attempts to register vehicle (403 Forbidden)
    res = client.post("/api/v1/transport/vehicles", json={
        "license_plate": "UNAUTH-PLATE",
        "capacity_kg": 1000.0
    }, headers=farmer_headers)

    assert res.status_code == 403
