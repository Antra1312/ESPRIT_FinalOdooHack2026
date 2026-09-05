import { useState } from 'react';
import { DB, uid } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function SalaryRules(){
  const {user}=useAuth();
  const canEdit=['hr_payroll_manager','admin'].includes(user.role);
  const [tick,setTick]=useState(0);
  const [show,setShow]=useState(false);
  const [form,setForm]=useState({name:'',code:'',category:'Basic',computeType:'fixed',baseCode:'',amount:0,sequence:10,formula:''});

  const create=()=>{
    if(!form.name||!form.code) return alert('Name and Code required');
    DB.rules.push({id:uid('R'),...form,code:form.code.toUpperCase()});
    // keep sorted by sequence for compute order
    DB.rules.sort((a,b)=>a.sequence-b.sequence);
    setShow(false); setForm({name:'',code:'',category:'Basic',computeType:'fixed',baseCode:'',amount:0,sequence:10,formula:''}); setTick(x=>x+1);
  };

  return (
    <div>
      <div className="pageHead"><div><h1>Salary Rules</h1><div className="desc">Define how earnings/deductions are calculated — Name, Code, Category, Sequence. Categories: Basic, Allowances, Gross, Deductions, Net. Sequence respects dependencies. Computation: fixed, percentage, formula. — A6 spec</div></div>
        {canEdit ? <button className="btn solid" onClick={()=>setShow(true)}>+ New Rule</button> : <span className="pill amber">Read-only — HR Payroll Manager / Admin can edit</span>}
      </div>
      <div className="card"><div className="tableWrap"><table>
        <thead><tr><th>Seq</th><th>Name</th><th>Code</th><th>Category</th><th>Compute</th><th>Value</th></tr></thead>
        <tbody>{[...DB.rules].sort((a,b)=>a.sequence-b.sequence).map(r=>(
          <tr key={r.id}><td>{r.sequence}</td><td>{r.name}</td><td><b>{r.code}</b></td><td><span className="pill gray">{r.category}</span></td><td>{r.computeType}{r.computeType==='percentage'?` of ${r.baseCode}`:r.computeType==='formula'?` ${r.formula}`:''}</td><td>{r.computeType==='fixed'?`₹${r.amount}`:r.computeType==='percentage'?`${r.amount}%`:`${r.formula}`}</td></tr>
        ))}</tbody>
      </table></div></div>

      <div className="card" style={{marginTop:16}}><div className="cardHead"><h3>Computation methods</h3></div>
        <div className="cardBody" style={{fontSize:13,color:'var(--ink-dim)'}}>
          <b>Fixed</b> — constant amount. <b>Percentage</b> — % of another code (e.g. HRA 20% of BASIC). <b>Formula</b> — <code>{'{CODE}'}</code> syntax, e.g. <code>{'{GROSS}-{PF}-{TAX}'}</code> for Net. Rules run in <b>sequence order</b> so later formulas can reference earlier results.
        </div>
      </div>

      {show && (
        <div className="modalOverlay" onMouseDown={e=>{if(e.target===e.currentTarget) setShow(false);}}>
          <div className="modal">
            <div className="modalHead"><h3>New Salary Rule</h3><button className="modalClose" onClick={()=>setShow(false)}>×</button></div>
            <div className="modalBody">
              <div className="formGrid">
                <div className="field"><label>Name</label><input placeholder="e.g. House Rent Allowance" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div className="field"><label>Code</label><input placeholder="e.g. HRA" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} /></div>
                <div className="field"><label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Basic</option><option>Allowances</option><option>Gross</option><option>Deductions</option><option>Net</option></select></div>
                <div className="field"><label>Sequence</label><input type="number" placeholder="e.g. 10" value={form.sequence} onChange={e=>setForm({...form,sequence:Number(e.target.value)})} /></div>
                <div className="field"><label>Compute type</label><select value={form.computeType} onChange={e=>setForm({...form,computeType:e.target.value})}><option value="fixed">Fixed amount</option><option value="percentage">Percentage</option><option value="formula">Formula</option></select></div>
                <div className="field"><label>Amount / %</label><input type="number" placeholder="e.g. 2000 or 20" value={form.amount} onChange={e=>setForm({...form,amount:Number(e.target.value)})} /></div>
                {form.computeType==='percentage' && <div className="field"><label>Base code</label><input placeholder="e.g. BASIC" value={form.baseCode} onChange={e=>setForm({...form,baseCode:e.target.value.toUpperCase()})} /></div>}
                {form.computeType==='formula' && <div className="field full"><label>Formula (use {'{CODE}'})</label><input placeholder="e.g. {GROSS}-{PF}-{TAX}" value={form.formula} onChange={e=>setForm({...form,formula:e.target.value})} /></div>}
              </div>
            </div>
            <div className="modalFoot"><button className="btn" onClick={()=>setShow(false)}>Cancel</button><button className="btn solid" onClick={create}>Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
