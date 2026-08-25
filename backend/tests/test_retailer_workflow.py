from app.models.user import UserRole
from app.models.batch import BatchStatus
from app.models.retail import ReceiptStatus


def create_user_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": f"User {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def setup_in_transit_shipment(client):
    farmer_headers = create_user_token(client, "farmer_ret@agritrace.org", UserRole.FARMER)
    tm_headers = create_user_token(client, "tm_ret@agritrace.org", UserRole.TRANSPORT_MANAGER)

    farm = client.post("/api/v1/farms/", json={
        "name": "Retail Test Farm",
        "location_address": "Market Road 5",
        "total_area_hectares": 8.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()

    harvest = client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Organic Tomatoes",
        "quantity": 500.0
    }, headers=farmer_headers).json()

    batch_id = harvest["batch"]["id"]

    shipment = client.post("/api/v1/transport/shipments", json={
        "batch_id": batch_id,
        "destination_address": "Fresh Market Superstore"
    }, headers=tm_headers).json()

    return shipment["id"], batch_id


def test_retailer_profile_registration(client):
    retailer_headers = create_user_token(client, "ret_prof1@agritrace.org", UserRole.RETAILER)

    res = client.post("/api/v1/retail/profile", json={
        "store_name": "Metro Fresh Mart",
        "store_code": "RET-METRO-01",
        "address": "Downtown Boulevard 12",
        "contact_phone": "+1-555-STORE"
    }, headers=retailer_headers)

    assert res.status_code == 201
    assert res.json()["store_code"] == "RET-METRO-01"


def test_confirm_delivery_receipt_and_batch_status(client):
    shipment_id, batch_id = setup_in_transit_shipment(client)
    retailer_headers = create_user_token(client, "ret_recv1@agritrace.org", UserRole.RETAILER)

    # Register Profile
    client.post("/api/v1/retail/profile", json={
        "store_name": "City Retailer",
        "store_code": "RET-CITY-01",
        "address": "City Mall",
        "contact_phone": "555-1111"
    }, headers=retailer_headers)

    # Confirm receipt of 500 KG
    res = client.post("/api/v1/retail/receipts", json={
        "shipment_id": shipment_id,
        "received_quantity": 500.0,
        "accepted_quantity": 500.0,
        "damaged_quantity": 0.0
    }, headers=retailer_headers)

    assert res.status_code == 201
    data = res.json()
    assert data["status"] == ReceiptStatus.ACCEPTED.value

    # Verify Batch Status MUST BE AT_RETAILER
    batch_res = client.get(f"/api/v1/batches/{batch_id}", headers=retailer_headers).json()
    assert batch_res["status"] == BatchStatus.AT_RETAILER.value


def test_report_damaged_products(client):
    shipment_id, batch_id = setup_in_transit_shipment(client)
    retailer_headers = create_user_token(client, "ret_damage@agritrace.org", UserRole.RETAILER)

    # Confirm receipt with 50 KG damaged
    res = client.post("/api/v1/retail/receipts", json={
        "shipment_id": shipment_id,
        "received_quantity": 500.0,
        "accepted_quantity": 450.0,
        "damaged_quantity": 50.0,
        "damage_reason": "Bruising during transport transit"
    }, headers=retailer_headers)

    assert res.status_code == 201
    data = res.json()
    assert data["status"] == ReceiptStatus.PARTIALLY_ACCEPTED.value
    assert data["damaged_quantity"] == 50.0


def test_retail_inventory_listing(client):
    shipment_id, batch_id = setup_in_transit_shipment(client)
    retailer_headers = create_user_token(client, "ret_inv@agritrace.org", UserRole.RETAILER)

    client.post("/api/v1/retail/receipts", json={
        "shipment_id": shipment_id,
        "received_quantity": 500.0,
        "accepted_quantity": 500.0
    }, headers=retailer_headers)

    inv_res = client.get("/api/v1/retail/inventory", headers=retailer_headers)
    assert inv_res.status_code == 200
    assert len(inv_res.json()) >= 1


def test_retailer_authorization_guards(client):
    farmer_headers = create_user_token(client, "farmer_unauth_ret@agritrace.org", UserRole.FARMER)

    # Farmer attempts to confirm retail delivery receipt (403 Forbidden)
    res = client.post("/api/v1/retail/receipts", json={
        "shipment_id": "some-shipment-id",
        "received_quantity": 100.0,
        "accepted_quantity": 100.0
    }, headers=farmer_headers)

    assert res.status_code == 403
