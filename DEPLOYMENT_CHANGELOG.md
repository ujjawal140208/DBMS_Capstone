# Deployment changelog

## Single-service Render deployment
- Consolidated production hosting into one Render Web Service.
- Render builds Backend and Frontend dependencies, builds the Vite app, and starts Express.
- Express serves `Frontend/dist` and continues to serve all existing `/api/*` routes.
- Production frontend API base is same-origin `/api`; no `VITE_API_URL` or CORS allowlist is needed.
- Vite local development proxy remains unchanged.
- Render Blueprint auto-deploys commits from the connected branch.
- MongoDB Atlas remains the database; no database schema or collection migration is part of this deployment change.
