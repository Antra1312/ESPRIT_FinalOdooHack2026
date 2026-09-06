import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DB, fmtDate, getAlloc, allocRemaining, initials, getSchedule, weeklyHours, workedHours } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { api, loadBootstrap } from '../api';
import SearchableSelect from '../components/SearchableSelect';

export default function EmployeeDetail(){
  const {id}=useParams();
  const nav=useNavigate();
  const {user}=useAuth();
  const [tab,setTab]=useState('overview');
  const [showEdit,setShowEdit]=useState(false);
  const [saving,setSaving]=useState(false);
  const [tick,setTick]=useState(0);
  const [form,setForm]=useState({});
  const emp=DB.employees.find(e=>e.id===id);
  if(!emp) return <div>Not found</div>;
  const contracts=DB.contracts.filter(c=>c.employeeId===emp.id).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
  const att=DB.attendance.filter(a=>a.employeeId===emp.id);
  const reqs=DB.requests.filter(r=>r.employeeId===emp.id);
  const allocs=DB.allocations.filter(a=>a.employeeId===emp.id);
  const mgr=DB.employees.find(e=>e.id===emp.managerId);
  const sched=getSchedule(emp.scheduleId);
  const isSelf=user.role==='employee';
  const canEdit=['admin','hr_payroll_manager'].includes(user.role);
  const openEdit=()=>{
    setForm({ name:emp.name || '', email:emp.email || '', phone:emp.phone || '', dept:emp.dept === 'Unassigned' ? '' : (emp.dept || ''), position:emp.position === '—' ? '' : (emp.position || ''), employeeType:emp.employeeType || 'Full Time', managerId:emp.managerId || '', scheduleId:emp.scheduleId || '', status:emp.status || 'Active', bankAccount:emp.bankAccount || '', bankName:emp.bankName || '', pan:emp.pan || '' });
    setShowEdit(true);
  };
  const save=async()=>{
    if(!form.name.trim()) return alert('Employee name is required');
    if(form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return alert('Enter a valid email address');
    setSaving(true);
    try {
      await api.updateEmployee(emp.id,form);
      await loadBootstrap();
      setShowEdit(false);
      setTick(value=>value+1);
    } catch(error) { alert(error.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="breadcrumb">{isSelf?'My Profile':<><Link to="/employees">Employees</Link> / {emp.name}</>}</div>
      <div className="pageHead">
        <div style={{display:'flex',gap:14,alignItems:'center'}}>
          <span className="avatar" style={{width:46,height:46,fontSize:16}}>{initials(emp.name)}</span>
          <div><h1 style={{marginBottom:2}}>{emp.name}</h1><div className="desc">{emp.position} · {emp.dept} · {emp.employeeType} · Reports to {mgr?mgr.name:'—'} · <span className={`pill ${emp.status==='Active'?'green':'gray'}`} style={{marginLeft:6}}>{emp.status}</span></div>
            <div className="hint">Schedule: {sched?`${sched.name} — ${weeklyHours(sched)}h/week (${sched.type})`:'—'}</div></div>
        </div>
        {canEdit && <button className="btn solid" onClick={openEdit}>Edit employee</button>}
      </div>
      <div className="smartBtns">
        <button className="smartBtn" onClick={()=>nav(`/contracts?employee=${emp.id}`)}><div className="n">{contracts.length}</div><div className="l">📄 Contracts — filtered view →</div></button>
        <button className="smartBtn" onClick={()=>nav(`/attendance?employee=${emp.id}`)}><div className="n">{att.length}</div><div className="l">🕐 Attendance — filtered view →</div></button>
        <button className="smartBtn" onClick={()=>nav(`/timeoff?employee=${emp.id}`)}><div className="n">{reqs.length}</div><div className="l">🏖️ Time Off — filtered view →</div></button>
        <button className="smartBtn" onClick={()=>nav(`/timeoff?employee=${emp.id}`)}><div className="n">{allocs.length}</div><div className="l">🗂️ Allocations — filtered view →</div></button>
      </div>
      <div style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn small" onClick={()=>setTab('contracts')}>View Contracts</button>
        <button className="btn small" onClick={()=>setTab('attendance')}>View Attendance</button>
        <button className="btn small" onClick={()=>setTab('timeoff')}>View Time Off</button>
      </div>
      <div className="tabs">
        {['overview','contracts','attendance','timeoff'].map(t=>(
          <button key={t} className={`tabbtn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>
      {tab==='overview' && (
        <div className="grid2">
          <div className="card"><div className="cardHead"><h3>Employee Details</h3></div><div className="cardBody">
            <div className="kv"><span className="k">Email</span><span className="v">{emp.email}</span></div>
            <div className="kv"><span className="k">Phone</span><span className="v">{emp.phone}</span></div>
            <div className="kv"><span className="k">Department</span><span className="v">{emp.dept}</span></div>
            <div className="kv"><span className="k">Position</span><span className="v">{emp.position}</span></div>
            <div className="kv"><span className="k">Type</span><span className="v">{emp.employeeType}</span></div>
            <div className="kv"><span className="k">Manager</span><span className="v">{mgr?mgr.name:'—'}</span></div>
            <div className="kv"><span className="k">Schedule</span><span className="v">{sched?sched.name:'—'} {sched?`(${weeklyHours(sched)}h)` :''}</span></div>
            <div className="kv"><span className="k">Status</span><span className="v"><span className={`pill ${emp.status==='Active'?'green':'gray'}`}>{emp.status}</span></span></div>
            <div className="kv"><span className="k">Bank</span><span className="v">{emp.bankAccount||'— missing'}</span></div>
            <div className="kv"><span className="k">PAN</span><span className="v">{emp.pan||'— missing'}</span></div>
          </div></div>
          <div className="card"><div className="cardHead"><h3>Time Off Balances</h3></div><div className="cardBody">
            {DB.allocations.filter(a=>a.employeeId===emp.id).map(a=>{
              const type=DB.timeoffTypes.find(t=>t.id===a.typeId);
              return <div key={a.id} className="kv"><span className="k">{type.name}</span><span className="v">{allocRemaining(a)} / {a.allocated} days</span></div>;
            })}
          </div></div>
        </div>
      )}
      {tab==='contracts' && (
        <div className="card"><div className="tableWrap"><table>
          <thead><tr><th>Position</th><th>Wage</th><th>Period</th><th>Status</th></tr></thead>
          <tbody>{contracts.map(c=>(
            <tr key={c.id}><td>{c.position}</td><td>₹{c.wage.toLocaleString()}</td><td>{fmtDate(c.startDate)} — {c.endDate?fmtDate(c.endDate):'Present'}</td><td><span className="pill blue">{DB.structures.find(s=>s.id===c.structureId)?.name}</span></td></tr>
          ))}</tbody>
        </table></div></div>
      )}
      {tab==='attendance' && (
        <div className="card"><div className="tableWrap"><table>
          <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Worked Hours</th><th>Status</th></tr></thead>
          <tbody>{att.length? att.map(a=>{
            const wh=workedHours(a.checkIn,a.checkOut);
            return <tr key={a.id}><td>{fmtDate(a.date)}</td><td>{a.checkIn||'—'}</td><td>{a.checkOut||'—'}</td><td>{wh?`${wh}h`:'—'}</td><td><span className={`pill ${a.status==='Normal'?'green':a.status==='Late'?'amber':'red'}`}>{a.status}</span></td></tr>;
          }): <tr><td colSpan={5} style={{textAlign:'center',padding:20}}>No records</td></tr>}</tbody>
        </table></div></div>
      )}
      {tab==='timeoff' && (
        <div className="card"><div className="tableWrap"><table>
          <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>{reqs.length? reqs.map(r=>{
            const t=DB.timeoffTypes.find(x=>x.id===r.typeId);
            return <tr key={r.id}><td>{t.name}</td><td>{fmtDate(r.from)} → {fmtDate(r.to)}</td><td>{r.duration}</td><td><span className={`pill ${r.status==='Approved'?'green':r.status==='Pending'?'amber':'red'}`}>{r.status}</span></td></tr>;
          }): <tr><td colSpan={4} style={{textAlign:'center',padding:20}}>No requests</td></tr>}</tbody>
        </table></div></div>
      )}
      {showEdit && (
        <div className="modalOverlay" onMouseDown={event=>{if(event.target===event.currentTarget) setShowEdit(false);}}>
          <div className="modal"><div className="modalHead"><h3>Edit employee details</h3><button className="modalClose" onClick={()=>setShowEdit(false)}>×</button></div>
            <div className="modalBody"><div className="formGrid">
              <div className="field"><label>Name</label><input value={form.name} onChange={event=>setForm({...form,name:event.target.value})} /></div>
              <div className="field"><label>Work email</label><input type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} /></div>
              <div className="field"><label>Phone</label><input value={form.phone} onChange={event=>setForm({...form,phone:event.target.value})} /></div>
              <div className="field"><label>Department</label><SearchableSelect value={form.dept} onChange={dept=>setForm({...form,dept})} emptyLabel="Unassigned" options={DB.departments.map(item=>({value:item.name,label:`${item.name}${item.code?` — ${item.code}`:''}`}))} /></div>
              <div className="field"><label>Position</label><SearchableSelect value={form.position} onChange={position=>setForm({...form,position})} emptyLabel="Unassigned" options={DB.jobPositions.map(item=>({value:item.title,label:`${item.title}${item.code?` — ${item.code}`:''}`}))} /></div>
              <div className="field"><label>Employment type</label><select value={form.employeeType} onChange={event=>setForm({...form,employeeType:event.target.value})}><option value="Full Time">Full Time</option><option value="Part Time">Part Time</option><option value="Contract">Contract</option><option value="Intern">Intern</option></select></div>
              <div className="field"><label>Manager</label><SearchableSelect value={form.managerId} onChange={managerId=>setForm({...form,managerId})} emptyLabel="No manager" options={DB.employees.filter(item=>item.id!==emp.id).map(item=>({value:item.id,label:`${item.name} — ${item.email}`}))} /></div>
              <div className="field"><label>Working schedule</label><SearchableSelect value={form.scheduleId} onChange={scheduleId=>setForm({...form,scheduleId})} emptyLabel="No schedule" options={DB.schedules.map(item=>({value:item.id,label:item.name}))} /></div>
              <div className="field"><label>Status</label><select value={form.status} onChange={event=>setForm({...form,status:event.target.value})}><option>Active</option><option>On Leave</option><option>Probation</option><option>Inactive</option></select></div>
              <div className="field"><label>Bank account number</label><input value={form.bankAccount} onChange={event=>setForm({...form,bankAccount:event.target.value})} /></div>
              <div className="field"><label>Bank name</label><input value={form.bankName} onChange={event=>setForm({...form,bankName:event.target.value})} /></div>
              <div className="field"><label>PAN</label><input value={form.pan} onChange={event=>setForm({...form,pan:event.target.value.toUpperCase()})} /></div>
            </div></div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShowEdit(false)}>Cancel</button><button className="btn solid" disabled={saving} onClick={save}>{saving?'Saving…':'Save changes'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
