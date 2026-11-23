import { useEffect, useMemo, useState } from 'react'
import { Activity, BedDouble, Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, CreditCard, FlaskConical, LayoutDashboard, Menu, Pill, Plus, Search, Stethoscope, Users, Wallet, X, RefreshCw, Database, FileText, Hospital } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from './api'

const modules = [
  ['dashboard','Overview',LayoutDashboard],
  ['hospitals','Hospital Centres',Building2],
  ['public_hospitals','Public Directory',Hospital],
  ['patients','Patients',Users],
  ['doctors','Doctors',Stethoscope],
  ['departments','Departments',Hospital],
  ['appointments','Appointments',CalendarDays],
  ['prescriptions','Prescriptions',ClipboardList],
  ['medicines','Medicines',Pill],
  ['lab_tests','Lab Tests',FlaskConical],
  ['lab_results','Lab Results',Activity],
  ['bills','Bills',FileText],
  ['payments','Payments',CreditCard],
  ['pharmacy_inventory','Pharmacy Stock',Database],
  ['admissions','Admissions',BedDouble],
  ['beds','Beds',BedDouble],
  ['audit_logs','Audit Logs',ClipboardList],
]
const labels = {
  hospitals:'Hospital Centres', public_hospitals:'Public Hospital Directory', patients:'Patients', doctors:'Doctors', departments:'Departments',
  appointments:'Appointments', prescriptions:'Prescriptions', medicines:'Medicines', lab_tests:'Lab Tests',
  lab_results:'Lab Results', bills:'Bills', payments:'Payments', pharmacy_inventory:'Pharmacy Stock',
  admissions:'Admissions', beds:'Beds', audit_logs:'Audit Logs'
}
const fieldSets = {
  hospitals:[['hospital_id','Centre ID'],['name','Centre name'],['city','City'],['phone','Phone'],['status','Status']],
  public_hospitals:[['facility_id','Facility ID'],['name','Facility name'],['facility_type','Facility type'],['district','District'],['state','State'],['pincode','PIN code'],['phone','Phone'],['latitude','Latitude'],['longitude','Longitude']],
  patients:[['patient_id','Patient ID'],['hospital_id','Hospital ID'],['name','Full name'],['age','Age'],['gender','Gender'],['contact','Contact'],['email','Email'],['blood_group','Blood group'],['city','City']],
  doctors:[['doctor_id','Doctor ID'],['hospital_id','Hospital ID'],['name','Full name'],['specialization','Specialization'],['department_id','Department ID'],['email','Email'],['phone','Phone'],['experience_years','Experience']],
  departments:[['department_id','Department ID'],['hospital_id','Hospital ID'],['name','Department name'],['status','Status']],
  appointments:[['appointment_id','Appointment ID'],['hospital_id','Hospital ID'],['patient_id','Patient ID'],['doctor_id','Doctor ID'],['appointment_at','Date/time (ISO)'],['reason','Reason'],['status','Status']],
  prescriptions:[['prescription_id','Prescription ID'],['hospital_id','Hospital ID'],['patient_id','Patient ID'],['doctor_id','Doctor ID'],['medicines','Medicines (JSON array)'],['notes','Notes']],
  medicines:[['medicine_id','Medicine ID'],['name','Medicine name'],['category','Category'],['manufacturer','Manufacturer'],['unit_price','Unit price']],
  lab_tests:[['lab_test_id','Test ID'],['name','Test name'],['description','Description'],['price','Price']],
  lab_results:[['result_id','Result ID'],['hospital_id','Hospital ID'],['patient_id','Patient ID'],['lab_test_id','Test ID'],['result','Result'],['status','Status']],
  bills:[['bill_id','Bill ID'],['hospital_id','Hospital ID'],['patient_id','Patient ID'],['total_amount','Total amount'],['status','Status']],
  payments:[['payment_id','Payment ID'],['hospital_id','Hospital ID'],['bill_id','Bill ID'],['amount','Amount'],['method','Method'],['status','Status']],
  pharmacy_inventory:[['inventory_id','Inventory ID'],['hospital_id','Hospital ID'],['medicine_id','Medicine ID'],['quantity','Quantity'],['reorder_level','Reorder level']],
  admissions:[['admission_id','Admission ID'],['hospital_id','Hospital ID'],['patient_id','Patient ID'],['bed_id','Bed ID'],['admitted_at','Admitted at'],['status','Status']],
  beds:[['bed_id','Bed ID'],['hospital_id','Hospital ID'],['ward','Ward'],['bed_number','Bed number'],['status','Status']],
  audit_logs:[['log_id','Log ID'],['action','Action'],['collection','Collection'],['record_id','Record ID'],['created_at','Created at']]
}
const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0))
function App(){
  const [active,setActive]=useState('dashboard')
  const [summary,setSummary]=useState(null)
  const [centres,setCentres]=useState([])
  const [records,setRecords]=useState([])
  const [total,setTotal]=useState(0)
  const [page,setPage]=useState(0)
  const [search,setSearch]=useState('')
  const [centre,setCentre]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [apiStatus,setApiStatus]=useState('checking')
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({})
  const [saving,setSaving]=useState(false)
  const pageSize=20
  const current=modules.find(m=>m[0]===active)
  const fetchDashboard=async()=>{
    try{const [s,c]=await Promise.all([api.get('/dashboard/summary'),api.get('/dashboard/centres')]);setSummary(s.data);setCentres(c.data);setError('');setApiStatus('connected')}
    catch(e){setApiStatus('offline');setError(e.response?.data?.detail||`API unavailable (${e.code||e.message}). Check /api/health and the deployed API configuration.`)}
  }
  const fetchRecords=async()=>{
    if(active==='dashboard')return
    setLoading(true)
    try{const r=await api.get(`/${active}`,{params:{skip:page*pageSize,limit:pageSize,search:search||undefined,hospital_id:centre||undefined}});setRecords(r.data.items);setTotal(r.data.total);setError('');setApiStatus('connected')}
    catch(e){setApiStatus('offline');setError(e.response?.data?.detail||`Unable to load records: ${e.code||e.message}. Check /api/health and the API deployment.`);setRecords([])}
    finally{setLoading(false)}
  }
  useEffect(()=>{fetchDashboard()},[])
  useEffect(()=>{setPage(0);setSearch('')},[active])
  useEffect(()=>{fetchRecords()},[active,page,centre])
  useEffect(()=>{const t=setTimeout(()=>{if(active!=='dashboard'){setPage(0);fetchRecords()}},300);return()=>clearTimeout(t)},[search])
  const openCreate=()=>{setForm({});setShowForm(true)}
  const save=async(e)=>{
    e.preventDefault();setSaving(true)
    try{
      const payload={...form}
      for(const k of Object.keys(payload)){if(payload[k]==='')delete payload[k];else if(typeof payload[k]==='string' && ['age','experience_years','unit_price','price','total_amount','amount','quantity','reorder_level'].includes(k))payload[k]=Number(payload[k])}
      if(typeof payload.medicines==='string'){try{payload.medicines=JSON.parse(payload.medicines)}catch{throw new Error('Medicines must be valid JSON, e.g. [{"medicine_id":"MED1","dose":"1 tablet"}]')}}
      await api.post(`/${active}`,payload);setShowForm(false);setForm({});fetchRecords();fetchDashboard()
    }catch(e){alert(e.response?.data?.detail||e.message||'Could not save record')}
    finally{setSaving(false)}
  }
  const remove=async(row)=>{if(!confirm('Delete this record?'))return;try{await api.delete(`/${active}/${row.id||row[`${active.slice(0,-1)}_id`]}`);fetchRecords();fetchDashboard()}catch(e){alert(e.response?.data?.detail||'Delete failed')}}
  const nav=<>{modules.map(([id,label,Icon])=><button key={id} className={`nav-item ${active===id?'selected':''}`} onClick={()=>setActive(id)}><Icon size={17}/><span>{label}</span>{id==='patients'&&summary?.patients>0&&<small>{summary.patients.toLocaleString('en-IN')}</small>}</button>)}</>
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={22}/></div><div><b>CareSphere</b><small>HOSPITAL NETWORK</small></div></div>
      <div className="network-label">WORKSPACE</div><nav>{nav}</nav>
      <div className="sidebar-bottom"><div className={`online-dot ${apiStatus}`}></div><div><b>Network database</b><small>{apiStatus==='connected'?'API connected':apiStatus==='checking'?'Checking connection…':'Connection unavailable'}</small></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">CARESPHERE / {active.toUpperCase()}</div><h1>{active==='dashboard'?'Network overview':labels[active]}</h1></div><div className="top-actions"><span className={`demo-pill ${apiStatus==='connected'?'is-online':apiStatus==='offline'?'is-offline':''}`}><i/> {apiStatus==='connected'?'SYSTEM ONLINE':apiStatus==='checking'?'CONNECTING':'API OFFLINE'}</span><button className="icon-button" onClick={()=>{fetchDashboard();fetchRecords()}} title="Refresh"><RefreshCw size={17}/></button></div></header>
      {error&&<div className="alert"><Activity size={18}/><span>{error}</span></div>}
      {active==='dashboard'?<Dashboard summary={summary} centres={centres} onNavigate={setActive}/>:<section className="panel">
        <div className="panel-toolbar"><div className="search-wrap"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records..."/></div>{active!=='public_hospitals'&&<select value={centre} onChange={e=>setCentre(e.target.value)}><option value="">All hospital centres</option>{centres.map(c=><option key={c.hospital_id} value={c.hospital_id}>{c.name}</option>)}</select>}<button className="primary-button" onClick={openCreate}><Plus size={17}/> Add record</button></div>
        <div className="table-meta"><span>{total.toLocaleString('en-IN')} records</span><span>{loading?'Loading...':`Showing ${records.length} records`}</span></div>
        <div className="table-scroll"><table><thead><tr>{(fieldSets[active]||[]).map(([k,l])=><th key={k}>{l}</th>)}<th>Action</th></tr></thead><tbody>
          {records.map((r,i)=><tr key={r.id||i}>{(fieldSets[active]||[]).map(([k])=><td key={k}>{Array.isArray(r[k])?JSON.stringify(r[k]):typeof r[k]==='object'&&r[k]?JSON.stringify(r[k]):String(r[k]??'—')}</td>)}<td><button className="delete-button" onClick={()=>remove(r)}>Delete</button></td></tr>)}
          {!records.length&&<tr><td colSpan={(fieldSets[active]||[]).length+1} className="empty">{loading?'Loading records...':'No records found. Add a record or seed the database.'}</td></tr>}
        </tbody></table></div>
        <div className="pagination"><span>Page {page+1} of {Math.max(1,Math.ceil(total/pageSize))}</span><div><button disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button><button disabled={(page+1)*pageSize>=total} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button></div></div>
      </section>}
      <footer>CareSphere · Public facility directory + synthetic operational demo data</footer>
    </main>
    {showForm&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><form className="modal" onSubmit={save}><div className="modal-head"><div><small>NEW ENTRY</small><h2>Add {labels[active]}</h2></div><button type="button" className="icon-button" onClick={()=>setShowForm(false)}><X size={18}/></button></div><div className="form-grid">{(fieldSets[active]||[]).filter(([k])=>!k.endsWith('_id')||!['patient_id','doctor_id','appointment_id','bill_id','payment_id','prescription_id','result_id','inventory_id','admission_id','log_id','facility_id'].includes(k)).map(([key,label])=><label key={key}>{label}{key==='medicines' ? <textarea rows="3" value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder='[{"medicine_id":"MED1","dose":"1 tablet"}]'/> : <input value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={key==='appointment_at'?'2026-12-01T10:00:00+05:30':''}/>}</label>)}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?'Saving...':'Save record'}</button></div></form></div>}
  </div>
}
function Dashboard({summary,centres,onNavigate}){
  const cards=[['Patients',summary?.patients,'Across all centres',Users,'blue','patients'],['Doctors',summary?.doctors,'Active network records',Stethoscope,'purple','doctors'],['Appointments',summary?.appointments,'All recorded visits',CalendarDays,'orange','appointments'],['Hospital centres',summary?.hospitals,'Operational locations',Building2,'green','hospitals'],['Public facilities',summary?.public_facilities,'Open directory records',Hospital,'purple','public_hospitals']]
  const chartData=centres.map(c=>({name:c.name.replace('CareSphere ',''),patients:c.patient_count||0,appointments:c.appointment_count||0}))
  return <div className="dashboard-content">
    <div className="welcome-row"><div><div className="eyebrow">LIVE NETWORK SNAPSHOT</div><h2>One network. Every centre.</h2><p>Monitor patient activity and operations across your hospital network.</p></div><div className="date-chip"><Activity size={16}/> Multi-centre view</div></div>
    <div className="stat-grid">{cards.map(([name,value,sub,Icon,color,target])=><button className="stat-card" key={name} onClick={()=>onNavigate(target)}><div className={`stat-icon ${color}`}><Icon size={19}/></div><div className="stat-name">{name}</div><div className="stat-value">{value==null?'—':Number(value).toLocaleString('en-IN')}</div><div className="stat-sub">{sub}</div></button>)}</div>
    <div className="content-grid"><section className="panel chart-panel"><div className="section-heading"><div><h3>Centre-wise activity</h3><p>Patients and appointments by hospital centre</p></div><span className="tag">AGGREGATED</span></div><div className="chart-area">{chartData.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:10,right:12,left:-16,bottom:4}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef0"/><XAxis dataKey="name" tick={{fontSize:12,fill:'#778196'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:'#778196'}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="patients" fill="#786B94" radius={[5,5,0,0]}/><Bar dataKey="appointments" fill="#67919E" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<div className="empty">Centre data will appear after seeding.</div>}</div><div className="legend"><span><i className="blue-dot"></i> Patients</span><span><i className="teal-dot"></i> Appointments</span></div></section>
    <section className="panel centre-panel"><div className="section-heading"><div><h3>Hospital centres</h3><p>Network directory</p></div><Building2 size={19}/></div><div className="centre-list">{centres.map(c=><div className="centre-row" key={c.hospital_id}><div className="centre-avatar">{c.name?.split(' ').slice(-1)[0]?.[0]||'C'}</div><div className="centre-info"><b>{c.name}</b><small>{c.city} · {c.hospital_id}</small></div><div className="centre-count">{Number(c.patient_count||0).toLocaleString('en-IN')}<small>patients</small></div></div>)}{!centres.length&&<div className="empty">No centres found. Run the seed script.</div>}</div></section></div>
    <section className="insight-strip"><div className="insight-icon"><Database size={20}/></div><div><b>Database operations workspace</b><p>Explore the public facility directory and the synthetic operational records across demo hospital centres.</p></div><button onClick={()=>onNavigate('patients')}>Explore records <ChevronRight size={16}/></button></section>
  </div>
}
export default App
