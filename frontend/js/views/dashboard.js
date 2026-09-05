import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function dashboard(){
  const periods = [...new Set(DB.payruns.map(p=>p.period))].sort();
  const filterPeriod = St.sub.dashPeriod || periods[periods.length-1];
  const filterDept = St.sub.dashDept || 'All';

  const payslipsInPeriod = DB.payslips.filter(p=>p.period===filterPeriod && (filterDept==='All' || getEmp(p.employeeId).dept===filterDept));
  const paidSlips = payslipsInPeriod.filter(p=>p.status==='Paid');
  const totalNet = paidSlips.reduce((s,p)=>s+p.net,0);
  const avgSalary = payslipsInPeriod.length ? Math.round(payslipsInPeriod.reduce((s,p)=>s+p.net,0)/payslipsInPeriod.length) : 0;
  const approvedLeave = DB.requests.filter(r=>r.status==='Approved').length;
  const attRecords = DB.attendance;
  const attHealthy = attRecords.filter(a=>a.status==='Normal').length;
  const attHealth = attRecords.length? Math.round(attHealthy/attRecords.length*100):100;

  const deptTotals = {};
  payslipsInPeriod.forEach(p=>{ const d=getEmp(p.employeeId).dept; deptTotals[d]=(deptTotals[d]||0)+p.net; });
  const maxDept = Math.max(1,...Object.values(deptTotals));

  const trend = periods.map(p=>({p, val: DB.payslips.filter(x=>x.period===p && x.status==='Paid').reduce((s,x)=>s+x.net,0)}));
  const maxTrend = Math.max(1,...trend.map(t=>t.val));

  const allWarnings = [];
  DB.payruns.forEach(pr=>{ if(pr.status!=='Paid' && pr.warnings && pr.warnings.length) allWarnings.push(...pr.warnings.map(w=>({...w, payrun:pr.name}))); });
  // also compute live for draft/computed runs not yet validated
  DB.payruns.forEach(pr=>{ if((pr.status==='Draft')) { /* not computed yet, nothing to warn */ } });

  const statusCounts = {Draft:0,Computed:0,Validated:0,Paid:0};
  DB.payruns.forEach(pr=>statusCounts[pr.status]=(statusCounts[pr.status]||0)+1);

  const pendingReq = DB.requests.filter(r=>r.status==='Pending').length;
  const avgRemaining = Math.round(DB.allocations.filter(a=>a.typeId==='TT1').reduce((s,a)=>s+allocRemaining(a),0)/DB.employees.length);

  body().innerHTML = `
    <div class="pageHead">
      <div><h1>Payroll Dashboard</h1><div class="desc">Live metrics aggregated from Employees, Contracts, Attendance, Time Off and Payroll — not static numbers.</div></div>
    </div>
    <div class="filterBar">
      <select onchange="St.sub.dashPeriod=this.value; App.go('dashboard')">
        ${periods.map(p=>`<option value="${p}" ${p===filterPeriod?'selected':''}>${periodLabel(p)}</option>`).join('')}
      </select>
      <select onchange="St.sub.dashDept=this.value; App.go('dashboard')">
        ${['All','IT','HR','Finance','Sales'].map(d=>`<option value="${d}" ${d===filterDept?'selected':''}>${d==='All'?'All departments':d}</option>`).join('')}
      </select>
    </div>
    <div class="kpiGrid">
      <div class="kpi"><div class="lbl">Total Net Salary Paid</div><div class="val">${fmtMoney(totalNet)}</div><div class="sub">${periodLabel(filterPeriod)}</div></div>
      <div class="kpi"><div class="lbl">Payslips Generated</div><div class="val">${payslipsInPeriod.length}</div><div class="sub">${paidSlips.length} paid</div></div>
      <div class="kpi"><div class="lbl">Average Salary</div><div class="val">${fmtMoney(avgSalary)}</div><div class="sub">net, per employee</div></div>
      <div class="kpi"><div class="lbl">Approved Time Off</div><div class="val">${approvedLeave}</div><div class="sub">${pendingReq} pending review</div></div>
      <div class="kpi"><div class="lbl">Attendance Health</div><div class="val">${attHealth}%</div><div class="sub">on-time check-ins</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="cardHead"><h3>Salary Cost by Department — ${periodLabel(filterPeriod)}</h3></div>
        <div class="cardBody bars">
          ${Object.keys(deptTotals).length? Object.entries(deptTotals).map(([d,v])=>`
            <div class="row"><div>${d}</div><div class="barTrack"><div class="barFill" style="width:${(v/maxDept*100).toFixed(0)}%"></div></div><div>${fmtMoney(v)}</div></div>
          `).join('') : '<div class="emptyState">No payslips computed yet for this period.</div>'}
        </div>
      </div>
      <div class="card">
        <div class="cardHead"><h3>Monthly Net Salary Trend</h3></div>
        <div class="cardBody bars">
          ${trend.map(t=>`<div class="row"><div>${periodLabel(t.p).split(' ')[0]}</div><div class="barTrack"><div class="barFill" style="width:${(t.val/maxTrend*100).toFixed(0)}%"></div></div><div>${fmtMoney(t.val)}</div></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="grid2" style="margin-top:16px;">
      <div class="card">
        <div class="cardHead"><h3>⚠️ Payroll Warnings &amp; Alerts</h3></div>
        <div class="cardBody warnList">
          ${allWarnings.length? allWarnings.slice(0,8).map(w=>`<div class="wItem"><span class="ic">${w.icon}</span><div>${w.message}<div class="hint">${w.payrun}</div></div></div>`).join('')
            : '<div class="emptyState" style="padding:20px;">🎉 No open payroll warnings right now.</div>'}
        </div>
      </div>
      <div class="card">
        <div class="cardHead"><h3>Payslip Status Breakdown</h3></div>
        <div class="cardBody">
          ${Object.entries(statusCounts).map(([k,v])=>`<div class="kv"><span class="k">${k}</span><span class="v">${v} payrun${v===1?'':'s'}</span></div>`).join('')}
          <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
            <div class="kv"><span class="k">Avg. Annual Leave remaining</span><span class="v">${avgRemaining} days</span></div>
            <div class="kv"><span class="k">Attendance records logged</span><span class="v">${attRecords.length}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
};

/* ---------- EMPLOYEES ---------- */
