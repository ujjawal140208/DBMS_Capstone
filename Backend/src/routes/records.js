import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { COLLECTIONS, ID_FIELDS } from '../config.js';
import { models } from '../models.js';
import { logEvent } from '../audit.js';
import {
  HttpError, asyncHandler, documentOut, escapeRegex, intParam, isObjectId, requireObjectBody, stringParam,
} from '../utils.js';

const router = Router();
const ACTIVE = ['scheduled', 'confirmed'];
const SEARCH_FIELDS = ['name', 'patient_id', 'doctor_id', 'appointment_id', 'bill_id', 'hospital_id', 'facility_id', 'source_record_id', 'facility_type', 'district', 'state', 'ward', 'bed_number', 'status', 'email', 'phone', 'medicine_id'];

router.param('collection', (_req, _res, next, name) => {
  if (!COLLECTIONS.includes(name)) return next(new HttpError(404, 'Unknown collection'));
  next();
});

const makePublicId = (collection) => `${collection.slice(0, 4).toUpperCase()}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
const selectorFor = (collection, recordId) => (isObjectId(recordId) ? { _id: recordId } : { [ID_FIELDS[collection]]: recordId });

router.get('/:collection', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const hospitalId = stringParam(req.query.hospital_id, 'hospital_id');
  const search = stringParam(req.query.search, 'search');
  const skip = intParam(req.query.skip, 'skip', { min: 0, fallback: 0 });
  const limit = intParam(req.query.limit, 'limit', { min: 1, max: 100, fallback: 25 });

  const query = {};
  if (hospitalId) query.hospital_id = hospitalId;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i'); // user text is escaped: no ReDoS / regex injection
    query.$or = SEARCH_FIELDS.map((f) => ({ [f]: rx }));
  }
  const Model = models[collection];
  const [total, items] = await Promise.all([
    Model.countDocuments(query),
    Model.find(query).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
  ]);
  res.json({ items: items.map(documentOut), total, skip, limit });
}));

router.get('/:collection/:recordId', asyncHandler(async (req, res) => {
  const { collection, recordId } = req.params;
  const doc = await models[collection].findOne(selectorFor(collection, recordId)).lean();
  if (!doc) throw new HttpError(404, 'Record not found');
  res.json(documentOut(doc));
}));

router.post('/:collection', asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const Model = models[collection];
  const data = requireObjectBody(req.body);
  delete data._id; delete data.id; delete data.__v;

  const idField = ID_FIELDS[collection];
  if (!data[idField]) data[idField] = makePublicId(collection);
  if (!data.created_at) data.created_at = new Date().toISOString();

  if (collection === 'appointments') {
    const required = ['hospital_id', 'doctor_id', 'appointment_at'];
    if (required.some((k) => !data[k])) throw new HttpError(422, `Required fields: ${required.join(', ')}`);
    if (!data.status) data.status = 'scheduled';
    if (ACTIVE.includes(data.status)) {
      const conflict = await Model.findOne({
        hospital_id: String(data.hospital_id),
        doctor_id: String(data.doctor_id),
        appointment_at: String(data.appointment_at),
        status: { $in: ACTIVE },
      }).lean();
      if (conflict) throw new HttpError(409, 'Doctor already has an active appointment at this time');
    }
  }

  let created;
  try {
    created = await Model.create(data);
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'A record with this unique value already exists');
    throw err;
  }
  await logEvent('CREATE', collection, String(created._id), { public_id: data[idField] });
  res.status(201).json(documentOut(created.toObject()));
}));

router.patch('/:collection/:recordId', asyncHandler(async (req, res) => {
  const { collection, recordId } = req.params;
  const body = requireObjectBody(req.body);
  const idField = ID_FIELDS[collection];
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => !['_id', 'id', '__v', idField].includes(k)));
  data.updated_at = new Date().toISOString();

  let updated;
  try {
    updated = await models[collection]
      .findOneAndUpdate(selectorFor(collection, recordId), { $set: data }, { new: true, runValidators: false })
      .lean();
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'A record with this unique value already exists');
    throw err;
  }
  if (!updated) throw new HttpError(404, 'Record not found');
  await logEvent('UPDATE', collection, recordId, { fields: Object.keys(data) });
  res.json(documentOut(updated));
}));

router.delete('/:collection/:recordId', asyncHandler(async (req, res) => {
  const { collection, recordId } = req.params;
  const deleted = await models[collection].findOneAndDelete(selectorFor(collection, recordId)).lean();
  if (!deleted) throw new HttpError(404, 'Record not found');
  await logEvent('DELETE', collection, recordId);
  res.json({ message: 'Record deleted', record_id: recordId });
}));

export default router;
