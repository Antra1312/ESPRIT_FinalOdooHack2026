import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DB, uid } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function SalaryStructures(){
  const {user}=useAuth();
  const canEdit=['hr_payroll_manager','admin'].includes(user.role);
  const [tick,setTick]=useState(0);
  const [show,setShow]=useState(false);
  const [name,setName]=useState('');
  const [selectedRules,setSelectedRules]=useState([]);

  const create=()=>{
    if(!name.trim()) return alert('Name required');
    DB.structures.push({id:uid('ST'),name,status:'Active',ruleIds:[...selectedRules]});
    setShow(false); setName(''); setSelectedRules([]); setTick(x=>x+1);
  };

  return (
    <div>
      <div className="pageHead"><div><h1>Salary Structures</h1><div className="desc">Containers for organized collections of Salary Rules — e.g. “Regular Salary”. Selected structure on a Payrun dictates rules applied. — A5 spec</div></div>
        {canEdit && <button className="btn solid" onClick={()=>setShow(true)}>+ New Structure</button>}
        {!canEdit && <span className="pill amber">Read-only — HR Payroll Manager / Admin can edit</span>}
      </div>
      <div className="card"><div className="tableWrap"><table>
        <thead><tr><th>Name</th><th>Status</th><th>Rules</th><th>Employees using</th><th>Sequence</th></tr></thead>
        <tbody>{DB.structures.map(s=>{
          const empCount=DB.contracts.filter(c=>c.structureId===s.id).length;
          return <tr key={s.id}><td><b>{s.name}</b></td><td><span className={`pill ${s.status==='Active'?'green':'gray'}`}>{s.status}</span></td><td>{s.ruleIds.length}</td><td>{empCount}</td><td><Link to="/salary-rules" style={{fontWeight:600}}>View rules →</Link></td></tr>;
        })}</tbody>
      </table></div></div>

      <div className="card" style={{marginTop:16}}><div className="cardHead"><h3>How it works</h3></div>
        <div className="cardBody" style={{fontSize:13,color:'var(--ink-dim)'}}>
          List shows number of rules, employees, active status. Form manages included rules and execution sequence. Payrun’s selected structure drives payslip calculation — <b>rules are processed in sequence</b> so totals build on earlier calculations. Categories: Basic, Allowances, Gross, Deductions, Net.
        </div>
      </div>

      {show && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShow(false);}}>
          <div className="modal">
            <div className="modalHead"><h3>New Salary Structure</h3><button className="modalClose" onClick={()=>setShow(false)}>×</button></div>
            <div className="modalBody">
              <div className="field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Regular Salary" /></div>
              <div className="field"><label>Include rules (sequence matters — drag via order)</label>
                <div style={{border:'1px solid var(--border)',borderRadius:8,maxHeight:260,overflowY:'auto'}}>
                  {DB.rules.map(r=>{
                    const checked=selectedRules.includes(r.id);
                    return <label key={r.id} style={{display:'flex',gap:8,padding:'8px 12px',borderBottom:'1px solid var(--border)',fontSize:13}}>
                      <input type="checkbox" checked={checked} onChange={e=>{
                        if(e.target.checked) setSelectedRules(prev=>[...prev,r.id]);
                        else setSelectedRules(prev=>prev.filter(x=>x!==r.id));
                      }} />
                      <span>[{r.sequence}] {r.name} <span style={{color:'var(--ink-faint)'}}>({r.code} — {r.category})</span></span>
                    </label>;
                  })}
                </div>
                <div className="hint">Selected order = execution sequence. In production this is re-orderable via ↑/↓.</div>
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn solid" onClick={create}>Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
