import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function schedules(){
  body().innerHTML = `
    <div class="pageHead"><div><h1>Working Schedules</h1><div class="desc">Weekly hours are calculated automatically from each day's start, end and break time.</div></div>
    ${isHR()?`<button class="btn solid" onclick="Forms.schedule()">+ New Schedule</button>`:''}</div>
    <div class="card"><div class="tableWrap"><table>
      <thead><tr><th>Name</th><th>Type</th><th>Pattern</th><th>Weekly Hours</th><th>Used by</th><th></th></tr></thead>
      <tbody>${DB.schedules.map(s=>{
        const used = DB.employees.filter(e=>e.scheduleId===s.id).length;
        const activeDays = s.days.filter(d=>d.on).map(d=>d.day).join(', ');
        return `<tr><td><b>${s.name}</b></td><td>${s.type}</td><td>${activeDays} · ${s.days.find(d=>d.on)?.start||''}–${s.days.find(d=>d.on)?.end||''}</td>
        <td><b>${weeklyHours(s)}h</b></td><td>${used} employee${used===1?'':'s'}</td>
        <td style="text-align:right;">${isHR()?`<button class="btn small" onclick="Forms.schedule('${s.id}')">Edit</button>`:''}</td></tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `;
};

/* ---------- ATTENDANCE ---------- */
