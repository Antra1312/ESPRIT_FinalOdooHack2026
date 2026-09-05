import { useState } from 'react';
import { DB, fmtMoney, periodLabel, allocRemaining } from '../data/mockData';

export default function Dashboard(){
  const periods=[...new Set(DB.payruns.map(p=>p.period))].sort();
  const [period,setPeriod]=useState(periods[periods.length-1]);
  const [dept,setDept]=useState('All');
  const [empType,setEmpType]=useState('All');

  const payslips=DB.payslips.filter(p=>{
    const emp=DB.employees.find(e=>e.id===p.employeeId);
    return p.period===period && (dept==='All' || emp?.dept===dept) && (empType==='All' || emp?.employeeType===empType);
  });
  const paid=payslips.filter(p=>p.status==='Paid');
  const totalNet=paid.reduce((s,p)=>s+p.net,0);
  const avg=payslips.length? Math.round(payslips.reduce((s,p)=>s+p.net,0)/payslips.length):0;
  const approved=DB.requests.filter(r=>r.status==='Approved').length;
  const pending=DB.requests.filter(r=>r.status==='Pending').length;
  const att=DB.attendance;
  const present=att.filter(a=>a.status==='Normal').length;
  const late=att.filter(a=>a.status==='Late').length;
  const missing=att.filter(a=>a.status==='Missing Checkout').length;
  const attHealth = att.length ? Math.round(present/att.length*100) : 100;

  const deptTotals={};
  payslips.forEach(p=>{ const d=DB.employees.find(e=>e.id===p.employeeId)?.dept||'Unknown'; deptTotals[d]=(deptTotals[d]||0)+p.net; });
  const maxDept=Math.max(1,...Object.values(deptTotals));
  const trend=periods.map(p=>({p,val:DB.payslips.filter(x=>x.period===p&&x.status==='Paid').reduce((s,x)=>s+x.net,0)}));
  const maxTrend=Math.max(1,...trend.map(t=>t.val));

  // operational alerts per B9 — compute live from actual records
  const alerts=[];
  DB.payruns.forEach(pr=>{
    if(pr.status!=='Paid' && pr.warnings?.length) alerts.push(...pr.warnings.map(w=>({msg:w.msg,icon:w.icon,src:pr.name})));
  });
  // missing bank / pan / no contract for period — live check for current period
  DB.employees.forEach(emp=>{
    const hasBank=!!emp.bankAccount;
    const hasPan=!!emp.pan;
    if(!hasBank) alerts.push({icon:'🏦',msg:`${emp.name}: missing bank details`,src:'Employee master'});
    if(!hasPan) alerts.push({icon:'⚠️',msg:`${emp.name}: incomplete info (PAN missing)`,src:'Employee master'});
  });
  // duplicate payslips
  const seen=new Set();
  DB.payslips.forEach(ps=>{
    const k=ps.employeeId+'|'+ps.period;
    if(seen.has(k)) alerts.push({icon:'🧾',msg:`${DB.employees.find(e=>e.id===ps.employeeId)?.name}: duplicate payslip for ${periodLabel(ps.period)}`,src:'Payroll'});
    else seen.add(k);
  });
  // contract attention — no contract for period
  if(period){
    DB.employees.forEach(emp=>{
      const hasContract=DB.contracts.some(c=>{
        const s=new Date(c.startDate); const e=c.endDate?new Date(c.endDate):null;
        const [y,m]=period.split('-').map(Number); const ps=new Date(y,m-1,1), pe=new Date(y,m,0);
        return c.employeeId===emp.id && s<=pe && (!e||e>=ps);
      });
      if(!hasContract) alerts.push({icon:'📄',msg:`${emp.name}: no contract covering ${periodLabel(period)}`,src:'Contract attention'});
    });
  }

  // department breakdown — headcount + total salary per B9
  const deptBreakdown={};
  DB.employees.forEach(emp=>{
    const d=emp.dept;
    if(!deptBreakdown[d]) deptBreakdown[d]={count:0,total:0};
    deptBreakdown[d].count+=1;
  });
  payslips.forEach(p=>{
    const d=DB.employees.find(e=>e.id===p.employeeId)?.dept;
    if(deptBreakdown[d]) deptBreakdown[d].total+=p.net;
  });

  const primaryLeaveType=DB.timeoffTypes.find((type)=>type.requiresAllocation);
  const avgRemaining=DB.employees.length
    ? Math.round(DB.allocations.filter(a=>a.typeId===primaryLeaveType?.id).reduce((s,a)=>s+allocRemaining(a),0)/DB.employees.length)
    : 0;

  return (
    <div>
      <div className="pageHead"><div><h1>Payroll Dashboard</h1><div className="desc">Live metrics aggregated from Employees, Contracts, Attendance, Time Off and Payroll — Period/Department/Employee type filters. — B9 spec</div></div></div>
      <div className="filterBar">
        <select value={period} onChange={e=>setPeriod(e.target.value)}>{periods.map(p=><option key={p} value={p}>{periodLabel(p)}</option>)}</select>
        <select value={dept} onChange={e=>setDept(e.target.value)}>{['All','IT','HR','Finance','Sales'].map(d=><option key={d} value={d}>{d==='All'?'All departments':d}</option>)}</select>
        <select value={empType} onChange={e=>setEmpType(e.target.value)}>{['All','Full-time','Contract'].map(t=><option key={t} value={t}>{t==='All'?'All types':t}</option>)}</select>
      </div>
      <div className="kpiGrid">
        <div className="kpi"><div className="lbl">Total Net Salary Paid</div><div className="val">{fmtMoney(totalNet)}</div><div className="sub">{periodLabel(period)}</div></div>
        <div className="kpi"><div className="lbl">Payslips Generated</div><div className="val">{payslips.length}</div><div className="sub">{paid.length} paid</div></div>
        <div className="kpi"><div className="lbl">Average Salary</div><div className="val">{fmtMoney(avg)}</div><div className="sub">net, per employee</div></div>
        <div className="kpi"><div className="lbl">Approved Time Off</div><div className="val">{approved}</div><div className="sub">{pending} pending review</div></div>
        <div className="kpi"><div className="lbl">Attendance Health</div><div className="val">{attHealth}%</div><div className="sub">on-time check-ins</div></div>
      </div>
      <div className="grid2">
        <div className="card"><div className="cardHead"><h3>Salary Cost by Department — {periodLabel(period)}</h3></div>
          <div className="cardBody bars">
            {Object.keys(deptTotals).length ? Object.entries(deptTotals).map(([d,v])=>(
              <div key={d} className="row"><div>{d}</div><div className="barTrack"><div className="barFill" style={{width:(v/maxDept*100).toFixed(0)+'%'}} /></div><div>{fmtMoney(v)}</div></div>
            )) : <div className="emptyState">No payslips for this period.</div>}
          </div>
        </div>
        <div className="card"><div className="cardHead"><h3>Monthly Net Salary Trend</h3></div>
          <div className="cardBody bars">
            {trend.map(t=>(
              <div key={t.p} className="row"><div>{periodLabel(t.p).split(' ')[0]}</div><div className="barTrack"><div className="barFill" style={{width:(t.val/maxTrend*100).toFixed(0)+'%'}} /></div><div>{fmtMoney(t.val)}</div></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid2" style={{marginTop:16}}>
        <div className="card"><div className="cardHead"><h3>⚠️ Operational Alerts</h3></div>
          <div className="cardBody warnList">
            {alerts.length ? alerts.slice(0,8).map((w,i)=><div key={i} className="wItem"><span>{w.icon}</span><span>{w.msg}<div className="hint">{w.src}</div></span></div>) : <div className="emptyState" style={{padding:20}}>🎉 No open warnings — payroll ready.</div>}
          </div>
        </div>
        <div className="card"><div className="cardHead"><h3>Attendance & Time Off Overview</h3></div>
          <div className="cardBody">
            <div className="kv"><span className="k">Present</span><span className="v">{present}</span></div>
            <div className="kv"><span className="k">Late</span><span className="v">{late}</span></div>
            <div className="kv"><span className="k">Missing check-outs</span><span className="v">{missing}</span></div>
            <div className="kv"><span className="k">Approved days</span><span className="v">{DB.requests.filter(r=>r.status==='Approved').reduce((s,r)=>s+r.duration,0)}</span></div>
            <div className="kv"><span className="k">Pending requests</span><span className="v">{pending}</span></div>
            <div className="kv"><span className="k">Avg. Annual Leave remaining</span><span className="v">{avgRemaining} days</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}><div className="cardHead"><h3>Department Breakdown — Headcount + Salary</h3></div>
        <div className="tableWrap"><table>
          <thead><tr><th>Department</th><th>Headcount</th><th>Total Net (filtered period)</th></tr></thead>
          <tbody>{Object.entries(deptBreakdown).map(([d,v])=>(
            <tr key={d}><td>{d}</td><td>{v.count}</td><td>{fmtMoney(v.total)}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
