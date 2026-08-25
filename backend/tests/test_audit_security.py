from app.models.user import UserRole


def create_user_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecretPassword123!",
        "full_name": f"Security User {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "SecretPassword123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def test_audit_logging_on_security_events(client):
    admin_headers = create_user_token(client, "admin_audit_test@agritrace.org", UserRole.SUPER_ADMIN)
    farmer_headers = create_user_token(client, "farmer_audit_test@agritrace.org", UserRole.FARMER)

    # 1. Farmer creates farm & harvest
    farm = client.post("/api/v1/farms/", json={
        "name": "Audit Test Farm",
        "location_address": "Audit Road 10",
        "total_area_hectares": 5.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()

    client.post("/api/v1/harvests/", json={"farm_id": farm["id"], "product_name": "Organic Tomatoes", "quantity": 100.0}, headers=farmer_headers)

    # 2. Admin retrieves audit log trail
    res = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 3

    actions = [l["action"] for l in logs]
    assert "USER_CREATION" in actions
    assert "LOGIN" in actions
    assert "BATCH_CREATION" in actions


def test_list_audit_logs_super_admin_only(client):
    admin_headers = create_user_token(client, "admin_audit_list@agritrace.org", UserRole.SUPER_ADMIN)

    res = client.get("/api/v1/audit-logs?action=LOGIN", headers=admin_headers)
    assert res.status_code == 200
    for entry in res.json():
        assert entry["action"] == "LOGIN"


def test_audit_logs_permission_isolation(client):
    farmer_headers = create_user_token(client, "farmer_no_audit@agritrace.org", UserRole.FARMER)

    res = client.get("/api/v1/audit-logs", headers=farmer_headers)
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]


def test_security_sql_injection_protection(client):
    # Attempt SQL injection attack payload in QR verify endpoint
    sql_payload = "' OR '1'='1"
    res = client.get(f"/api/v1/verify/{sql_payload}")
    assert res.status_code == 404
    assert "Unrecognized QR code" in res.json()["detail"]
