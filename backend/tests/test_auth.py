from app.models.role import UserRole


def test_registration(client):
    payload = {
        "email": "farmer2@agritrace.org",
        "password": "SecurePassword123!",
        "full_name": "Bob Farmer",
        "role": UserRole.FARMER.value,
        "phone_number": "+1987654321",
        "organization": "Sunrise Orchards"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["full_name"] == payload["full_name"]
    assert data["role"] == UserRole.FARMER.value
    assert "id" in data
    assert "hashed_password" not in data


def test_duplicate_registration(client):
    payload = {
        "email": "dup@agritrace.org",
        "password": "Password123!",
        "full_name": "Dup User",
        "role": UserRole.CUSTOMER.value
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_login(client):
    reg_payload = {
        "email": "warehouse1@agritrace.org",
        "password": "StoragePass123!",
        "full_name": "Charlie Manager",
        "role": UserRole.WAREHOUSE_MANAGER.value
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "warehouse1@agritrace.org",
        "password": "StoragePass123!"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == reg_payload["email"]


def test_invalid_credentials(client):
    reg_payload = {
        "email": "invalid_login@agritrace.org",
        "password": "RealPassword123!",
        "full_name": "Test User",
        "role": UserRole.CUSTOMER.value
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    response = client.post("/api/v1/auth/login", json={
        "email": "invalid_login@agritrace.org",
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401


def test_invalid_jwt(client):
    # Test missing token
    res1 = client.get("/api/v1/auth/me")
    assert res1.status_code == 401

    # Test malformed JWT token
    headers = {"Authorization": "Bearer invalid.jwt.token"}
    res2 = client.get("/api/v1/auth/me", headers=headers)
    assert res2.status_code == 401


def test_protected_route(client):
    reg_payload = {
        "email": "me_test@agritrace.org",
        "password": "Password123!",
        "full_name": "Me User",
        "role": UserRole.CUSTOMER.value
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_res = client.post("/api/v1/auth/login", json={
        "email": reg_payload["email"],
        "password": reg_payload["password"]
    }).json()

    headers = {"Authorization": f"Bearer {login_res['access_token']}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == reg_payload["email"]


def test_role_permissions(client):
    # Register Farmer
    farmer_payload = {
        "email": "farmer_perm@agritrace.org",
        "password": "Password123!",
        "full_name": "Farmer Joe",
        "role": UserRole.FARMER.value
    }
    client.post("/api/v1/auth/register", json=farmer_payload)
    farmer_login = client.post("/api/v1/auth/login", json={"email": farmer_payload["email"], "password": farmer_payload["password"]}).json()
    farmer_headers = {"Authorization": f"Bearer {farmer_login['access_token']}"}

    # Farmer should access farmer-only route
    res_farmer = client.get("/api/v1/auth/farmer-only", headers=farmer_headers)
    assert res_farmer.status_code == 200

    # Farmer should NOT access quality-only route (403 Forbidden)
    res_farmer_quality = client.get("/api/v1/auth/quality-only", headers=farmer_headers)
    assert res_farmer_quality.status_code == 403

    # Register Quality Officer
    quality_payload = {
        "email": "quality_perm@agritrace.org",
        "password": "Password123!",
        "full_name": "Quality Officer Ann",
        "role": UserRole.QUALITY_OFFICER.value
    }
    client.post("/api/v1/auth/register", json=quality_payload)
    quality_login = client.post("/api/v1/auth/login", json={"email": quality_payload["email"], "password": quality_payload["password"]}).json()
    quality_headers = {"Authorization": f"Bearer {quality_login['access_token']}"}

    # Quality officer should access quality-only route
    res_quality = client.get("/api/v1/auth/quality-only", headers=quality_headers)
    assert res_quality.status_code == 200

    # Quality officer should NOT access farmer-only route
    res_quality_farmer = client.get("/api/v1/auth/farmer-only", headers=quality_headers)
    assert res_quality_farmer.status_code == 403
