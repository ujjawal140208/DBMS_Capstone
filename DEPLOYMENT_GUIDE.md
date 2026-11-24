# CareSphere — simple single-service Render deployment

## Final architecture
- **One Render Web Service** runs the Express server and serves the built React/Vite frontend.
- **MongoDB Atlas** remains the database.
- No Vercel project, separate frontend service, production CORS allowlist or `VITE_API_URL` is required.
- Render automatically deploys new commits from the connected GitHub branch (`autoDeployTrigger: commit`).

## 1. Preserve the working local project
1. Back up your current `DBMS_capstone` folder.
2. Extract this ZIP to a temporary folder. Copy the contents of its `DBMS_capstone` folder into your existing Git repository folder.
3. Preserve the existing `.git` directory and `Backend/.env`. Do not overwrite local credentials.
4. The ZIP excludes `.env` files and Git metadata. If needed, recreate `Backend/.env` from `.env.example`.

## 2. Local test before pushing
Backend terminal:
```powershell
cd Backend
npm ci
npm test
npm run dev
```
Frontend terminal:
```powershell
cd Frontend
npm ci
npm run build
npm run dev
```
Open `http://localhost:5173`. Vite proxies `/api` to `http://127.0.0.1:8000`. In production, Express serves the built `Frontend/dist` files and the API on the same origin.

## 3. Check secrets before GitHub
From repository root:
```powershell
git status
git check-ignore Backend/.env
git ls-files Backend/.env Frontend/.env
```
The last command should print nothing. If an env file was previously tracked, untrack it without deleting the local copy and rotate its credentials:
```powershell
git rm --cached Backend/.env
git rm --cached Frontend/.env
```
Never commit `.env`, Atlas credentials, database exports or real patient information.

## 4. Push to the existing GitHub repository
```powershell
git add -A
git status
git commit -m "Deploy CareSphere as a single Render service"
git push origin main
```

## 5. Create the single Render service
1. Sign in at https://render.com.
2. Choose **New + → Blueprint**.
3. Connect the existing GitHub repository. Ensure `render.yaml` is at the repository root.
4. Render reads the Blueprint and creates one Web Service named `caresphere`. Do not create a separate Static Site.
5. Blueprint commands: `npm ci --prefix Backend && npm ci --prefix Frontend && npm run build --prefix Frontend` and `npm start --prefix Backend`.
6. Set the required secret when prompted:

```env
MONGODB_URI=your_actual_mongodb_atlas_connection_string
```

The Blueprint also sets `NODE_ENV=production`, `NODE_VERSION=24.22.1`, `HOST=0.0.0.0`, and `DATABASE_NAME=caresphere_db`. Render injects `PORT`; do not hardcode it. `DNS_SERVERS` is optional and should only be set if Render logs show SRV DNS resolution failures.

7. Deploy and wait for the service to become **Live**.

## 6. Configure MongoDB Atlas network access
1. In Render service settings, find the outbound IP ranges for the service/region.
2. In Atlas, open **Security → Network Access** and allow the Render outbound IP ranges.
3. Ensure the Atlas database user has read/write permissions on `caresphere_db`.
4. URL-encode reserved characters in the password within `MONGODB_URI` (for example `@` becomes `%40`).
5. Do not leave `0.0.0.0/0` as a permanent access rule.

## 7. Verify the live application
Replace the example hostname with the actual Render URL:
- `/` — CareSphere frontend should load.
- `/api/health/live` — should return `{"status":"ok","service":"caresphere-api"}`.
- `/api/health` — should return `{"status":"ok","database":"connected"}`.
- `/api/dashboard/summary` — should return dashboard JSON.

If `/` returns JSON instead of the UI, the Vite build likely did not create `Frontend/dist/index.html`; inspect the Render build logs. If `/api/health` returns 503, inspect its detail and Render logs, then verify Atlas credentials and network access.

## 8. Automatic updates from GitHub to Render
The Blueprint has `autoDeployTrigger: commit`. After the first successful deployment, each push to the connected branch (`main`) triggers a new Render build and deploy automatically.

Normal update workflow:
```powershell
git add -A
git commit -m "Describe your CareSphere update"
git push origin main
```
Then open Render → CareSphere → Events/Deploys and wait for the new deploy to become **Live**. If auto-deploy is disabled in the Render dashboard, enable it for the connected branch. If a build fails, the previous successful deployment remains the live version; inspect build/runtime logs before retrying.

## 9. Remove the old Vercel deployment — only after Render works
Do not delete Vercel before the single Render service is Live and the four URLs above pass. After verification:
1. Open Vercel Dashboard → old `dbms_capstone` project → Settings → General.
2. Scroll to **Delete Project** and confirm the project name.
3. This removes the Vercel deployment/project; it does not delete your GitHub repository or Render service.

You can also leave the Vercel project disabled/unused until you are fully confident. There is no need to delete the GitHub repository.

## 10. Free-plan and security notes
- Render free web services can sleep after inactivity and take time to wake; this is expected.
- This app currently has no authentication or patient-level authorization. Use synthetic demo data only. Do not upload real patient health information until proper authentication, authorization, audit and privacy safeguards are implemented.
- Do not run `npm run seed` against existing data unless you intend to create synthetic demo records. Run the public hospital importer as a deliberate one-off job, not on every service startup.
