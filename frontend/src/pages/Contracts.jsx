import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DB, fmtDate, isContractActive, uid } from '../data/mockData';

export default function Contracts(){
  const [tick,setTick]=useState(0);
  const [show,setShow]=useState(false);
  const [searchParams]=useSearchParams();
  const filterEmp=searchParams.get('employee');
  const positions=['Software Developer','Senior Developer','Team Lead','Engineering Manager','QA Engineer','DevOps Engineer','HR Executive','HR Manager','Recruiter','Financial Analyst','Sales Executive','Sales Manager','Intern','Product Manager','UX Designer','Business Analyst'];
  const [form,setForm]=useState({employeeId:DB.employees[0]?.id||'',position:'',dept:'IT',wage:50000,structureId:'st_regular',startDate:'2026-09-01',endDate:''});

  const create=()=>{
    if(!form.position) return alert('Position required');
    if(Number(form.wage)<=0) return alert('Wage must be >0');
    DB.contracts.push({id:uid('C'),employeeId:form.employeeId,position:form.position,dept:form.dept,wage:Number(form.wage),structureId:form.structureId,startDate:form.startDate,endDate:form.endDate||null});
    setShow(false); setTick(x=>x+1);
  };

  const filtered=filterEmp?DB.contracts.filter(c=>c.employeeId===filterEmp):DB.contracts;
  const filterName=filterEmp?DB.employees.find(e=>e.id===filterEmp)?.name:null;
  return (
    <div>
      <div className="pageHead"><div><h1>Contracts {filterName?`— ${filterName}`:''}</h1><div className="desc">Historical records — payroll uses only contract applicable to selected period, no concurrent actives. Highlights active. — A2 spec {filterEmp && <><Link to="/contracts" style={{marginLeft:8}}>Clear filter</Link></>}</div></div>
        <button className="btn solid" onClick={()=>setShow(true)}>+ New Contract</button>
      </div>
      <div className="card"><div className="tableWrap"><table>
        <thead><tr><th>Employee</th><th>Position / Dept</th><th>Wage</th><th>Period</th><th>Status</th><th>Structure</th></tr></thead>
        <tbody>{filtered.map(c=>{
          const emp=DB.employees.find(e=>e.id===c.employeeId);
          const active=isContractActive(c);
          return <tr key={c.id} style={active?{background:'#F0FBFA'}:{}}><td>{emp?.name}</td><td>{c.position}<div className="hint">{c.dept}</div></td><td>₹{c.wage.toLocaleString()}</td><td>{fmtDate(c.startDate)} — {c.endDate?fmtDate(c.endDate):'Present'}</td><td><span className={`pill ${active?'green':'gray'}`}>{active?'Active':'Ended'}</span></td><td><span className="pill blue">{DB.structures.find(s=>s.id===c.structureId)?.name}</span></td></tr>;
        })}</tbody>
      </table></div></div>
      <div className="hint" style={{marginTop:8}}>Hardcoded — backend will enforce period overlap checks later.</div>
      {show && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShow(false);}}>
          <div className="modal"><div className="modalHead"><h3>New Contract</h3><button className="modalClose" onClick={()=>setShow(false)}>×</button></div>
            <div className="modalBody">
              <div className="formGrid">
                <div className="field"><label>Employee</label><select value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})}>{DB.employees.map(emp=><option key={emp.id} value={emp.id}>{emp.name} — {emp.dept}</option>)}</select></div>
                <div className="field"><label>Position</label><select value={form.position} onChange={e=>setForm({...form,position:e.target.value})}><option value="">— Select position</option>{positions.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div className="field"><label>Department</label><select value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})}><option>IT</option><option>HR</option><option>Finance</option><option>Sales</option><option>Operations</option><option>Marketing</option><option>Engineering</option><option>Support</option><option>Admin</option></select></div>
                <div className="field"><label>Wage</label><input type="number" placeholder="e.g. 50000" value={form.wage} onChange={e=>setForm({...form,wage:e.target.value})} /></div>
                <div className="field"><label>Salary Structure</label><select value={form.structureId} onChange={e=>setForm({...form,structureId:e.target.value})}>{DB.structures.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="field"><label>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} /></div>
                <div className="field"><label>End Date (leave blank for ongoing)</label><input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} /></div>
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn solid" onClick={create}>Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
