import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
export const isObjectId = (v) => typeof v === 'string' && OBJECT_ID_RE.test(v);

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mongo document -> JSON-safe object (ObjectId/Date -> string, `_id` -> `id`). */
export function serialize(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    if (value._bsontype) return value.toString(); // Decimal128, Long, ...
    const out = {};
    for (const [k, v] of Object.entries(value)) if (k !== '_id' && k !== '__v') out[k] = serialize(v);
    return out;
  }
  return value;
}

export function documentOut(doc) {
  if (!doc) return null;
  const out = serialize(doc);
  out.id = String(doc._id);
  return out;
}

/**
 * NoSQL-injection / prototype-pollution guard for request bodies.
 * Drops any key that starts with "$", contains ".", or is __proto__/constructor/prototype,
 * at every depth, so a client can never smuggle Mongo operators into a write.
 */
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export function sanitizeBody(value, depth = 0) {
  if (depth > 10) throw new HttpError(422, 'Payload is nested too deeply');
  if (Array.isArray(value)) return value.map((v) => sanitizeBody(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.') || BAD_KEYS.has(k)) continue;
      out[k] = sanitizeBody(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function requireObjectBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(422, 'Request body must be a JSON object');
  }
  return sanitizeBody(body);
}

/** Query-string values must be plain strings (blocks ?hospital_id[$ne]=x style operator injection). */
export function stringParam(value, name) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw new HttpError(422, `Query parameter '${name}' must be a string`);
  return value.slice(0, 200);
}

export function intParam(value, name, { min, max, fallback }) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) throw new HttpError(422, `Query parameter '${name}' must be an integer`);
  const n = Number(value);
  if (n < min || (max !== undefined && n > max)) {
    throw new HttpError(422, `Query parameter '${name}' must be between ${min} and ${max ?? 'infinity'}`);
  }
  return n;
}
