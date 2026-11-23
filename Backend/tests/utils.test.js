import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeRegex, intParam, requireObjectBody, sanitizeBody, stringParam,
} from '../src/utils.js';

test('escapeRegex escapes regular-expression metacharacters', () => {
  assert.equal('a.b'.replace(new RegExp(escapeRegex('a.b')), 'x'), 'x');
});

test('sanitizeBody removes Mongo operators and unsafe prototype keys recursively', () => {
  const input = JSON.parse('{"name":"A","$where":"bad","nested":{"safe":1,"a.b":2},"items":[{"$gt":1,"ok":true}]}');
  assert.deepEqual(sanitizeBody(input), { name: 'A', nested: { safe: 1 }, items: [{ ok: true }] });
});

test('sanitizeBody rejects excessive nesting', () => {
  let value = {};
  for (let i = 0; i < 12; i += 1) value = { child: value };
  assert.throws(() => sanitizeBody(value), /nested too deeply/);
});

test('requireObjectBody rejects arrays and primitives', () => {
  assert.throws(() => requireObjectBody([]), /JSON object/);
  assert.throws(() => requireObjectBody('x'), /JSON object/);
});

test('stringParam accepts strings and rejects structured query values', () => {
  assert.equal(stringParam('Delhi', 'city'), 'Delhi');
  assert.throws(() => stringParam({ $ne: '' }, 'city'), /must be a string/);
});

test('intParam validates bounds and integer syntax', () => {
  assert.equal(intParam('20', 'limit', { min: 1, max: 100, fallback: 25 }), 20);
  assert.equal(intParam(undefined, 'limit', { min: 1, max: 100, fallback: 25 }), 25);
  assert.throws(() => intParam('2.5', 'limit', { min: 1, max: 100, fallback: 25 }), /integer/);
  assert.throws(() => intParam('101', 'limit', { min: 1, max: 100, fallback: 25 }), /between/);
});

test('open hospital feature mapping preserves provenance and normalizes location', async () => {
  const { mapOpenHospitalFeature } = await import('../src/openHospitalDataset.js');
  const mapped = mapOpenHospitalFeature({ attributes: {
    objectid: 712, health_facility_name: 'District Hospital Sample', facility_type: 'District Hospital',
    address: 'Main Road', street: 'Station Road', locality: 'Central', landmark: 'Bus Stand',
    state_name: 'Haryana', district_name: 'Gurugram', taluka_name: 'Gurugram', block_name: 'Urban',
    posatalcode: '122001', landline_number: '0124-000000', lat: '28.45', lon: '77.02',
  } }, '2026-11-23T00:00:00.000Z');
  assert.equal(mapped.facility_id, 'IND-712');
  assert.equal(mapped.city, 'Gurugram');
  assert.equal(mapped.state, 'Haryana');
  assert.equal(mapped.latitude, 28.45);
  assert.equal(mapped.longitude, 77.02);
  assert.equal(mapped.source_imported_at, '2026-11-23T00:00:00.000Z');
  assert.ok(mapped.source_url.startsWith('https://'));
});

test('open hospital feature mapping skips records without a name or source ID', async () => {
  const { mapOpenHospitalFeature } = await import('../src/openHospitalDataset.js');
  assert.equal(mapOpenHospitalFeature({ attributes: { objectid: 1 } }), null);
  assert.equal(mapOpenHospitalFeature({ attributes: { health_facility_name: 'No ID' } }), null);
});
