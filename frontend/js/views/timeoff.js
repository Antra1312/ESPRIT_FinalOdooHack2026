import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function timeoff(){
  const tab = St.sub.toTab || 'requests';
  const isSelf = St.user.role==='employee';
  body().innerHTML = `
    <div class="pageHead"><div><h1>Time Off</h1><div class="desc">Requests, allocations and the leave types that define how each policy behaves.</div></div>
    ${(isSelf || isHR()) ? `<button class="btn solid" onclick="Forms.request()">+ New Request</button>`:''}</div>
    <div class="tabs">
      <button class="tabbtn ${tab==='requests'?'active':''}" onclick="St.sub.toTab='requests'; App.go('timeoff')">Requests</button>
      ${!isSelf?`<button class="tabbtn ${tab==='allocations'?'active':''}" onclick="St.sub.toTab='allocations'; App.go('timeoff')">Allocations</button>
      <button class="tabbtn ${tab==='types'?'active':''}" onclick="St.sub.toTab='types'; App.go('timeoff')">Time Off Types</button>`:''}
    </div>
    <div id="toBody"></div>
  `;
  const tb = document.getElementById('toBody');
  if(tab==='requests'){
    const scope = isSelf ? DB.requests.filter(r=>r.employeeId===St.user.actorId) : DB.requests;
    tb.innerHTML = `<div class="card"><div class="tableWrap"><table>
      <thead><tr>${isSelf?'':'<th>Employee</th>'}<th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>${isHR()?'<th></th>':''}</tr></thead>
      <tbody>${[...scope].reverse().map(r=>{ const t=DB.timeoffTypes.find(x=>x.id===r.typeId);
        return `<tr>${isSelf?'':`<td>${getEmp(r.employeeId).name}</td>`}<td>${t.name}</td><td>${fmtDate(r.from)}</td><td>${fmtDate(r.to)}</td><td>${r.duration}</td><td>${r.reason||'—'}</td><td>${reqPill(r.status)}</td>
        ${isHR() ? `<td style="text-align:right;">${r.status==='Pending'?`<button class="btn small accent" onclick="App.approveRequest('${r.id}')">Approve</button> <button class="btn small danger" onclick="App.rejectRequest('${r.id}')">Reject</button>`:'—'}</td>`:''}</tr>`;
      }).join('') || `<tr><td colspan="8" class="hint">No requests yet.</td></tr>`}</tbody>
    </table></div></div>`;
  } else if(tab==='allocations'){
    tb.innerHTML = `<div class="pageHead" style="margin-bottom:10px;"><div></div>${isHR()?`<button class="btn small solid" onclick="Forms.allocation()">+ New Allocation</button>`:''}</div>
    <div class="card"><div class="tableWrap"><table>
      <thead><tr><th>Employee</th><th>Type</th><th>Allocated</th><th>Used</th><th>Remaining</th><th>Valid</th></tr></thead>
      <tbody>${DB.allocations.map(a=>{ const t=DB.timeoffTypes.find(x=>x.id===a.typeId);
        return `<tr><td>${getEmp(a.employeeId).name}</td><td>${t.name}</td><td>${a.allocated} ${t.unit}</td><td>${a.used}</td><td><b>${allocRemaining(a)}</b></td><td>${fmtDate(a.validFrom)} – ${fmtDate(a.validTo)}</td></tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  } else if(tab==='types'){
    tb.innerHTML = `<div class="pageHead" style="margin-bottom:10px;"><div></div>${isHR()?`<button class="btn small solid" onclick="Forms.timeoffType()">+ New Type</button>`:''}</div>
    <div class="card"><div class="tableWrap"><table>
      <thead><tr><th>Name</th><th>Unit</th><th>Requires Allocation</th><th></th></tr></thead>
      <tbody>${DB.timeoffTypes.map(t=>`<tr><td><span class="badgeDot" style="background:${t.color}"></span><b>${t.name}</b></td><td>${t.unit}</td><td>${t.requiresAllocation?'Yes':'No'}</td>
      <td style="text-align:right;">${isHR()?`<button class="btn small" onclick="Forms.timeoffType('${t.id}')">Edit</button>`:''}</td></tr>`).join('')}</tbody>
    </table></div></div>`;
  }
};

App.approveRequest = function(id){
  const r = DB.requests.find(x=>x.id===id);
  const t = DB.timeoffTypes.find(x=>x.id===r.typeId);
  if(t.requiresAllocation){
    const a = getAlloc(r.employeeId, r.typeId);
    if(!a || allocRemaining(a) < r.duration){ toast('Cannot approve — insufficient leave balance', 'warn'); return; }
    a.used += r.duration;
  }
  r.status = 'Approved';
  toast('Leave request approved — balance updated', 'ok');
  App.go('timeoff');
};
App.rejectRequest = function(id){ DB.requests.find(x=>x.id===id).status='Rejected'; toast('Leave request rejected'); App.go('timeoff'); };

/* ---------- PAYROLL (Payruns / Payslips / Structures / Rules) ---------- */
