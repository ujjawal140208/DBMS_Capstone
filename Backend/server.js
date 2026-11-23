
import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables first.
dotenv.config({
  path: path.join(BACKEND_DIR, '.env')
});

// Configure DNS before importing the application or Mongoose.
const servers = (
  process.env.DNS_SERVERS || '8.8.8.8,8.8.4.4'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

dns.setServers(servers);
dns.setDefaultResultOrder('ipv4first');

console.log('[DNS] Configured:', dns.getServers());

// Dynamic imports ensure DNS configuration happens first.
const { createApp } = await import('./src/app.js');
const { HOST, PORT, DATABASE_NAME } =
  await import('./src/config.js');
const { connectDb, closeDb } =
  await import('./src/db.js');
const { createIndexes } =
  await import('./src/indexes.js');

const app = createApp();

try {
  await connectDb();
  await createIndexes();

  console.log(
    `[MongoDB] Connected to ${DATABASE_NAME}`
  );
} catch (error) {
  console.error(
    '[MongoDB] Connection failed:',
    error.message
  );
}

const server = app.listen(PORT, HOST, () => {
  console.log(
    `[CareSphere] API running at http://${HOST}:${PORT}`
  );
});

async function shutdown() {
  server.close();
  await closeDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
