import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function employees(){
  if(St.user.role==='employee'){ return App.go('employee-detail',{id:St.user.actorId}); }
  const view = St.sub.empView || 'kanban';
  const q = (St.sub.empQuery||'').toLowerCase();
  const list = DB.employees.filter(e=> e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q));
  const depts = [...new Set(DB.employees.map(e=>e.dept))];

  body().innerHTML = `
    <div class="pageHead">
      <div><h1>Employees</h1><div class="desc">Employee records are the central hub — every contract, attendance entry and leave record links back here.</div></div>
      ${isHR()?`<button class="btn solid" onclick="Forms.employee()">+ New Employee</button>`:''}
    </div>
    <div class="filterBar">
      <div class="searchBox"><input placeholder="Search employees…" value="${St.sub.empQuery||''}" oninput="St.sub.empQuery=this.value; App.go('employees')"></div>
      <button class="btn small ${view==='kanban'?'solid':''}" onclick="St.sub.empView='kanban'; App.go('employees')">Kanban</button>
      <button class="btn small ${view==='list'?'solid':''}" onclick="St.sub.empView='list'; App.go('employees')">List</button>
    </div>
    ${view==='kanban' ? `
      <div class="kanbanCols">
        ${depts.map(d=>`
          <div class="kanbanCol"><h4>${d} · ${list.filter(e=>e.dept===d).length}</h4>
            ${list.filter(e=>e.dept===d).map(e=>`
              <div class="empCard" onclick="App.go('employee-detail',{id:'${e.id}'})">
                <div class="nm">${e.name}</div><div class="ps">${e.position}</div>
                <div style="margin-top:8px;"><span class="pill ${e.status==='Active'?'green':'gray'}">${e.status}</span></div>
              </div>`).join('') || '<div class="hint">No employees</div>'}
          </div>`).join('')}
      </div>
    ` : `
      <div class="card"><div class="tableWrap"><table>
        <thead><tr><th>Employee</th><th>Department</th><th>Position</th><th>Manager</th><th>Status</th><th>Contracts</th><th></th></tr></thead>
        <tbody>
        ${list.map(e=>{
          const mgr = e.managerId?getEmp(e.managerId):null;
          return `<tr class="clickable" onclick="App.go('employee-detail',{id:'${e.id}'})">
            <td><b>${e.name}</b></td><td>${e.dept}</td><td>${e.position}</td><td>${mgr?mgr.name:'—'}</td>
            <td><span class="pill ${e.status==='Active'?'green':'gray'}">${e.status}</span></td>
            <td>${empContracts(e.id).length}</td>
            <td style="text-align:right;">${isHR()?`<button class="btn small" onclick="event.stopPropagation(); Forms.employee('${e.id}')">Edit</button>`:''}</td>
          </tr>`;
        }).join('')}
        </tbody></table></div></div>
    `}
  `;
};

