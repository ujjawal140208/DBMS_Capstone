# CareSphere — complete local + production deployment guide

This repository is a small monorepo with two deployable services:

- `Frontend/`: React + Vite static frontend, deployed to Vercel.
- `Backend/`: Express + Mongoose API, deployed to Render.
- MongoDB Atlas: managed database used by the backend only.

Do **not** deploy the backend to Vercel in this setup. The `render.yaml` Blueprint is the production backend definition. Vercel serves only the Vite frontend.

---

## 0. Before changing anything

1. Keep a backup of the currently working local project before replacing any source files.
2. Extract this ZIP to a temporary folder. Open the extracted `DBMS_capstone` folder and copy its contents into your **existing GitHub repository folder** (the folder that already contains `.git`). Allow source files to be overwritten. Preserve the existing `.git` folder and your local `Backend/.env` / `Frontend/.env` files. Do not initialise a new Git repository.
3. Do not upload `Backend/.env` or any real credentials to GitHub.
4. The supplied ZIP intentionally excludes local `.env` files and `.git` metadata. If your local `Backend/.env` is missing after copying, recreate it from `Backend/.env.example` and enter your existing Atlas URI. The frontend `.env` is optional for default local proxy use.
5. Keep your existing Atlas database and collection data. Do not run `npm run seed` unless you want to create/update synthetic demo data.

## 1. Local development (preserves the two-terminal workflow)

### Backend

In PowerShell:

```powershell
cd DBMS_capstone\Backend
Copy-Item .env.example .env
notepad .env
```

Set at least:

```env
MONGODB_URI=your_actual_mongodb_atlas_uri
DATABASE_NAME=caresphere_db
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
TRUST_PROXY=0
```

If your Windows/local DNS requires it, add:

```env
DNS_SERVERS=8.8.8.8,8.8.4.4
```

Install and start:

```powershell
npm ci
npm run dev
```

### Frontend

Open a second terminal:

```powershell
cd DBMS_capstone\Frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api` to `http://127.0.0.1:8000` when `VITE_API_URL` is blank.

### Local verification

Open:

- `http://127.0.0.1:8000/api/health/live` — process is listening.
- `http://127.0.0.1:8000/api/health` — MongoDB is connected and responds to ping.
- `http://127.0.0.1:8000/api/dashboard/summary` — dashboard endpoint returns JSON.
- `http://localhost:5173` — frontend loads.

Do not browse to `http://0.0.0.0:8000`; `0.0.0.0` is a bind address, not a browser destination.

## 2. Optional synthetic demo data

The project's patient, doctor and appointment seed data is synthetic. Seed it only if the database does not already contain demo records:

```powershell
cd DBMS_capstone\Backend
npm run seed
```

Default sizes are 5 hospital centres, 1,000 doctors, 50,000 synthetic patients, 30,000 synthetic appointments and 16 synthetic beds per hospital centre, plus matching synthetic admissions for occupied beds. The bed and admission records are deliberately labelled as synthetic demo data in their fields/UI.

Re-running the seed uses upserts for the generated IDs; it does not clear collections. Review `Backend/scripts/seed.js` before changing defaults or using this against a database with non-demo records.

## 3. Optional open hospital directory import

The public facility import writes to the separate `public_hospitals` collection. It does not overwrite the app's internal `hospitals` collection.

Import one randomly selected record whose facility type contains “Hospital”:

```powershell
cd DBMS_capstone\Backend
npm run import:hospitals -- --sample
```

Import a capped batch:

```powershell
npm run import:hospitals -- --limit 2000
```

Import all records available from the configured public Esri India feature layer:

```powershell
npm run import:hospitals
```

The importer pages the public Esri India ArcGIS feature layer and upserts by `facility_id`. The layer exposes hospital/facility names, type, address, PIN code, phone, state/district and coordinates. It stores related Government of India catalogue links as context, not as verified row-level provenance. Its published ItemInfo response does not expose a populated licence field; verify the provider's current terms and attribution requirements before redistribution or production use. Run it locally or as a controlled one-off job, not during web-service startup. Do not present the resulting directory as complete or authoritative without independent validation.

## 4. Push to GitHub

From the repository root (the folder containing `Backend`, `Frontend` and `render.yaml`):

```powershell
git status
git check-ignore Backend/.env
```

