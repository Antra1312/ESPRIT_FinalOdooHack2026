import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function payroll(){
  const tab = St.sub.payTab || 'payruns';
  body().innerHTML = `
    <div class="pageHead"><div><h1>Payroll</h1><div class="desc">Run payroll in two steps, review warnings, then validate and mark paid.</div></div></div>
    <div class="tabs">
      <button class="tabbtn ${tab==='payruns'?'active':''}" onclick="St.sub.payTab='payruns'; App.go('payroll')">Payruns</button>
      <button class="tabbtn ${tab==='payslips'?'active':''}" onclick="St.sub.payTab='payslips'; App.go('payroll')">Payslips</button>
      <button class="tabbtn ${tab==='structures'?'active':''}" onclick="St.sub.payTab='structures'; App.go('payroll')">Salary Structures</button>
      <button class="tabbtn ${tab==='rules'?'active':''}" onclick="St.sub.payTab='rules'; App.go('payroll')">Salary Rules</button>
    </div>
    <div id="payBody"></div>
  `;
  const pb = document.getElementById('payBody');
  if(tab==='payruns') return renderPayrunsList(pb);
  if(tab==='payslips') return renderPayslipsList(pb);
  if(tab==='structures') return renderStructures(pb);
  if(tab==='rules') return renderRules(pb);
};

function payStatusPill(s){ const map={Draft:'gray',Computed:'blue',Validated:'amber',Paid:'green'}; return `<span class="pill ${map[s]||'gray'}">${s}</span>`; }

function renderPayrunsList(pb){
  const list = [...DB.payruns].sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate));
  pb.innerHTML = `<div class="pageHead" style="margin-bottom:10px;"><div></div>${isPayroll()?`<button class="btn solid" onclick="Wizard.open()">+ New Payrun</button>`:''}</div>
  <div class="card"><div class="tableWrap"><table>
    <thead><tr><th>Payrun</th><th>Structure</th><th>Period</th><th>Employees</th><th>Status</th><th>Warnings</th><th></th></tr></thead>
    <tbody>${list.map(p=>`<tr class="clickable" onclick="App.go('payrun-detail',{id:'${p.id}'})">
      <td><b>${p.name}</b></td><td>${getStructure(p.structureId).name}</td><td>${periodLabel(p.period)}</td><td>${p.employeeIds.length}</td>
      <td>${payStatusPill(p.status)}</td><td>${p.status==='Paid'?'—':(p.warnings&&p.warnings.length?`<span class="pill red">${p.warnings.length}</span>`:(p.status==='Validated'?'<span class="pill green">0</span>':'—'))}</td>
      <td style="text-align:right;"><span class="btn small">Open →</span></td></tr>`).join('') || `<tr><td colspan="7" class="hint">No payruns yet.</td></tr>`}
    </tbody></table></div></div>`;
}

Views['payrun-detail'] = function(params){
  const payrun = getPayrun(params.id); if(!payrun) return App.go('payroll');
  const slips = (payrun.payslipIds||[]).map(getPayslip);
  const structure = getStructure(payrun.structureId);
  body().innerHTML = `
    <div class="breadcrumb"><a href="#" onclick="St.sub.payTab='payruns'; App.go('payroll'); return false;">Payroll</a> / ${payrun.name}</div>
    <div class="pageHead">
      <div><h1>${payrun.name}</h1><div class="desc">${structure.name} · ${periodLabel(payrun.period)} · ${payrun.employeeIds.length} employees</div></div>
      <div>${payStatusPill(payrun.status)}</div>
    </div>
    <div class="filterBar">
      ${isPayroll() && payrun.status==='Draft' ? `<button class="btn solid" onclick="App.doCompute('${payrun.id}')">Compute</button>`:''}
      ${isPayroll() && payrun.status==='Computed' ? `<button class="btn solid" onclick="App.doValidate('${payrun.id}')">Validate</button>`:''}
      ${isPayroll() && payrun.status==='Validated' ? `<button class="btn accent" onclick="App.doMarkPaid('${payrun.id}')">Mark Paid</button>`:''}
      ${isPayroll() && (payrun.status==='Computed'||payrun.status==='Validated'||payrun.status==='Paid') ? `<button class="btn" onclick="App.doSend('${payrun.id}')">${payrun.sent?'Re-send Payslips':'Send Payslips'}</button>`:''}
    </div>
    ${(payrun.warnings && payrun.warnings.length && payrun.status!=='Paid') ? `
      <div class="card" style="margin-bottom:16px;border-color:#F2C9CB;">
        <div class="cardHead"><h3>⚠️ ${payrun.warnings.length} warning(s) found — review before marking paid</h3></div>
        <div class="cardBody warnList">${payrun.warnings.map(w=>`<div class="wItem"><span class="ic">${w.icon}</span><div>${w.message}</div></div>`).join('')}</div>
      </div>` : ''}
    <div class="card"><div class="cardHead"><h3>Payslips</h3></div><div class="tableWrap"><table>
      <thead><tr><th>Employee</th><th>Contract used</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th><th></th></tr></thead>
      <tbody>${slips.length? slips.map(s=>{ const e=getEmp(s.employeeId); const c=s.contractId?DB.contracts.find(x=>x.id===s.contractId):null;
        return `<tr><td>${e.name}</td><td>${c?c.position+' ('+fmtDate(c.startDate)+(c.endDate?'–'+fmtDate(c.endDate):'–ongoing')+')':'<span class="pill red">No contract</span>'}</td>
        <td>${fmtMoney(s.gross)}</td><td>${fmtMoney(s.deductions)}</td><td><b>${fmtMoney(s.net)}</b></td><td>${payStatusPill(s.status)}</td>
        <td style="text-align:right;"><button class="btn small" onclick="App.go('payslip-detail',{id:'${s.id}'})">View</button></td></tr>`;
      }).join('') : `<tr><td colspan="7" class="hint">Not computed yet — click Compute to generate payslips for the selected employees.</td></tr>`}</tbody>
    </table></div></div>
  `;
};

