import { St, App, can, isHR, isPayroll, isPayrollAdmin, ROLES } from '../main.js';\nimport { body, toast, openModal, closeModal } from '../ui.js';\nimport { DB, uid, fmtMoney, fmtDate, periodLabel, initials, colorFor, weeklyHours, getAlloc, allocRemaining, getEmp, getSchedule, empContracts, isContractActive, currentContract, pickContractForPeriod, evalExpr, computeSalaryLines, getPayrun, getPayslip, getStructure, computePayrun, computeWarnings, validatePayrun, markPayrunPaid, sendPayslips } from '../store.js';\n\nexport function users(){
  body().innerHTML = `<div class="pageHead"><div><h1>Users &amp; Roles</h1><div class="desc">Role-based access controls what each account can see and do.</div></div></div>
  <div class="card"><div class="tableWrap"><table>
    <thead><tr><th>Role</th><th>Demo user</th><th>Permissions</th></tr></thead>
    <tbody>
      <tr><td><span class="pill blue">Employee</span></td><td>${getEmp('E1').name}</td><td>View own profile, attendance and leave balance; submit time off requests.</td></tr>
      <tr><td><span class="pill green">HR Manager</span></td><td>${getEmp('E9').name}</td><td>Full CRUD on Employees, Contracts, Attendance, Schedules, Time Off. No payroll access.</td></tr>
      <tr><td><span class="pill amber">HR Payroll User</span></td><td>${getEmp('E8').name}</td><td>HR Manager permissions + create/update Payruns &amp; Payslips. Read-only Salary Structures/Rules.</td></tr>
      <tr><td><span class="pill">HR Payroll Manager</span></td><td>${getEmp('E2').name}</td><td>All Payroll User permissions + full CRUD on Salary Structures &amp; Rules.</td></tr>
      <tr><td><span class="pill red">Admin</span></td><td>${getEmp('E2').name}</td><td>Full access to every module, plus user &amp; role management.</td></tr>
    </tbody>
  </table></div></div>`;
};

/* =========================================================================
   FORMS (modals) — Create / Edit
   ========================================================================= */
const Forms = {};

