# Database design notes

## Multi-centre partition key
Every operational collection should include `hospital_id`. This is a logical partition key
for centre-level filtering and aggregation. It is not a MongoDB shard key by itself.

## Relationship examples
- `departments.hospital_id` -> `hospitals.hospital_id`
- `doctors.hospital_id`, `doctors.department_id` -> hospital and department documents
- `appointments.patient_id`, `appointments.doctor_id`, `appointments.hospital_id`
- `prescriptions.patient_id`, `prescriptions.doctor_id`
- `lab_results.patient_id`, `lab_results.lab_test_id`
- `bills.patient_id`; `payments.bill_id`
- `pharmacy_inventory.medicine_id`, `pharmacy_inventory.hospital_id`

## Embedding vs references
Use references for entities reused across many documents (patient, doctor, hospital, medicine).
Embed small, bounded value objects such as medicine lines within a prescription when a
historical snapshot is needed. Avoid unbounded arrays on patient documents.

## Performance
Indexes are created on public IDs, hospital + frequently filtered fields, and appointment slots.
Use `explain()` in MongoDB Compass or Atlas to inspect query plans. The dashboard aggregation
uses `$lookup` to calculate centre-level counts; for very large production datasets, consider
pre-aggregated reporting collections or scheduled materialized summaries.

## Transactions
MongoDB transactions require a replica set or sharded cluster (Atlas clusters support this).
This starter avoids pretending every deployment has transaction support. For a future
financial workflow, wrap bill + payment state changes in a session transaction and test
against the chosen Atlas tier.
