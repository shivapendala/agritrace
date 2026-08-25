from app.models.user import UserRole


def create_user_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecretPassword123!",
        "full_name": f"User {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "SecretPassword123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def test_list_user_notifications_and_unread_count(client):
    farmer_headers = create_user_token(client, "notif_farmer@agritrace.org", UserRole.FARMER)

    # 1. Initially 0 notifications
    res = client.get("/api/v1/notifications/unread-count", headers=farmer_headers)
    assert res.status_code == 200
    assert res.json()["unread_count"] == 0

    # 2. Create farm & harvest to trigger HARVEST_CREATED notification
    farm = client.post("/api/v1/farms/", json={
        "name": "Notif Organic Farm",
        "location_address": "Farm Lane 12",
        "total_area_hectares": 10.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()

    client.post("/api/v1/harvests/", json={
        "farm_id": farm["id"],
        "product_name": "Fresh Sweet Corn",
        "quantity": 300.0
    }, headers=farmer_headers)

    # 3. Check unread count is now > 0
    unread_res = client.get("/api/v1/notifications/unread-count", headers=farmer_headers)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] >= 1

    # 4. List notifications
    list_res = client.get("/api/v1/notifications", headers=farmer_headers)
    assert list_res.status_code == 200
    notifs = list_res.json()
    assert len(notifs) >= 1
    assert notifs[0]["type"] == "HARVEST_CREATED"
    assert "Fresh Sweet Corn" in notifs[0]["message"]


def test_mark_single_notification_as_read(client):
    farmer_headers = create_user_token(client, "notif_farmer_read@agritrace.org", UserRole.FARMER)

    farm = client.post("/api/v1/farms/", json={
        "name": "Read Test Farm",
        "location_address": "Read Road 5",
        "total_area_hectares": 5.0,
        "soil_type": "Clay",
        "irrigation_type": "Rainfed"
    }, headers=farmer_headers).json()

    client.post("/api/v1/harvests/", json={"farm_id": farm["id"], "product_name": "Apples", "quantity": 100.0}, headers=farmer_headers)

    notifs = client.get("/api/v1/notifications", headers=farmer_headers).json()
    notif_id = notifs[0]["id"]

    # Mark as read
    read_res = client.put(f"/api/v1/notifications/{notif_id}/read", headers=farmer_headers)
    assert read_res.status_code == 200
    assert read_res.json()["read"] is True


def test_mark_all_notifications_as_read(client):
    farmer_headers = create_user_token(client, "notif_farmer_all@agritrace.org", UserRole.FARMER)

    farm = client.post("/api/v1/farms/", json={
        "name": "All Read Farm",
        "location_address": "All Read Ave 1",
        "total_area_hectares": 5.0,
        "soil_type": "Sandy",
        "irrigation_type": "Sprinkler"
    }, headers=farmer_headers).json()

    client.post("/api/v1/harvests/", json={"farm_id": farm["id"], "product_name": "Potatoes", "quantity": 200.0}, headers=farmer_headers)

    mark_all_res = client.put("/api/v1/notifications/mark-all-read", headers=farmer_headers)
    assert mark_all_res.status_code == 200

    unread_res = client.get("/api/v1/notifications/unread-count", headers=farmer_headers)
    assert unread_res.json()["unread_count"] == 0


def test_notification_permission_isolation(client):
    farmer_headers_a = create_user_token(client, "user_a_notif@agritrace.org", UserRole.FARMER)
    farmer_headers_b = create_user_token(client, "user_b_notif@agritrace.org", UserRole.FARMER)

    farm_a = client.post("/api/v1/farms/", json={
        "name": "User A Farm",
        "location_address": "Address A 1",
        "total_area_hectares": 5.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers_a).json()

    client.post("/api/v1/harvests/", json={"farm_id": farm_a["id"], "product_name": "Peaches", "quantity": 50.0}, headers=farmer_headers_a)

    notifs_a = client.get("/api/v1/notifications", headers=farmer_headers_a).json()
    notif_id_a = notifs_a[0]["id"]

    # User B attempts to mark User A's notification as read -> Returns 403 Forbidden!
    forbidden_res = client.put(f"/api/v1/notifications/{notif_id_a}/read", headers=farmer_headers_b)
    assert forbidden_res.status_code == 403
    assert "do not have permission" in forbidden_res.json()["detail"]
