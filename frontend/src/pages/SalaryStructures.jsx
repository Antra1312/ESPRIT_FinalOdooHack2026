import { useState } from 'react';
import { DB, uid } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function SalaryStructures(){
  const {user}=useAuth();
  const canEdit=['hr_payroll_manager','admin'].includes(user.role);
  const [tick,setTick]=useState(0);
  const [show,setShow]=useState(false);
  const [viewRules,setViewRules]=useState(null);
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
        <thead><tr><th>Name</th><th>Status</th><th>Rules</th><th>Employees using</th><th></th></tr></thead>
        <tbody>{DB.structures.map(s=>{
          const empCount=DB.contracts.filter(c=>c.structureId===s.id).length;
          return <tr key={s.id}><td><b>{s.name}</b></td><td><span className={`pill ${s.status==='Active'?'green':'gray'}`}>{s.status}</span></td><td>{s.ruleIds.length}</td><td>{empCount}</td><td><button className="btn small" onClick={()=>setViewRules(s)}>View rules →</button></td></tr>;
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
            <div className="modalBody" style={{textAlign:'left'}}>
              <div className="field" style={{textAlign:'left'}}><label style={{textAlign:'left'}}>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Regular Salary" /></div>
              <div className="field" style={{textAlign:'left'}}><label style={{textAlign:'left'}}>Include rules</label>
                <div style={{border:'1px solid var(--border)',borderRadius:8,maxHeight:260,overflowY:'auto',textAlign:'left'}}>
                  {DB.rules.map(r=>{
                    const checked=selectedRules.includes(r.id);
                    return <label key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:6,padding:'6px 8px',borderBottom:'1px solid var(--border)',fontSize:13,textAlign:'left',width:'100%',margin:0,lineHeight:1.2}}>
                      <input type="checkbox" checked={checked} style={{margin:0,flexShrink:0,width:14,height:14}} onChange={e=>{
                        if(e.target.checked) setSelectedRules(prev=>[...prev,r.id]);
                        else setSelectedRules(prev=>prev.filter(x=>x!==r.id));
                      }} />
                      <span style={{textAlign:'left',flex:1,padding:0,margin:0}}>[{r.sequence}] {r.name} <span style={{color:'var(--ink-faint)'}}>({r.code} — {r.category})</span></span>
                    </label>;
                  })}
                </div>
                <div className="hint" style={{textAlign:'left'}}>Selected order = execution sequence. In production this is re-orderable via ↑/↓.</div>
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn solid" onClick={create}>Create</button></div>
          </div>
        </div>
      )}
      {viewRules && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setViewRules(null);}}>
          <div className="modal"><div className="modalHead"><h3>{viewRules.name} — Rules ({viewRules.ruleIds.length})</h3><button className="modalClose" onClick={()=>setViewRules(null)}>×</button></div>
            <div className="modalBody" style={{textAlign:'left'}}>
              <div className="tableWrap"><table><thead><tr><th>Seq</th><th>Name</th><th>Code</th><th>Category</th><th>Compute</th></tr></thead>
                <tbody>{viewRules.ruleIds.map(rid=>{
                  const r=DB.rules.find(x=>x.id===rid);
                  if(!r) return null;
                  return <tr key={r.id}><td>{r.sequence}</td><td>{r.name}</td><td><b>{r.code}</b></td><td><span className="pill gray">{r.category}</span></td><td>{r.computeType==='fixed'?`₹${r.amount}`:r.computeType==='percentage'?`${r.amount}% of ${r.baseCode}`:r.formula}</td></tr>;
                })}</tbody></table></div>
              <div className="hint" style={{marginTop:8}}>Only rules linked to this structure — sequence drives computation.</div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setViewRules(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