`git check-ignore Backend/.env` should print the ignored path. Check that no `.env` is staged:

```powershell
git ls-files Backend/.env Frontend/.env
```

This should print nothing. If an `.env` was previously committed, remove it from Git tracking (this does not delete the local file) and rotate the exposed credential:

```powershell
git rm --cached Backend/.env
git rm --cached Frontend/.env
```

Then:

```powershell
git add .
git status
git commit -m "CareSphere clinical UI and Render deployment setup"
git push origin main
```

Do not add `.env` files, MongoDB connection strings, passwords or database exports to the commit.

## 5. Deploy the backend on Render

### Preferred method: Blueprint

1. Sign in at https://render.com.
2. Choose **New + → Blueprint**.
3. Connect the existing GitHub repository that contains `render.yaml` at its root.
4. Render reads `render.yaml`. The service root is already `Backend`; do not set the repo root to `Frontend` for this service.
5. Review the service values: Node web service, `npm ci`, `npm start`, liveness path `/api/health/live`.
6. Supply the secret/environment variables when Render prompts you, or add them in the service's **Environment** page:

```env
MONGODB_URI=your_actual_atlas_connection_string
DATABASE_NAME=caresphere_db
CORS_ORIGINS=https://YOUR-PROJECT.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

The Blueprint also configures `NODE_ENV=production`, `NODE_VERSION=24.22.1`, `HOST=0.0.0.0`, `TRUST_PROXY=1`, Singapore as the initial service region and automatic commit deployments. If `MONGODB_URI` is missing in production, the API now reports a clear configuration error instead of silently trying `127.0.0.1:27017`. Render injects `PORT`; do not hardcode it in Render settings. Add any Vercel custom domain as another comma-separated origin in `CORS_ORIGINS` (origin only; no path and no trailing slash).

7. Deploy and wait for the service to become **Live**.
8. Copy the generated backend URL, for example `https://caresphere-api.onrender.com` (your actual host may differ).

### Check Render endpoints before setting Vercel

Open these using your actual Render URL:

- `https://YOUR-RENDER-HOST.onrender.com/` — should return JSON identifying CareSphere API.
- `https://YOUR-RENDER-HOST.onrender.com/api/health/live` — should return `{"status":"ok","service":"caresphere-api"}`.
- `https://YOUR-RENDER-HOST.onrender.com/api/health` — should return `{"status":"ok","database":"connected"}`.
- `https://YOUR-RENDER-HOST.onrender.com/api/dashboard/summary` — should return JSON counts.

The liveness endpoint only confirms that the Node process is running. `/api/health` confirms the Atlas connection and database ping.

## 6. Configure MongoDB Atlas for Render

1. In Atlas, open the project containing your existing cluster.
2. Open **Security → Network Access → IP Access List**.
3. In the Render service's details page, open **Connect → Outbound** and copy its outbound IP ranges.
4. Add the Render outbound ranges to Atlas. If you use Render dedicated outbound IPs, allowlist those addresses instead.
5. Ensure the Atlas database user in `MONGODB_URI` has access to `caresphere_db` (or the database named in `DATABASE_NAME`) and the required read/write privileges.
6. Ensure the password in the URI is URL-encoded when it contains reserved characters such as `@`, `:`, `/`, `?`, `#` or `%`.
7. Do not use `0.0.0.0/0` as a permanent network rule. It permits network access from anywhere; if used temporarily for diagnosis, remove it and replace it with the Render service's outbound ranges.

If `/api/health` responds 503, read its `detail` field and the Render service logs. Typical causes:

- Authentication failed: database username/password or user role is wrong.
- Server selection timeout: Atlas IP access list or outbound network access is wrong.
- DNS/SRV failure: check the Atlas hostname and the Render log. Only set `DNS_SERVERS` if a Render DNS problem is observed; the custom resolver used on your Windows laptop is not automatically needed on Render.
- TLS/certificate failure: keep Atlas TLS validation enabled; do not set `tlsInsecure=true`.

## 7. Deploy the frontend on Vercel

1. Open the existing Vercel project connected to this same repository.
2. Go to **Settings → Build and Deployment**.
3. Set **Root Directory** to `Frontend` and save. This project is now deployed as a frontend-only Vite app; Render hosts the API.
4. Use these settings (Vercel generally detects Vite automatically):
   - Framework Preset: `Vite`
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js Version: `24.x` (Vercel currently supports Node 24.x and 22.x for builds).
5. Go to **Settings → Environment Variables** and add:

