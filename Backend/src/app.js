import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { CORS_ORIGINS, TRUST_PROXY } from './config.js';
import { connectDb, mongoose, requireDb } from './db.js';
import { HttpError } from './utils.js';
import dashboardRouter from './routes/dashboard.js';
import recordsRouter from './routes/records.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (TRUST_PROXY) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl (no Origin header) and the explicit whitelist only.
      if (!origin || CORS_ORIGINS.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }));
  app.use(rateLimit({
    windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { detail: 'Too many requests, please slow down.' },
  }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => res.json({ name: 'CareSphere API', health: '/api/health' }));

  // Health must remain reachable even when Atlas is down, so deployment failures
  // are diagnosable instead of being hidden behind a generic frontend error.
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
