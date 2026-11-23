import mongoose from 'mongoose';
import { COLLECTIONS, ID_FIELDS } from './config.js';

/**
 * Flexible (strict:false) schemas: the demo UI sends arbitrary fields per collection, so we only
 * declare the keys that are indexed/queried and let the rest through, same as the original design.
 * Real validation/limits are enforced in the route layer.
 */
export const models = {};
for (const name of COLLECTIONS) {
  const schema = new mongoose.Schema(
    { [ID_FIELDS[name]]: { type: String }, hospital_id: { type: String } },
    { strict: false, versionKey: false, collection: name, minimize: false },
  );
  models[name] = mongoose.models[name] || mongoose.model(name, schema);
}
