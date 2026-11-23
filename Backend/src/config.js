import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import dotenv from 'dotenv';

// Always load Backend/.env, no matter which folder node is started from.
const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(BACKEND_DIR, '.env') });

function clean(value, fallback) {
  let v = (value ?? fallback ?? '').trim();
  // remove accidental wrapping quotes, e.g. MONGODB_URI="mongodb+srv://..."
  if (v.length >= 2 && v[0] === v[v.length - 1] && (v[0] === '"' || v[0] === "'")) v = v.slice(1, -1).trim();
  return v;
}

export const MONGODB_URI = clean(process.env.MONGODB_URI, process.env.VERCEL ? '' : 'mongodb://127.0.0.1:27017');
export const DATABASE_NAME = clean(process.env.DATABASE_NAME, 'caresphere_db');
export const PORT = Number(process.env.PORT) || 8000;
export const HOST = clean(process.env.HOST, '127.0.0.1');
// Vercel runs behind its trusted edge proxy; enable one-hop IP forwarding there.
export const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.VERCEL === '1';
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((x) => x.trim()).filter(Boolean);

export const COLLECTIONS = [
  'hospitals', 'public_hospitals', 'departments', 'patients', 'doctors', 'appointments',
  'prescriptions', 'medicines', 'lab_tests', 'lab_results', 'bills',
  'payments', 'pharmacy_inventory', 'admissions', 'beds', 'audit_logs',
];

export const ID_FIELDS = {
  hospitals: 'hospital_id', public_hospitals: 'facility_id', departments: 'department_id', patients: 'patient_id',
  doctors: 'doctor_id', appointments: 'appointment_id', prescriptions: 'prescription_id',
  medicines: 'medicine_id', lab_tests: 'lab_test_id', lab_results: 'result_id',
  bills: 'bill_id', payments: 'payment_id', pharmacy_inventory: 'inventory_id',
  admissions: 'admission_id', beds: 'bed_id', audit_logs: 'log_id',
};

// Some home/ISP/campus DNS servers refuse the SRV lookups that mongodb+srv:// needs (querySrv ECONNREFUSED).
// Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env to make Node use public DNS for the Atlas lookup.
export const DNS_SERVERS = clean(process.env.DNS_SERVERS, '').split(',').map((x) => x.trim()).filter(Boolean);
if (DNS_SERVERS.length) dns.setServers(DNS_SERVERS);
dns.setDefaultResultOrder('ipv4first');
