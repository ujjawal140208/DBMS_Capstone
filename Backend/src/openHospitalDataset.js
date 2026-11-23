export const OPEN_HOSPITAL_SOURCE = Object.freeze({
  layer: 'Esri India Living Atlas — Hospital Directory of India',
  url: 'https://livingatlas.esri.in/server/rest/services/LivingAtlas/IND_Hospital_Directory/MapServer/0',
  ogdHospitalDirectory: 'https://data.gov.in/catalog/hospital-directory-national-health-portal',
  ogdHealthCentres: 'https://data.gov.in/catalog/all-india-health-centres-directory',
});

const clean = (value) => value === null || value === undefined ? '' : String(value).trim();

export function mapOpenHospitalFeature(feature, importedAt = new Date().toISOString()) {
  const a = feature?.attributes || {};
  const objectId = a.objectid;
  if (objectId === null || objectId === undefined || !clean(a.health_facility_name)) return null;
  const addressParts = [a.address, a.street, a.locality, a.landmark].map(clean).filter(Boolean);
  return {
    facility_id: `IND-${objectId}`,
    source_record_id: String(objectId),
    name: clean(a.health_facility_name),
    facility_type: clean(a.facility_type) || 'Health facility',
    address: [...new Set(addressParts)].join(', '),
    city: clean(a.district_name || a.taluka_name || a.state_name),
    district: clean(a.district_name),
    state: clean(a.state_name),
    taluka: clean(a.taluka_name),
    block: clean(a.block_name),
    pincode: clean(a.posatalcode),
    phone: clean(a.landline_number),
    latitude: Number.isFinite(Number(a.lat)) && clean(a.lat) ? Number(a.lat) : null,
    longitude: Number.isFinite(Number(a.lon)) && clean(a.lon) ? Number(a.lon) : null,
    status: 'active',
    source: OPEN_HOSPITAL_SOURCE.layer,
    source_url: OPEN_HOSPITAL_SOURCE.url,
    source_catalogs: [OPEN_HOSPITAL_SOURCE.ogdHospitalDirectory, OPEN_HOSPITAL_SOURCE.ogdHealthCentres],
    source_imported_at: importedAt,
  };
}
