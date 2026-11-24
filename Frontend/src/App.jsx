import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, BedDouble, Building2, CalendarCheck,
  CalendarDays, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, ClipboardList, Clock3, CreditCard, Database,
  FileText, FlaskConical, HeartPulse, Hospital, MapPin, Menu, Pill, Plus,
  RefreshCw, Search, ShieldCheck, Stethoscope, UserRound, Users, X,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api from './api'

const clinicalNavigation = [
  { id: 'doctor', label: 'Doctor dashboard', icon: Activity },
  { id: 'ehr', label: 'Patient EHR chart', icon: FileText },
  { id: 'wards', label: 'Inpatient wards & beds', icon: BedDouble },
  { id: 'portal', label: 'Patient appointments', icon: CalendarDays },
]

const collections = [
  ['hospitals', 'Hospital centres', Building2],
  ['public_hospitals', 'Public directory', Hospital],
  ['patients', 'Patients', Users],
  ['doctors', 'Doctors', Stethoscope],
  ['departments', 'Departments', Hospital],
  ['appointments', 'Appointments', CalendarDays],
  ['prescriptions', 'Prescriptions', ClipboardList],
  ['medicines', 'Medicines', Pill],
  ['lab_tests', 'Lab tests', FlaskConical],
  ['lab_results', 'Lab results', Activity],
  ['bills', 'Bills', FileText],
  ['payments', 'Payments', CreditCard],
  ['pharmacy_inventory', 'Pharmacy stock', Database],
  ['admissions', 'Admissions', BedDouble],
  ['beds', 'Beds', BedDouble],
  ['audit_logs', 'Audit logs', ClipboardList],
]

const labels = Object.fromEntries(collections.map(([id, label]) => [id, label]))
const fieldSets = {
  hospitals: [['hospital_id', 'Centre ID'], ['name', 'Centre name'], ['city', 'City'], ['phone', 'Phone'], ['status', 'Status']],
  public_hospitals: [['facility_id', 'Facility ID'], ['name', 'Facility name'], ['facility_type', 'Facility type'], ['district', 'District'], ['state', 'State'], ['pincode', 'PIN code'], ['phone', 'Phone'], ['latitude', 'Latitude'], ['longitude', 'Longitude']],
  patients: [['patient_id', 'Patient ID'], ['hospital_id', 'Hospital ID'], ['name', 'Full name'], ['age', 'Age'], ['gender', 'Gender'], ['contact', 'Contact'], ['email', 'Email'], ['blood_group', 'Blood group'], ['city', 'City']],
  doctors: [['doctor_id', 'Doctor ID'], ['hospital_id', 'Hospital ID'], ['name', 'Full name'], ['specialization', 'Specialization'], ['department_id', 'Department ID'], ['email', 'Email'], ['phone', 'Phone'], ['experience_years', 'Experience']],
  departments: [['department_id', 'Department ID'], ['hospital_id', 'Hospital ID'], ['name', 'Department name'], ['status', 'Status']],
  appointments: [['appointment_id', 'Appointment ID'], ['hospital_id', 'Hospital ID'], ['patient_id', 'Patient ID'], ['doctor_id', 'Doctor ID'], ['appointment_at', 'Date/time'], ['reason', 'Reason'], ['status', 'Status']],
  prescriptions: [['prescription_id', 'Prescription ID'], ['hospital_id', 'Hospital ID'], ['patient_id', 'Patient ID'], ['doctor_id', 'Doctor ID'], ['medicines', 'Medicines'], ['notes', 'Notes']],
  medicines: [['medicine_id', 'Medicine ID'], ['name', 'Medicine name'], ['category', 'Category'], ['manufacturer', 'Manufacturer'], ['unit_price', 'Unit price']],
  lab_tests: [['lab_test_id', 'Test ID'], ['name', 'Test name'], ['description', 'Description'], ['price', 'Price']],
  lab_results: [['result_id', 'Result ID'], ['hospital_id', 'Hospital ID'], ['patient_id', 'Patient ID'], ['lab_test_id', 'Test ID'], ['result', 'Result'], ['status', 'Status']],
  bills: [['bill_id', 'Bill ID'], ['hospital_id', 'Hospital ID'], ['patient_id', 'Patient ID'], ['total_amount', 'Total amount'], ['status', 'Status']],
  payments: [['payment_id', 'Payment ID'], ['hospital_id', 'Hospital ID'], ['bill_id', 'Bill ID'], ['amount', 'Amount'], ['method', 'Method'], ['status', 'Status']],
  pharmacy_inventory: [['inventory_id', 'Inventory ID'], ['hospital_id', 'Hospital ID'], ['medicine_id', 'Medicine ID'], ['quantity', 'Quantity'], ['reorder_level', 'Reorder level']],
  admissions: [['admission_id', 'Admission ID'], ['hospital_id', 'Hospital ID'], ['patient_id', 'Patient ID'], ['bed_id', 'Bed ID'], ['admitted_at', 'Admitted at'], ['status', 'Status']],
  beds: [['bed_id', 'Bed ID'], ['hospital_id', 'Hospital ID'], ['ward', 'Ward'], ['bed_number', 'Bed number'], ['status', 'Status']],
  audit_logs: [['log_id', 'Log ID'], ['action', 'Action'], ['collection', 'Collection'], ['record_id', 'Record ID'], ['created_at', 'Created at']],
}

const primaryIdFields = {
  hospitals: 'hospital_id', public_hospitals: 'facility_id', departments: 'department_id',
  patients: 'patient_id', doctors: 'doctor_id', appointments: 'appointment_id',
  prescriptions: 'prescription_id', medicines: 'medicine_id', lab_tests: 'lab_test_id',
  lab_results: 'result_id', bills: 'bill_id', payments: 'payment_id',
  pharmacy_inventory: 'inventory_id', admissions: 'admission_id', beds: 'bed_id', audit_logs: 'log_id',
}

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
const number = value => Number(value || 0).toLocaleString('en-IN')
const asDate = value => {
  if (!value) return 'Date not recorded'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}
