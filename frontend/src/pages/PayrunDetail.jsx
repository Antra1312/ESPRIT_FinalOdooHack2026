import { useParams, useNavigate } from 'react-router-dom';
import { DB, periodLabel, fmtMoney, computeSalaryLines, getStructure, uid } from '../data/mockData';
import { useState } from 'react';
import { api, loadBootstrap } from '../api';

export default function PayrunDetail(){
  const {id}=useParams();
  const nav=useNavigate();
  const pr=DB.payruns.find(p=>p.id===id);
  const [tick,setTick]=useState(0);
  const [emailSummary,setEmailSummary]=useState('');
  if(!pr) return <div>Not found</div>;
  const structure=getStructure(pr.structureId);

  const compute=async ()=>{
    if (pr.id.length > 20) {
      try {
        await api.computePayrun(pr.id);
        await loadBootstrap();
        setTick(x=>x+1);
      } catch (error) {
        alert(error.message);
      }
      return;
    }
    const struct=getStructure(pr.structureId);
    pr.payslipIds=[];
    // remove old payslips for this payrun
    DB.payslips=DB.payslips.filter(p=>p.payrunId!==pr.id);
    pr.employeeIds.forEach(empId=>{
      const c=DB.contracts.filter(x=>x.employeeId===empId).find(x=>{
        const [y,m]=pr.period.split('-').map(Number);
        const ps=new Date(y,m-1,1), pe=new Date(y,m,0);
        const s=new Date(x.startDate), e=x.endDate?new Date(x.endDate):null;
        return s<=pe && (!e||e>=ps);
      });
      let lines=[];
      if(c) lines=computeSalaryLines(c, struct);
      const gross=(lines.find(l=>l.category==='Gross')||{}).amount||0;
      const ded=lines.filter(l=>l.category==='Deductions').reduce((s,l)=>s+l.amount,0);
      const net=(lines.find(l=>l.category==='Net')||{}).amount|| (gross-ded);
      const ps={id:uid('PS'),payrunId:pr.id,employeeId:empId,period:pr.period,contractId:c?.id||null,structureId:struct.id,lines,gross,deductions:ded,net,status:'Computed',sent:false};
      DB.payslips.push(ps); pr.payslipIds.push(ps.id);
    });
    pr.status='Computed';
    setTick(x=>x+1);
  };

  const validate=async ()=>{
    if (pr.id.length > 20) {
      try {
        await api.validatePayrun(pr.id);
        await loadBootstrap();
        setTick(x=>x+1);
      } catch (error) {
        alert(error.message);
      }
      return;
    }
    const warnings=[];
    (pr.payslipIds||[]).forEach(pid=>{
      const ps=DB.payslips.find(p=>p.id===pid); const emp=DB.employees.find(e=>e.id===ps.employeeId);
      if(!emp.bankAccount) warnings.push({icon:'🏦',msg:`${emp.name}: missing bank account`});
      if(!emp.pan) warnings.push({icon:'⚠️',msg:`${emp.name}: missing PAN`});
      if(!ps.contractId) warnings.push({icon:'📄',msg:`${emp.name}: no contract for ${periodLabel(ps.period)}`});
      const dup=DB.payslips.find(p=>p.id!==ps.id && p.employeeId===ps.employeeId && p.period===ps.period);
      if(dup) warnings.push({icon:'🧾',msg:`${emp.name}: duplicate payslip for ${periodLabel(ps.period)}`});
    });
    pr.warnings=warnings;
    pr.status='Validated';
    (pr.payslipIds||[]).forEach(pid=>{ const p=DB.payslips.find(x=>x.id===pid); if(p) p.status='Validated'; });
    setTick(x=>x+1);
  };

  const markPaid=async ()=>{
    if (pr.id.length > 20) {
      try {
        await api.payPayrun(pr.id);
        await loadBootstrap();
        setTick(x=>x+1);
      } catch (error) {
        alert(error.message);
      }
      return;
    }
    if(pr.warnings?.length && !confirm(`${pr.warnings.length} warning(s) found. Mark as paid anyway?`)) return;
    pr.status='Paid';
    (pr.payslipIds||[]).forEach(pid=>{ const p=DB.payslips.find(x=>x.id===pid); if(p) p.status='Paid'; });
    setTick(x=>x+1);
  };
  const send=async ()=>{
    if (pr.id.length > 20) {
      if (!['Validated','Paid'].includes(pr.status)) return alert('Validate or mark this payrun as paid before emailing payslips.');
      if (!window.confirm(`Send ${payslips.length} payslip email(s) for ${pr.name}?`)) return;
      try {
        const result=await api.sendPayrun(pr.id);
        pr.sent=true;
        setEmailSummary(result.message || 'Payslip emails sent.');
        setTick(x=>x+1);
      } catch (error) {
        setEmailSummary(`Email delivery failed: ${error.message}`);
      }
      return;
    }
    (pr.payslipIds||[]).forEach(pid=>{ const p=DB.payslips.find(x=>x.id===pid); if(p) p.sent=true; });
    pr.sent=true; setTick(x=>x+1);
  };

  const payslips=(pr.payslipIds||[]).map(pid=>DB.payslips.find(p=>p.id===pid)).filter(Boolean);

  return (
    <div>
      <div className="breadcrumb"><a onClick={()=>nav('/payroll')} style={{cursor:'pointer'}}>Payroll</a> / {pr.name}</div>
      <div className="pageHead"><div><h1>{pr.name}</h1><div className="desc">{periodLabel(pr.period)} · {structure.name} · {pr.status}</div></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn solid" onClick={compute} disabled={pr.status==='Paid'}>Compute</button>
          <button className="btn" onClick={validate} disabled={pr.status==='Draft' || pr.status==='Paid'}>Validate</button>
          <button className="btn" onClick={markPaid} disabled={pr.status!=='Validated'}>Mark Paid</button>
          <button className="btn accent" onClick={send} disabled={!payslips.length || !['Validated','Paid'].includes(pr.status)}>Send {payslips.length || ''} Payslips by Email</button>
        </div>
      </div>

      {emailSummary && <div className="card" style={{marginBottom:16}}><div className="cardBody">{emailSummary}</div></div>}

      {pr.warnings?.length>0 && (
        <div className="card" style={{marginBottom:16,borderColor:'#F2C9CB'}}>
          <div className="cardHead"><h3>⚠️ Warnings</h3></div>
          <div className="cardBody warnList">
            {pr.warnings.map((w,i)=><div key={i} className="wItem"><span>{w.icon}</span><span>{w.msg}</span></div>)}
          </div>
        </div>
      )}

      <div className="card"><div className="cardHead"><h3>Payslips ({payslips.length})</h3></div>
        <div className="tableWrap"><table>
          <thead><tr><th>Employee</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th><th>Sent</th></tr></thead>
          <tbody>{payslips.length? payslips.map(ps=>{
            const emp=DB.employees.find(e=>e.id===ps.employeeId);
            return <tr key={ps.id} className="clickable" onClick={()=>nav(`/payslips/${ps.id}`)}>
              <td>{emp?.name}</td><td>{fmtMoney(ps.gross)}</td><td>{fmtMoney(ps.deductions)}</td><td><b>{fmtMoney(ps.net)}</b></td><td><span className={`pill ${ps.status==='Paid'?'green':ps.status==='Computed'?'blue':'amber'}`}>{ps.status}</span></td><td>{ps.sent?'✓':''}</td>
            </tr>;
          }) : <tr><td colSpan={6} style={{textAlign:'center',padding:20}}>No payslips — click Compute</td></tr>}</tbody>
        </table></div>
      </div>
    </div>
  );
}