```env
VITE_API_URL=https://YOUR-RENDER-HOST.onrender.com/api
```

Select Production. Preview deployments also require their exact preview domain to be added to Render's `CORS_ORIGINS`; configure Preview only if you plan to test previews against the same API. You may paste the Render service origin alone or include `/api`; the frontend client normalizes both forms. Never use `http://127.0.0.1:8000/api` in Vercel.
6. Save the variable and redeploy. Vite embeds `VITE_*` variables at build time, so changing the variable alone does not update an already-built deployment.
7. Copy the final Vercel production URL and add its exact origin to Render's `CORS_ORIGINS` if it differs from the one you already configured. Then redeploy/restart the Render service after changing environment variables.

## 8. Production smoke test

Run these tests in order:

1. Render `/api/health/live` → HTTP 200.
2. Render `/api/health` → HTTP 200 and `database: connected`.
3. Render `/api/dashboard/summary` → HTTP 200 JSON.
4. Vercel website opens and the status indicator says `SYSTEM ONLINE`.
5. Doctor dashboard summary and hospital centres are displayed.
6. Patient EHR can select a patient and show linked records (or clear empty states where no linked records exist).
7. Wards view displays seeded bed/admission records if `npm run seed` was run; otherwise it displays a correct empty state.
8. Patient appointments view can select a patient and show linked appointments/prescriptions/results/bills (empty states are expected if those collections have no linked records).
9. Records workspace search/pagination and create/delete work against the selected API.

## 9. Common production errors

| Browser / HTTP error | What to inspect | Corrective action |
|---|---|---|
| `ERR_NAME_NOT_RESOLVED` / `ERR_CONNECTION_REFUSED` | Incorrect Render URL or service not Live | Copy the exact `onrender.com` URL from Render and check service status. |
| HTTP 404 | Base URL/path wrong | `VITE_API_URL` must end in `/api`; check `/api/health/live`. |
| HTTP 403 / CORS | Browser origin is missing from `CORS_ORIGINS` | Add the exact Vercel origin, without a path or trailing slash, then restart Render. |
| HTTP 503 on `/api/health` | API process is alive but Atlas is not ready | Read JSON `detail`; check Atlas user, URI, IP access list and Render logs. |
| HTTP 429 | API rate limit reached | Wait for the rate window to reset; investigate repeated polling before changing limits. |
| First request is slow | Render Free service may have spun down | Allow the service to wake; paid Render plans avoid free-instance idle spin-down. |
| Production says API URL missing | Vercel has no `VITE_API_URL` at build time | Add it to Production and redeploy. |

Render Free web services spin down after 15 minutes without inbound requests and typically take about a minute to wake. That is an expected free-tier limitation, not an API bug. Use a paid always-on instance if the project needs consistent response times.

## 10. Security and data-handling warning

This project currently has no login/authentication or role-based access control. The API includes read/write/delete endpoints for the records collections. Do **not** expose real patient records, medical histories, prescriptions or identifiable health information through a public deployment. Use synthetic demo data only until authentication, authorization, audit policy, encryption, backups, and legal/compliance reviews are implemented. A UI label or HTTPS certificate does not make an application HIPAA compliant.

## 11. If you need to roll back

- Local app: keep the original working folder/ZIP as a backup. The new ZIP does not include or overwrite your local `.env` files.
- GitHub: revert the deployment commit or restore the saved branch.
- Render: use the service's deploy history to redeploy the previous successful commit.
- Vercel: use Deployments to promote a previous successful frontend deployment.

---

## Official deployment references

- Render Node version: https://render.com/docs/node-version
- Render Blueprint reference: https://render.com/docs/blueprint-spec
- Render health checks: https://render.com/docs/health-checks
- Render outbound IP addresses: https://render.com/docs/outbound-ip-addresses
- Render MongoDB Atlas guide: https://render.com/docs/connect-to-mongodb-atlas
- Vercel Vite guide: https://vercel.com/docs/frameworks/frontend/vite
- Vercel build configuration: https://vercel.com/docs/builds/configure-a-build
- Vite environment variables: https://vite.dev/guide/env-and-mode
- MongoDB Atlas IP access list: https://www.mongodb.com/docs/atlas/security/ip-access-list/
