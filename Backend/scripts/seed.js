import { faker, fakerEN_IN } from '@faker-js/faker';
import { models } from '../src/models.js';
import { closeDb, connectDb } from '../src/db.js';
import { createIndexes } from '../src/indexes.js';

const fk = fakerEN_IN;
faker.seed(42); fk.seed(42);

const HOSPITALS = [
  ['HOSP001', 'CareSphere Central', 'Delhi'],
  ['HOSP002', 'CareSphere North', 'Ghaziabad'],
  ['HOSP003', 'CareSphere South', 'Noida'],
  ['HOSP004', 'CareSphere East', 'Lucknow'],
  ['HOSP005', 'CareSphere West', 'Jaipur'],
];
const DEPARTMENTS = ['Cardiology', 'Neurology', 'Orthopaedics', 'Paediatrics', 'General Medicine', 'Dermatology', 'ENT'];
const pick = (arr) => arr[fk.number.int({ min: 0, max: arr.length - 1 })];
const rint = (min, max) => fk.number.int({ min, max });
const pad = (n, w) => String(n).padStart(w, '0');
const envInt = (k, d) => Number.parseInt(process.env[k] ?? '', 10) || d;

async function upsertMany(model, key, docs, batch = 1000) {
  let dupes = 0;
  for (let i = 0; i < docs.length; i += batch) {
    const ops = docs.slice(i, i + batch).map((d) => ({
      updateOne: { filter: { [key]: d[key] }, update: { $set: d }, upsert: true },
    }));
    try {
      await models[model].collection.bulkWrite(ops, { ordered: false });
    } catch (err) {
      if (err?.code === 11000 || err?.writeErrors) dupes += err.writeErrors?.length ?? 1; // e.g. random slot collisions
      else throw err;
    }
  }
  return dupes;
}

await connectDb();
await createIndexes();

const hospitalCount = Math.max(1, Math.min(5, envInt('SEED_HOSPITALS', 5)));
const hospitals = HOSPITALS.slice(0, hospitalCount);
await upsertMany('hospitals', 'hospital_id', hospitals.map(([hospital_id, name, city]) => ({
  hospital_id, name, city, address: `${fk.location.streetAddress()}, ${city}`, phone: fk.phone.number(), status: 'active',
})));

const depts = [];
for (const [hid] of hospitals) {
  DEPARTMENTS.forEach((name, idx) => depts.push({ department_id: `${hid}-D${pad(idx + 1, 2)}`, hospital_id: hid, name, status: 'active' }));
}
await upsertMany('departments', 'department_id', depts);

const doctorCount = envInt('SEED_DOCTORS', 1000);
const doctors = [];
for (let i = 1; i <= doctorCount; i++) {
  const hid = hospitals[(i - 1) % hospitals.length][0];
  doctors.push({
    doctor_id: `DOC${pad(i, 6)}`, hospital_id: hid, name: fk.person.fullName(),
    specialization: pick(DEPARTMENTS), department_id: `${hid}-D${pad(rint(1, DEPARTMENTS.length), 2)}`,
    email: fk.internet.email(), phone: fk.phone.number(), experience_years: rint(1, 35), status: 'active',
  });
}
await upsertMany('doctors', 'doctor_id', doctors);

const patientCount = envInt('SEED_PATIENTS', 50000);
let buf = [];
for (let i = 1; i <= patientCount; i++) {
  const h = hospitals[(i - 1) % hospitals.length];
  buf.push({
    patient_id: `PAT${pad(i, 7)}`, hospital_id: h[0], name: fk.person.fullName(),
    age: rint(1, 95), gender: pick(['Male', 'Female', 'Other']),
    contact: fk.string.numeric({ length: 10, allowLeadingZeros: false }), email: fk.internet.email(),
    blood_group: pick(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    city: h[2], medical_history: [],
    created_at: fk.date.past({ years: 4 }).toISOString(),
  });
  if (buf.length >= 1000) { await upsertMany('patients', 'patient_id', buf); buf = []; }
}
if (buf.length) await upsertMany('patients', 'patient_id', buf);

const appointmentCount = envInt('SEED_APPOINTMENTS', 30000);
let dupes = 0;
buf = [];
const now = Date.now();
for (let i = 1; i <= appointmentCount; i++) {
  const hid = hospitals[(i - 1) % hospitals.length][0];
  const docNum = ((i - 1) % doctorCount) + 1;
  const patNum = ((i - 1) % patientCount) + 1;
  const when = new Date(now + rint(-365, 60) * 86_400_000 + pick([0, 30, 60, 90]) * 60_000);
  buf.push({
    appointment_id: `APT${pad(i, 7)}`, hospital_id: hid, patient_id: `PAT${pad(patNum, 7)}`, doctor_id: `DOC${pad(docNum, 6)}`,
    appointment_at: when.toISOString(), reason: pick(['Consultation', 'Follow-up', 'Routine checkup']),
    status: pick(['completed', 'scheduled', 'cancelled']), created_at: when.toISOString(),
  });
  if (buf.length >= 1000) { dupes += await upsertMany('appointments', 'appointment_id', buf); buf = []; }
}
if (buf.length) dupes += await upsertMany('appointments', 'appointment_id', buf);

console.log(`Seed complete: ${hospitals.length} centres, ${doctorCount.toLocaleString()} doctors, ${patientCount.toLocaleString()} patients, ${appointmentCount.toLocaleString()} appointments.`);
if (dupes) console.log(`(${dupes} appointment(s) skipped because they collided with an existing active doctor/time slot.)`);
await closeDb();
