import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DB, fmtDate, isContractActive } from '../data/mockData';
import { api, loadBootstrap } from '../api';
import SearchableSelect from '../components/SearchableSelect';

export default function Contracts(){
  const [tick,setTick]=useState(0);
  const [show,setShow]=useState(false);
  const [searchParams]=useSearchParams();
  const filterEmp=searchParams.get('employee');
  const [form,setForm]=useState({employeeId:DB.employees[0]?.id||'',position:'',dept:DB.departments[0]?.name||'',wage:0,structureId:DB.structures[0]?.id||'',startDate:new Date().toISOString().slice(0,10),endDate:''});

  const create=async ()=>{
    if(!form.position) return alert('Position required');
    if(Number(form.wage)<=0) return alert('Wage must be >0');
    try {
      await api.createContract(form);
      await loadBootstrap();
      setShow(false); setTick(x=>x+1);
    } catch (error) { alert(error.message); }
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
      {show && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShow(false);}}>
          <div className="modal"><div className="modalHead"><h3>New Contract</h3><button className="modalClose" onClick={()=>setShow(false)}>×</button></div>
            <div className="modalBody">
              <div className="formGrid">
                <div className="field"><label>Employee</label><SearchableSelect value={form.employeeId} onChange={employeeId=>setForm({...form,employeeId})} options={DB.employees.map(employee=>({value:employee.id,label:`${employee.name} — ${employee.dept}`}))} /></div>
                <div className="field"><label>Position</label><SearchableSelect value={form.position} onChange={position=>setForm({...form,position})} emptyLabel="Select position" options={DB.jobPositions.map(position=>({value:position.title,label:position.title}))} /></div>
                <div className="field"><label>Department</label><SearchableSelect value={form.dept} onChange={dept=>setForm({...form,dept})} emptyLabel="Select department" options={DB.departments.map(department=>({value:department.name,label:department.name}))} /></div>
                <div className="field"><label>Wage</label><input type="number" placeholder="e.g. 50000" value={form.wage} onChange={e=>setForm({...form,wage:e.target.value})} /></div>
                <div className="field"><label>Salary Structure</label><SearchableSelect value={form.structureId} onChange={structureId=>setForm({...form,structureId})} options={DB.structures.map(structure=>({value:structure.id,label:structure.name}))} /></div>
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