App.doCompute = function(id){ computePayrun(id); toast('Payslips computed for all selected employees', 'ok'); App.go('payrun-detail',{id}); };
App.doValidate = function(id){ validatePayrun(id); const w = getPayrun(id).warnings.length; toast(w? w+' warning(s) found — review below' : 'Validated — no issues found', w?'warn':'ok'); App.go('payrun-detail',{id}); };
App.doMarkPaid = function(id){ if(markPayrunPaid(id)){ toast('Payrun marked as paid', 'ok'); } App.go('payrun-detail',{id}); };
App.doSend = function(id){ sendPayslips(id); toast('Payslips emailed to '+getPayrun(id).payslipIds.length+' employees (simulated)', 'ok'); App.go('payrun-detail',{id}); };

function renderPayslipsList(pb){
  const filterPeriod = St.sub.psPeriod || 'All';
  const periods = [...new Set(DB.payslips.map(p=>p.period))].sort();
  const list = DB.payslips.filter(p=> filterPeriod==='All'||p.period===filterPeriod).sort((a,b)=>b.period.localeCompare(a.period));
  pb.innerHTML = `<div class="filterBar"><select onchange="St.sub.psPeriod=this.value; App.go('payroll')">
    <option value="All">All periods</option>${periods.map(p=>`<option value="${p}" ${filterPeriod===p?'selected':''}>${periodLabel(p)}</option>`).join('')}
  </select></div>
  <div class="card"><div class="tableWrap"><table>
    <thead><tr><th>Employee</th><th>Period</th><th>Structure</th><th>Gross</th><th>Net</th><th>Status</th><th>Emailed</th><th></th></tr></thead>
    <tbody>${list.map(s=>`<tr class="clickable" onclick="App.go('payslip-detail',{id:'${s.id}'})"><td>${getEmp(s.employeeId).name}</td><td>${periodLabel(s.period)}</td>
      <td>${getStructure(s.structureId).name}</td><td>${fmtMoney(s.gross)}</td><td><b>${fmtMoney(s.net)}</b></td><td>${payStatusPill(s.status)}</td>
      <td>${s.sent?'✅ '+fmtDate(s.sentDate):'—'}</td><td style="text-align:right;"><span class="btn small">View →</span></td></tr>`).join('') || `<tr><td colspan="8" class="hint">No payslips yet.</td></tr>`}
    </tbody></table></div></div>`;
}

Views['payslip-detail'] = function(params){
  const ps = getPayslip(params.id); if(!ps) return App.go('payroll');
  const e = getEmp(ps.employeeId);
  const c = ps.contractId ? DB.contracts.find(x=>x.id===ps.contractId) : null;
  const earnings = ps.lines.filter(l=>l.category==='Basic'||l.category==='Allowance');
  const deductions = ps.lines.filter(l=>l.category==='Deduction');
  body().innerHTML = `
    <div class="breadcrumb"><a href="#" onclick="App.go('payrun-detail',{id:'${ps.payrunId}'});return false;">${getPayrun(ps.payrunId).name}</a> / Payslip</div>
    <div class="pageHead"><div><h1>Payslip — ${e.name}</h1><div class="desc">${periodLabel(ps.period)} · ${getStructure(ps.structureId).name} · ${payStatusPill(ps.status)}</div></div>
      <button class="btn solid" onclick="App.printPayslip('${ps.id}')">🖨️ Print / Save PDF</button>
    </div>
    <div class="grid2">
      <div class="card"><div class="cardHead"><h3>Salary Computation</h3></div><div class="cardBody">
        <div class="slipBlock"><h4>Earnings</h4>${earnings.map(l=>`<div class="slipLine"><span>${l.name}</span><span>${fmtMoney(l.amount)}</span></div>`).join('')}
          <div class="slipTotal"><span>Gross Salary</span><span>${fmtMoney(ps.gross)}</span></div></div>
        <div class="slipBlock"><h4>Deductions</h4>${deductions.length?deductions.map(l=>`<div class="slipLine"><span>${l.name}</span><span>−${fmtMoney(l.amount)}</span></div>`).join(''):'<div class="hint">No deductions</div>'}
          <div class="slipTotal"><span>Total Deductions</span><span>−${fmtMoney(ps.deductions)}</span></div></div>
        <div class="slipTotal" style="border-top:2px solid var(--primary);color:var(--primary);"><span>Net Salary</span><span>${fmtMoney(ps.net)}</span></div>
      </div></div>
      <div class="card"><div class="cardHead"><h3>Details</h3></div><div class="cardBody">
        <div class="kv"><span class="k">Employee</span><span class="v">${e.name}</span></div>
        <div class="kv"><span class="k">Department</span><span class="v">${e.dept}</span></div>
        <div class="kv"><span class="k">Contract used</span><span class="v">${c?c.position:'—'}</span></div>
        <div class="kv"><span class="k">Contract period</span><span class="v">${c?fmtDate(c.startDate)+' – '+(c.endDate?fmtDate(c.endDate):'ongoing'):'—'}</span></div>
        <div class="kv"><span class="k">Bank Account</span><span class="v">${e.bankAccount||'<span class=\"pill red\">Missing</span>'}</span></div>
        <div class="kv"><span class="k">Emailed to employee</span><span class="v">${ps.sent?'Yes, '+fmtDate(ps.sentDate):'Not yet'}</span></div>
      </div></div>
    </div>
  `;
};

