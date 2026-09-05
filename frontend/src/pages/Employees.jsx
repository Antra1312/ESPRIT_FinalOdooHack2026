import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { api, loadBootstrap } from '../api';

export default function Employees(){
  const nav=useNavigate();
  const {user}=useAuth();
  const [view,setView]=useState('kanban');
  const [q,setQ]=useState('');
  const [tick,setTick]=useState(0);
  const [show,setShow]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({name:'',dept:'',position:'',managerId:'',scheduleId:'',status:'Active',employeeType:'Full-time',email:'',phone:''});
  const list=DB.employees.filter(e=> e.name.toLowerCase().includes(q.toLowerCase()) || e.position.toLowerCase().includes(q.toLowerCase()));
  const depts=DB.departments.map((department)=>department.name);
  const isHR=['hr_manager','hr_payroll_user','hr_payroll_manager','admin'].includes(user.role);

  if(user.role==='employee'){
    nav(`/employees/${user.empId}`,{replace:true});
    return null;
  }

  const openAdd=()=>{ setEditId(null); setForm({name:'',dept:DB.departments[0]?.name||'',position:'',managerId:'',scheduleId:DB.schedules[0]?.id||'',status:'Active',employeeType:'Full-time',email:'',phone:''}); setShow(true); };
  const openEdit=(e)=>{ setEditId(e.id); setForm({name:e.name,dept:e.dept,position:e.position,managerId:e.managerId||'',scheduleId:e.scheduleId,status:e.status,employeeType:e.employeeType,email:e.email,phone:e.phone}); setShow(true); };
  const managerOptions=DB.employees.filter(e=> e.position.toLowerCase().includes('manager') || DB.employees.some(x=>x.managerId===e.id));
  const save=async ()=>{
    if(!form.name.trim()||!form.position.trim()) return alert('Name and Position required');
    const emailOk=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if(form.email && !emailOk) return alert('Invalid email format');
    const digits=form.phone.replace(/\D/g,'');
    if(form.phone && digits.length!==10) return alert('Phone must be exactly 10 digits');
    const payload={...form, joiningDate: editId ? undefined : new Date().toISOString().slice(0,10)};
    try {
      if(editId) await api.updateEmployee(editId, payload);
      else await api.createEmployee(payload);
      await loadBootstrap();
      setShow(false); setTick(x=>x+1);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <div className="pageHead">
        <div><h1>Employees</h1><div className="desc">Central hub for employee records, departments, managers, schedules, status, and related HR data.</div></div>
        {isHR && <button className="btn solid" onClick={openAdd}>+ New Employee</button>}
      </div>
      <div className="filterBar">
        <div className="searchBox"><input placeholder="Search employees…" value={q} onChange={e=>setQ(e.target.value)} /></div>
        <button className={`btn small ${view==='kanban'?'solid':''}`} onClick={()=>setView('kanban')}>Kanban</button>
        <button className={`btn small ${view==='list'?'solid':''}`} onClick={()=>setView('list')}>List</button>
      </div>
      {view==='kanban' ? (
        <div className="kanbanCols">
          {depts.map(d=>(
            <div key={d} className="kanbanCol"><h4>{d} · {list.filter(e=>e.dept===d).length}</h4>
              {list.filter(e=>e.dept===d).map(e=>(
                <div key={e.id} className="empCard" onClick={()=>nav(`/employees/${e.id}`)}>
                  <div className="nm">{e.name}</div><div className="ps">{e.position} · {e.employeeType}</div>
                  <div style={{marginTop:8,display:'flex',gap:6,justifyContent:'space-between',alignItems:'center'}}><span className={`pill ${e.status==='Active'?'green':'gray'}`}>{e.status}</span>{isHR && <button className="btn small" onClick={ev=>{ev.stopPropagation(); openEdit(e);}}>Edit</button>}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><div className="tableWrap"><table>
          <thead><tr><th>Employee</th><th>Department</th><th>Position</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map(e=>(
            <tr key={e.id} className="clickable" onClick={()=>nav(`/employees/${e.id}`)}>
              <td><b>{e.name}</b></td><td>{e.dept}</td><td>{e.position}</td><td><span className={`pill ${e.status==='Active'?'green':'gray'}`}>{e.status}</span></td>
              <td style={{textAlign:'right'}}>{isHR && <button className="btn small" onClick={ev=>{ev.stopPropagation(); openEdit(e);}}>Edit</button>}</td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
      {show && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShow(false);}}>
          <div className="modal"><div className="modalHead"><h3>{editId?'Edit Employee':'New Employee'}</h3><button className="modalClose" onClick={()=>setShow(false)}>×</button></div>
            <div className="modalBody">
              <div className="formGrid">
                <div className="field"><label>Name</label><input placeholder="e.g. Aarav Mehta" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div className="field"><label>Department</label><select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})}><option value="">— Select department</option>{DB.departments.map((department)=><option key={department.id} value={department.name}>{department.name}</option>)}</select></div>
                <div className="field"><label>Position</label><select value={form.position} onChange={e=>setForm({...form,position:e.target.value})}><option value="">— Select position</option>{DB.jobPositions.map((position)=><option key={position.id} value={position.title}>{position.title}</option>)}</select></div>
                <div className="field"><label>Type</label><select value={form.employeeType} onChange={e=>setForm({...form,employeeType:e.target.value})}><option>Full-time</option><option>Contract</option><option>Intern</option><option>Part-time</option></select></div>
                <div className="field"><label>Email</label><input type="email" placeholder="e.g. aarav.mehta@peoplepay360.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                <div className="field"><label>Phone</label><input placeholder="e.g. 9820011234" maxLength={10} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} /></div>
                <div className="field"><label>Manager</label><select value={form.managerId} onChange={e=>setForm({...form,managerId:e.target.value})}><option value="">— None</option>{managerOptions.map(x=><option key={x.id} value={x.id}>{x.name} — {x.position}</option>)}</select></div>
                <div className="field"><label>Schedule</label><select value={form.scheduleId} onChange={e=>setForm({...form,scheduleId:e.target.value})}>{DB.schedules.map(s=><option key={s.id} value={s.id}>{s.name} — {s.type}</option>)}</select></div>
                <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Inactive</option><option>On Leave</option><option>Probation</option></select></div>
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn solid" onClick={save}>{editId?'Save':'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
