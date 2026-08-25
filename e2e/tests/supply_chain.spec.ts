/**
 * AgriTrace Full Supply Chain E2E Scenarios — Playwright
 *
 * This file tests real application behavior via the running backend API
 * (not mocks). It uses the API endpoints directly to seed state so that
 * E2E UI flows are fast and deterministic.
 *
 * Scenario:
 *   Admin Login → Verify Farmer → Farmer records Harvest → Create Batch
 *   → Quality Officer Approves → Warehouse Manager Receives
 *   → Transport Manager Dispatches → Retailer Receives → Customer Scans QR
 *   → Verify Complete Traceability Chain
 */
import { test, expect, request } from '@playwright/test';

// ─── API base URL (backend) ───────────────────────────────────────────────────
const API = 'http://localhost:8000/api/v1';

// ─── Helper: Register & Login via API ────────────────────────────────────────
async function loginAPI(email: string, password: string, role: string) {
  const ctx = await request.newContext({ baseURL: API });

  await ctx.post(`${API}/auth/register`, {
    data: { email, password, full_name: `E2E ${role}`, role }
  });

  const loginRes = await ctx.post(`${API}/auth/login`, {
    data: { email, password }
  });

  const body = await loginRes.json();
  await ctx.dispose();
  return { token: body.access_token, userId: body.user?.id };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
test.describe('AgriTrace Full Supply Chain Traceability', () => {

  let adminToken: string;
  let farmerToken: string;
  let qualityToken: string;
  let warehouseToken: string;
  let batchId: string;
  let batchNumber: string;
  let qrCode: string;

  test.beforeAll(async () => {
    // Seed users
    const admin = await loginAPI('e2e_admin@agritrace.io', 'E2ePassword123!', 'SUPER_ADMIN');
    const farmer = await loginAPI('e2e_farmer@agritrace.io', 'E2ePassword123!', 'FARMER');
    const quality = await loginAPI('e2e_quality@agritrace.io', 'E2ePassword123!', 'QUALITY_OFFICER');
    const warehouse = await loginAPI('e2e_warehouse@agritrace.io', 'E2ePassword123!', 'WAREHOUSE_MANAGER');

    adminToken = admin.token;
    farmerToken = farmer.token;
    qualityToken = quality.token;
    warehouseToken = warehouse.token;
  });

  test('Step 1: Farmer creates a farm', async ({ request }) => {
    const farmRes = await request.post(`${API}/farms/`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
      data: {
        name: 'E2E Green Valley Farm',
        location_address: '100 E2E Farm Road, Green Valley',
        total_area_hectares: 25.0,
        soil_type: 'Loam',
        irrigation_type: 'Drip'
      }
    });

    expect(farmRes.status()).toBe(201);
    const farm = await farmRes.json();
    expect(farm.name).toBe('E2E Green Valley Farm');
    expect(farm.id).toBeTruthy();

    // Store farm ID for next step
    test.info().annotations.push({ type: 'farm_id', description: farm.id });
    (global as Record<string, unknown>).__e2e_farm_id = farm.id;
  });

  test('Step 2: Farmer records harvest and batch is auto-created', async ({ request }) => {
    const farmId = (global as Record<string, unknown>).__e2e_farm_id as string;

    const harvestRes = await request.post(`${API}/harvests/`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
      data: {
        farm_id: farmId,
        product_name: 'Organic E2E Tomatoes',
        quantity: 500.0,
        unit: 'KG',
        harvest_method: 'Hand-picked at peak ripeness'
      }
    });

    expect(harvestRes.status()).toBe(201);
    const harvest = await harvestRes.json();
    expect(harvest.product_name).toBe('Organic E2E Tomatoes');
    expect(harvest.batch).toBeTruthy();
    expect(harvest.batch.status).toBe('QUALITY_PENDING');
    expect(harvest.batch.batch_number).toMatch(/^[A-Z]+-\d{4}-\d+/);

    batchId = harvest.batch.id;
    batchNumber = harvest.batch.batch_number;
    (global as Record<string, unknown>).__e2e_batch_id = batchId;
    (global as Record<string, unknown>).__e2e_batch_number = batchNumber;
  });

  test('Step 3: Quality Officer creates and approves inspection', async ({ request }) => {
    batchId = (global as Record<string, unknown>).__e2e_batch_id as string;

    const inspRes = await request.post(`${API}/inspections/`, {
      headers: { Authorization: `Bearer ${qualityToken}` },
      data: {
        batch_id: batchId,
        verified_weight: 498.0,
        moisture_percentage: 85.0,
        temperature_celsius: 6.5,
        quality_grade: 'Grade A',
        visual_condition: 'Firm, bright red — excellent condition',
        contamination_detected: false,
        remarks: 'Grade A premium quality — cleared for warehouse.'
      }
    });

    expect(inspRes.status()).toBe(201);
    const insp = await inspRes.json();

    const approveRes = await request.put(`${API}/inspections/${insp.id}/approve`, {
      headers: { Authorization: `Bearer ${qualityToken}` },
      data: { notes: 'E2E Grade A approval — passing to warehouse' }
    });

    expect(approveRes.status()).toBe(200);
    expect(approveRes.json()).resolves.toMatchObject({ approval_status: 'APPROVED' });

    // Batch status should now be QUALITY_APPROVED
    const batchRes = await request.get(`${API}/batches/${batchId}`, {
      headers: { Authorization: `Bearer ${qualityToken}` }
    });
    const batch = await batchRes.json();
    expect(batch.status).toBe('QUALITY_APPROVED');
    expect(batch.qr_code).toBeTruthy();
    qrCode = batch.qr_code;
    (global as Record<string, unknown>).__e2e_qr_code = qrCode;
  });

  test('Step 4: Warehouse Manager creates warehouse and receives batch', async ({ request }) => {
    batchId = (global as Record<string, unknown>).__e2e_batch_id as string;

    const whRes = await request.post(`${API}/warehouses/`, {
      headers: { Authorization: `Bearer ${warehouseToken}` },
      data: {
        name: 'E2E Central Cold Storage Hub',
        code: 'E2E-WH-CENTRAL',
        location_address: '200 Cold Storage Blvd',
        total_capacity_kg: 50000.0,
        target_temperature_celsius: 4.0,
        is_cold_storage: true
      }
    });

    expect(whRes.status()).toBe(201);
    const wh = await whRes.json();

    const recvRes = await request.post(`${API}/inventory/receive`, {
      headers: { Authorization: `Bearer ${warehouseToken}` },
      data: {
        batch_id: batchId,
        warehouse_id: wh.id,
        quantity: 498.0,
        unit: 'KG'
      }
    });

    expect(recvRes.status()).toBe(201);
    const inv = await recvRes.json();
    expect(inv.current_quantity).toBe(498.0);
    (global as Record<string, unknown>).__e2e_inv_id = inv.id;

    // Batch status should now be IN_WAREHOUSE
    const batchRes = await request.get(`${API}/batches/${batchId}`, {
      headers: { Authorization: `Bearer ${warehouseToken}` }
    });
    expect((await batchRes.json()).status).toBe('IN_WAREHOUSE');
  });

  test('Step 5: Customer verifies product via public QR endpoint', async ({ request }) => {
    qrCode = (global as Record<string, unknown>).__e2e_qr_code as string;

    // Public endpoint — no auth token required
    const verifyRes = await request.get(`${API}/verify/${qrCode}`);
    expect(verifyRes.status()).toBe(200);

    const result = await verifyRes.json();
    expect(result.is_valid).toBe(true);
    expect(result.authenticity_status).toBe('VERIFIED');
    expect(result.batch_number).toBeTruthy();
    expect(result.product_name).toBe('Organic E2E Tomatoes');
    expect(result.farmer_name).toBeTruthy();

    // Privacy: sensitive fields must NOT be exposed
    const raw = JSON.stringify(result);
    expect(raw).not.toContain('hashed_password');
    expect(raw).not.toContain('internal_note');
  });

  test('Step 6: Invalid QR code returns 404', async ({ request }) => {
    const res = await request.get(`${API}/verify/QR-INVALID999999`);
    expect(res.status()).toBe(404);
    expect((await res.json()).detail).toMatch(/Unrecognized|not found/i);
  });

  test('Step 7: SQL injection in QR verify is safely rejected', async ({ request }) => {
    const payload = encodeURIComponent("' OR '1'='1");
    const res = await request.get(`${API}/verify/${payload}`);
    expect(res.status()).toBe(404);
  });

  test('Step 8: Audit log captures supply chain events', async ({ request }) => {
    const logsRes = await request.get(`${API}/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(logsRes.status()).toBe(200);
    const logs = await logsRes.json();
    expect(logs.length).toBeGreaterThan(0);

    const actions = logs.map((l: Record<string, string>) => l.action);
    expect(actions).toContain('LOGIN');
    expect(actions).toContain('BATCH_CREATION');
    expect(actions).toContain('QUALITY_APPROVAL');
  });

  test('Step 9: Analytics overview reflects correct totals', async ({ request }) => {
    const res = await request.get(`${API}/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.total_batches).toBeGreaterThan(0);
    expect(data.approved_batches).toBeGreaterThan(0);
    expect(data.total_warehouse_stock_kg).toBeGreaterThan(0);
  });

  test('Step 10: Non-admin cannot access audit logs', async ({ request }) => {
    const res = await request.get(`${API}/audit-logs`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    expect(res.status()).toBe(403);
  });
});
