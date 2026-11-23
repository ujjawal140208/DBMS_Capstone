import { Router } from 'express';
import { models } from '../models.js';
import { asyncHandler, serialize } from '../utils.js';

const router = Router();

router.get('/summary', asyncHandler(async (_req, res) => {
  const [hospitals, publicFacilities, patients, doctors, appointments, pendingBills, revenueRows] = await Promise.all([
    models.hospitals.countDocuments({}),
    models.public_hospitals.countDocuments({}),
    models.patients.countDocuments({}),
    models.doctors.countDocuments({}),
    models.appointments.countDocuments({}),
    models.bills.countDocuments({ status: { $in: ['pending', 'partially_paid'] } }),
    models.payments.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  res.json({
    hospitals, public_facilities: publicFacilities, patients, doctors, appointments,
    pending_bills: pendingBills,
    revenue: revenueRows[0]?.total ?? 0,
  });
}));

router.get('/centres', asyncHandler(async (_req, res) => {
  // $lookup with a $count sub-pipeline: counts per centre without materialising every patient/appointment
  // document into an array (which could hit the 16 MB document limit on large centres).
  const countOf = (from, as) => ({
    $lookup: {
      from,
      let: { h: '$hospital_id' },
      pipeline: [{ $match: { $expr: { $eq: ['$hospital_id', '$$h'] } } }, { $count: 'n' }],
      as,
    },
  });
  const rows = await models.hospitals.aggregate([
    countOf('patients', 'p'),
    countOf('appointments', 'a'),
    {
      $project: {
        _id: 0, hospital_id: 1, name: 1, city: 1,
        patient_count: { $ifNull: [{ $arrayElemAt: ['$p.n', 0] }, 0] },
        appointment_count: { $ifNull: [{ $arrayElemAt: ['$a.n', 0] }, 0] },
      },
    },
    { $sort: { name: 1 } },
  ]);
  res.json(rows.map(serialize));
}));

export default router;