Forms.employee = function(id){
  const e = id ? getEmp(id) : null;
  openModal(`
    <div class="modalHead"><h3>${e?'Edit Employee':'New Employee'}</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody"><div class="formGrid">
      <div class="field full"><label>Full name</label><input id="f_name" value="${e?e.name:''}"></div>
      <div class="field"><label>Department</label><select id="f_dept">${['IT','HR','Finance','Sales'].map(d=>`<option ${e&&e.dept===d?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="field"><label>Position</label><input id="f_position" value="${e?e.position:''}"></div>
      <div class="field"><label>Manager</label><select id="f_manager"><option value="">— None —</option>${DB.employees.filter(x=>x.id!==id).map(m=>`<option value="${m.id}" ${e&&e.managerId===m.id?'selected':''}>${m.name}</option>`).join('')}</select></div>
      <div class="field"><label>Working Schedule</label><select id="f_schedule">${DB.schedules.map(s=>`<option value="${s.id}" ${e&&e.scheduleId===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
      <div class="field"><label>Email</label><input id="f_email" value="${e?e.email:''}"></div>
      <div class="field"><label>Phone</label><input id="f_phone" value="${e?e.phone:''}"></div>
      <div class="field"><label>Bank Account</label><input id="f_bank" value="${e?e.bankAccount:''}" placeholder="e.g. HDFC •••• 4521"></div>
      <div class="field"><label>PAN</label><input id="f_pan" value="${e?e.pan:''}"></div>
      <div class="field"><label>Join Date</label><input type="date" id="f_join" value="${e?e.joinDate:'2026-09-05'}"></div>
      <div class="field"><label>Status</label><select id="f_status">${['Active','Inactive'].map(s=>`<option ${e&&e.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div></div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveEmployee('${id||''}')">Save Employee</button></div>
  `, true);
};
Forms.saveEmployee = function(id){
  const val = k=>document.getElementById(k).value;
  const data = { name:val('f_name'), dept:val('f_dept'), position:val('f_position'), managerId:val('f_manager')||null, scheduleId:val('f_schedule'),
    email:val('f_email'), phone:val('f_phone'), bankAccount:val('f_bank'), pan:val('f_pan'), joinDate:val('f_join'), status:val('f_status') };
  if(!data.name){ toast('Employee name is required','warn'); return; }
  if(id){ Object.assign(getEmp(id), data); toast('Employee updated','ok'); }
  else { data.id = uid('E'); DB.employees.push(data); toast('Employee created','ok'); }
  closeModal(); App.go('employees');
};

Forms.contract = function(id, presetEmpId){
  const c = id ? DB.contracts.find(x=>x.id===id) : null;
  openModal(`
    <div class="modalHead"><h3>${c?'Edit Contract':'New Contract'}</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody"><div class="formGrid">
      <div class="field full"><label>Employee</label><select id="f_emp">${DB.employees.map(e=>`<option value="${e.id}" ${(c&&c.employeeId===e.id)||(presetEmpId===e.id)?'selected':''}>${e.name}</option>`).join('')}</select></div>
      <div class="field"><label>Position</label><input id="f_position" value="${c?c.position:''}"></div>
      <div class="field"><label>Department</label><select id="f_dept">${['IT','HR','Finance','Sales'].map(d=>`<option ${c&&c.dept===d?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="field"><label>Wage / CTC per month (₹)</label><input type="number" id="f_wage" value="${c?c.wage:''}"></div>
      <div class="field"><label>Salary Structure</label><select id="f_structure">${DB.structures.map(s=>`<option value="${s.id}" ${c&&c.structureId===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
      <div class="field"><label>Start Date</label><input type="date" id="f_start" value="${c?c.startDate:'2026-09-01'}"></div>
      <div class="field"><label>End Date (blank = ongoing)</label><input type="date" id="f_end" value="${c&&c.endDate?c.endDate:''}"></div>
    </div>
    <div class="hint">💡 Old contracts are never deleted — they remain as history. Payroll automatically selects whichever contract's date range covers the payrun period.</div>
    </div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveContract('${id||''}')">Save Contract</button></div>
  `, true);
};
Forms.saveContract = function(id){
  const val = k=>document.getElementById(k).value;
  const data = { employeeId:val('f_emp'), position:val('f_position'), dept:val('f_dept'), wage:Number(val('f_wage')), structureId:val('f_structure'), startDate:val('f_start'), endDate:val('f_end')||null };
  if(id){ Object.assign(DB.contracts.find(x=>x.id===id), data); toast('Contract updated','ok'); }
  else { data.id = uid('C'); DB.contracts.push(data); toast('Contract created','ok'); }
  closeModal(); App.go('contracts');
};

Forms.schedule = function(id){
  const s = id ? getSchedule(id) : { name:'', type:'Fixed', days:[{day:'Mon',on:true,start:'09:00',end:'18:00',brk:60},{day:'Tue',on:true,start:'09:00',end:'18:00',brk:60},{day:'Wed',on:true,start:'09:00',end:'18:00',brk:60},{day:'Thu',on:true,start:'09:00',end:'18:00',brk:60},{day:'Fri',on:true,start:'09:00',end:'18:00',brk:60},{day:'Sat',on:false,start:'',end:'',brk:0},{day:'Sun',on:false,start:'',end:'',brk:0}] };
  openModal(`
    <div class="modalHead"><h3>${id?'Edit Schedule':'New Schedule'}</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody">
      <div class="formGrid" style="margin-bottom:14px;">
        <div class="field"><label>Schedule name</label><input id="f_name" value="${s.name}"></div>
        <div class="field"><label>Type</label><select id="f_type">${['Fixed','Flexible'].map(t=>`<option ${s.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="scheduleRow" style="font-weight:700;color:var(--ink-dim);font-size:11px;text-transform:uppercase;"><div>Day</div><div>Start</div><div>End</div><div>Break (min)</div><div>Active</div></div>
      <div id="schedDays">${s.days.map((d,i)=>`
        <div class="scheduleRow">
          <div>${d.day}</div>
          <input type="time" data-i="${i}" class="sd-start" value="${d.start}">
          <input type="time" data-i="${i}" class="sd-end" value="${d.end}">
          <input type="number" data-i="${i}" class="sd-brk" value="${d.brk}">
          <input type="checkbox" data-i="${i}" class="sd-on" ${d.on?'checked':''} onchange="Forms.recalcSchedulePreview()">
        </div>`).join('')}</div>
      <div class="hint">Weekly hours (auto-calculated): <b id="schedPreview">${weeklyHours(s)}h</b></div>
    </div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveSchedule('${id||''}')">Save Schedule</button></div>
  `, true);
};
Forms.recalcSchedulePreview = function(){
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=>({
    day, on: document.querySelectorAll('.sd-on')[i].checked,
    start: document.querySelectorAll('.sd-start')[i].value, end: document.querySelectorAll('.sd-end')[i].value,
    brk: Number(document.querySelectorAll('.sd-brk')[i].value||0)
  }));
  document.getElementById('schedPreview').textContent = weeklyHours({days}) + 'h';
};
document.addEventListener('input', e=>{ if(e.target.matches('.sd-start,.sd-end,.sd-brk')) Forms.recalcSchedulePreview(); });
Forms.saveSchedule = function(id){
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=>({
    day, on: document.querySelectorAll('.sd-on')[i].checked,
    start: document.querySelectorAll('.sd-start')[i].value, end: document.querySelectorAll('.sd-end')[i].value,
    brk: Number(document.querySelectorAll('.sd-brk')[i].value||0)
  }));
  const data = { name: document.getElementById('f_name').value, type: document.getElementById('f_type').value, days };
  if(id){ Object.assign(getSchedule(id), data); toast('Schedule updated','ok'); }
  else { data.id = uid('sch'); DB.schedules.push(data); toast('Schedule created','ok'); }
  closeModal(); App.go('schedules');
};

Forms.attendance = function(id){
  const a = id ? DB.attendance.find(x=>x.id===id) : null;
  openModal(`
    <div class="modalHead"><h3>${a?'Correct Attendance':'Log Attendance'}</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody"><div class="formGrid">
      <div class="field full"><label>Employee</label><select id="f_emp" ${a?'disabled':''}>${DB.employees.map(e=>`<option value="${e.id}" ${a&&a.employeeId===e.id?'selected':''}>${e.name}</option>`).join('')}</select></div>
      <div class="field"><label>Date</label><input type="date" id="f_date" value="${a?a.date:'2026-09-05'}"></div>
      <div class="field"></div>
      <div class="field"><label>Check-in</label><input type="time" id="f_in" value="${a?a.checkIn:'09:00'}"></div>
      <div class="field"><label>Check-out</label><input type="time" id="f_out" value="${a?a.checkOut:'18:00'}"></div>
      <div class="field full"><label>Note</label><input id="f_note" value="${a?a.note:''}" placeholder="Reason for manual correction"></div>
    </div></div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveAttendance('${id||''}')">Save</button></div>
  `);
};
Forms.saveAttendance = function(id){
  const val = k=>document.getElementById(k).value;
  const checkIn = val('f_in'), checkOut = val('f_out');
  let status = 'Normal';
  if(!checkOut) status = 'Missing Checkout';
  else if(checkIn > '09:15') status = 'Late';
  if(id) status = 'Corrected';
  const data = { employeeId: id?DB.attendance.find(x=>x.id===id).employeeId:val('f_emp'), date:val('f_date'), checkIn, checkOut, status, note:val('f_note') };
  if(id){ Object.assign(DB.attendance.find(x=>x.id===id), data); toast('Attendance corrected','ok'); }
  else { data.id = uid('AT'); DB.attendance.push(data); toast('Attendance logged','ok'); }
  closeModal(); App.go('attendance');
};

function weekdaysBetween(from,to){
  let d = new Date(from); const end = new Date(to); let count=0;
  while(d<=end){ const day=d.getDay(); if(day!==0&&day!==6) count++; d.setDate(d.getDate()+1); }
  return Math.max(count,1);
}
Forms.request = function(){
  const isSelf = St.user.role==='employee';
  openModal(`
    <div class="modalHead"><h3>New Time Off Request</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody"><div class="formGrid">
      ${isSelf?`<input type="hidden" id="f_emp" value="${St.user.actorId}">`:`<div class="field full"><label>Employee</label><select id="f_emp">${DB.employees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select></div>`}
      <div class="field full"><label>Type</label><select id="f_type">${DB.timeoffTypes.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
      <div class="field"><label>From</label><input type="date" id="f_from" value="2026-09-15"></div>
      <div class="field"><label>To</label><input type="date" id="f_to" value="2026-09-15"></div>
      <div class="field full"><label>Reason</label><textarea id="f_reason" rows="2"></textarea></div>
    </div></div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveRequest()">Submit Request</button></div>
  `);
};
Forms.saveRequest = function(){
  const val = k=>document.getElementById(k).value;
  const from = val('f_from'), to = val('f_to');
  const duration = weekdaysBetween(from,to);
  const data = { id:uid('RQ'), employeeId:val('f_emp'), typeId:val('f_type'), from, to, duration, status:'Pending', reason:val('f_reason') };
  DB.requests.push(data);
  toast('Time off request submitted','ok');
  closeModal(); App.go('timeoff');
};

Forms.allocation = function(){
  openModal(`
    <div class="modalHead"><h3>New Allocation</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody"><div class="formGrid">
      <div class="field full"><label>Employee</label><select id="f_emp">${DB.employees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select></div>
      <div class="field full"><label>Type</label><select id="f_type">${DB.timeoffTypes.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
      <div class="field"><label>Allocated (days)</label><input type="number" id="f_alloc" value="20"></div>
      <div class="field"><label>Already used</label><input type="number" id="f_used" value="0"></div>
      <div class="field"><label>Valid from</label><input type="date" id="f_vfrom" value="2026-01-01"></div>
      <div class="field"><label>Valid to</label><input type="date" id="f_vto" value="2026-12-31"></div>
    </div></div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveAllocation()">Save Allocation</button></div>
  `);
};
Forms.saveAllocation = function(){
  const val = k=>document.getElementById(k).value;
  DB.allocations.push({ id:uid('AL'), employeeId:val('f_emp'), typeId:val('f_type'), allocated:Number(val('f_alloc')), used:Number(val('f_used')), validFrom:val('f_vfrom'), validTo:val('f_vto'), status:'Approved' });
  toast('Allocation created','ok'); closeModal(); App.go('timeoff');
};

Forms.timeoffType = function(id){
  const t = id ? DB.timeoffTypes.find(x=>x.id===id) : null;
  openModal(`
    <div class="modalHead"><h3>${t?'Edit Time Off Type':'New Time Off Type'}</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody"><div class="formGrid">
      <div class="field full"><label>Name</label><input id="f_name" value="${t?t.name:''}"></div>
      <div class="field"><label>Unit</label><select id="f_unit">${['days','hours'].map(u=>`<option ${t&&t.unit===u?'selected':''}>${u}</option>`).join('')}</select></div>
      <div class="field"><label>Colour</label><input type="color" id="f_color" value="${t?t.color:'#0EA5A0'}"></div>
      <div class="field full"><label><input type="checkbox" id="f_req" ${t&&t.requiresAllocation?'checked':''}> Requires an approved allocation before use</label></div>
    </div></div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveTimeoffType('${id||''}')">Save</button></div>
  `);
};
Forms.saveTimeoffType = function(id){
  const val = k=>document.getElementById(k).value;
  const data = { name:val('f_name'), unit:val('f_unit'), color:val('f_color'), requiresAllocation:document.getElementById('f_req').checked };
  if(id){ Object.assign(DB.timeoffTypes.find(x=>x.id===id), data); toast('Time off type updated','ok'); }
  else { data.id = uid('TT'); DB.timeoffTypes.push(data); toast('Time off type created','ok'); }
  closeModal(); App.go('timeoff');
};

/* ---- Salary Structure form (ordered rule picker) ---- */
Forms.structure = function(id){
  const s = id ? getStructure(id) : { name:'', status:'Active', ruleIds:[] };
  window.__structDraft = { ...s, ruleIds:[...s.ruleIds] };
  openModal(`
    <div class="modalHead"><h3>${id?'Edit Salary Structure':'New Salary Structure'}</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody">
      <div class="field"><label>Structure name</label><input id="f_name" value="${s.name}"></div>
      <div class="field" style="margin-top:12px;"><label>Salary rules (in execution order)</label></div>
      <div id="structRuleList"></div>
      <div class="field" style="margin-top:10px;"><label>Add a rule</label>
        <select id="f_addRule">${DB.rules.map(r=>`<option value="${r.id}">${r.name} (${r.code})</option>`).join('')}</select>
        <button class="btn small" style="margin-top:8px;" onclick="Forms.addRuleToStructure()">+ Add to structure</button>
      </div>
    </div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveStructure('${id||''}')">Save Structure</button></div>
  `, true);
  Forms.renderStructRuleList();
};
Forms.renderStructRuleList = function(){
  const ids = window.__structDraft.ruleIds;
  document.getElementById('structRuleList').innerHTML = ids.length ? ids.map((rid,i)=>{
    const r = DB.rules.find(x=>x.id===rid);
    return `<div class="ruleRow"><div class="seq">${i+1}</div><div class="meta"><div class="nm">${r.name}</div><div class="cd">${r.code} · ${ruleComputeSummary(r)}</div></div>
      <button class="miniBtn" onclick="Forms.moveRule(${i},-1)">↑</button><button class="miniBtn" onclick="Forms.moveRule(${i},1)">↓</button>
      <button class="miniBtn" onclick="Forms.removeRuleFromStructure(${i})">✕</button></div>`;
  }).join('') : `<div class="hint">No rules added yet.</div>`;
};
Forms.addRuleToStructure = function(){ const rid = document.getElementById('f_addRule').value; if(!window.__structDraft.ruleIds.includes(rid)) window.__structDraft.ruleIds.push(rid); Forms.renderStructRuleList(); };
Forms.removeRuleFromStructure = function(i){ window.__structDraft.ruleIds.splice(i,1); Forms.renderStructRuleList(); };
Forms.moveRule = function(i,dir){ const arr=window.__structDraft.ruleIds; const j=i+dir; if(j<0||j>=arr.length) return; [arr[i],arr[j]]=[arr[j],arr[i]]; Forms.renderStructRuleList(); };
Forms.saveStructure = function(id){
  const name = document.getElementById('f_name').value;
  if(!name){ toast('Structure name is required','warn'); return; }
  if(window.__structDraft.ruleIds.length===0){ toast('Add at least one salary rule','warn'); return; }
  if(id){ const s=getStructure(id); s.name=name; s.ruleIds=window.__structDraft.ruleIds; toast('Structure updated','ok'); }
  else { DB.structures.push({ id:uid('st'), name, status:'Active', ruleIds:window.__structDraft.ruleIds }); toast('Structure created','ok'); }
  closeModal(); St.sub.payTab='structures'; App.go('payroll');
};

/* ---- Salary Rule form ---- */
Forms.rule = function(id){
  const r = id ? DB.rules.find(x=>x.id===id) : { code:'', name:'', category:'Allowance', computeType:'fixed', baseCode:'', amount:0, formula:'' };
  openModal(`
    <div class="modalHead"><h3>${id?'Edit Salary Rule':'New Salary Rule'}</h3><button class="modalClose" onclick="closeModal()">×</button></div>
    <div class="modalBody"><div class="formGrid">
      <div class="field"><label>Name</label><input id="f_name" value="${r.name}"></div>
      <div class="field"><label>Code</label><input id="f_code" value="${r.code}" placeholder="e.g. BONUS" style="text-transform:uppercase;"></div>
      <div class="field"><label>Category</label><select id="f_cat">${['Basic','Allowance','Gross','Deduction','Net'].map(c=>`<option ${r.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Computation Method</label><select id="f_ctype" onchange="Forms.toggleRuleInputs()">
        <option value="fixed" ${r.computeType==='fixed'?'selected':''}>Fixed amount</option>
        <option value="percentage" ${r.computeType==='percentage'?'selected':''}>Percentage of another rule</option>
        <option value="formula" ${r.computeType==='formula'?'selected':''}>Formula</option>
      </select></div>
      <div class="field" id="row_fixed"><label>Amount (₹)</label><input type="number" id="f_amount" value="${r.amount}"></div>
      <div class="field" id="row_pct"><label>Base rule code</label><input id="f_base" value="${r.baseCode}" placeholder="e.g. BASIC (or CTC)"></div>
      <div class="field full" id="row_formula"><label>Formula</label><input id="f_formula" value="${r.formula}" placeholder="e.g. {GROSS}-{PF}-{TAX}">
        <div class="hint">Reference any earlier rule with {CODE}, e.g. {BASIC}, {GROSS}. {CTC} is the contract wage.</div></div>
    </div></div>
    <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Forms.saveRule('${id||''}')">Save Rule</button></div>
  `, true);
  Forms.toggleRuleInputs();
};
Forms.toggleRuleInputs = function(){
  const t = document.getElementById('f_ctype').value;
  document.getElementById('row_fixed').style.display = t==='fixed' ? 'block':'none';
  document.getElementById('row_pct').style.display = t==='percentage' ? 'block':'none';
  document.getElementById('row_formula').style.display = t==='formula' ? 'block':'none';
};
Forms.saveRule = function(id){
  const val = k=>document.getElementById(k).value;
  const data = { name:val('f_name'), code:val('f_code').toUpperCase(), category:val('f_cat'), computeType:val('f_ctype'),
    amount:Number(val('f_amount')||0), baseCode:val('f_base').toUpperCase(), formula:val('f_formula') };
  if(!data.name || !data.code){ toast('Name and code are required','warn'); return; }
  if(id){ Object.assign(DB.rules.find(x=>x.id===id), data); toast('Rule updated','ok'); }
  else { data.id = uid('r'); DB.rules.push(data); toast('Rule created','ok'); }
  closeModal(); St.sub.payTab='rules'; App.go('payroll');
};

/* =========================================================================
   PAYRUN WIZARD (2-step: scope -> employees)
   ========================================================================= */
const Wizard = { step:1, structureId:'st_regular', period:'2026-09', selected:new Set() };
Wizard.open = function(){
  Wizard.step = 1; Wizard.structureId='st_regular'; Wizard.period='2026-09'; Wizard.selected=new Set();
  Wizard.render();
};
Wizard.render = function(){
  if(Wizard.step===1){
    openModal(`
      <div class="modalHead"><h3>New Payrun</h3><button class="modalClose" onclick="closeModal()">×</button></div>
      <div class="modalBody">
        <div class="stepDots"><b>Step 1 of 2</b> — Define scope &nbsp;→&nbsp; Step 2 — Select employees</div>
        <div class="field"><label>Salary Structure</label><select id="w_structure">${DB.structures.map(s=>`<option value="${s.id}" ${Wizard.structureId===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
        <div class="field" style="margin-top:12px;"><label>Payroll Period</label><input type="month" id="w_period" value="${Wizard.period}"></div>
        <div class="hint">This step only defines scope. The Payrun record is only created after you select employees on the next step.</div>
      </div>
      <div class="modalFoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn solid" onclick="Wizard.toStep2()">Continue →</button></div>
    `);
  } else {
    const structure = getStructure(Wizard.structureId);
    const eligible = DB.employees.filter(e=> e.status==='Active' && DB.contracts.some(c=>c.employeeId===e.id && c.structureId===Wizard.structureId));
    openModal(`
      <div class="modalHead"><h3>New Payrun</h3><button class="modalClose" onclick="closeModal()">×</button></div>
      <div class="modalBody">
        <div class="stepDots">Step 1 ✓ ${structure.name} · ${periodLabel(Wizard.period)} &nbsp;→&nbsp; <b>Step 2 of 2 — Select employees</b></div>
        <div class="checklistBox">
          ${eligible.map(e=>`<label class="checklistItem"><input type="checkbox" data-emp="${e.id}" ${Wizard.selected.has(e.id)?'checked':''} onchange="Wizard.toggle('${e.id}',this.checked)"><span><b>${e.name}</b> — ${e.position}</span></label>`).join('') || `<div class="emptyState">No employees are on this salary structure.</div>`}
        </div>
        <div class="hint">${Wizard.selected.size} of ${eligible.length} employees selected. The payrun created only includes the selected employees.</div>
      </div>
      <div class="modalFoot"><button class="btn" onclick="Wizard.step=1; Wizard.render()">← Back</button><button class="btn solid" onclick="Wizard.create()" ${Wizard.selected.size===0?'disabled':''}>Create Payrun</button></div>
    `, true);
  }
};
Wizard.toStep2 = function(){
  Wizard.structureId = document.getElementById('w_structure').value;
  Wizard.period = document.getElementById('w_period').value || Wizard.period;
  Wizard.selected = new Set(DB.employees.filter(e=>e.status==='Active' && DB.contracts.some(c=>c.employeeId===e.id && c.structureId===Wizard.structureId)).map(e=>e.id));
  Wizard.step = 2; Wizard.render();
};
Wizard.toggle = function(id, on){ on ? Wizard.selected.add(id) : Wizard.selected.delete(id); };
Wizard.create = function(){
  const structure = getStructure(Wizard.structureId);
  const payrun = { id:uid('PR'), name:periodLabel(Wizard.period)+' — '+structure.name, structureId:Wizard.structureId, period:Wizard.period, employeeIds:[...Wizard.selected], status:'Draft', warnings:[], sent:false, createdDate: new Date().toISOString().slice(0,10) };
  DB.payruns.push(payrun);
  closeModal(); toast('Payrun created — only the selected employees are included', 'ok');
  App.go('payrun-detail',{id:payrun.id});
};

/* =========================================================================
   INIT
   ========================================================================= */
window.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