App.printPayslip = function(id){
  const ps = getPayslip(id); const e = getEmp(ps.employeeId);
  const earnings = ps.lines.filter(l=>l.category==='Basic'||l.category==='Allowance');
  const deductions = ps.lines.filter(l=>l.category==='Deduction');
  document.getElementById('printArea').innerHTML = `
    <div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="font-family:Sora,sans-serif;">PeoplePay360</h2>
      <h3>Payslip — ${periodLabel(ps.period)}</h3>
      <p><b>${e.name}</b><br>${e.position||''} · ${e.dept}<br>PAN: ${e.pan||'—'} · Bank: ${e.bankAccount||'—'}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:14px;">
        <tr><td style="padding:6px 0;font-weight:700;">EARNINGS</td><td></td></tr>
        ${earnings.map(l=>`<tr><td style="padding:4px 0;">${l.name}</td><td style="text-align:right;">${fmtMoney(l.amount)}</td></tr>`).join('')}
        <tr><td style="padding:6px 0;font-weight:700;border-top:1px solid #000;">Gross Salary</td><td style="text-align:right;font-weight:700;border-top:1px solid #000;">${fmtMoney(ps.gross)}</td></tr>
        <tr><td style="padding:10px 0 4px;font-weight:700;">DEDUCTIONS</td><td></td></tr>
        ${deductions.map(l=>`<tr><td style="padding:4px 0;">${l.name}</td><td style="text-align:right;">−${fmtMoney(l.amount)}</td></tr>`).join('')}
        <tr><td style="padding:10px 0;font-weight:800;font-size:16px;border-top:2px solid #000;">NET SALARY</td><td style="text-align:right;font-weight:800;font-size:16px;border-top:2px solid #000;">${fmtMoney(ps.net)}</td></tr>
      </table>
    </div>`;
  window.print();
};

function renderStructures(pb){
  pb.innerHTML = `<div class="pageHead" style="margin-bottom:10px;"><div></div>${isPayrollAdmin()?`<button class="btn solid" onclick="Forms.structure()">+ New Structure</button>`:''}</div>
  <div class="card"><div class="tableWrap"><table>
    <thead><tr><th>Name</th><th>Rules</th><th>Employees</th><th>Status</th><th></th></tr></thead>
    <tbody>${DB.structures.map(s=>{
      const empCount = DB.contracts.filter(c=>c.structureId===s.id && isContractActive(c)).length;
      return `<tr><td><b>${s.name}</b></td><td>${s.ruleIds.length} rules</td><td>${empCount}</td><td><span class="pill green">${s.status}</span></td>
      <td style="text-align:right;">${isPayrollAdmin()?`<button class="btn small" onclick="Forms.structure('${s.id}')">Edit</button>`:'<span class="hint">Read-only</span>'}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
}

function renderRules(pb){
  pb.innerHTML = `<div class="pageHead" style="margin-bottom:10px;"><div></div>${isPayrollAdmin()?`<button class="btn solid" onclick="Forms.rule()">+ New Rule</button>`:''}</div>
  <div class="card"><div class="tableWrap"><table>
    <thead><tr><th>Name</th><th>Code</th><th>Category</th><th>Computation</th><th></th></tr></thead>
    <tbody>${DB.rules.map(r=>`<tr><td><b>${r.name}</b></td><td><code>${r.code}</code></td><td><span class="pill blue">${r.category}</span></td>
      <td>${ruleComputeSummary(r)}</td><td style="text-align:right;">${isPayrollAdmin()?`<button class="btn small" onclick="Forms.rule('${r.id}')">Edit</button>`:'<span class="hint">Read-only</span>'}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}
function ruleComputeSummary(r){
  if(r.computeType==='fixed') return 'Fixed amount: '+fmtMoney(r.amount);
  if(r.computeType==='percentage') return r.amount+'% of {'+r.baseCode+'}';
  return 'Formula: '+r.formula;
}

/* ---------- USERS (Admin) ---------- */
