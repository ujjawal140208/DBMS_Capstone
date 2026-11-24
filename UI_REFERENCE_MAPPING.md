# CareSphere UI reference mapping

The Stitch reference archive contains four screens. The React frontend now implements each as a live view backed by existing CareSphere API collections.

| Stitch screen | CareSphere view | Data collections used |
|---|---|---|
| `doctor_clinical_dashboard` | Doctor dashboard | `dashboard/summary`, `dashboard/centres`, `appointments`, `patients`, `doctors`, `beds`, `admissions` |
| `patient_ehr_clinical_chart` | Patient EHR chart | `patients`, `appointments`, `prescriptions`, `lab_results`, `bills` |
| `inpatient_wards_bed_telemetry` | Inpatient wards & beds | `beds`, `admissions`, `patients` |
| `patient_health_appointment_portal` | Patient appointments | `patients`, `appointments`, `prescriptions`, `lab_results`, `bills` |

## Visual translation

- Preserves the reference's left clinical navigation, compact top bar, dark context banners, modular white cards, crisp borders and dense but scannable information hierarchy.
- Uses the requested CareSphere palette: `#B9ACDD`, `#786B94`, `#3F5E6F`, `#67919E`, `#93B8C2`, `#B5D6DC`.
- Uses red/amber/green only for semantic record statuses. It does not invent clinical-alert values or patient vitals when those fields are absent.
- Adds responsive navigation, tablet grids and mobile single-column layouts.
- Retains the existing generic CRUD workspace for all collections.

## Data integrity notes

- The EHR and patient appointment portal are demo views over the project's existing collections; this project does not implement authentication or per-patient authorization.
- The bed board uses the `beds` and `admissions` collections. The optional seed extension adds clearly synthetic example beds/admissions so this view can be previewed without inventing real operational data.
- The patient/doctor/appointment seed data remains synthetic. The public hospital directory remains a separate source-attributed collection.
