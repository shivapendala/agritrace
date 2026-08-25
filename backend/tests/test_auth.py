from app.models.user import UserRole


def test_register_user_success(client):
    payload = {
        "email": "farmer1@agritrace.org",
        "password": "FarmerPassword123!",
        "full_name": "John Farmer",
        "role": UserRole.FARMER.value,
        "phone_number": "+1234567890",
        "organization": "Green Valley Organics"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["full_name"] == payload["full_name"]
    assert data["role"] == UserRole.FARMER.value
    assert "id" in data
    assert "hashed_password" not in data


def test_register_user_duplicate_email(client):
    payload = {
        "email": "duplicate@agritrace.org",
        "password": "Password123!",
        "full_name": "Duplicate User",
        "role": UserRole.CUSTOMER.value
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_login_success(client):
    # First register user
    reg_payload = {
        "email": "quality@agritrace.org",
        "password": "QualitySecure123!",
        "full_name": "Alice Inspector",
        "role": UserRole.QUALITY_OFFICER.value
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # Login
    login_payload = {
        "email": "quality@agritrace.org",
        "password": "QualitySecure123!"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == reg_payload["email"]


def test_login_invalid_password(client):
    reg_payload = {
        "email": "wrongpass@agritrace.org",
        "password": "CorrectPassword123!",
        "full_name": "Test User",
        "role": UserRole.CUSTOMER.value
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "wrongpass@agritrace.org",
        "password": "IncorrectPassword!"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401


def test_get_me_and_refresh_token(client):
    reg_payload = {
        "email": "me_user@agritrace.org",
        "password": "Password123!",
        "full_name": "Self User",
        "role": UserRole.WAREHOUSE_MANAGER.value
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_res = client.post("/api/v1/auth/login", json={"email": reg_payload["email"], "password": reg_payload["password"]}).json()
    access_token = login_res["access_token"]
    refresh_token = login_res["refresh_token"]

    # Test /me endpoint
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == reg_payload["email"]

    # Test /refresh endpoint
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()


def test_rbac_admin_only_users_list(client):
    # Register normal farmer
    farmer_payload = {
        "email": "farmer_rbac@agritrace.org",
        "password": "Password123!",
        "full_name": "Farmer Joe",
        "role": UserRole.FARMER.value
    }
    client.post("/api/v1/auth/register", json=farmer_payload)
    farmer_login = client.post("/api/v1/auth/login", json={"email": farmer_payload["email"], "password": farmer_payload["password"]}).json()
    farmer_headers = {"Authorization": f"Bearer {farmer_login['access_token']}"}

    # Attempt to access admin endpoint
    res_farmer = client.get("/api/v1/auth/users", headers=farmer_headers)
    assert res_farmer.status_code == 403

    # Register SUPER_ADMIN
    admin_payload = {
        "email": "super_admin@agritrace.org",
        "password": "AdminPassword123!",
        "full_name": "Super Admin",
        "role": UserRole.SUPER_ADMIN.value
    }
    client.post("/api/v1/auth/register", json=admin_payload)
    admin_login = client.post("/api/v1/auth/login", json={"email": admin_payload["email"], "password": admin_payload["password"]}).json()
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}

    res_admin = client.get("/api/v1/auth/users", headers=admin_headers)
    assert res_admin.status_code == 200
    assert isinstance(res_admin.json(), list)
