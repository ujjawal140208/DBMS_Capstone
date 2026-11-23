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
- The API binds to `0.0.0.0` by default so it works in hosted web services; use `HOST=127.0.0.1` if you specifically want loopback-only binding. Set `TRUST_PROXY=1` when hosted behind a trusted reverse proxy.

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

When `VITE_API_URL` is blank, the frontend calls `/api` and Vite proxies it to the local Express server. In production, `VITE_API_URL` points directly to the Render API service.

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
`hospitals`, `public_hospitals`, `departments`, `patients`, `doctors`, `appointments`,
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

## Production deployment (Vercel frontend + Render API + MongoDB Atlas)

This project uses a split deployment: Vercel hosts the static Vite frontend, Render runs the existing Express backend as a normal Node web service, and MongoDB Atlas remains the database. This avoids wrapping the long-running Express server in a custom Vercel catch-all function.

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for the exact setup steps. In summary:

- Vercel Root Directory: `Frontend`; use the Vite defaults (`npm ci`, `npm run build`, output `dist`).
- Render Root Directory: `Backend`; build `npm ci`; start `npm start`; bind `HOST=0.0.0.0` and use Render's injected `PORT`. A starter Blueprint is included as `render.yaml`.
- Render environment: set `MONGODB_URI`, `DATABASE_NAME=caresphere_db`, and `CORS_ORIGINS` to your exact Vercel origin plus local origins.
- Vercel environment: set `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`. Vite embeds this value into the production bundle, so redeploy the frontend after changing it.
- Local development still uses the existing Vite proxy at `/api` to `http://127.0.0.1:8000`; leave `VITE_API_URL` blank locally.

A Render Free web service can spin down after 15 minutes without inbound traffic and can take about a minute to wake up. For a demo this may be acceptable; use an always-on paid service if cold starts are unacceptable.

## Public hospital directory import

The optional importer adds public health-facility directory entries to the separate `public_hospitals` collection. It does not create real patient, doctor, appointment, or clinical records.

The import source is Esri India's **Hospital Directory of India** public feature layer. Its item description traces the underlying facility information to the Government of India's OGD Hospital Directory and All India Health Centres Directory. The importer retains source IDs, source URLs, and provenance notes on each imported record. Check the upstream data terms and attribution before redistributing the imported dataset.

Configure `Backend/.env` using `Backend/.env.example`, then run:

```bash
cd Backend
npm install
npm run import:hospitals -- --sample   # imports one randomly selected hospital-type record
npm run import:hospitals               # imports all available facilities in pages
npm run import:hospitals -- --limit 5000
```

The importer is idempotent: records are upserted using stable source-derived `facility_id` values. Existing demo hospital records and the other seeded demo collections are not deleted. A public facility directory is kept distinct from synthetic patient and appointment data.

## Tests

```bash
cd Backend
npm test
```

The test suite covers request sanitization, query validation, MongoDB URI validation, actionable connection diagnostics, health endpoint behaviour when the database is unavailable, 404 handling, and malformed JSON handling.

## Local development

Run the backend in one terminal (`cd Backend && npm install && npm run dev`) and the frontend in another (`cd Frontend && npm install && npm run dev`). The Vite development server proxies `/api` to `http://127.0.0.1:8000`.
