import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function contracts(){
  const list = [...DB.contracts].sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
  body().innerHTML = `
    <div class="pageHead"><div><h1>Contracts</h1><div class="desc">Historical contracts are preserved. Payroll always uses the contract valid for the selected payroll period.</div></div>
    ${isHR()?`<button class="btn solid" onclick="Forms.contract()">+ New Contract</button>`:''}</div>
    <div class="card"><div class="tableWrap"><table>
      <thead><tr><th>Employee</th><th>Position</th><th>Department</th><th>Wage (CTC/mo)</th><th>Structure</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(c=>{ const e=getEmp(c.employeeId);
        return `<tr><td><a href="#" onclick="App.go('employee-detail',{id:'${e.id}'});return false;">${e.name}</a></td><td>${c.position}</td><td>${c.dept}</td>
        <td>${fmtMoney(c.wage)}</td><td>${getStructure(c.structureId).name}</td><td>${fmtDate(c.startDate)}</td><td>${c.endDate?fmtDate(c.endDate):'Ongoing'}</td>
        <td><span class="pill ${isContractActive(c)?'green':'gray'}">${isContractActive(c)?'Active':'History'}</span></td>
        <td style="text-align:right;">${isHR()?`<button class="btn small" onclick="Forms.contract('${c.id}')">Edit</button>`:''}</td></tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `;
};

/* ---------- SCHEDULES ---------- */
