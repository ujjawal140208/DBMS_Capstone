# CareSphere — Hospital Operations Workspace

CareSphere is a demo hospital operations application built with React + Vite, Node.js + Express, Mongoose and MongoDB Atlas. It includes a doctor dashboard, patient EHR view, inpatient bed board, patient appointments view and collection-based data management workspace.

## Technology
- Frontend: React 18, Vite 6, Axios, Recharts, Lucide React
- Backend: Node.js, Express 4, Mongoose 8
- Database: MongoDB Atlas
- Hosting: **one Render Web Service** serves both the built frontend and Express API; MongoDB Atlas remains the database.

## Project structure
```text
DBMS_capstone/
├── Backend/       # Express API, Mongoose models, scripts and tests
├── Frontend/      # React + Vite application
├── render.yaml    # One-service Render Blueprint with automatic deploys
├── DEPLOYMENT_GUIDE.md
├── UI_REFERENCE_MAPPING.md
└── TEST_REPORT.md
```

## Run locally
1. `cd Backend`; copy `.env.example` to `.env`, enter your Atlas URI, run `npm ci` and `npm run dev`.
2. In another terminal, `cd Frontend`; run `npm ci` and `npm run dev`.
3. Open `http://localhost:5173`. Vite proxies `/api` to the backend on port 8000.

## Deploy
Connect this repository to Render as a Blueprint. The root `render.yaml` builds the frontend and backend dependencies, builds Vite, and starts Express. Express serves `Frontend/dist` and handles `/api/*` from the same domain. Set `MONGODB_URI` in Render. Render auto-deploys new commits to the connected branch. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## Demo-data warning
Patient, doctor and appointment seed records are synthetic. The public hospital directory is separate. The application does not provide authentication or per-patient authorization; do not use real patient data in this public demo.
