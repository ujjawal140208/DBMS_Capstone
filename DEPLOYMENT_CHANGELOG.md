# Deployment and UI changelog

## November 2026 deployment pass

- Standardized the deployment model: Vercel serves the frontend from `Frontend/`; Render runs the Express API from `Backend/`; MongoDB Atlas remains the database.
- Added a root Render Blueprint with explicit backend root, Node version, startup command, environment variables and liveness path.
- Added `/api/health/live` for process liveness and retained `/api/health` for database readiness.
- Made DNS setup happen before dynamic import of Mongoose/application code when a custom local DNS resolver is configured.
- Normalized configured CORS origins and return an actionable 403 for non-whitelisted origins.
- Made the frontend fail with an explicit message when `VITE_API_URL` is missing from a production build.
- Pinned Node 24.22.1 for Render and added a compatible Node engine range for local and Vercel environments.
- Added synthetic bed/admission seed rows for the inpatient design view.
- Added indexes for bed and admission lookups.
- Expanded searchable fields for bed/admission and directory collections.
- Implemented the four supplied Stitch clinical workspaces and retained generic collection CRUD.
- Added responsive desktop/tablet/mobile layout and the requested CareSphere palette.
- Added deployment, data and security documentation.

## Security packaging

- Excluded `.env` files, `.git` metadata, dependency folders and build outputs from the final ZIP.
- The uploaded source archive's Git index did not list `Backend/.env` or `Frontend/.env` as tracked files at the time of inspection. Continue checking this before every push.

- Added server-side patient search to the EHR and appointment portal so large patient collections are searchable beyond the first page.
- Restored foreign-key fields in the collection creation form while hiding only each collection's generated primary ID.
- Refreshed collection data after create/delete operations.
- Moved pending appointment and bed occupancy totals into server-side counts so dashboard metrics are not limited to the first 100 records.

- Added a data-driven EHR vitals snapshot and SOAP/progress-note panel; absent values are labelled `Not recorded` rather than generated.
- Fixed patient selectors so clearing the selection shows an empty state and exact IDs returned by server-side patient search can resolve outside the first page.
- Restricted ward occupancy links to active admissions only, avoiding stale discharged admissions appearing on occupied bed cards.
- Production MongoDB configuration no longer falls back to localhost if `MONGODB_URI` is absent; the readiness endpoint reports an actionable missing-secret error.
- Improved network error text to point to the Render URL, CORS allowlist and Vercel build-time API variable.
- Configured Singapore as the initial Render region for an India-based deployment; the guide instructs matching Render to the actual Atlas cluster region where possible.
