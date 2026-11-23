// Quick Atlas connectivity check:  npm run check-db
import mongoose from 'mongoose';
import { DATABASE_NAME, MONGODB_URI } from '../src/config.js';
import { closeDb, connectDb, isLocalUri, redact } from '../src/db.js';

console.log('Target      :', redact(MONGODB_URI));
console.log('Database    :', DATABASE_NAME);
console.log('TLS         :', isLocalUri() ? 'not required (local)' : 'enforced, certificates verified');
try {
  const started = Date.now();
  await connectDb();
  const { version } = await mongoose.connection.db.admin().serverInfo();
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log(`OK - connected in ${Date.now() - started} ms, MongoDB ${version}, ${cols.length} collection(s) present.`);
  await closeDb();
} catch (err) {
  console.error('FAILED -', err.message);
  process.exit(1);
}
