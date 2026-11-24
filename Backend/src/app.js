import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { TRUST_PROXY } from './config.js';
import { connectDb, mongoose, requireDb } from './db.js';
import { HttpError } from './utils.js';
import dashboardRouter from './routes/dashboard.js';
import recordsRouter from './routes/records.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (TRUST_PROXY) app.set('trust proxy', 1);

  app.use(helmet());
  // The production frontend and API share one Render origin. During local
  // development Vite proxies /api to Express, so browser CORS is not needed.
  app.use(rateLimit({
    windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { detail: 'Too many requests, please slow down.' },
  }));
  app.use(express.json({ limit: '100kb' }));

  const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const frontendDist = path.resolve(backendDir, '..', 'Frontend', 'dist');
  const indexFile = path.join(frontendDist, 'index.html');
  app.get('/', (_req, res) => {
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
    return res.json({ name: 'CareSphere API', status: 'running', health: '/api/health' });
  });
  // Liveness is intentionally independent of MongoDB, so Render can verify the
  // Node process is listening even while Atlas is being configured or recovered.
  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok', service: 'caresphere-api' }));

  // Readiness checks the actual Atlas connection and ping, not just the process.
  app.get('/api/health', async (_req, res) => {
    try {
      await connectDb();
      await mongoose.connection.db.command({ ping: 1 });
      res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        detail: err?.message || 'Database connection failed',
      });
    }
  });

  app.use('/api/dashboard', requireDb, dashboardRouter);
  app.use('/api', requireDb, recordsRouter);

  // Serve the built Vite app from this same Express service in production.
  // This application uses a single-page dashboard rooted at '/', not URL-based
  // client routes. Serve static assets but do not turn unknown paths into index.html:
  // API clients and the 404 test must receive a real JSON 404 for unknown URLs.
  if (fs.existsSync(indexFile)) {
    app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
  }

  app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ detail: err.detail });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ detail: 'Invalid JSON body' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ detail: 'Payload too large' });
    console.error('[error]', err);
    // Never leak internals / connection strings to clients.
    res.status(500).json({ detail: 'Internal server error' });
  });

  return app;
}
