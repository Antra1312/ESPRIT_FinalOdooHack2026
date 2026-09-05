import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB, periodLabel, uid, computeSalaryLines, pickContractForPeriod, getStructure, fmtMoney } from '../data/mockData';

export default function Payroll(){
  const nav=useNavigate();
  const [showWizard,setShowWizard]=useState(false);
  const [wizardStep,setWizardStep]=useState(1);
  const [wizardStructure,setWizardStructure]=useState('st_regular');
  const [wizardPeriod,setWizardPeriod]=useState('2026-09');
  const [wizardEmployees,setWizardEmployees]=useState([]);

  const createPayrun=()=>{
    const ids=[...wizardEmployees];
    if(ids.length===0) return alert('Select at least one employee');
    const pr={id:uid('PR'),name:`${periodLabel(wizardPeriod)} — ${getStructure(wizardStructure).name}`,structureId:wizardStructure,period:wizardPeriod,employeeIds:ids,status:'Draft',warnings:[],sent:false,createdDate:wizardPeriod+'-01',payslipIds:[]};
    DB.payruns.push(pr);
    setShowWizard(false);
    nav(`/payroll/${pr.id}`);
  };

  return (
    <div>
      <div className="pageHead"><div><h1>Payroll — Payruns</h1><div className="desc">Two-step wizard: Step 1 picks Structure + Period, Step 2 selects employees. Payrun created only after Step 2.</div></div>
        <button className="btn solid" onClick={()=>{setShowWizard(true); setWizardStep(1); setWizardEmployees([...new Set(DB.contracts.map(c=>c.employeeId))]);}}>+ New Payrun</button>
      </div>
      <div className="card"><div className="tableWrap"><table>
        <thead><tr><th>Payrun</th><th>Period</th><th>Structure</th><th>Status</th><th>Payslips</th></tr></thead>
        <tbody>{DB.payruns.map(p=>(
          <tr key={p.id} className="clickable" onClick={()=>nav(`/payroll/${p.id}`)}>
            <td><b>{p.name}</b></td><td>{periodLabel(p.period)}</td><td>{getStructure(p.structureId)?.name}</td><td><span className={`pill ${p.status==='Paid'?'green':p.status==='Draft'?'gray':p.status==='Computed'?'blue':'amber'}`}>{p.status}</span></td><td>{p.payslipIds?.length ?? 0}</td>
          </tr>
        ))}</tbody>
      </table></div></div>

      {showWizard && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShowWizard(false);}}>
          <div className="modal">
            <div className="modalHead"><h3>New Payrun — Step {wizardStep} of 2</h3><button className="modalClose" onClick={()=>setShowWizard(false)}>×</button></div>
            <div className="modalBody">
              {wizardStep===1 ? (
                <>
                  <div className="field"><label>Salary Structure</label>
                    <select value={wizardStructure} onChange={e=>setWizardStructure(e.target.value)}>
                      {DB.structures.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Period (YYYY-MM)</label><input value={wizardPeriod} onChange={e=>setWizardPeriod(e.target.value)} placeholder="2026-09" /></div>
                </>
              ) : (
                <div>
                  <div className="hint" style={{marginBottom:10}}>Select employees to include in this payrun:</div>
                  <div style={{border:'1px solid var(--border)',borderRadius:8,maxHeight:260,overflowY:'auto'}}>
                    {[...new Set(DB.contracts.map(c=>c.employeeId))].map(empId=>{
                      const emp=DB.employees.find(e=>e.id===empId);
                      const checked=wizardEmployees.includes(empId);
                      return (
                        <label key={empId} style={{display:'flex',gap:9,padding:'9px 12px',borderBottom:'1px solid var(--border)'}}>
                          <input type="checkbox" checked={checked} onChange={e=>{
                            if(e.target.checked) setWizardEmployees(prev=>[...prev,empId]);
                            else setWizardEmployees(prev=>prev.filter(x=>x!==empId));
                          }} />
                          {emp.name} — {emp.dept} {pickContractForPeriod(empId,wizardPeriod)?`· ₹${pickContractForPeriod(empId,wizardPeriod).wage.toLocaleString()}`:'· no contract for period'}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="modalFoot">
              {wizardStep===2 && <button className="btn" onClick={()=>setWizardStep(1)}>Back</button>}
              {wizardStep===1 ? <button className="btn solid" onClick={()=>setWizardStep(2)}>Continue</button> : <button className="btn solid" onClick={createPayrun}>Create Payrun</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
