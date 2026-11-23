import { randomUUID } from 'node:crypto';
import { models } from './models.js';

export async function logEvent(action, collection, recordId = null, details = {}) {
  try {
    await models.audit_logs.create({
      log_id: `LOG-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      action,
      collection,
      record_id: recordId,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Auditing must never break the user's request.
    console.warn('[audit] could not write audit log:', err.message);
  }
}
