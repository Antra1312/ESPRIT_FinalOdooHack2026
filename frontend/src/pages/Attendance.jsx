import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DB, fmtDate, workedHours, uid } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import { api, loadBootstrap } from '../api';
export default function Attendance(){
  const {user}=useAuth();
  const isEmployee=user.role==='employee';
  const canCorrect=['hr_manager','hr_payroll_user','hr_payroll_manager','admin'].includes(user.role);
  const [tick,setTick]=useState(0);
  const [show,setShow]=useState(false);
  const [punching,setPunching]=useState(false);
  const [form,setForm]=useState({employeeId:DB.employees[0]?.id||'',date:new Date().toISOString().slice(0,10),checkIn:'09:00',checkOut:'18:00',status:'Normal'});
  const [searchParams]=useSearchParams();
  const filterEmp=searchParams.get('employee');
  const filtered=isEmployee?DB.attendance.filter(a=>a.employeeId===user.empId):(filterEmp?DB.attendance.filter(a=>a.employeeId===filterEmp):DB.attendance);
  const filterName=filterEmp?DB.employees.find(e=>e.id===filterEmp)?.name:null;
  const today=new Date().toISOString().slice(0,10);
  const todayRecord=DB.attendance.find(record=>record.employeeId===user.empId && String(record.date).slice(0,10)===today);
  const punch=async (action)=>{
    setPunching(true);
    try {
      const time=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});
      await (action==='in'?api.checkIn({date:today,time}):api.checkOut({date:today,time}));
      await loadBootstrap();
      setTick(value=>value+1);
    } catch(error) { alert(error.message); }
    finally { setPunching(false); }
  };
  const create=()=>{
    DB.attendance.push({id:uid('AT'),employeeId:form.employeeId,date:form.date,checkIn:form.checkIn,checkOut:form.checkOut,status:form.status,note:''});
    setShow(false); setTick(x=>x+1);
  };
  return (
    <div>
      <div className="pageHead"><div><h1>Attendance {filterName?`— ${filterName}`:''}</h1><div className="desc">Check In, Check Out, Worked Hours, Status — corrections restricted to authorized users. Feeds Reports. — B3 spec (hardcoded) {filterEmp && <><Link to="/attendance" style={{marginLeft:8}}>Clear filter</Link></>}</div></div>
        {isEmployee ? <div style={{display:'flex',gap:8}}><button className="btn solid" disabled={punching || !!todayRecord?.checkIn} onClick={()=>punch('in')}>{todayRecord?.checkIn?'Checked in':'Check in'}</button><button className="btn" disabled={punching || !todayRecord?.checkIn || !!todayRecord?.checkOut} onClick={()=>punch('out')}>{todayRecord?.checkOut?'Checked out':'Check out'}</button></div> : <button className="btn solid" onClick={()=>setShow(true)}>+ New Entry</button>}
      </div>
      <div className="card"><div className="tableWrap"><table>
        <thead><tr><th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Worked Hours</th><th>Status</th><th></th></tr></thead>
        <tbody>{filtered.map(a=>{
          const emp=DB.employees.find(e=>e.id===a.employeeId);
          const wh=workedHours(a.checkIn,a.checkOut);
          return <tr key={a.id}><td>{emp?.name}</td><td>{fmtDate(a.date)}</td><td>{a.checkIn||'—'}</td><td>{a.checkOut||'—'}</td><td>{wh?`${wh}h`:'—'}</td><td><span className={`pill ${a.status==='Normal'?'green':a.status==='Late'?'amber':'red'}`}>{a.status}</span></td><td>{canCorrect ? <button className="btn small" onClick={()=>{const v=prompt('Correct status',a.status); if(v){a.status=v; setTick(x=>x+1);}}}>Correct</button>: <span className="hint">view only</span>}</td></tr>;
        })}</tbody>
      </table></div></div>
      {show && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShow(false);}}>
          <div className="modal"><div className="modalHead"><h3>New Attendance Entry</h3><button className="modalClose" onClick={()=>setShow(false)}>×</button></div>
            <div className="modalBody">
              <div className="formGrid">
                <div className="field"><label>Employee</label><SearchableSelect value={form.employeeId} onChange={employeeId=>setForm({...form,employeeId})} options={DB.employees.map(employee=>({value:employee.id,label:`${employee.name} — ${employee.email}`}))} /></div>
                <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
                <div className="field"><label>Check In</label><input type="time" value={form.checkIn} onChange={e=>setForm({...form,checkIn:e.target.value})} /></div>
                <div className="field"><label>Check Out</label><input type="time" value={form.checkOut} onChange={e=>setForm({...form,checkOut:e.target.value})} /></div>
                <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Normal</option><option>Late</option><option>Missing Checkout</option></select></div>
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn solid" onClick={create}>Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
