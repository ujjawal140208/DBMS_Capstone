import { createApp } from './src/app.js';
import { HOST, PORT, DATABASE_NAME } from './src/config.js';
import { closeDb, connectDb } from './src/db.js';
import { createIndexes } from './src/indexes.js';

const app = createApp();

// Do not crash on startup if MongoDB is unreachable: report it clearly and keep the API alive,
// so /api/health and the UI show the real reason and every request retries the connection.
try {
  await connectDb();
  await createIndexes();
  console.log(`MongoDB connected: database '${DATABASE_NAME}'`);
} catch (err) {
  console.error(`MongoDB NOT connected: ${err.message}`);
}

const server = app.listen(PORT, HOST, () => {
  console.log(`CareSphere API listening on http://${HOST}:${PORT}  (health: /api/health)`);
});

const shutdown = async () => {
  server.close();
  await closeDb();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
