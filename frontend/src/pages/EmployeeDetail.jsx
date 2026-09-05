import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DB, fmtDate, getAlloc, allocRemaining, initials, getSchedule, weeklyHours, workedHours, isContractActive } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function EmployeeDetail(){
  const {id}=useParams();
  const nav=useNavigate();
  const {user, can}=useAuth();
  const [tab,setTab]=useState('overview');
  const emp=DB.employees.find(e=>e.id===id);
  if(!emp) return <div>Not found</div>;
  const contracts=DB.contracts.filter(c=>c.employeeId===emp.id).sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
  const att=DB.attendance.filter(a=>a.employeeId===emp.id);
  const reqs=DB.requests.filter(r=>r.employeeId===emp.id);
  const allocs=DB.allocations.filter(a=>a.employeeId===emp.id);
  const mgr=DB.employees.find(e=>e.id===emp.managerId);
  const sched=getSchedule(emp.scheduleId);
  const isSelf=user.role==='employee';
  const isHR=can('hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin');

  return (
    <div>
      <div className="breadcrumb">{isSelf?'My Profile':<><Link to="/employees">Employees</Link> / {emp.name}</>}</div>
      <div className="pageHead">
        <div style={{display:'flex',gap:14,alignItems:'center'}}>
          <span className="avatar" style={{width:46,height:46,fontSize:16}}>{initials(emp.name)}</span>
          <div><h1 style={{marginBottom:2}}>{emp.name}</h1><div className="desc">{emp.position} · {emp.dept} · {emp.employeeType} · Reports to {mgr?mgr.name:'—'} · <span className={`pill ${emp.status==='Active'?'green':'gray'}`} style={{marginLeft:6}}>{emp.status}</span></div>
            <div className="hint">Schedule: {sched?`${sched.name} — ${weeklyHours(sched)}h/week (${sched.type})`:'—'}</div></div>
        </div>
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
        <div className="card">
          <div className="cardHead">
            <h3>Contract History ({contracts.length})</h3>
            {isHR && (
              <Link to={`/contracts?employee=${emp.id}`} className="btn small solid">
                Manage / + New Contract
              </Link>
            )}
          </div>
          <div className="tableWrap"><table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Department</th>
                <th>Monthly Wage</th>
                <th>Salary Structure</th>
                <th>Contract Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length > 0 ? contracts.map(c => {
                const active = isContractActive(c);
                const structure = DB.structures.find(s => s.id === c.structureId);
                return (
                  <tr key={c.id} style={active ? { background: '#F0FBFA' } : {}}>
                    <td><b>{c.position}</b></td>
                    <td>{c.dept}</td>
                    <td><b>₹{c.wage.toLocaleString()}</b></td>
                    <td><span className="pill blue">{structure?.name || c.structureId}</span></td>
                    <td>{fmtDate(c.startDate)} — {c.endDate ? fmtDate(c.endDate) : <span style={{ color: 'var(--success)', fontWeight: 600 }}>Ongoing</span>}</td>
                    <td>
                      <span className={`pill ${active ? 'green' : 'gray'}`}>
                        {active ? 'Active' : 'Ended'}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>No contracts recorded</td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
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
    </div>
  );
}
