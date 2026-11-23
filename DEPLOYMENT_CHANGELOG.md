# Deployment change log

- Replaced the custom Vercel Express catch-all deployment with a split architecture.
- Removed the old root `vercel.json` and `api/[...path].js`; Vercel project root is now `Frontend`.
- Vercel now builds and serves only `Frontend/` as static Vite assets.
- Added `render.yaml` for the existing Express backend in `Backend/`.
- Frontend API base supports `VITE_API_URL` in production while retaining `/api` + Vite proxy locally.
- Improved dashboard API errors to include HTTP status and request URL when the server response has no JSON detail.
- Changed default backend bind host to `0.0.0.0`; `HOST` remains overridable through environment configuration.
- No database schema, business routes, CRUD semantics, seed data, or MongoDB collection names were changed.
