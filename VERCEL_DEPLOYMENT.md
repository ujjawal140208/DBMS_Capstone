# CareSphere — Vercel deployment

## What changed
- Added a Vercel serverless entrypoint at `api/[...path].js` that mounts the existing Express app.
- Configured Vercel to build the existing Vite frontend from `Frontend/`.
- Changed the frontend API default to the same-origin `/api`, so production does not call localhost.
- Kept the existing Express routes, MongoDB models, validation, CRUD logic, and seed scripts intact.
- Removed local `.env` files from this delivery. Configure secrets in Vercel instead.

## Deploy
1. Push this project to the existing GitHub repository.
2. In Vercel, import `ujjawal140208/DBMS_Capstone`.
3. Keep the project **Root Directory** as `./` (the repository root).
4. The repository's `vercel.json` supplies the frontend build command and output directory. Do not set the root directory to `Frontend`.
5. In Vercel → Project → Settings → Environment Variables, add:
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `DATABASE_NAME` — for example `caresphere_db`
   - `CORS_ORIGINS` — optional for same-origin use; add any separately hosted frontend origin if you use one
   - `DNS_SERVERS` — optional; normally leave unset unless your deployment environment has SRV DNS lookup issues
6. Add the Vercel deployment to MongoDB Atlas Network Access. For a quick hosted demo, Atlas commonly uses `0.0.0.0/0`; restrict this where possible and use a strong database user with least-privilege access.
7. Deploy. Then open `/api/health` on the deployed domain. A healthy response reports `status: "ok"` and `database: "connected"`.

## Local development
- Backend: `cd Backend && npm install && npm run dev`
- Frontend: `cd Frontend && npm ci && npm run dev`
- The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.
- Set `Backend/.env` using `Backend/.env.example`. You do not need a frontend `.env` for the default setup.

## Important
- Vercel Functions are serverless. The API connects to MongoDB lazily on requests; it does not rely on a persistent `node server.js` process.
- Do not commit `.env` files or paste the Atlas URI into source code.
- Large one-time seed jobs should be run from a trusted local/worker environment, not as part of a Vercel request.