Views['employee-detail'] = function(params){
  const emp = getEmp(params.id); if(!emp){ return App.go('employees'); }
  const tab = St.sub.empTab || 'overview';
  const contracts = empContracts(emp.id);
  const att = DB.attendance.filter(a=>a.employeeId===emp.id);
  const reqs = DB.requests.filter(r=>r.employeeId===emp.id);
  const allocs = DB.allocations.filter(a=>a.employeeId===emp.id);
  const mgr = emp.managerId?getEmp(emp.managerId):null;
  const sched = getSchedule(emp.scheduleId);
  const isSelf = St.user.role==='employee';

  body().innerHTML = `
    <div class="breadcrumb">${isSelf?'My Profile':`<a href="#" onclick="App.go('employees');return false;">Employees</a> / ${emp.name}`}</div>
    <div class="pageHead">
      <div style="display:flex;gap:14px;align-items:center;">
        <span class="avatar" style="width:46px;height:46px;font-size:16px;background:${colorFor(emp.name)}">${initials(emp.name)}</span>
        <div><h1 style="margin-bottom:2px;">${emp.name}</h1><div class="desc">${emp.position} · ${emp.dept} · Reports to ${mgr?mgr.name:'—'}</div></div>
      </div>
      ${isHR() && !isSelf ?`<button class="btn solid" onclick="Forms.employee('${emp.id}')">Edit Employee</button>`:''}
    </div>
    <div class="smartBtns">
      <div class="smartBtn"><div class="n">${contracts.length}</div><div class="l">📄 Contracts</div></div>
      <div class="smartBtn"><div class="n">${att.length}</div><div class="l">🕐 Attendance entries</div></div>
      <div class="smartBtn"><div class="n">${reqs.length}</div><div class="l">🏖️ Time off requests</div></div>
      <div class="smartBtn"><div class="n">${allocRemaining(getAlloc(emp.id,'TT1'))}</div><div class="l">Annual leave days left</div></div>
    </div>
    <div class="tabs">
      ${['overview','contracts','attendance','timeoff'].map(t=>`<button class="tabbtn ${tab===t?'active':''}" onclick="St.sub.empTab='${t}'; App.go('employee-detail',{id:'${emp.id}'})">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
    </div>
    <div id="empTabBody"></div>
  `;
  const tb = document.getElementById('empTabBody');
  if(tab==='overview'){
    tb.innerHTML = `<div class="grid2">
      <div class="card"><div class="cardHead"><h3>Employee Details</h3></div><div class="cardBody">
        <div class="kv"><span class="k">Email</span><span class="v">${emp.email}</span></div>
        <div class="kv"><span class="k">Phone</span><span class="v">${emp.phone}</span></div>
        <div class="kv"><span class="k">Department</span><span class="v">${emp.dept}</span></div>
        <div class="kv"><span class="k">Position</span><span class="v">${emp.position}</span></div>
        <div class="kv"><span class="k">Manager</span><span class="v">${mgr?mgr.name:'—'}</span></div>
        <div class="kv"><span class="k">Working Schedule</span><span class="v">${sched?sched.name+' ('+weeklyHours(sched)+'h/week)':'—'}</span></div>
        <div class="kv"><span class="k">Join Date</span><span class="v">${fmtDate(emp.joinDate)}</span></div>
        <div class="kv"><span class="k">Status</span><span class="v"><span class="pill ${emp.status==='Active'?'green':'gray'}">${emp.status}</span></span></div>
      </div></div>
      <div class="card"><div class="cardHead"><h3>Payroll Readiness</h3></div><div class="cardBody">
        <div class="kv"><span class="k">Bank Account</span><span class="v">${emp.bankAccount?emp.bankAccount:'<span class=\"pill red\">Missing</span>'}</span></div>
        <div class="kv"><span class="k">PAN</span><span class="v">${emp.pan?emp.pan:'<span class=\"pill red\">Missing</span>'}</span></div>
        <div class="kv"><span class="k">Active Contract</span><span class="v">${currentContract(emp.id)?fmtMoney(currentContract(emp.id).wage)+' CTC/mo':'<span class=\"pill red\">None</span>'}</span></div>
        <div class="kv"><span class="k">Salary Structure</span><span class="v">${currentContract(emp.id)?getStructure(currentContract(emp.id).structureId).name:'—'}</span></div>
      </div></div>
    </div>`;
  } else if(tab==='contracts'){
    tb.innerHTML = `<div class="card"><div class="cardHead"><h3>Contract History</h3>${isHR()&&!isSelf?`<button class="btn small solid" onclick="Forms.contract(null,'${emp.id}')">+ New Contract</button>`:''}</div>
    <div class="tableWrap"><table><thead><tr><th>Position</th><th>Wage (CTC/mo)</th><th>Structure</th><th>Start</th><th>End</th><th>Status</th></tr></thead><tbody>
      ${contracts.map(c=>`<tr><td>${c.position}</td><td>${fmtMoney(c.wage)}</td><td>${getStructure(c.structureId).name}</td><td>${fmtDate(c.startDate)}</td><td>${c.endDate?fmtDate(c.endDate):'Ongoing'}</td>
      <td><span class="pill ${isContractActive(c)?'green':'gray'}">${isContractActive(c)?'Active':'History'}</span></td></tr>`).join('') || `<tr><td colspan="6" class="hint">No contracts yet.</td></tr>`}
    </tbody></table></div></div>`;
  } else if(tab==='attendance'){
    tb.innerHTML = `<div class="card"><div class="cardHead"><h3>Attendance</h3></div><div class="tableWrap"><table><thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Note</th></tr></thead><tbody>
      ${att.map(a=>`<tr><td>${fmtDate(a.date)}</td><td>${a.checkIn||'—'}</td><td>${a.checkOut||'—'}</td><td>${attPill(a.status)}</td><td>${a.note||'—'}</td></tr>`).join('') || `<tr><td colspan="5" class="hint">No attendance recorded.</td></tr>`}
    </tbody></table></div></div>`;
  } else if(tab==='timeoff'){
    tb.innerHTML = `<div class="grid2">
      <div class="card"><div class="cardHead"><h3>Requests</h3></div><div class="tableWrap"><table><thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead><tbody>
        ${reqs.map(r=>`<tr><td>${DB.timeoffTypes.find(t=>t.id===r.typeId).name}</td><td>${fmtDate(r.from)}</td><td>${fmtDate(r.to)}</td><td>${r.duration}</td><td>${reqPill(r.status)}</td></tr>`).join('') || `<tr><td colspan="5" class="hint">No requests.</td></tr>`}
      </tbody></table></div></div>
      <div class="card"><div class="cardHead"><h3>Balances</h3></div><div class="cardBody">
        ${allocs.map(a=>`<div class="kv"><span class="k">${DB.timeoffTypes.find(t=>t.id===a.typeId).name}</span><span class="v">${allocRemaining(a)} / ${a.allocated} ${DB.timeoffTypes.find(t=>t.id===a.typeId).unit} left</span></div>`).join('')}
      </div></div>
    </div>`;
  }
};

function attPill(s){ const map={Normal:'green',Late:'amber','Missing Checkout':'red',Corrected:'blue'}; return `<span class="pill ${map[s]||'gray'}">${s}</span>`; }
function reqPill(s){ const map={Approved:'green',Pending:'amber',Rejected:'red'}; return `<span class="pill ${map[s]||'gray'}">${s}</span>`; }

/* ---------- CONTRACTS ---------- */
