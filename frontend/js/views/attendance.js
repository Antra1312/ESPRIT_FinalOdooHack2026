import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function attendance(){
  const isSelf = St.user.role==='employee';
  const scope = isSelf ? DB.attendance.filter(a=>a.employeeId===St.user.actorId) : DB.attendance;
  const empFilter = St.sub.attEmp || 'All';
  const list = scope.filter(a=> empFilter==='All' || a.employeeId===empFilter).sort((a,b)=>new Date(b.date)-new Date(a.date));
  body().innerHTML = `
    <div class="pageHead"><div><h1>Attendance</h1><div class="desc">Check-ins, check-outs and worked hours, with exceptions flagged for review.</div></div>
    ${isHR()?`<button class="btn solid" onclick="Forms.attendance()">+ Log / Correct Entry</button>`:''}</div>
    ${!isSelf?`<div class="filterBar"><select onchange="St.sub.attEmp=this.value; App.go('attendance')">
      <option value="All">All employees</option>
      ${DB.employees.map(e=>`<option value="${e.id}" ${empFilter===e.id?'selected':''}>${e.name}</option>`).join('')}
    </select></div>`:''}
    <div class="card"><div class="tableWrap"><table>
      <thead><tr>${isSelf?'':'<th>Employee</th>'}<th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Note</th>${isHR()?'<th></th>':''}</tr></thead>
      <tbody>${list.map(a=>`<tr>${isSelf?'':`<td>${getEmp(a.employeeId).name}</td>`}<td>${fmtDate(a.date)}</td><td>${a.checkIn||'—'}</td><td>${a.checkOut||'—'}</td><td>${attPill(a.status)}</td><td>${a.note||'—'}</td>
        ${isHR()?`<td style="text-align:right;"><button class="btn small" onclick="Forms.attendance('${a.id}')">Correct</button></td>`:''}</tr>`).join('') || `<tr><td colspan="7" class="hint">No records.</td></tr>`}
      </tbody>
    </table></div></div>
  `;
};

/* ---------- TIME OFF ---------- */
