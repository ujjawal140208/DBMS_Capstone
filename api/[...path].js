import { createApp } from '../Backend/src/app.js';

// Vercel Node Function catch-all for /api/*.
// Express keeps the same route definitions used by local development.
const app = createApp();

export default function handler(req, res) {
  // Defensive normalization for adapters that pass only the catch-all suffix.
  if (req.url && !req.url.startsWith('/api/')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
