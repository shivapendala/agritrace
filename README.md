# AgriTrace — Farm-to-Market Traceability Platform

AgriTrace is a comprehensive farm-to-market agricultural product traceability platform. It tracks agricultural products through every step of their lifecycle: farmer harvest, quality inspection, warehouse storage, transportation, retailer receipt, and final customer QR verification.

---

## Technical Stack

- **Backend**: FastAPI (Python 3.11+), SQLAlchemy ORM, Pydantic v2, PostgreSQL, PyJWT, Passlib (Bcrypt)
- **Frontend**: React 18, TypeScript, Vite, React Router DOM, Custom Responsive CSS Theme
- **Testing**: Pytest (Backend API & Auth unit tests), Playwright (End-to-end testing)
- **Containerization**: Docker, Docker Compose

---

## Main User Roles

1. `SUPER_ADMIN` — System administration and user role management
2. `FARMER` — Farm registration, crop tracking, harvest recording, batch creation
3. `QUALITY_OFFICER` — Batch quality inspections and certification checks
4. `WAREHOUSE_MANAGER` — Storage allocation and inventory management
5. `TRANSPORT_MANAGER` — Logistics, vehicle routing, and driver assignment
6. `DRIVER` — In-transit telemetry updates and delivery sign-offs
7. `RETAILER` — Store inventory receipt and retail customer sales
8. `CUSTOMER` — Public QR code scanning and farm-to-market lineage verification

---

## Phase Implementation Status

- [x] **Phase 1: Project Architecture & Foundation**: Environment setup, Docker Compose, PostgreSQL database, health endpoint, base layout.
- [x] **Phase 2: Authentication & Role-Based Access Control (RBAC)**: User models, Role models, Bcrypt password hashing, JWT access/refresh token issuance, current user profile endpoint, role authorization guards, dynamic navigation, 403 unauthorized handler, and Pytest security suite.
- [x] **Phase 3: Farmer and Farm Management**: Farmer profiles, contact & address management, verification status (`UNVERIFIED`, `VERIFIED`, `SUSPENDED`), Farm CRUD operations (GPS coordinates, area size, soil type, irrigation system), Crop tracking (variety, planting dates, harvest status), Admin verification & suspension workflows, and Pytest suite.
- [x] **Phase 4: Harvest and Batch Management**: Harvest logging (quantity, unit, method, initial grade, notes), Unique traceability batch generator (`TOM-2026-0001` pattern), Batch status lifecycle (`HARVESTED`, `QUALITY_PENDING`, `QUALITY_APPROVED`, `IN_WAREHOUSE`, `IN_TRANSIT`, `AT_RETAILER`, `SOLD`, `REJECTED`), Quantity inventory tracking & over-deduction guards, interactive provenance step timeline, and Pytest suite.

---

## Getting Started

### Local Backend Development

1. Create a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Run Pytest test suite:
   ```bash
   pytest tests/
   ```

3. Start FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Local Frontend Development

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start Vite development server:
   ```bash
   npm run dev
   ```

---

## License & Compliance

Original production-grade code created for AgriTrace. All logic is maintainable, role-validated, and documented.
