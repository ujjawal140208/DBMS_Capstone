import mongoose from 'mongoose';
import { MONGODB_URI, DATABASE_NAME } from './config.js';
import { HttpError } from './utils.js';

mongoose.set('strictQuery', false);
// NOTE: user input is validated/sanitised in the route layer (string-only query params, $-key stripping on bodies).
// Mongoose's global `sanitizeFilter` is deliberately NOT used: it would also neutralise our own $in/$or filters.

/** Hide the password if a URI ever ends up in a log line or error message. */
export const redact = (text) => String(text).replace(/(mongodb(?:\+srv)?:\/\/[^:/?#\s]+:)[^@\s]+@/gi, '$1****@');

export function validateUri(uri = MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not configured. Add your MongoDB Atlas connection string in Vercel Environment Variables.');
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }
  if (/[<>]/.test(uri)) {
    throw new Error('MONGODB_URI still contains <placeholders>. Put your real Atlas username, password and cluster host in Backend/.env.');
  }
  // Never allow TLS verification to be switched off.
  if (/tlsAllowInvalid(Certificates|Hostnames)=true|tlsInsecure=true/i.test(uri)) {
    throw new Error('Refusing to connect: the URI disables TLS certificate validation (tlsInsecure / tlsAllowInvalid*).');
  }
  if (/[?&]tls=false|[?&]ssl=false/i.test(uri) && /mongodb\.net/i.test(uri)) {
    throw new Error('Atlas requires TLS; remove tls=false / ssl=false from MONGODB_URI.');
  }
}

export const isLocalUri = (uri = MONGODB_URI) => /^mongodb:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(uri);

/** Turn a driver error into an actionable message (and never leak credentials). */
export function hint(err) {
  const text = redact(err?.message || String(err));
  const low = text.toLowerCase();
  if (/placeholders|must start with|refusing to connect|requires tls/i.test(text)) return text;
  if (low.includes('bad auth') || low.includes('authentication failed')) {
    return 'MongoDB authentication failed. Check the username/password in MONGODB_URI (URL-encode special characters such as @ : / in the password) and that the user has access to this database.';
  }
  if (low.includes('enotfound') || low.includes('querysrv') || low.includes('getaddrinfo') || low.includes('econnrefused') && low.includes('_mongodb._tcp')) {
    return `DNS lookup for the MongoDB host failed [${text.split('\n')[0].slice(0, 160)}]. Check the cluster hostname in MONGODB_URI (copy it from Atlas > Connect). If the hostname is right, your DNS is blocking SRV lookups: add DNS_SERVERS=8.8.8.8,1.1.1.1 to Backend/.env, or use Atlas's non-SRV connection string (mongodb://...).`;
  }
  if (low.includes('ssl') || low.includes('tls') || low.includes('certificate')) {
    return 'TLS handshake with MongoDB failed. Check that your system clock is correct and that no proxy/antivirus is intercepting HTTPS. In Atlas > Network Access make sure your IP is allowed.';
  }
  if (low.includes('127.0.0.1:27017') || low.includes('localhost:27017')) {
    return 'Could not reach MongoDB at localhost:27017. Start a local MongoDB server, or put your MongoDB Atlas connection string in Backend/.env as MONGODB_URI.';
  }
  if (low.includes('server selection') || low.includes('timed out') || low.includes('whitelist') || low.includes('replicasetnoprimary')) {
    return 'Timed out reaching MongoDB. In Atlas > Network Access add your current IP address, and check your internet connection / VPN / firewall (port 27017 must be open).';
  }
  return `MongoDB connection failed: ${text}`;
}

let connecting = null;

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      validateUri();
      await mongoose.connect(MONGODB_URI, {
        dbName: DATABASE_NAME,
        serverSelectionTimeoutMS: 7000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 20,
        retryWrites: true,
        autoIndex: false, // indexes are created explicitly in src/indexes.js
        // Atlas (SRV) always uses TLS; force it for any remote host too. Certificates are always verified.
        ...(isLocalUri() ? {} : { tls: true }),
      });
      return mongoose.connection;
    } catch (err) {
      await mongoose.disconnect().catch(() => {});
      const e = new Error(hint(err));
      e.cause = err;
      throw e;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

/** Express middleware: (re)connect lazily and answer 503 with a clear reason instead of crashing. */
export async function requireDb(_req, _res, next) {
  try {
    await connectDb();
    next();
  } catch (err) {
    next(new HttpError(503, err.message));
  }
}

export async function closeDb() {
  await mongoose.disconnect().catch(() => {});
}

export { mongoose };
