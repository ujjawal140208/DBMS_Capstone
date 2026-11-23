# CareSphere — Multi-Centre Hospital Management & Analytics

A runnable DBMS capstone starter built with React + Vite, Node.js (Express + Mongoose), and MongoDB Atlas.
It intentionally has **no authentication** in this version. Use synthetic/demo data only.

## Features
- Multi-centre data model: operational records carry a `hospital_id`.
- Hospital centres, departments, patients, doctors, appointments, prescriptions,
  medicines, laboratory tests/results, bills, payments, pharmacy inventory,
  admissions, beds, and audit logs.
- Generic CRUD API for the listed collections.
- Dashboard KPIs and hospital-centre aggregation.
- Appointment conflict check for the same doctor, centre, and time slot.
- MongoDB indexes and collection validators.
- Synthetic-data seeder for multi-centre load testing.
- Paginated collection browsing and search from the UI.

## Requirements
- Node.js 18+ (20 or 22 recommended)
- MongoDB Atlas cluster (or local MongoDB)

## 1. Configure MongoDB Atlas
1. In Atlas create a **database user** (Database Access) with read/write access to `caresphere_db`.
2. In **Network Access** add your current IP (avoid `0.0.0.0/0` outside quick tests).
3. Copy the connection string (Connect > Drivers) into `Backend/.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
DATABASE_NAME=caresphere_db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```
URL-encode special characters in the password (`@` -> `%40`, `:` -> `%3A`, `/` -> `%2F`).
Never commit `.env` (it is in `.gitignore`).

Check the connection before starting anything:
```bash
cd Backend
npm install
npm run check-db
```

### How the Atlas connection is secured
- TLS is always on for `mongodb+srv://` and forced for every non-local host; certificates are always verified.
  The backend refuses to start a connection if the URI contains `tlsInsecure` / `tlsAllowInvalid*`,
  or still contains `<placeholders>`.
- Credentials live only in `.env`; passwords are redacted from every log line and error message,
  and clients only ever get a generic error (never a connection string).
- Request hardening: Helmet security headers, CORS whitelist, rate limit (300 req/min/IP),
  100 kB body limit, `$`-operator / dotted-key stripping on all writes (NoSQL injection),
  string-only query params, regex-escaped search (no ReDoS), collection-name whitelist.
- The API binds to `127.0.0.1` by default. Set `HOST` / `TRUST_PROXY=1` deliberately when deploying.

## 2. Start backend
```bash
cd Backend
npm install
npm start          # or: npm run dev  (auto-restart on file changes)
```
API: http://127.0.0.1:8000  (health: http://127.0.0.1:8000/api/health)

If MongoDB is unreachable the API still starts and answers `503` with the exact reason
(wrong password, IP not allowed in Atlas, DNS, ...) so the UI shows it; it reconnects on the next request.

## 3. Seed demo data
```bash
cd Backend
npm run seed
```
Targets are controlled by environment variables:
- `SEED_PATIENTS` (default 50000)
- `SEED_APPOINTMENTS` (default 30000)
- `SEED_DOCTORS` (default 1000)
- `SEED_HOSPITALS` (default 5)

**Important:** 50,000 patients + 30,000 appointments is a meaningful load for a small/free
cluster (Atlas M0 has a 512 MB limit). The seeder uses synthetic data and upserts fixed demo IDs,
so rerunning it updates/reuses those IDs rather than duplicating them.
Quick test: `SEED_PATIENTS=1000 SEED_APPOINTMENTS=500 SEED_DOCTORS=50 npm run seed`
(PowerShell: `$env:SEED_PATIENTS=1000; npm run seed`).

## 4. Start frontend
Open a second terminal:
```bash
cd Frontend
npm install
npm run dev
```
Open http://localhost:5173

Optional frontend API URL:
Create `Frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

## API overview
- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/centres`
- `GET /api/{collection}?hospital_id=HOSP001&search=...&skip=0&limit=25`
- `POST /api/{collection}`
- `GET /api/{collection}/{record_id}`
- `PATCH /api/{collection}/{record_id}`
- `DELETE /api/{collection}/{record_id}`

Allowed collection names:
`hospitals`, `departments`, `patients`, `doctors`, `appointments`,
`prescriptions`, `medicines`, `lab_tests`, `lab_results`, `bills`, `payments`,
`pharmacy_inventory`, `admissions`, `beds`, `audit_logs`.

Appointment creation checks for an existing active appointment for the same doctor,
hospital centre, and `appointment_at` timestamp. The database unique index is a
second line of defence for this slot model.

## Data model notes
MongoDB is document-oriented, not a relational SQL database. This project uses
document IDs and references (for example `patient_id`, `doctor_id`, `hospital_id`),
embedded arrays where useful, validation, indexes, and aggregation pipelines.
It does not claim SQL foreign keys or relational normalization.

## Production hardening backlog
Authentication, role-based access control, field-level privacy, encryption policies,
backups, audit retention, rate limiting, formal migrations, observability, and
healthcare regulatory compliance are intentionally not implemented in this academic
demo. Do not use real patient data.
