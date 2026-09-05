import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { DB, fmtDate, allocRemaining, uid } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function TimeOff(){
  const {user}=useAuth();
  const canManage=['hr_manager','hr_payroll_user','hr_payroll_manager','admin'].includes(user.role);
  const [tab,setTab]=useState('requests');
  const [tick,setTick]=useState(0);
  const [showReq,setShowReq]=useState(false);
  const [showAlloc,setShowAlloc]=useState(false);
  const [showType,setShowType]=useState(false);
  const [reqForm,setReqForm]=useState({employeeId:DB.employees[0]?.id||'',typeId:DB.timeoffTypes[0]?.id||'',from:'',to:'',duration:1,reason:''});
  const [allocForm,setAllocForm]=useState({employeeId:DB.employees[0]?.id||'',typeId:DB.timeoffTypes[0]?.id||'',allocated:0});
  const [typeForm,setTypeForm]=useState({name:'',unit:'days',requiresAllocation:true});

  const createReq=()=>{
    if(!reqForm.from||!reqForm.to) return alert('Dates required');
    DB.requests.push({id:uid('RQ'),employeeId:reqForm.employeeId,typeId:reqForm.typeId,from:reqForm.from,to:reqForm.to,duration:Number(reqForm.duration),status:'Pending',reason:reqForm.reason});
    setShowReq(false); setTick(x=>x+1);
  };
  const createAlloc=()=>{
    DB.allocations.push({id:uid('AL'),employeeId:allocForm.employeeId,typeId:allocForm.typeId,allocated:Number(allocForm.allocated),used:0,validFrom:'2026-01-01',validTo:'2026-12-31',status:'Approved'});
    setShowAlloc(false); setTick(x=>x+1);
  };
  const createType=()=>{
    if(!typeForm.name) return alert('Name required');
    DB.timeoffTypes.push({id:uid('TT'),name:typeForm.name,unit:typeForm.unit,requiresAllocation:typeForm.requiresAllocation,approvalRequired:true,payrollIntegration:true,color:'#94A0B8'});
    setShowType(false); setTick(x=>x+1);
  };
  const [searchParams]=useSearchParams();
  const filterEmp=searchParams.get('employee');
  const filterName=filterEmp?DB.employees.find(e=>e.id===filterEmp)?.name:null;
  const reqList=filterEmp?DB.requests.filter(r=>r.employeeId===filterEmp):DB.requests;
  const allocList=filterEmp?DB.allocations.filter(a=>a.employeeId===filterEmp):DB.allocations;

  return (
    <div>
      <div className="pageHead"><div><h1>Time Off {filterName?`— ${filterName}`:''}</h1><div className="desc">Main nav → Requests, Allocations, Types. Approved requests deduct. — A4/B4 spec (hardcoded) {filterEmp && <><Link to="/timeoff" style={{marginLeft:8}}>Clear filter</Link></>}</div></div>
        {tab==='requests' && <button className="btn solid" onClick={()=>setShowReq(true)}>+ New Request</button>}
        {tab==='allocations' && canManage && <button className="btn solid" onClick={()=>setShowAlloc(true)}>+ New Allocation</button>}
        {tab==='types' && canManage && <button className="btn solid" onClick={()=>setShowType(true)}>+ New Type</button>}
      </div>
      <div className="tabs">
        <button className={`tabbtn ${tab==='requests'?'active':''}`} onClick={()=>setTab('requests')}>Requests</button>
        <button className={`tabbtn ${tab==='allocations'?'active':''}`} onClick={()=>setTab('allocations')}>Allocations</button>
        <button className={`tabbtn ${tab==='types'?'active':''}`} onClick={()=>setTab('types')}>Types</button>
      </div>
      {tab==='requests' && (
        <div className="card"><div className="tableWrap"><table>
          <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>{reqList.map(r=>{
            const emp=DB.employees.find(e=>e.id===r.employeeId);
            const t=DB.timeoffTypes.find(x=>x.id===r.typeId);
            return <tr key={r.id}><td>{emp?.name}</td><td><span className="pill gray">{t?.name}</span></td><td>{fmtDate(r.from)} → {fmtDate(r.to)}</td><td>{r.duration}</td><td><span className={`pill ${r.status==='Approved'?'green':r.status==='Pending'?'amber':'red'}`}>{r.status}</span></td>
              <td style={{display:'flex',gap:6}}>
                {r.status==='Pending' && canManage && <>
                  <button className="btn small solid" onClick={()=>{r.status='Approved'; const alloc=DB.allocations.find(a=>a.employeeId===r.employeeId && a.typeId===r.typeId); if(alloc) alloc.used += r.duration; setTick(x=>x+1);}}>Approve</button>
                  <button className="btn small" onClick={()=>{r.status='Rejected'; setTick(x=>x+1);}}>Reject</button>
                </>}
                {!canManage && r.status==='Pending' && <span className="hint">awaiting approval</span>}
              </td></tr>;
          })}</tbody>
        </table></div></div>
      )}
      {tab==='allocations' && (
        <div className="card"><div className="tableWrap"><table>
          <thead><tr><th>Employee</th><th>Type</th><th>Allocated</th><th>Used</th><th>Remaining</th><th>Validity</th></tr></thead>
          <tbody>{allocList.map(a=>{
            const emp=DB.employees.find(e=>e.id===a.employeeId);
            const t=DB.timeoffTypes.find(x=>x.id===a.typeId);
            return <tr key={a.id}><td>{emp?.name}</td><td>{t?.name}</td><td>{a.allocated}</td><td>{a.used}</td><td><b>{allocRemaining(a)}</b></td><td className="hint">{a.validFrom} → {a.validTo}</td></tr>;
          })}</tbody>
        </table></div></div>
      )}
      {tab==='types' && (
        <div className="card"><div className="tableWrap"><table>
          <thead><tr><th>Name</th><th>Unit</th><th>Requires Allocation</th><th>Payroll Integration</th></tr></thead>
          <tbody>{DB.timeoffTypes.map(t=>(
            <tr key={t.id}><td>{t.name}</td><td>{t.unit}</td><td>{t.requiresAllocation?'Yes':'No'}</td><td>{t.payrollIntegration?'Yes':'No'}</td></tr>
          ))}</tbody>
        </table></div></div>
      )}
      {showReq && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShowReq(false);}}>
          <div className="modal"><div className="modalHead"><h3>New Time Off Request</h3><button className="modalClose" onClick={()=>setShowReq(false)}>×</button></div>
            <div className="modalBody">
              <div className="formGrid">
                <div className="field"><label>Employee</label><select value={reqForm.employeeId} onChange={e=>setReqForm({...reqForm,employeeId:e.target.value})}>{DB.employees.map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div>
                <div className="field"><label>Type</label><select value={reqForm.typeId} onChange={e=>setReqForm({...reqForm,typeId:e.target.value})}>{DB.timeoffTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div className="field"><label>From</label><input type="date" value={reqForm.from} onChange={e=>setReqForm({...reqForm,from:e.target.value})} /></div>
                <div className="field"><label>To</label><input type="date" value={reqForm.to} onChange={e=>setReqForm({...reqForm,to:e.target.value})} /></div>
                <div className="field"><label>Duration</label><input type="number" value={reqForm.duration} onChange={e=>setReqForm({...reqForm,duration:e.target.value})} /></div>
                <div className="field full"><label>Reason</label><input value={reqForm.reason} onChange={e=>setReqForm({...reqForm,reason:e.target.value})} /></div>
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShowReq(false)}>Cancel</button><button className="btn solid" onClick={createReq}>Create</button></div>
          </div>
        </div>
      )}
      {showAlloc && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShowAlloc(false);}}>
          <div className="modal"><div className="modalHead"><h3>New Allocation</h3><button className="modalClose" onClick={()=>setShowAlloc(false)}>×</button></div>
            <div className="modalBody">
              <div className="formGrid">
                <div className="field"><label>Employee</label><select value={allocForm.employeeId} onChange={e=>setAllocForm({...allocForm,employeeId:e.target.value})}>{DB.employees.map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div>
                <div className="field"><label>Type</label><select value={allocForm.typeId} onChange={e=>setAllocForm({...allocForm,typeId:e.target.value})}>{DB.timeoffTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div className="field"><label>Allocated days</label><input type="number" value={allocForm.allocated} onChange={e=>setAllocForm({...allocForm,allocated:e.target.value})} /></div>
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShowAlloc(false)}>Cancel</button><button className="btn solid" onClick={createAlloc}>Create</button></div>
          </div>
        </div>
      )}
      {showType && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShowType(false);}}>
          <div className="modal"><div className="modalHead"><h3>New Time Off Type</h3><button className="modalClose" onClick={()=>setShowType(false)}>×</button></div>
            <div className="modalBody">
              <div className="field"><label>Name</label><input value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})} /></div>
              <div className="field"><label>Unit</label><select value={typeForm.unit} onChange={e=>setTypeForm({...typeForm,unit:e.target.value})}><option>days</option><option>hours</option></select></div>
              <div className="field"><label><input type="checkbox" checked={typeForm.requiresAllocation} onChange={e=>setTypeForm({...typeForm,requiresAllocation:e.target.checked})} /> Requires allocation</label></div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShowType(false)}>Cancel</button><button className="btn solid" onClick={createType}>Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
