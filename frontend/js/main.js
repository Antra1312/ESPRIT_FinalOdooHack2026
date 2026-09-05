import { DB, getEmp } from './store.js';\nimport { toast } from './ui.js';\nimport { dashboard } from './views/dashboard.js';\nimport { employees } from './views/employees.js';\nimport { contracts } from './views/contracts.js';\nimport { schedules } from './views/schedules.js';\nimport { attendance } from './views/attendance.js';\nimport { timeoff } from './views/timeoff.js';\nimport { payroll } from './views/payroll.js';\nimport { users } from './views/users.js';\n\n
/* =========================================================================
   PeoplePay360 — HR & Payroll — Single-file demo prototype
   Vanilla JS, in-memory data model. No backend. Data resets on reload.
   ========================================================================= */

const DEMO_TODAY = new Date('2026-09-05T00:00:00');
let UID_COUNTER = 1000;
function uid(prefix){ return prefix + '_' + (UID_COUNTER++); }
function fmtMoney(n){ return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtDate(d){ if(!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function periodLabel(p){ if(!p) return '—'; const [y,m]=p.split('-'); const dt=new Date(y,m-1,1); return dt.toLocaleDateString('en-IN',{month:'long',year:'numeric'}); }
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function colorFor(seed){ const colors=['#0EA5A0','#123A5E','#C77D14','#7C5CBF','#1E9E5A','#C1373B','#1B5FA6']; let h=0; for(const c of seed) h+=c.charCodeAt(0); return colors[h%colors.length]; }

/* ---------------------------------------------------------------------
   SEED DATA
--------------------------------------------------------------------- */
const DB = { employees:[], contracts:[], schedules:[], attendance:[], timeoffTypes:[], allocations:[], requests:[], structures:[], rules:[], payruns:[], payslips:[] };

// Schedules
DB.schedules.push(
  { id:'sch1', name:'Standard 40h', type:'Fixed', days:[
      {day:'Mon',on:true,start:'09:00',end:'18:00',brk:60},
      {day:'Tue',on:true,start:'09:00',end:'18:00',brk:60},
      {day:'Wed',on:true,start:'09:00',end:'18:00',brk:60},
      {day:'Thu',on:true,start:'09:00',end:'18:00',brk:60},
      {day:'Fri',on:true,start:'09:00',end:'18:00',brk:60},
      {day:'Sat',on:false,start:'',end:'',brk:0},{day:'Sun',on:false,start:'',end:'',brk:0}]},
  { id:'sch2', name:'Sales Flex 40h', type:'Flexible', days:[
      {day:'Mon',on:true,start:'10:00',end:'19:00',brk:60},
      {day:'Tue',on:true,start:'10:00',end:'19:00',brk:60},
      {day:'Wed',on:true,start:'10:00',end:'19:00',brk:60},
      {day:'Thu',on:true,start:'10:00',end:'19:00',brk:60},
      {day:'Fri',on:true,start:'10:00',end:'19:00',brk:60},
      {day:'Sat',on:false,start:'',end:'',brk:0},{day:'Sun',on:false,start:'',end:'',brk:0}]}
);
function weeklyHours(s){ let mins=0; s.days.forEach(d=>{ if(d.on&&d.start&&d.end){ const [sh,sm]=d.start.split(':').map(Number); const [eh,em]=d.end.split(':').map(Number); mins += (eh*60+em)-(sh*60+sm)-(d.brk||0); } }); return Math.round(mins/60*10)/10; }

// Employees
DB.employees.push(
  {id:'E1',name:'Antra Gajjar',dept:'IT',position:'Software Developer',managerId:'E2',scheduleId:'sch1',status:'Active',email:'antra.gajjar@peoplepay360.com',phone:'98200 11234',bankAccount:'HDFC •••• 4521',pan:'ABCDP1234F',joinDate:'2024-01-15'},
  {id:'E2',name:'Rahul Sharma',dept:'IT',position:'Engineering Manager',managerId:null,scheduleId:'sch1',status:'Active',email:'rahul.sharma@peoplepay360.com',phone:'98200 11235',bankAccount:'ICICI •••• 7788',pan:'ABCDR5678K',joinDate:'2021-03-01'},
  {id:'E3',name:'Priya Verma',dept:'HR',position:'HR Executive',managerId:'E9',scheduleId:'sch1',status:'Active',email:'priya.verma@peoplepay360.com',phone:'98200 11236',bankAccount:'SBI •••• 3321',pan:'ABCDV4455L',joinDate:'2023-06-01'},
  {id:'E4',name:'Yash Kumavat',dept:'Finance',position:'Financial Analyst',managerId:'E9',scheduleId:'sch1',status:'Active',email:'yash.kumavat@peoplepay360.com',phone:'98200 11237',bankAccount:'AXIS •••• 9012',pan:'ABCDK7890M',joinDate:'2024-02-01'},
  {id:'E5',name:'Aarav Mehta',dept:'IT',position:'QA Engineer',managerId:'E2',scheduleId:'sch1',status:'Active',email:'aarav.mehta@peoplepay360.com',phone:'98200 11238',bankAccount:'HDFC •••• 5566',pan:'ABCDM3344N',joinDate:'2023-09-01'},
  {id:'E6',name:'Aisha Khan',dept:'Sales',position:'Sales Executive',managerId:'E10',scheduleId:'sch2',status:'Active',email:'aisha.khan@peoplepay360.com',phone:'98200 11239',bankAccount:'KOTAK •••• 6677',pan:'ABCDK2233P',joinDate:'2022-11-01'},
  {id:'E7',name:'John Doe',dept:'IT',position:'DevOps Engineer',managerId:'E2',scheduleId:'sch1',status:'Active',email:'john.doe@peoplepay360.com',phone:'98200 11240',bankAccount:'',pan:'ABCDD8899Q',joinDate:'2021-07-01'},
  {id:'E8',name:'Meera Iyer',dept:'HR',position:'Recruiter',managerId:'E9',scheduleId:'sch1',status:'Active',email:'meera.iyer@peoplepay360.com',phone:'98200 11241',bankAccount:'SBI •••• 1122',pan:'ABCDI6677R',joinDate:'2024-05-01'},
  {id:'E9',name:'Karan Patel',dept:'HR',position:'HR Manager',managerId:null,scheduleId:'sch1',status:'Active',email:'karan.patel@peoplepay360.com',phone:'98200 11242',bankAccount:'ICICI •••• 4433',pan:'',joinDate:'2020-01-01'},
  {id:'E10',name:'Sara Ali',dept:'Sales',position:'Sales Manager',managerId:null,scheduleId:'sch2',status:'Active',email:'sara.ali@peoplepay360.com',phone:'98200 11243',bankAccount:'AXIS •••• 8899',pan:'ABCDA1122S',joinDate:'2019-04-01'}
);

// Salary Structures & Rules
DB.rules.push(
  {id:'r_basic',code:'BASIC',name:'Basic Salary',category:'Basic',computeType:'percentage',baseCode:'CTC',amount:80,formula:''},
  {id:'r_hra',code:'HRA',name:'House Rent Allowance',category:'Allowance',computeType:'percentage',baseCode:'BASIC',amount:20,formula:''},
  {id:'r_travel',code:'TRAVEL',name:'Travel Allowance',category:'Allowance',computeType:'fixed',baseCode:'',amount:2000,formula:''},
  {id:'r_gross',code:'GROSS',name:'Gross Salary',category:'Gross',computeType:'formula',baseCode:'',amount:0,formula:'{BASIC}+{HRA}+{TRAVEL}'},
  {id:'r_pf',code:'PF',name:'Provident Fund',category:'Deduction',computeType:'percentage',baseCode:'BASIC',amount:10,formula:''},
  {id:'r_tax',code:'TAX',name:'Income Tax (TDS)',category:'Deduction',computeType:'formula',baseCode:'',amount:0,formula:'{GROSS} > 40000 ? 2000 : 0'},
  {id:'r_net',code:'NET',name:'Net Salary',category:'Net',computeType:'formula',baseCode:'',amount:0,formula:'{GROSS}-{PF}-{TAX}'},
  {id:'r_incentive',code:'INCENTIVE',name:'Sales Incentive',category:'Allowance',computeType:'percentage',baseCode:'CTC',amount:15,formula:''},
  {id:'r_gross2',code:'GROSS2',name:'Gross Salary',category:'Gross',computeType:'formula',baseCode:'',amount:0,formula:'{BASIC}+{HRA}+{INCENTIVE}'},
  {id:'r_tax2',code:'TAX2',name:'Income Tax (TDS)',category:'Deduction',computeType:'formula',baseCode:'',amount:0,formula:'{GROSS2} > 40000 ? 2200 : 0'},
  {id:'r_net2',code:'NET2',name:'Net Salary',category:'Net',computeType:'formula',baseCode:'',amount:0,formula:'{GROSS2}-{PF}-{TAX2}'}
);
DB.structures.push(
  {id:'st_regular',name:'Regular Salary',status:'Active',ruleIds:['r_basic','r_hra','r_travel','r_gross','r_pf','r_tax','r_net']},
  {id:'st_sales',name:'Sales Incentive Salary',status:'Active',ruleIds:['r_basic','r_hra','r_incentive','r_gross2','r_pf','r_tax2','r_net2']}
);

// Contracts (history preserved; payroll must pick the one valid for the period)
DB.contracts.push(
  {id:'C1',employeeId:'E1',position:'Junior Developer',dept:'IT',wage:30000,structureId:'st_regular',startDate:'2024-01-15',endDate:'2024-12-31'},
  {id:'C2',employeeId:'E1',position:'Software Developer',dept:'IT',wage:45000,structureId:'st_regular',startDate:'2025-01-01',endDate:'2025-12-31'},
  {id:'C3',employeeId:'E1',position:'Software Developer',dept:'IT',wage:50000,structureId:'st_regular',startDate:'2026-01-01',endDate:null},
  {id:'C4',employeeId:'E2',position:'Engineering Manager',dept:'IT',wage:95000,structureId:'st_regular',startDate:'2022-01-01',endDate:null},
  {id:'C5',employeeId:'E3',position:'HR Executive',dept:'HR',wage:42000,structureId:'st_regular',startDate:'2023-06-01',endDate:null},
  {id:'C6',employeeId:'E4',position:'Financial Analyst',dept:'Finance',wage:55000,structureId:'st_regular',startDate:'2024-02-01',endDate:null},
  {id:'C7',employeeId:'E5',position:'QA Engineer',dept:'IT',wage:44000,structureId:'st_regular',startDate:'2023-09-01',endDate:null},
  {id:'C8',employeeId:'E6',position:'Sales Executive',dept:'Sales',wage:38000,structureId:'st_sales',startDate:'2022-11-01',endDate:null},
  {id:'C9',employeeId:'E7',position:'DevOps Engineer',dept:'IT',wage:62000,structureId:'st_regular',startDate:'2021-07-01',endDate:null},
  {id:'C10',employeeId:'E8',position:'Recruiter',dept:'HR',wage:36000,structureId:'st_regular',startDate:'2024-05-01',endDate:null},
  {id:'C11',employeeId:'E9',position:'HR Manager',dept:'HR',wage:72000,structureId:'st_regular',startDate:'2020-01-01',endDate:null},
  {id:'C12',employeeId:'E10',position:'Sales Manager',dept:'Sales',wage:80000,structureId:'st_sales',startDate:'2019-04-01',endDate:null}
);

// Attendance (Sept 2026 sample)
DB.attendance.push(
  {id:uid('AT'),employeeId:'E1',date:'2026-09-01',checkIn:'09:03',checkOut:'18:12',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E1',date:'2026-09-02',checkIn:'09:05',checkOut:'18:10',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E1',date:'2026-09-03',checkIn:'09:40',checkOut:'18:05',status:'Late',note:'Traffic delay'},
  {id:uid('AT'),employeeId:'E1',date:'2026-09-04',checkIn:'09:01',checkOut:'18:00',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E5',date:'2026-09-01',checkIn:'09:02',checkOut:'18:03',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E5',date:'2026-09-02',checkIn:'09:55',checkOut:'18:20',status:'Late',note:''},
  {id:uid('AT'),employeeId:'E5',date:'2026-09-03',checkIn:'09:00',checkOut:'',status:'Missing Checkout',note:'Forgot to check out'},
  {id:uid('AT'),employeeId:'E5',date:'2026-09-04',checkIn:'09:04',checkOut:'18:02',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E7',date:'2026-09-01',checkIn:'09:10',checkOut:'18:15',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E7',date:'2026-09-02',checkIn:'09:08',checkOut:'',status:'Missing Checkout',note:''},
  {id:uid('AT'),employeeId:'E7',date:'2026-09-03',checkIn:'09:00',checkOut:'18:00',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E3',date:'2026-09-01',checkIn:'08:58',checkOut:'18:04',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E3',date:'2026-09-02',checkIn:'09:01',checkOut:'18:00',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E6',date:'2026-09-01',checkIn:'10:05',checkOut:'19:10',status:'Normal',note:''},
  {id:uid('AT'),employeeId:'E6',date:'2026-09-02',checkIn:'10:45',checkOut:'19:00',status:'Late',note:''}
);

// Time Off Types
DB.timeoffTypes.push(
  {id:'TT1',name:'Annual Leave',unit:'days',requiresAllocation:true,color:'#0EA5A0'},
  {id:'TT2',name:'Sick Leave',unit:'days',requiresAllocation:true,color:'#C77D14'},
  {id:'TT3',name:'Unpaid Leave',unit:'days',requiresAllocation:false,color:'#94A0B8'}
);
// Allocations
DB.employees.forEach(e=>{
  DB.allocations.push({id:uid('AL'),employeeId:e.id,typeId:'TT1',allocated:20,used:(e.id==='E1'?5:2),validFrom:'2026-01-01',validTo:'2026-12-31',status:'Approved'});
  DB.allocations.push({id:uid('AL'),employeeId:e.id,typeId:'TT2',allocated:10,used:1,validFrom:'2026-01-01',validTo:'2026-12-31',status:'Approved'});
});
function getAlloc(employeeId,typeId){ return DB.allocations.find(a=>a.employeeId===employeeId&&a.typeId===typeId); }
function allocRemaining(a){ return a.allocated - a.used; }

// Time off requests
DB.requests.push(
  {id:uid('RQ'),employeeId:'E1',typeId:'TT1',from:'2026-09-10',to:'2026-09-12',duration:3,status:'Pending',reason:'Family function'},
  {id:uid('RQ'),employeeId:'E5',typeId:'TT2',from:'2026-08-20',to:'2026-08-20',duration:1,status:'Approved',reason:'Fever'},
  {id:uid('RQ'),employeeId:'E6',typeId:'TT1',from:'2026-09-18',to:'2026-09-19',duration:2,status:'Pending',reason:'Personal travel'},
  {id:uid('RQ'),employeeId:'E3',typeId:'TT3',from:'2026-07-05',to:'2026-07-05',duration:1,status:'Rejected',reason:'Unplanned'}
);

/* ---------------------------------------------------------------------
   HELPERS: contract selection, payroll computation, warnings
--------------------------------------------------------------------- */
function getEmp(id){ return DB.employees.find(e=>e.id===id); }
function getSchedule(id){ return DB.schedules.find(s=>s.id===id); }
function empContracts(id){ return DB.contracts.filter(c=>c.employeeId===id).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)); }
function isContractActive(c){ const s=new Date(c.startDate); const e=c.endDate?new Date(c.endDate):null; return s<=DEMO_TODAY && (!e||e>=DEMO_TODAY); }
function currentContract(employeeId){ return empContracts(employeeId).find(isContractActive); }

function pickContractForPeriod(employeeId, period){
  const [y,m] = period.split('-').map(Number);
  const periodStart = new Date(y, m-1, 1);
  const periodEnd = new Date(y, m, 0);
  return empContracts(employeeId).find(c=>{
    const s = new Date(c.startDate);
    const e = c.endDate ? new Date(c.endDate) : null;
    return s <= periodEnd && (!e || e >= periodStart);
  });
}

function evalExpr(expr, ctx){
  const sub = expr.replace(/\{(\w+)\}/g, (m,code)=> (ctx[code]!==undefined ? ctx[code] : 0));
  try{ return Function('"use strict"; return (' + sub + ');')(); }catch(err){ return 0; }
}

function computeSalaryLines(contract, structure){
  const rules = structure.ruleIds.map(id=>DB.rules.find(r=>r.id===id)).filter(Boolean);
  const ctx = { CTC: contract.wage };
  const lines = [];
  rules.forEach(rule=>{
    let value = 0;
    if(rule.computeType==='fixed') value = rule.amount;
    else if(rule.computeType==='percentage') value = (ctx[rule.baseCode]||0) * (rule.amount/100);
    else if(rule.computeType==='formula') value = evalExpr(rule.formula, ctx);
    value = Math.round(value*100)/100;
    ctx[rule.code] = value;
    lines.push({code:rule.code,name:rule.name,category:rule.category,amount:value});
  });
  const gross = (lines.find(l=>l.category==='Gross')||{}).amount ?? lines.filter(l=>l.category==='Basic'||l.category==='Allowance').reduce((s,l)=>s+l.amount,0);
  const deductions = lines.filter(l=>l.category==='Deduction').reduce((s,l)=>s+l.amount,0);
  const netLine = lines.find(l=>l.category==='Net');
  const net = netLine ? netLine.amount : (gross-deductions);
  return { lines, gross, deductions, net };
}

function getPayrun(id){ return DB.payruns.find(p=>p.id===id); }
function getPayslip(id){ return DB.payslips.find(p=>p.id===id); }
function getStructure(id){ return DB.structures.find(s=>s.id===id); }

function computePayrun(payrunId){
  const payrun = getPayrun(payrunId);
  const structure = getStructure(payrun.structureId);
  payrun.payslipIds = [];
  payrun.employeeIds.forEach(empId=>{
    const emp = getEmp(empId);
    const contract = pickContractForPeriod(empId, payrun.period);
    let lines=[], gross=0, deductions=0, net=0;
    if(contract){ const r = computeSalaryLines(contract, structure); lines=r.lines; gross=r.gross; deductions=r.deductions; net=r.net; }
    const payslip = { id:uid('PS'), payrunId, employeeId:empId, period:payrun.period, contractId: contract?contract.id:null, structureId:structure.id, lines, gross, deductions, net, status:'Computed', sent:false, sentDate:null };
    DB.payslips.push(payslip);
    payrun.payslipIds.push(payslip.id);
  });
  payrun.status = 'Computed';
}

function computeWarnings(payrun){
  const warnings = [];
  (payrun.payslipIds||[]).forEach(pid=>{
    const ps = getPayslip(pid); const emp = getEmp(ps.employeeId);
    if(!emp.bankAccount) warnings.push({type:'bank', icon:'🏦', employeeId:emp.id, message:emp.name+': missing bank account details'});
    if(!emp.pan) warnings.push({type:'info', icon:'⚠️', employeeId:emp.id, message:emp.name+': employee information incomplete (PAN missing)'});
    if(!ps.contractId) warnings.push({type:'contract', icon:'📄', employeeId:emp.id, message:emp.name+': no contract found covering '+periodLabel(ps.period)});
    const dup = DB.payslips.find(p=>p.id!==ps.id && p.employeeId===ps.employeeId && p.period===ps.period);
    if(dup) warnings.push({type:'duplicate', icon:'🧾', employeeId:emp.id, message:emp.name+': duplicate payslip already exists for '+periodLabel(ps.period)});
  });
  return warnings;
}

function validatePayrun(id){
  const payrun = getPayrun(id);
  payrun.warnings = computeWarnings(payrun);
  payrun.status = 'Validated';
  (payrun.payslipIds||[]).forEach(pid=> getPayslip(pid).status='Validated');
}

function markPayrunPaid(id){
  const payrun = getPayrun(id);
  if(payrun.warnings && payrun.warnings.length){
    if(!confirm(payrun.warnings.length+' warning(s) were found for this payrun. Mark as paid anyway?')) return false;
  }
  payrun.status = 'Paid';
  (payrun.payslipIds||[]).forEach(pid=> getPayslip(pid).status='Paid');
  return true;
}

function sendPayslips(payrunId){
  const payrun = getPayrun(payrunId);
  (payrun.payslipIds||[]).forEach(pid=>{ const ps=getPayslip(pid); ps.sent=true; ps.sentDate=new Date().toISOString().slice(0,10); });
  payrun.sent = true;
}

// Seed two historical, already-paid payruns so the Dashboard has trend data
function seedHistoricalPayrun(name, period){
  const regularEmployees = DB.contracts.filter(c=>c.structureId==='st_regular').map(c=>c.employeeId);
  const uniqueIds = [...new Set(regularEmployees)];
  const payrun = { id:uid('PR'), name, structureId:'st_regular', period, employeeIds:uniqueIds, status:'Draft', warnings:[], sent:false, createdDate:period+'-01' };
  DB.payruns.push(payrun);
  computePayrun(payrun.id);
  validatePayrun(payrun.id);
  markPayrunPaidSilently(payrun.id);
  sendPayslips(payrun.id);
}
function markPayrunPaidSilently(id){ const payrun=getPayrun(id); payrun.status='Paid'; (payrun.payslipIds||[]).forEach(pid=>getPayslip(pid).status='Paid'); }
seedHistoricalPayrun('July 2026 — Regular Salary','2026-07');
seedHistoricalPayrun('August 2026 — Regular Salary','2026-08');

// Live draft payrun for the demo walkthrough
(function seedDraftPayrun(){
  const regularEmployees = [...new Set(DB.contracts.filter(c=>c.structureId==='st_regular').map(c=>c.employeeId))];
  DB.payruns.push({ id:uid('PR'), name:'September 2026 — Regular Salary', structureId:'st_regular', period:'2026-09', employeeIds:regularEmployees, status:'Draft', warnings:[], sent:false, createdDate:'2026-09-01' });
})();

/* =========================================================================
   APP STATE / ROUTER
   ========================================================================= */
const ROLES = {
  employee:{ label:'Employee', color:'#4C7EA8' },
  hr_manager:{ label:'HR Manager', color:'#0EA5A0' },
  hr_payroll_user:{ label:'HR Payroll User', color:'#C77D14' },
  hr_payroll_manager:{ label:'HR Payroll Manager', color:'#7C5CBF' },
  admin:{ label:'Admin', color:'#C1373B' }
};
const ROLE_DEMO_USER = { employee:'E1', hr_manager:'E9', hr_payroll_user:'E8', hr_payroll_manager:'E2', admin:'E2' };

const NAV_ITEMS = [
  {key:'dashboard', label:'Dashboard', roles:['hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {key:'employees', label:'Employees', roles:['employee','hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {key:'contracts', label:'Contracts', roles:['hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {key:'schedules', label:'Working Schedules', roles:['hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {key:'attendance', label:'Attendance', roles:['employee','hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {key:'timeoff', label:'Time Off', roles:['employee','hr_manager','hr_payroll_user','hr_payroll_manager','admin']},
  {key:'payroll', label:'Payroll', roles:['hr_payroll_user','hr_payroll_manager','admin']},
  {key:'users', label:'Users', roles:['admin']}
];

const St = { user:null, route:'dashboard', sub:{}, };

const App = {

login(role){
  const empId = ROLE_DEMO_USER[role];
  St.user = { role, employeeId: role==='employee'?empId:null, name: role==='employee'?getEmp(empId).name:getEmp(empId).name, actorId: empId };
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('appShell').style.display='flex';
  document.getElementById('rolePillLabel').textContent = ROLES[role].label;
  document.getElementById('userNameLabel').textContent = St.user.name;
  document.getElementById('userAvatar').textContent = initials(St.user.name);
  document.getElementById('userAvatar').style.background = ROLES[role].color;
  St.route = role==='employee' ? 'employees' : (NAV_ITEMS.find(n=>n.roles.includes(role)).key);
  renderNav();
  App.go(St.route);
  toast('Signed in as '+ROLES[role].label, 'ok');
},

logout(){
  St.user = null;
  document.getElementById('appShell').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
},

go(route, params){
  St.route = route; St.params = params||{};
  renderNav();
  Views[route] ? Views[route](St.params) : (document.getElementById('appBody').innerHTML='<div class="emptyState">Not found</div>');
  window.scrollTo(0,0);
}
};

function can(...roles){ return St.user && roles.includes(St.user.role); }
function isHR(){ return can('hr_manager','hr_payroll_user','hr_payroll_manager','admin'); }
function isPayroll(){ return can('hr_payroll_user','hr_payroll_manager','admin'); }
function isPayrollAdmin(){ return can('hr_payroll_manager','admin'); }

function renderNav(){
  const nav = document.getElementById('subnav'); nav.innerHTML='';
  NAV_ITEMS.filter(n=>n.roles.includes(St.user.role)).forEach(n=>{
    const b = document.createElement('button');
    b.className = 'navbtn'+(St.route===n.key || (n.key==='payroll' && St.route.startsWith('payroll'))? ' active':'');
    b.textContent = n.label;
    b.onclick = ()=> App.go(n.key==='payroll' ? 'payroll' : n.key);
    nav.appendChild(b);
  });
}

export { St, ROLES, can, isHR, isPayroll, isPayrollAdmin, App };

const Views = {
  dashboard, employees, contracts, schedules, attendance, timeoff, payroll, users
};

// Start
window.App = App;
App.go('dashboard');