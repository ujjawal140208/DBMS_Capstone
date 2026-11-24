import { models } from './models.js';

const log = (...a) => console.warn('[indexes]', ...a);

async function safe(label, fn) {
  // An index problem must never stop the API from starting.
  try { await fn(); } catch (err) { log(`'${label}' skipped: ${err.message}`); }
}

export async function createIndexes() {
  const idx = (model, keys, opts = {}) => models[model].collection.createIndex(keys, opts);
  const specs = [
    ['hospitals.hospital_id', () => idx('hospitals', { hospital_id: 1 }, { unique: true })],
    ['public_hospitals.facility_id', () => idx('public_hospitals', { facility_id: 1 }, { unique: true })],
    ['public_hospitals.source_record_id', () => idx('public_hospitals', { source_record_id: 1 }, { unique: true, sparse: true })],
    ['departments.department_id', () => idx('departments', { department_id: 1 }, { unique: true })],
    ['patients.patient_id', () => idx('patients', { patient_id: 1 }, { unique: true })],
    ['patients.hospital_name', () => idx('patients', { hospital_id: 1, name: 1 })],
    ['patients.hospital_contact', () => idx('patients', { hospital_id: 1, contact: 1 })],
    ['doctors.doctor_id', () => idx('doctors', { doctor_id: 1 }, { unique: true })],
    ['doctors.hospital_dept', () => idx('doctors', { hospital_id: 1, department_id: 1 })],
    ['appointments.appointment_id', () => idx('appointments', { appointment_id: 1 }, { unique: true })],
    ['beds.bed_id', () => idx('beds', { bed_id: 1 }, { unique: true })],
    ['beds.hospital_ward_status', () => idx('beds', { hospital_id: 1, ward: 1, status: 1 })],
    ['admissions.admission_id', () => idx('admissions', { admission_id: 1 }, { unique: true })],
    ['admissions.hospital_patient', () => idx('admissions', { hospital_id: 1, patient_id: 1, admitted_at: -1 })],
    ['appointments.hospital_time', () => idx('appointments', { hospital_id: 1, appointment_at: -1 })],
    ['prescriptions.hospital_patient', () => idx('prescriptions', { hospital_id: 1, patient_id: 1 })],
    ['lab_results.hospital_patient', () => idx('lab_results', { hospital_id: 1, patient_id: 1 })],
    ['bills.hospital_patient_date', () => idx('bills', { hospital_id: 1, patient_id: 1, created_at: -1 })],
    ['payments.hospital_bill', () => idx('payments', { hospital_id: 1, bill_id: 1 })],
    ['pharmacy_inventory.hospital_medicine', () => idx('pharmacy_inventory', { hospital_id: 1, medicine_id: 1 }, { unique: true })],
    ['audit_logs.created_at', () => idx('audit_logs', { created_at: -1 })],
  ];
  for (const [label, fn] of specs) await safe(label, fn);

  // Unique doctor/time slot for active appointments. "$in" inside a partial index needs MongoDB 6.0+,
  // so fall back to a plain index (the API still checks conflicts itself).
  await safe('appointments.unique_active_doctor_slot', async () => {
    const keys = { hospital_id: 1, doctor_id: 1, appointment_at: 1 };
    try {
      await idx('appointments', keys, {
        unique: true,
        name: 'unique_active_doctor_slot',
        partialFilterExpression: { status: { $in: ['scheduled', 'confirmed'] } },
      });
    } catch (err) {
      if (err.code === 11000) throw err; // existing duplicate slots: report, don't hide
      await idx('appointments', keys, { name: 'doctor_slot_lookup' });
    }
  });
}
