import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load the backend environment before importing config, Mongoose, or Express.
const backendDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDir, '.env') });

// Atlas SRV resolution can fail on some Windows/local DNS networks. Configure
// this before the application graph imports Mongoose. On Render, leave
// DNS_SERVERS unset unless Render logs show SRV lookup failures.
const dnsServers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);
dns.setDefaultResultOrder('ipv4first');
if (dnsServers.length) console.log('[DNS] Custom resolvers enabled.');

// Dynamic imports guarantee DNS and dotenv are initialized first.
const [{ createApp }, { HOST, PORT, DATABASE_NAME }, { closeDb, connectDb }, { createIndexes }] = await Promise.all([
  import('./src/app.js'),
  import('./src/config.js'),
  import('./src/db.js'),
  import('./src/indexes.js'),
]);

const app = createApp();

// Keep the HTTP server alive if Atlas is temporarily unavailable. The live
// endpoint stays healthy; /api/health reports database readiness separately.
try {
  await connectDb();
  await createIndexes();
  console.log(`[MongoDB] Connected to database '${DATABASE_NAME}'.`);
} catch (error) {
  console.error(`[MongoDB] Startup connection failed: ${error.message}`);
}

const server = app.listen(PORT, HOST, () => {
  console.log(`[CareSphere] API listening on ${HOST}:${PORT}.`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[CareSphere] ${signal} received; shutting down.`);
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
