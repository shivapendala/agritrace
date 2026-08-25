from app.models.user import UserRole


def create_user_token(client, email, role):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecretPassword123!",
        "full_name": f"Admin {role.value}",
        "role": role.value
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "SecretPassword123!"}).json()
    return {"Authorization": f"Bearer {login_res['access_token']}"}


def test_analytics_overview_metrics(client):
    admin_headers = create_user_token(client, "admin_analytics@agritrace.org", UserRole.SUPER_ADMIN)

    res = client.get("/api/v1/analytics/overview", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert "total_farmers" in data
    assert "total_farms" in data
    assert "total_batches" in data
    assert "approved_batches" in data
    assert "rejected_batches" in data
    assert "total_warehouse_stock_kg" in data
    assert "temperature_alerts_count" in data


def test_analytics_filtered_reports(client):
    admin_headers = create_user_token(client, "admin_reports@agritrace.org", UserRole.SUPER_ADMIN)
    farmer_headers = create_user_token(client, "farmer_rep@agritrace.org", UserRole.FARMER)

    farm = client.post("/api/v1/farms/", json={
        "name": "Report Farm",
        "location_address": "Report Road 99",
        "total_area_hectares": 12.0,
        "soil_type": "Loam",
        "irrigation_type": "Drip"
    }, headers=farmer_headers).json()

    client.post("/api/v1/harvests/", json={"farm_id": farm["id"], "product_name": "Organic Strawberries", "quantity": 450.0}, headers=farmer_headers)

    # Test harvest report filter by product_name
    res = client.get("/api/v1/analytics/reports?report_type=harvest&product_name=Strawberries", headers=admin_headers)
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) >= 1
    assert "Strawberries" in rows[0]["product_name"]


def test_export_report_csv_file(client):
    admin_headers = create_user_token(client, "admin_csv@agritrace.org", UserRole.SUPER_ADMIN)

    res = client.get("/api/v1/analytics/reports/export-csv?report_type=harvest", headers=admin_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Record ID,Date,Report Type" in res.text