const getItems = async (collection, params = {}) => {
  const response = await api.get(`/${collection}`, { params: { skip: 0, limit: 100, ...params } })
  return response.data?.items || []
}
const getDetail = (error, fallback) => {
  const body = error?.response?.data
  if (body?.detail) return body.detail
  if (body?.message) return body.message
  if (error?.response?.status) return `HTTP ${error.response.status}: ${error.response.statusText || fallback}`
  if (error?.code === 'ERR_NETWORK') {
    const advice = import.meta.env.PROD
      ? 'Check the Render service URL, its CORS_ORIGINS allowlist, and the VITE_API_URL value in Vercel.'
      : 'Check that the Express backend is running on port 8000 and that the Vite /api proxy target is correct.'
    return `${advice} (${fallback})`
  }
  return `${error?.code || 'Network error'}: ${error?.message || fallback}`
}
const displayValue = value => {
  if (value === null || value === undefined || value === '') return 'Not recorded'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None recorded'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
const normaliseStatus = value => String(value || 'unknown').toLowerCase().replace(/[_-]/g, ' ')
const statusClass = value => {
  const status = normaliseStatus(value)
  if (['active', 'completed', 'available', 'paid', 'confirmed', 'stable', 'normal', 'discharged'].includes(status)) return 'status-good'
  if (['pending', 'scheduled', 'occupied', 'in progress', 'partially paid', 'cleaning'].includes(status)) return 'status-warn'
  if (['cancelled', 'critical', 'blocked', 'overdue', 'unavailable'].includes(status)) return 'status-danger'
  return 'status-neutral'
}
const patientLabel = patient => patient?.name || patient?.patient_id || 'Unassigned patient'
const doctorLabel = doctor => doctor?.name || doctor?.doctor_id || 'Doctor not assigned'

function App() {
  const [activeView, setActiveView] = useState('doctor')
  const [activeCollection, setActiveCollection] = useState('patients')
  const [dataNavOpen, setDataNavOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [summary, setSummary] = useState(null)
  const [centres, setCentres] = useState([])
  const [selectedCentre, setSelectedCentre] = useState('')
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [beds, setBeds] = useState([])
  const [admissions, setAdmissions] = useState([])
  const [ehrPatientId, setEhrPatientId] = useState('')
  const [portalPatientId, setPortalPatientId] = useState('')
  const [related, setRelated] = useState({ appointments: [], prescriptions: [], lab_results: [], bills: [] })
  const [portalRelated, setPortalRelated] = useState({ appointments: [], prescriptions: [], lab_results: [], bills: [] })
  const [apiStatus, setApiStatus] = useState('checking')
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [recordLoading, setRecordLoading] = useState(false)
  const [recordsRefresh, setRecordsRefresh] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const pageSize = 20

  const selectedEhrPatient = useMemo(() => ehrPatientId ? patients.find(patient => patient.patient_id === ehrPatientId) || null : null, [patients, ehrPatientId])
  const selectedPortalPatient = useMemo(() => portalPatientId ? patients.find(patient => patient.patient_id === portalPatientId) || null : null, [patients, portalPatientId])
  const patientMap = useMemo(() => new Map(patients.map(patient => [patient.patient_id, patient])), [patients])
  const doctorMap = useMemo(() => new Map(doctors.map(doctor => [doctor.doctor_id, doctor])), [doctors])

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    setApiStatus('checking')
    setApiError('')
    try {
      const [health, summaryResponse, centresResponse, patientRows, doctorRows, appointmentRows, bedRows, admissionRows] = await Promise.all([
        api.get('/health'), api.get('/dashboard/summary'), api.get('/dashboard/centres'),
        getItems('patients'), getItems('doctors'), getItems('appointments'), getItems('beds'), getItems('admissions'),
      ])
      if (health.data?.database !== 'connected') throw new Error('API responded but the database is not connected.')
      setSummary(summaryResponse.data)
      setCentres(centresResponse.data || [])
      setPatients(current => {
        const merged = new Map(current.map(item => [item.patient_id, item]))
        patientRows.forEach(item => merged.set(item.patient_id, item))
        return [...patientRows, ...[...merged.values()].filter(item => !patientRows.some(row => row.patient_id === item.patient_id))]
      })
      setDoctors(doctorRows)
      setAppointments(appointmentRows)
      setBeds(bedRows)
      setAdmissions(admissionRows)
      setEhrPatientId(current => current || patientRows[0]?.patient_id || '')
      setPortalPatientId(current => current || patientRows[0]?.patient_id || '')
      setApiStatus('connected')
    } catch (error) {
      setApiStatus('offline')
      setApiError(getDetail(error, 'Unable to connect to CareSphere API'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBaseData() }, [loadBaseData])

  useEffect(() => {
    if (!selectedEhrPatient?.patient_id || activeView !== 'ehr') return
    let cancelled = false
    const loadRelated = async () => {
      try {
        const query = { search: selectedEhrPatient.patient_id }
        const [a, p, l, b] = await Promise.all([
          getItems('appointments', query), getItems('prescriptions', query),
          getItems('lab_results', query), getItems('bills', query),
        ])
        if (!cancelled) setRelated({ appointments: a, prescriptions: p, lab_results: l, bills: b })
      } catch (error) {
        if (!cancelled) setApiError(getDetail(error, 'Unable to load the selected patient record'))
      }
    }
    loadRelated()
    return () => { cancelled = true }
  }, [selectedEhrPatient?.patient_id, activeView])

  useEffect(() => {
    if (!selectedPortalPatient?.patient_id || activeView !== 'portal') return
    let cancelled = false
    const loadRelated = async () => {
      try {
        const query = { search: selectedPortalPatient.patient_id }
        const [a, p, l, b] = await Promise.all([
          getItems('appointments', query), getItems('prescriptions', query),
          getItems('lab_results', query), getItems('bills', query),
        ])
        if (!cancelled) setPortalRelated({ appointments: a, prescriptions: p, lab_results: l, bills: b })
      } catch (error) {
        if (!cancelled) setApiError(getDetail(error, 'Unable to load the patient portal'))
      }
    }
    loadRelated()
    return () => { cancelled = true }
  }, [selectedPortalPatient?.patient_id, activeView])

  useEffect(() => {
    if (activeView !== 'records') return
    let cancelled = false
    const timer = setTimeout(async () => {
      setRecordLoading(true)
      try {
        const response = await api.get(`/${activeCollection}`, {
          params: { skip: page * pageSize, limit: pageSize, search: search || undefined, hospital_id: selectedCentre || undefined },
        })
        if (!cancelled) {
          setRecords(response.data.items || [])
          setTotal(response.data.total || 0)
          setApiStatus('connected')
          setApiError('')
        }
      } catch (error) {
        if (!cancelled) {
          setApiStatus('offline')
          setApiError(getDetail(error, 'Unable to load records'))
          setRecords([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) setRecordLoading(false)
      }
    }, search ? 250 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [activeView, activeCollection, page, search, selectedCentre, recordsRefresh])

  const navigate = view => {
    setActiveView(view)
    setMobileNavOpen(false)
    setApiError('')
    if (view === 'records') {
      setPage(0)
      setSearch('')
    }
  }

  const openCollection = collection => {
    setActiveCollection(collection)
    setPage(0)
    setSearch('')
    navigate('records')
  }

  const openCreate = () => { setForm({}); setShowForm(true) }

  const save = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') delete payload[key]
        else if (typeof payload[key] === 'string' && ['age', 'experience_years', 'unit_price', 'price', 'total_amount', 'amount', 'quantity', 'reorder_level', 'latitude', 'longitude'].includes(key)) payload[key] = Number(payload[key])
      }
      if (typeof payload.medicines === 'string') {
        try { payload.medicines = JSON.parse(payload.medicines) }
        catch { throw new Error('Medicines must be valid JSON, e.g. [{"medicine_id":"MED1","dose":"1 tablet"}]') }
      }
      await api.post(`/${activeCollection}`, payload)
      setShowForm(false)
      setForm({})
      setPage(0)
      setSearch('')
      setRecordsRefresh(value => value + 1)
      await loadBaseData()
    } catch (error) {
      window.alert(getDetail(error, error.message || 'Could not save record'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async row => {
    if (!window.confirm('Delete this record? This action cannot be undone.')) return
    try {
      await api.delete(`/${activeCollection}/${row.id || row[`${activeCollection.slice(0, -1)}_id`]}`)
      setRecords(current => current.filter(item => item.id !== row.id))
      setTotal(current => Math.max(0, current - 1))
      setRecordsRefresh(value => value + 1)
      await loadBaseData()
    } catch (error) {
      window.alert(getDetail(error, 'Delete failed'))
    }
  }

  const title = {
    doctor: 'Doctor dashboard', ehr: 'Patient EHR chart', wards: 'Inpatient wards & beds',
    portal: 'Patient appointments', records: labels[activeCollection] || 'Records workspace',
  }[activeView]

  return (
    <div className={`app-shell ${mobileNavOpen ? 'sidebar-visible' : ''}`}>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-symbol"><HeartPulse size={22} strokeWidth={2.2} /></div>
          <div className="brand-copy"><strong>CareSphere</strong><span>HOSPITAL NETWORK</span></div>
          <button className="sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="side-caption">CLINICAL NAVIGATION</div>
        <nav className="side-nav">
          {clinicalNavigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeView === id ? 'active' : ''}`} onClick={() => navigate(id)}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-caption side-caption-spaced">DATA MANAGEMENT</div>
        <button className={`nav-item data-toggle ${activeView === 'records' ? 'active' : ''}`} onClick={() => setDataNavOpen(open => !open)}>
          <Database size={17} /><span>Records workspace</span><ChevronDown className={`toggle-chevron ${dataNavOpen ? 'rotated' : ''}`} size={15} />
        </button>
        {dataNavOpen && (
          <nav className="collection-nav">
            {collections.map(([id, label, Icon]) => (
              <button key={id} className={`collection-link ${activeView === 'records' && activeCollection === id ? 'selected' : ''}`} onClick={() => openCollection(id)}>
                <Icon size={15} /><span>{label}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="sidebar-bottom">
          <div className={`connection-indicator ${apiStatus}`} />
          <div><strong>{apiStatus === 'connected' ? 'API connected' : apiStatus === 'checking' ? 'Checking service' : 'API unavailable'}</strong><span>{apiStatus === 'connected' ? 'MongoDB status verified' : apiStatus === 'checking' ? 'Contacting backend…' : 'Check service settings'}</span></div>
        </div>
        <div className="sidebar-footnote"><ShieldCheck size={14} /> Synthetic demo records · Not for clinical use</div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumb"><span>CARESPHERE</span><span className="breadcrumb-slash">/</span><strong>{title.toUpperCase()}</strong></div>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <label className="centre-select-wrap"><Building2 size={16} /><select value={selectedCentre} onChange={event => setSelectedCentre(event.target.value)} aria-label="Select hospital centre"><option value="">All hospital centres</option>{centres.map(centre => <option key={centre.hospital_id} value={centre.hospital_id}>{centre.name}</option>)}</select><ChevronDown size={14} /></label>
            <span className={`service-pill ${apiStatus}`}><i />{apiStatus === 'connected' ? 'SYSTEM ONLINE' : apiStatus === 'checking' ? 'CONNECTING' : 'API OFFLINE'}</span>
            <button className="icon-button" onClick={loadBaseData} title="Refresh application data" aria-label="Refresh"><RefreshCw size={17} /></button>
          </div>
        </header>

        {apiError && <div className="global-alert"><AlertCircle size={17} /><div><strong>Connection or data request issue</strong><span>{apiError}</span></div><button onClick={() => setApiError('')} aria-label="Dismiss"><X size={16} /></button></div>}

        {loading && apiStatus === 'checking' ? <LoadingView /> : null}
        {!loading && apiStatus === 'offline' && !summary ? <ConnectionView error={apiError} onRetry={loadBaseData} /> : null}
        {activeView === 'doctor' && summary && <DoctorDashboard summary={summary} centres={centres} patients={patients} doctors={doctors} appointments={appointments} beds={beds} admissions={admissions} patientMap={patientMap} doctorMap={doctorMap} onNavigate={navigate} onCollection={openCollection} loading={loading} />}
        {activeView === 'ehr' && <PatientEhr patients={patients} patient={selectedEhrPatient} patientId={ehrPatientId} onPatientChange={(id, row) => { setEhrPatientId(id); if (row) setPatients(current => [...current.filter(item => item.patient_id !== id), row]) }} related={related} onCollection={openCollection} />}
        {activeView === 'wards' && <WardBoard beds={beds} admissions={admissions} patientMap={patientMap} centres={centres} selectedCentre={selectedCentre} onCollection={openCollection} />}
        {activeView === 'portal' && <PatientPortal patients={patients} patient={selectedPortalPatient} patientId={portalPatientId} onPatientChange={(id, row) => { setPortalPatientId(id); if (row) setPatients(current => [...current.filter(item => item.patient_id !== id), row]) }} related={portalRelated} onCollection={openCollection} />}
        {activeView === 'records' && <RecordsWorkspace collection={activeCollection} records={records} total={total} page={page} pageSize={pageSize} search={search} onSearch={setSearch} onPage={setPage} loading={recordLoading} onCreate={openCreate} onDelete={remove} />}

        <footer className="app-footer"><span>CareSphere · Hospital operations workspace</span><span>Public directory + synthetic operational demo data</span></footer>
      </main>

      {showForm && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowForm(false) }}>
        <form className="modal" onSubmit={save}>
          <div className="modal-head"><div><span className="eyebrow">NEW RECORD</span><h2>Add {labels[activeCollection]}</h2></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={18} /></button></div>
          <div className="form-grid">{(fieldSets[activeCollection] || []).filter(([key]) => key !== primaryIdFields[activeCollection]).map(([key, label]) => (
            <label key={key}>{label}{key === 'medicines' ? <textarea rows="3" value={form[key] || ''} onChange={event => setForm({ ...form, [key]: event.target.value })} placeholder='[{"medicine_id":"MED1","dose":"1 tablet"}]' /> : <input value={form[key] || ''} onChange={event => setForm({ ...form, [key]: event.target.value })} placeholder={key === 'appointment_at' ? '2026-12-01T10:00:00+05:30' : ''} />}</label>
          ))}</div>
          <div className="modal-actions"><button type="button" className="button secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="button primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save record'}</button></div>
        </form>
      </div>}
    </div>
  )
}

function LoadingView() {
  return <div className="loading-panel"><div className="loading-spinner" /><strong>Connecting to CareSphere</strong><span>Loading hospital workspace and database records…</span></div>
}

function ConnectionView({ error, onRetry }) {
  return <section className="connection-panel"><div className="connection-icon"><Activity size={26} /></div><span className="eyebrow">SERVICE CONNECTION</span><h2>CareSphere could not load the workspace</h2><p>{error || 'The API did not respond. Check that the backend service is running and the API URL is configured correctly.'}</p><button className="button primary-button" onClick={onRetry}><RefreshCw size={16} /> Retry connection</button></section>
}

function SectionHeading({ eyebrow, title, description, action, children }) {
  return <div className="section-heading-row"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action || children}</div>
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'teal', onClick }) {
  const Wrapper = onClick ? 'button' : 'div'
  return <Wrapper className={`metric-card ${onClick ? 'metric-clickable' : ''}`} onClick={onClick}><div className={`metric-icon ${tone}`}><Icon size={19} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value ?? '—'}</strong><span className="metric-detail">{detail}</span></Wrapper>
}

function RecordList({ items, empty, render, className = '' }) {
  if (!items?.length) return <div className="empty-state"><Database size={19} /><span>{empty || 'No records have been added yet.'}</span></div>
  return <div className={`record-list ${className}`}>{items.map((item, index) => <div key={item.id || item.appointment_id || item.prescription_id || item.result_id || item.bed_id || index}>{render(item)}</div>)}</div>
}

function DoctorDashboard({ summary, centres, patients, doctors, appointments, beds, admissions, patientMap, doctorMap, onNavigate, onCollection, loading }) {
  const currentAppointments = [...appointments].sort((a, b) => new Date(b.appointment_at || b.created_at || 0) - new Date(a.appointment_at || a.created_at || 0)).slice(0, 6)
  const registeredBeds = Number(summary.registered_beds || 0)
  const occupancy = registeredBeds ? Math.round((Number(summary.occupied_beds || 0) / registeredBeds) * 100) : null
  const centreChart = centres.slice(0, 7).map(centre => ({ name: centre.name.replace(/^CareSphere\s*/i, ''), patients: Number(centre.patient_count || 0), appointments: Number(centre.appointment_count || 0) }))
  const pendingAppointments = appointments.filter(item => ['scheduled', 'pending', 'confirmed'].includes(normaliseStatus(item.status))).length
  return <div className="workspace-content">
    <section className="dashboard-hero"><div className="hero-copy"><span className="eyebrow light">CLINICAL OPERATIONS · NETWORK OVERVIEW</span><h2>Clear visibility across every centre.</h2><p>Review patient activity, care schedules and inpatient capacity from one connected workspace.</p><div className="hero-meta"><span><span className="hero-live-dot" /> Database connection verified</span><span><Building2 size={14} /> {centres.length} configured centres</span></div></div><div className="hero-mark"><HeartPulse size={58} strokeWidth={1.2} /><span>CARESPHERE</span><small>CARE OPERATIONS</small></div></section>
    <SectionHeading eyebrow="AT A GLANCE" title="Network snapshot" description="Live totals returned by your CareSphere database." action={<span className="updated-tag"><Clock3 size={14} /> {loading ? 'Refreshing' : 'Current data'}</span>} />
    <div className="metric-grid">
      <MetricCard label="Patient records" value={number(summary.patients)} detail="Across all configured centres" icon={Users} tone="lavender" onClick={() => onCollection('patients')} />
      <MetricCard label="Medical providers" value={number(summary.doctors)} detail="Doctor records in the network" icon={Stethoscope} tone="teal" onClick={() => onCollection('doctors')} />
      <MetricCard label="Appointments" value={number(summary.appointments)} detail={`${number(summary.pending_appointments ?? pendingAppointments)} scheduled or pending`} icon={CalendarDays} tone="blue" onClick={() => onCollection('appointments')} />
      <MetricCard label="Hospital centres" value={number(summary.hospitals)} detail={`${number(summary.public_facilities)} public directory facilities`} icon={Hospital} tone="slate" onClick={() => onCollection('hospitals')} />
      <MetricCard label="Bed occupancy" value={occupancy === null ? '—' : `${occupancy}%`} detail={registeredBeds ? `${number(registeredBeds)} registered beds` : 'No bed inventory recorded'} icon={BedDouble} tone="ice" onClick={() => onNavigate('wards')} />
    </div>
    <div className="dashboard-grid primary-grid">
      <section className="surface-card chart-card"><SectionHeading eyebrow="CENTRE PERFORMANCE" title="Patient & appointment activity" description="Counts by configured hospital centre." /><div className="chart-area">{centreChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={centreChart} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf2" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#68788a' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: '#8291a1' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5ebf1', fontSize: 12 }} /><Bar dataKey="patients" name="Patients" fill="#786B94" radius={[5, 5, 0, 0]} maxBarSize={34} /><Bar dataKey="appointments" name="Appointments" fill="#67919E" radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer> : <div className="empty-state"><Building2 size={20} /><span>Centre activity will appear after hospital centres are added.</span></div>}</div><div className="chart-legend"><span><i className="legend-lavender" /> Patient records</span><span><i className="legend-teal" /> Appointments</span></div></section>
      <section className="surface-card centre-card"><SectionHeading eyebrow="LOCATION DIRECTORY" title="Hospital centres" description="Your configured operational locations." action={<button className="text-action" onClick={() => onCollection('hospitals')}>View all <ArrowUpRight size={14} /></button>} /><RecordList items={centres.slice(0, 5)} empty="No operational centres found. Add a hospital centre to begin." render={centre => <div className="centre-row"><div className="centre-avatar"><Hospital size={17} /></div><div className="centre-text"><strong>{centre.name}</strong><span>{centre.city || 'Location not recorded'} · {centre.hospital_id}</span></div><div className="centre-total">{number(centre.patient_count)}<small>patients</small></div></div>} /></section>
    </div>
    <div className="dashboard-grid secondary-grid">
      <section className="surface-card"><SectionHeading eyebrow="CARE SCHEDULE" title="Recent appointments" description="Latest appointment records from the network." action={<button className="text-action" onClick={() => onCollection('appointments')}>All appointments <ArrowUpRight size={14} /></button>} /><RecordList items={currentAppointments} empty="No appointments have been recorded yet." render={appointment => <div className="appointment-row"><div className="list-date-icon"><CalendarCheck size={17} /></div><div className="list-main"><strong>{patientLabel(patientMap.get(appointment.patient_id))}</strong><span>{doctorLabel(doctorMap.get(appointment.doctor_id))} · {appointment.reason || 'Reason not recorded'}</span><small>{asDate(appointment.appointment_at)}</small></div><StatusPill value={appointment.status} /></div>} /></section>
      <section className="surface-card"><SectionHeading eyebrow="PROVIDER DIRECTORY" title="Care team" description="Doctors registered in your network." action={<button className="text-action" onClick={() => onCollection('doctors')}>View team <ArrowUpRight size={14} /></button>} /><RecordList items={doctors.slice(0, 5)} empty="No doctor records are available yet." render={doctor => <div className="provider-row"><div className="provider-avatar">{(doctor.name || 'D').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="list-main"><strong>{doctor.name || doctor.doctor_id}</strong><span>{doctor.specialization || 'Specialty not recorded'}</span><small>{doctor.experience_years ? `${doctor.experience_years} years of experience` : doctor.department_id || doctor.hospital_id || 'Department not recorded'}</small></div><span className={`provider-status ${statusClass(doctor.status)}`}>{doctor.status || 'Registered'}</span></div>} /></section>
    </div>
    <div className="demo-notice"><ShieldCheck size={17} /><div><strong>Demonstration environment</strong><span>Operational patient and appointment records in this project are synthetic demo data. The public hospital directory is stored separately with source provenance.</span></div></div>
  </div>
}

function StatusPill({ value }) { return <span className={`status-pill ${statusClass(value)}`}>{value || 'Unknown'}</span> }

function PatientPicker({ patients, patient, patientId, onPatientChange }) {
  const listId = `patient-options-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const selectedLabel = item => item ? `${item.name || item.patient_id} · ${item.patient_id}` : ''
  const [query, setQuery] = useState(selectedLabel(patient))
  const [options, setOptions] = useState(patients)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    setOptions(current => {
      const merged = new Map(current.map(item => [item.patient_id, item]))
      patients.forEach(item => merged.set(item.patient_id, item))
      if (patient) merged.set(patient.patient_id, patient)
      return [...merged.values()]
    })
  }, [patients, patient])

  useEffect(() => {
    setQuery(selectedLabel(patient))
  }, [patientId, patient?.name, patient?.patient_id])

  useEffect(() => {
    const term = (query.includes(' · ') ? query.split(' · ')[0] : query).trim()
    if (term.length < 2) {
      setOptions(patients)
      setSearching(false)
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await api.get('/patients', { params: { skip: 0, limit: 25, search: term } })
        if (!cancelled) {
          const rows = response.data?.items || []
          const merged = new Map(rows.map(item => [item.patient_id, item]))
          if (patient) merged.set(patient.patient_id, patient)
          setOptions([...merged.values()])
          const exactMatch = rows.find(item =>
            item.patient_id?.toLowerCase() === term.toLowerCase() ||
            selectedLabel(item).toLowerCase() === query.trim().toLowerCase()
          )
          if (exactMatch) onPatientChange(exactMatch.patient_id, exactMatch)
        }
      } catch {
        if (!cancelled) setOptions(patients)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, patient?.patient_id])

  const handleChange = event => {
    const value = event.target.value
    setQuery(value)
    if (!value.trim()) {
      onPatientChange('')
      return
    }
    const match = options.find(item => selectedLabel(item).toLowerCase() === value.trim().toLowerCase() || item.patient_id?.toLowerCase() === value.trim().toLowerCase())
    if (match) onPatientChange(match.patient_id, match)
  }

  return <label className="patient-picker">
    <Search size={16} />
    <input
      type="search"
      list={listId}
      value={query}
      onChange={handleChange}
      placeholder="Search patient name or ID"
      aria-label="Search patient by name or ID"
      autoComplete="off"
    />
    <datalist id={listId}>
      {options.flatMap(item => [<option key={`${item.patient_id}-label`} value={selectedLabel(item)} />, <option key={`${item.patient_id}-id`} value={item.patient_id} />])}
    </datalist>
    <span className="picker-feedback">{searching ? 'Searching…' : `${options.length} matches`}</span>
  </label>
}

function vitalDisplay(value, suffix = '') {
  if (value === null || value === undefined || value === '') return 'Not recorded'
  if (typeof value === 'object') {
    if ('systolic' in value && 'diastolic' in value) return `${value.systolic}/${value.diastolic}${suffix}`
    return displayValue(value)
  }
  if (typeof value === 'string') {
    const text = value.trim()
    return suffix && !/[a-z%°]/i.test(text) ? `${text}${suffix}` : text
  }
  return `${value}${suffix}`
}

function PatientEhr({ patients, patient, patientId, onPatientChange, related, onCollection }) {
  const history = patient?.medical_history || patient?.history || []
  const vitals = patient?.vitals && typeof patient.vitals === 'object' ? patient.vitals : {}
  const vitalReadings = [
    { label: 'Blood pressure', value: vitalDisplay(vitals.blood_pressure ?? patient?.blood_pressure ?? patient?.bp, ' mmHg'), icon: Activity },
    { label: 'Heart rate', value: vitalDisplay(vitals.heart_rate ?? patient?.heart_rate ?? patient?.pulse ?? patient?.hr, ' bpm'), icon: HeartPulse },
    { label: 'Oxygen saturation', value: vitalDisplay(vitals.oxygen_saturation ?? patient?.oxygen_saturation ?? patient?.spo2, '%'), icon: HeartPulse },
    { label: 'Temperature', value: vitalDisplay(vitals.temperature ?? patient?.temperature ?? patient?.temp, ' °C'), icon: Activity },
    { label: 'Respiratory rate', value: vitalDisplay(vitals.respiratory_rate ?? patient?.respiratory_rate ?? patient?.resp_rate, ' /min'), icon: Activity },
    { label: 'BMI', value: vitalDisplay(vitals.bmi ?? patient?.bmi, ''), icon: UserRound },
  ]
  const soapFields = [
    ['Subjective', patient?.subjective ?? patient?.soap_note?.subjective],
    ['Objective', patient?.objective ?? patient?.soap_note?.objective],
    ['Assessment', patient?.assessment ?? patient?.soap_note?.assessment],
    ['Plan', patient?.plan ?? patient?.soap_note?.plan],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '')
  const generalNote = patient?.clinical_notes ?? patient?.clinical_note ?? patient?.progress_note
  const appointments = [...related.appointments].sort((a, b) => new Date(b.appointment_at || 0) - new Date(a.appointment_at || 0)).slice(0, 5)
  return <div className="workspace-content">
    <div className="view-toolbar"><div><span className="eyebrow">PATIENT RECORDS · CLINICAL CHART</span><p>Review one patient's demographic profile and linked records.</p></div><PatientPicker patients={patients} patient={patient} patientId={patientId} onPatientChange={onPatientChange} /></div>
    {!patient ? <EmptyWorkspace title="No patient records available" text="Add or import a synthetic demo patient from the Records workspace to preview the EHR chart." action={<button className="button primary-button" onClick={() => onCollection('patients')}>Open patient records <ArrowRight size={15} /></button>} /> : <>
      <section className="patient-banner"><div className="patient-monogram">{(patient.name || 'P').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="patient-banner-main"><span className="eyebrow light">PATIENT CONTEXT</span><h2>{patient.name || 'Unnamed patient'}</h2><div className="patient-meta"><span>MRN {patient.patient_id}</span><span>{patient.age ? `${patient.age} years` : 'Age not recorded'}</span><span>{patient.gender || 'Gender not recorded'}</span><span>{patient.city || 'Location not recorded'}</span></div></div><div className="patient-banner-tags"><StatusPill value={patient.status || 'Registered'} /><span className="blood-chip">{patient.blood_group || 'Blood group not recorded'}</span></div></section>
      <div className="patient-facts-grid">
        <FactCard label="Hospital centre" value={patient.hospital_id || 'Not assigned'} icon={Hospital} />
        <FactCard label="Contact" value={patient.contact || 'Not recorded'} icon={UserRound} />
        <FactCard label="Email" value={patient.email || 'Not recorded'} icon={FileText} />
        <FactCard label="Patient since" value={asDate(patient.created_at)} icon={CalendarDays} />
      </div>
      <section className="surface-card vitals-panel"><SectionHeading eyebrow="OBSERVATIONS · RECORDED DATA ONLY" title="Vitals snapshot" description="Values are shown only when present in this patient's record." /><div className="vitals-grid">{vitalReadings.map(reading => <div className="vital-card" key={reading.label}><div className="vital-icon"><reading.icon size={16} /></div><span>{reading.label}</span><strong>{reading.value}</strong></div>)}</div></section>
      <div className="ehr-grid">
        <div className="ehr-column">
          <section className="surface-card"><SectionHeading eyebrow="PATIENT PROFILE" title="Clinical context" /><div className="clinical-context"><strong>Recorded medical history</strong><p>{Array.isArray(history) ? history.join(', ') || 'No medical history has been recorded for this patient.' : displayValue(history)}</p></div><div className="detail-line"><span>Allergies</span><strong>{displayValue(patient.allergies)}</strong></div><div className="detail-line"><span>Address</span><strong>{displayValue(patient.address)}</strong></div></section>
          <section className="surface-card"><SectionHeading eyebrow="CLINICAL DOCUMENTATION" title="SOAP / progress notes" />{soapFields.length ? <div className="soap-grid">{soapFields.map(([label, value]) => <div className="soap-note" key={label}><strong>{label}</strong><p>{displayValue(value)}</p></div>)}</div> : generalNote ? <div className="clinical-context"><p>{displayValue(generalNote)}</p></div> : <div className="empty-state"><FileText size={19} /><span>No SOAP or progress notes have been recorded for this patient.</span></div>}</section>
          <section className="surface-card"><SectionHeading eyebrow="CARE TIMELINE" title="Appointments" action={<button className="text-action" onClick={() => onCollection('appointments')}>Manage <ArrowUpRight size={14} /></button>} /><RecordList items={appointments} empty="No appointments are linked to this patient." render={item => <div className="timeline-item"><div className="timeline-dot" /><div className="list-main"><strong>{item.reason || 'Appointment'}</strong><span>{asDate(item.appointment_at)}</span><small>Doctor ID: {item.doctor_id || 'Not assigned'}</small></div><StatusPill value={item.status} /></div>} /></section>
        </div>
        <div className="ehr-column">
          <section className="surface-card"><SectionHeading eyebrow="MEDICATION RECORD" title="Prescriptions" action={<button className="text-action" onClick={() => onCollection('prescriptions')}>All prescriptions <ArrowUpRight size={14} /></button>} /><RecordList items={related.prescriptions} empty="No prescriptions have been recorded for this patient." render={item => <div className="prescription-row"><div className="prescription-icon"><Pill size={17} /></div><div className="list-main"><strong>{Array.isArray(item.medicines) ? item.medicines.map(m => m.name || m.medicine_id || JSON.stringify(m)).join(', ') : displayValue(item.medicines)}</strong><span>{item.notes || 'No prescription notes recorded'}</span><small>{item.prescription_id || 'Prescription'} · Doctor {item.doctor_id || 'not assigned'}</small></div></div>} /></section>
          <section className="surface-card"><SectionHeading eyebrow="DIAGNOSTIC RECORD" title="Laboratory results" action={<button className="text-action" onClick={() => onCollection('lab_results')}>View results <ArrowUpRight size={14} /></button>} /><RecordList items={related.lab_results} empty="No laboratory results have been recorded for this patient." render={item => <div className="lab-row"><div className="lab-icon"><FlaskConical size={17} /></div><div className="list-main"><strong>{item.test_name || item.lab_test_id || 'Laboratory test'}</strong><span>{displayValue(item.result)}</span></div><StatusPill value={item.status} /></div>} /></section>
          <section className="surface-card"><SectionHeading eyebrow="ACCOUNT SUMMARY" title="Bills & payments" action={<button className="text-action" onClick={() => onCollection('bills')}>Open billing <ArrowUpRight size={14} /></button>} /><RecordList items={related.bills} empty="No bills are linked to this patient." render={item => <div className="bill-row"><div className="list-main"><strong>{item.bill_id || 'Bill record'}</strong><span>{money(item.total_amount)} · {item.created_at ? asDate(item.created_at) : 'Date not recorded'}</span></div><StatusPill value={item.status} /></div>} /></section>
        </div>
      </div>
    </>}
  </div>
}

function FactCard({ label, value, icon: Icon }) {
  return <div className="fact-card"><div className="fact-icon"><Icon size={16} /></div><div><span>{label}</span><strong>{value}</strong></div></div>
}

function WardBoard({ beds, admissions, patientMap, centres, selectedCentre, onCollection }) {
  const filteredBeds = selectedCentre ? beds.filter(bed => bed.hospital_id === selectedCentre) : beds
  const occupied = filteredBeds.filter(bed => ['occupied', 'in use', 'in-use'].includes(normaliseStatus(bed.status)))
  const available = filteredBeds.filter(bed => ['available', 'vacant', 'ready'].includes(normaliseStatus(bed.status)))
  const cleaning = filteredBeds.filter(bed => ['cleaning', 'turnover', 'maintenance'].includes(normaliseStatus(bed.status)))
  const activeAdmissions = admissions.filter(admission => !selectedCentre || admission.hospital_id === selectedCentre).filter(admission => ['admitted', 'active', 'in progress', 'ongoing'].includes(normaliseStatus(admission.status))).slice(0, 8)
  const activeBedAdmissions = admissions.filter(admission => ['admitted', 'active', 'in progress', 'ongoing'].includes(normaliseStatus(admission.status)))
  const bedById = new Map(filteredBeds.map(bed => [bed.bed_id, bed]))
  return <div className="workspace-content">
    <section className="ward-hero"><div><span className="eyebrow light">INPATIENT OPERATIONS · BED MANAGEMENT</span><h2>{selectedCentre ? centres.find(centre => centre.hospital_id === selectedCentre)?.name || 'Selected hospital centre' : 'Hospital bed overview'}</h2><p>Live bed inventory and admission records from the database. No telemetry is simulated.</p><div className="ward-hero-meta"><span><span className="hero-live-dot" /> Inventory view</span><span><MapPin size={14} /> {selectedCentre || 'All centres'}</span></div></div><div className="ward-hero-stat"><span>REGISTERED BEDS</span><strong>{number(filteredBeds.length)}</strong><small>Inventory records</small></div></section>
    <div className="metric-grid ward-metrics">
      <MetricCard label="Occupied" value={number(occupied.length)} detail="Beds marked occupied" icon={BedDouble} tone="lavender" />
      <MetricCard label="Available" value={number(available.length)} detail="Beds marked available" icon={CheckCircle2} tone="teal" />
      <MetricCard label="Turnover / cleaning" value={number(cleaning.length)} detail="Beds not yet ready" icon={RefreshCw} tone="blue" />
      <MetricCard label="Active admissions" value={number(activeAdmissions.length)} detail="Matching admission records" icon={ClipboardList} tone="ice" />
    </div>
    <SectionHeading eyebrow="BED INVENTORY" title="Ward bed board" description="Bed status is taken directly from the Beds collection." action={<button className="button secondary-button" onClick={() => onCollection('beds')}>Manage bed records <ArrowUpRight size={14} /></button>} />
    {filteredBeds.length ? <div className="bed-grid">{filteredBeds.map(bed => {
      const admission = activeBedAdmissions.find(item => item.bed_id === bed.bed_id && (!selectedCentre || item.hospital_id === selectedCentre))
      const patient = patientMap.get(admission?.patient_id)
      return <article className={`bed-card ${statusClass(bed.status)}`} key={bed.id || bed.bed_id}><div className="bed-card-head"><div><span className="eyebrow">{bed.ward || 'WARD NOT RECORDED'}</span><h3>Bed {bed.bed_number || bed.bed_id}</h3></div><StatusPill value={bed.status} /></div><div className="bed-patient">{admission ? <><div className="provider-avatar">{(patient?.name || admission.patient_id || 'P').slice(0, 1).toUpperCase()}</div><div><strong>{patientLabel(patient)}</strong><span>{admission.patient_id || 'Patient ID not recorded'}</span></div></> : <div className="bed-unassigned"><BedDouble size={19} /><span>No admission linked to this bed</span></div>}</div><div className="bed-card-foot"><span>{bed.hospital_id || 'Centre not assigned'}</span><span>{admission?.admitted_at ? asDate(admission.admitted_at) : 'No admission date'}</span></div></article>
    })}</div> : <EmptyWorkspace title="No bed inventory found" text="Add bed records to the Beds collection to populate the inpatient board. Bed availability is never fabricated by this screen." action={<button className="button primary-button" onClick={() => onCollection('beds')}>Open bed records <ArrowRight size={15} /></button>} />}
    <section className="surface-card admissions-panel"><SectionHeading eyebrow="INPATIENT FLOW" title="Recent admissions" description="Admission records associated with the selected centre." action={<button className="text-action" onClick={() => onCollection('admissions')}>Manage admissions <ArrowUpRight size={14} /></button>} /><RecordList items={activeAdmissions} empty="No active admissions are recorded." render={item => <div className="appointment-row"><div className="list-date-icon"><ClipboardList size={17} /></div><div className="list-main"><strong>{patientLabel(patientMap.get(item.patient_id))}</strong><span>{item.bed_id && bedById.get(item.bed_id) ? `Bed ${bedById.get(item.bed_id).bed_number || item.bed_id}` : item.bed_id || 'Bed not assigned'} · {item.hospital_id || 'Centre not recorded'}</span><small>{item.admitted_at ? asDate(item.admitted_at) : 'Admission date not recorded'}</small></div><StatusPill value={item.status} /></div>} /></section>
  </div>
}

function PatientPortal({ patients, patient, patientId, onPatientChange, related, onCollection }) {
  const now = Date.now()
  const upcoming = related.appointments.filter(item => new Date(item.appointment_at).getTime() >= now && !['cancelled', 'completed'].includes(normaliseStatus(item.status))).sort((a, b) => new Date(a.appointment_at) - new Date(b.appointment_at))[0]
  const latestLabs = related.lab_results.slice(0, 4)
  const prescriptionCount = related.prescriptions.length
  return <div className="workspace-content">
    <div className="view-toolbar"><div><span className="eyebrow">PATIENT EXPERIENCE · APPOINTMENT VIEW</span><p>Preview patient-linked visits, prescriptions and diagnostics using demo records.</p></div><PatientPicker patients={patients} patient={patient} patientId={patientId} onPatientChange={onPatientChange} /></div>
    {!patient ? <EmptyWorkspace title="No patient profiles available" text="Create a synthetic demo patient before previewing the patient appointment experience." action={<button className="button primary-button" onClick={() => onCollection('patients')}>Open patient records <ArrowRight size={15} /></button>} /> : <>
      <section className="portal-hero"><div className="portal-avatar">{(patient.name || 'P').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="portal-hero-copy"><span className="eyebrow light">PATIENT SUMMARY · DEMO VIEW</span><h2>Welcome, {patient.name || 'patient'}</h2><p>Health record {patient.patient_id} · Primary centre {patient.hospital_id || 'not assigned'}</p></div><button className="button portal-action" onClick={() => onCollection('appointments')}><CalendarCheck size={16} /> View appointments</button></section>
      <div className="portal-grid">
        <div className="portal-column">
          <section className="surface-card next-visit-card"><SectionHeading eyebrow="NEXT VISIT" title="Upcoming appointment" />{upcoming ? <><div className="next-visit-date"><CalendarDays size={23} /><div><strong>{asDate(upcoming.appointment_at)}</strong><span>{upcoming.reason || 'Reason not recorded'}</span></div></div><div className="detail-line"><span>Doctor ID</span><strong>{upcoming.doctor_id || 'Not assigned'}</strong></div><div className="detail-line"><span>Appointment status</span><StatusPill value={upcoming.status} /></div></> : <div className="empty-state"><CalendarDays size={20} /><span>No upcoming appointment is recorded for this patient.</span></div>}<button className="button secondary-button full-button" onClick={() => onCollection('appointments')}>Open appointment records <ArrowRight size={15} /></button></section>
          <section className="surface-card"><SectionHeading eyebrow="CARE DOCUMENTS" title="Latest lab diagnostics" action={<button className="text-action" onClick={() => onCollection('lab_results')}>View all <ArrowUpRight size={14} /></button>} /><RecordList items={latestLabs} empty="No laboratory results are available." render={item => <div className="lab-row"><div className="lab-icon"><FlaskConical size={17} /></div><div className="list-main"><strong>{item.test_name || item.lab_test_id || 'Diagnostic result'}</strong><span>{displayValue(item.result)}</span><small>{item.created_at ? asDate(item.created_at) : 'Date not recorded'}</small></div><StatusPill value={item.status} /></div>} /></section>
        </div>
        <div className="portal-column">
          <section className="surface-card"><SectionHeading eyebrow="MEDICATIONS" title="Prescription overview" action={<button className="text-action" onClick={() => onCollection('prescriptions')}>View all <ArrowUpRight size={14} /></button>} /><div className="portal-count-card"><div className="portal-count-icon"><Pill size={20} /></div><div><strong>{number(prescriptionCount)}</strong><span>Prescription records linked to this patient</span></div></div><RecordList items={related.prescriptions.slice(0, 4)} empty="No prescription records are available." render={item => <div className="prescription-row"><div className="list-main"><strong>{Array.isArray(item.medicines) ? item.medicines.map(m => m.name || m.medicine_id || 'Medicine').join(', ') : displayValue(item.medicines)}</strong><span>{item.notes || 'No notes recorded'}</span></div><StatusPill value={item.status || 'Recorded'} /></div>} /></section>
          <section className="surface-card"><SectionHeading eyebrow="ACCOUNT" title="Billing summary" action={<button className="text-action" onClick={() => onCollection('bills')}>Open billing <ArrowUpRight size={14} /></button>} /><RecordList items={related.bills} empty="No bills have been linked to this patient." render={item => <div className="bill-row"><div className="list-main"><strong>{item.bill_id || 'Bill record'}</strong><span>{money(item.total_amount)}</span></div><StatusPill value={item.status} /></div>} /></section>
        </div>
        <section className="surface-card portal-side-card"><SectionHeading eyebrow="PATIENT PROFILE" title="Your details" /><FactLine label="Age" value={patient.age ? `${patient.age} years` : 'Not recorded'} /><FactLine label="Gender" value={patient.gender || 'Not recorded'} /><FactLine label="Blood group" value={patient.blood_group || 'Not recorded'} /><FactLine label="Contact" value={patient.contact || 'Not recorded'} /><FactLine label="Email" value={patient.email || 'Not recorded'} /><div className="demo-notice compact"><ShieldCheck size={16} /><span>This is a demonstration view. It is not an authenticated patient portal and must not be used for real patient data.</span></div></section>
      </div>
    </>}
  </div>
}

function FactLine({ label, value }) { return <div className="fact-line"><span>{label}</span><strong>{value}</strong></div> }

function EmptyWorkspace({ title, text, action }) { return <div className="empty-workspace"><div className="empty-workspace-icon"><Database size={25} /></div><h2>{title}</h2><p>{text}</p>{action}</div> }

function RecordsWorkspace({ collection, records, total, page, pageSize, search, onSearch, onPage, loading, onCreate, onDelete }) {
  const fields = fieldSets[collection] || []
  return <div className="workspace-content records-content">
    <section className="records-intro"><div><span className="eyebrow">DATABASE MANAGEMENT · COLLECTION VIEW</span><h2>{labels[collection] || collection}</h2><p>Search, inspect and manage records stored in the CareSphere database.</p></div><button className="button primary-button" onClick={onCreate}><Plus size={16} /> Add record</button></section>
    <section className="surface-card records-panel">
      <div className="records-toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={event => onSearch(event.target.value)} placeholder={`Search ${labels[collection]?.toLowerCase() || 'records'}…`} /></label><span className="records-total"><Database size={15} /> {number(total)} records</span></div>
      <div className="table-scroll"><table><thead><tr>{fields.map(([key, label]) => <th key={key}>{label}</th>)}<th>Actions</th></tr></thead><tbody>
        {records.map((record, index) => <tr key={record.id || index}>{fields.map(([key]) => <td key={key} title={displayValue(record[key])}>{displayValue(record[key])}</td>)}<td><button className="delete-button" onClick={() => onDelete(record)}>Delete</button></td></tr>)}
        {!records.length && <tr><td colSpan={fields.length + 1} className="empty-cell">{loading ? 'Loading records…' : `No ${labels[collection]?.toLowerCase() || 'records'} found. Add a record or import data.`}</td></tr>}
      </tbody></table></div>
      <div className="pagination"><span>Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))} · Showing {records.length} records</span><div><button disabled={page === 0} onClick={() => onPage(value => Math.max(0, value - 1))} aria-label="Previous page"><ChevronLeft size={16} /></button><button disabled={(page + 1) * pageSize >= total} onClick={() => onPage(value => value + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div></div>
    </section>
  </div>
}

export default App
