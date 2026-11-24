# CareSphere — Hospital Operations Workspace

CareSphere is a demo hospital operations application built with React + Vite, Node.js + Express, Mongoose and MongoDB Atlas. It includes a doctor dashboard, patient EHR view, inpatient bed board, patient appointments view and a collection-based data management workspace.

## Project structure

```text
DBMS_capstone/
├── Backend/
│   ├── scripts/       # synthetic seed + public hospital import
│   ├── src/           # Express app, Mongo models, routes and utilities
│   └── tests/         # Node test runner suite
├── Frontend/
│   └── src/           # React views, API client and styles
├── render.yaml        # Render API Blueprint
├── DEPLOYMENT_GUIDE.md
├── UI_REFERENCE_MAPPING.md
└── TEST_REPORT.md
```

## Technology stack

- Frontend: React 18, Vite 6, Axios, Recharts, Lucide React
- Backend: Node.js, Express 4, Mongoose 8
- Database: MongoDB Atlas
- Hosting: Vercel (frontend) + Render (backend)

## Run locally

1. `cd Backend` → copy `.env.example` to `.env` and add your Atlas URI → `npm ci` → `npm run dev`.
2. In another terminal, `cd Frontend` → `npm ci` → `npm run dev`.
3. Open `http://localhost:5173`.

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete local setup, seeding, open hospital directory import, GitHub, Render and Vercel instructions. See [UI_REFERENCE_MAPPING.md](UI_REFERENCE_MAPPING.md) for how the four supplied Stitch screens map to live database data, and [TEST_REPORT.md](TEST_REPORT.md) for the exact checks completed and checks still requiring dependencies/live services.

## Demo-data warning

Patient, doctor and appointment records created by `npm run seed` are synthetic. The public hospital directory uses a separate `public_hospitals` collection and carries source metadata. The application currently does not provide authentication or per-patient authorization; do not place real patient data in a public deployment.
