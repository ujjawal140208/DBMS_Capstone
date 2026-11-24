import { models } from '../src/models.js';
import { closeDb, connectDb } from '../src/db.js';
import { createIndexes } from '../src/indexes.js';
import { mapOpenHospitalFeature } from '../src/openHospitalDataset.js';

/**
 * Imports the public India Hospital Directory feature layer published by Esri India.
 * The corresponding Government of India OGD hospital-directory and health-centre
 * catalogue links are stored as contextual references. This script does not claim
 * a verified row-level match or a particular redistribution licence; check provider
 * terms and attribution before re-publishing imported data.
 *
 * Usage:
 *   npm run import:hospitals -- --sample   # one randomly selected facility
 *   npm run import:hospitals              # all available facilities, paged in batches
 *   npm run import:hospitals -- --limit 5000
 */
const SERVICE = 'https://livingatlas.esri.in/server/rest/services/LivingAtlas/IND_Hospital_Directory/MapServer/0/query';
const PAGE_SIZE = 1000;
const fields = [
  'objectid', 'health_facility_name', 'address', 'street', 'landmark', 'locality',
  'posatalcode', 'landline_number', 'facility_type', 'state_name', 'district_name',
  'taluka_name', 'block_name', 'lat', 'lon',
].join(',');

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const sampleOnly = process.argv.includes('--sample');
const maxLimit = Number.parseInt(argValue('--limit', '0'), 10) || 0;

async function query(params) {
  const url = new URL(SERVICE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Open dataset request failed: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`Open dataset API: ${payload.error.message || JSON.stringify(payload.error)}`);
  return payload;
}

const toHospital = mapOpenHospitalFeature;

async function upsert(records) {
  if (!records.length) return 0;
  const operations = records.map((doc) => ({
    updateOne: {
      filter: { facility_id: doc.facility_id },
      update: { $set: doc, $setOnInsert: { created_at: new Date().toISOString() } },
      upsert: true,
    },
  }));
  const result = await models.public_hospitals.collection.bulkWrite(operations, { ordered: false });
  return (result.upsertedCount || 0) + (result.modifiedCount || 0);
}

async function main() {
  await connectDb();
  await createIndexes();
  // The random sample is restricted to facility types explicitly labelled as hospitals.
  const sampleWhere = "facility_type LIKE '%Hospital%'";
  const countResult = await query({ where: '1=1', returnCountOnly: 'true', f: 'json' });
  const total = Number(countResult.count || 0);
  if (!total) throw new Error('The public dataset returned zero records.');

  if (sampleOnly) {
    const hospitalCountResult = await query({ where: sampleWhere, returnCountOnly: 'true', f: 'json' });
    const hospitalTotal = Number(hospitalCountResult.count || 0);
    if (!hospitalTotal) throw new Error('No hospital-type records were returned by the public dataset.');
    const offset = Math.floor(Math.random() * hospitalTotal);
    const result = await query({
      where: sampleWhere, outFields: fields, returnGeometry: 'false', f: 'json',
      resultOffset: offset, resultRecordCount: 1,
    });
    const doc = toHospital(result.features?.[0]);
    if (!doc) throw new Error('Could not map the selected sample facility. Try again.');
    await upsert([doc]);
    console.log(`Imported one random public hospital: ${doc.name} (${doc.state || 'state unavailable'})`);
    console.log(`Dataset records reported by provider: ${total.toLocaleString('en-IN')}`);
    return;
  }

  const target = maxLimit > 0 ? Math.min(maxLimit, total) : total;
  let imported = 0;
  for (let offset = 0; offset < target; offset += PAGE_SIZE) {
    const result = await query({
      where: '1=1', outFields: fields, returnGeometry: 'false', f: 'json',
      orderByFields: 'objectid ASC', resultOffset: offset,
      resultRecordCount: Math.min(PAGE_SIZE, target - offset),
    });
    const docs = (result.features || []).map(toHospital).filter(Boolean);
    if (!docs.length) break;
    imported += await upsert(docs);
    console.log(`Processed ${Math.min(offset + docs.length, target).toLocaleString('en-IN')} / ${target.toLocaleString('en-IN')}`);
  }
  console.log(`Hospital directory import complete. Inserted/updated ${imported.toLocaleString('en-IN')} records.`);
}

try {
  await main();
} catch (error) {
  console.error(`[hospital-import] ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDb();
}
