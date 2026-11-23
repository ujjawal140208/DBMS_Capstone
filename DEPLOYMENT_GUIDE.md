# CareSphere production deployment — Vercel + Render + MongoDB Atlas

## Recommended architecture

- **Vercel:** React + Vite static frontend only.
- **Render:** existing Express + Mongoose backend, started with `node server.js`.
- **MongoDB Atlas:** existing database. No database migration or data reset is required.

The local developer workflow is unchanged: the frontend uses `/api` and Vite proxies it to `http://127.0.0.1:8000` when `VITE_API_URL` is blank.

## A. Deploy the backend to Render first

1. Push this updated repository to GitHub.
2. Open Render → New → Blueprint and connect the same GitHub repository, or create a Web Service manually.
3. The included `render.yaml` describes the backend service. If configuring manually, use:
   - Runtime: Node
   - Root Directory: `Backend`
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/`
4. Configure environment variables on the Render service:
   - `MONGODB_URI`: your real Atlas connection URI (secret; never commit it)
   - `DATABASE_NAME`: `caresphere_db` (or the database name used by the local working app)
   - `HOST`: `0.0.0.0`
   - `TRUST_PROXY`: `1`
   - `CORS_ORIGINS`: exact comma-separated origins, for example `https://YOUR-PROJECT.vercel.app,http://localhost:5173,http://127.0.0.1:5173`
5. Deploy. Render assigns a URL such as `https://caresphere-api.onrender.com`.
6. Test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`. It must return HTTP 200 and `{ "status": "ok", "database": "connected" }`.

Do not set `PORT` manually; Render injects it. The server reads `process.env.PORT` through the existing config. `HOST=0.0.0.0` is required for the service to receive traffic.

## B. Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set Root Directory to `Frontend`. This is a separate frontend project; it does not need access to the backend source.
3. Framework Preset: Vite.
4. Use the standard Vite settings:
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. In Vercel → Settings → Environment Variables, set for Production (and Preview if you use previews):
   - `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`
6. Redeploy the frontend after adding or changing `VITE_API_URL`. Vite environment variables are embedded at build time.

## C. Verify end to end

1. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/health` in a browser. It must return `status: ok` and `database: connected`.
2. Open `https://YOUR-PROJECT.vercel.app`. In browser DevTools → Network, frontend API requests must go to `https://YOUR-RENDER-SERVICE.onrender.com/api/...`, not `127.0.0.1`, not the Vercel `/api` route.
3. Check `GET /api/dashboard/summary` and `GET /api/dashboard/centres` on the Render origin.
4. If browser console reports CORS, add the exact Vercel website origin (scheme + hostname, no path or trailing slash) to Render's `CORS_ORIGINS`, save, and redeploy/restart the Render service.

## D. Local development remains unchanged

- Backend terminal: `cd Backend && npm ci && npm run dev`
- Frontend terminal: `cd Frontend && npm ci && npm run dev`
- Leave `Frontend/.env` absent or keep `VITE_API_URL` blank. Vite's `/api` proxy targets `http://127.0.0.1:8000`.

## E. Important notes

- Do not commit `Backend/.env` or `Frontend/.env`. The repo `.gitignore` ignores them.
- Keep the existing Atlas database and collection data. This deployment does not run seed scripts automatically.
- Render's Free web services spin down after 15 minutes without inbound traffic and may take about a minute to wake up. This is normal for Free compute; use a paid always-on instance if you need a consistently warm API.
- This app has no authentication in the current capstone version. Keep using synthetic/demo patient data only; do not publish real patient information.
