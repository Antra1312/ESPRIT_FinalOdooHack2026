// Simple in-memory DB - keeps logic from PeoplePay360.html but trimmed
// Seeded data matches problem statement: 10 employees, contracts history, schedules, rules

export const DEMO_TODAY = new Date('2026-09-05T00:00:00');
let UID = 1000;
export const uid = (p) => `${p}_${UID++}`;
export const fmtMoney = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
export const periodLabel = (p) => { if(!p) return '—'; const [y,m]=p.split('-'); return new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'}); };
export const initials = (name) => name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

export const DB = {
  employees: [
    {id:'E1',name:'Antra Gajjar',dept:'IT',position:'Software Developer',managerId:'E2',scheduleId:'sch1',status:'Active',employeeType:'Full-time',email:'antra.gajjar@peoplepay360.com',phone:'98200 11234',bankAccount:'HDFC •••• 4521',pan:'ABCDP1234F',joinDate:'2024-01-15'},
    {id:'E2',name:'Rahul Sharma',dept:'IT',position:'Engineering Manager',managerId:null,scheduleId:'sch1',status:'Active',employeeType:'Full-time',email:'rahul.sharma@peoplepay360.com',phone:'98200 11235',bankAccount:'ICICI •••• 7788',pan:'ABCDR5678K',joinDate:'2021-03-01'},
    {id:'E3',name:'Priya Verma',dept:'HR',position:'HR Executive',managerId:'E9',scheduleId:'sch1',status:'Active',employeeType:'Full-time',email:'priya.verma@peoplepay360.com',phone:'98200 11236',bankAccount:'SBI •••• 3321',pan:'ABCDV4455L',joinDate:'2023-06-01'},
    {id:'E4',name:'Yash Kumavat',dept:'Finance',position:'Financial Analyst',managerId:'E9',scheduleId:'sch1',status:'Active',employeeType:'Full-time',email:'yash.kumavat@peoplepay360.com',phone:'98200 11237',bankAccount:'AXIS •••• 9012',pan:'ABCDK7890M',joinDate:'2024-02-01'},
    {id:'E5',name:'Aarav Mehta',dept:'IT',position:'QA Engineer',managerId:'E2',scheduleId:'sch1',status:'Active',employeeType:'Contract',email:'aarav.mehta@peoplepay360.com',phone:'98200 11238',bankAccount:'HDFC •••• 5566',pan:'ABCDM3344N',joinDate:'2023-09-01'},
    {id:'E6',name:'Aisha Khan',dept:'Sales',position:'Sales Executive',managerId:'E10',scheduleId:'sch2',status:'Active',employeeType:'Full-time',email:'aisha.khan@peoplepay360.com',phone:'98200 11239',bankAccount:'KOTAK •••• 6677',pan:'ABCDK2233P',joinDate:'2022-11-01'},
    {id:'E7',name:'John Doe',dept:'IT',position:'DevOps Engineer',managerId:'E2',scheduleId:'sch1',status:'Active',employeeType:'Contract',email:'john.doe@peoplepay360.com',phone:'98200 11240',bankAccount:'',pan:'ABCDD8899Q',joinDate:'2021-07-01'},
    {id:'E8',name:'Meera Iyer',dept:'HR',position:'Recruiter',managerId:'E9',scheduleId:'sch1',status:'Active',employeeType:'Full-time',email:'meera.iyer@peoplepay360.com',phone:'98200 11241',bankAccount:'SBI •••• 1122',pan:'ABCDI6677R',joinDate:'2024-05-01'},
    {id:'E9',name:'Karan Patel',dept:'HR',position:'HR Manager',managerId:null,scheduleId:'sch1',status:'Active',employeeType:'Full-time',email:'karan.patel@peoplepay360.com',phone:'98200 11242',bankAccount:'ICICI •••• 4433',pan:'',joinDate:'2020-01-01'},
    {id:'E10',name:'Sara Ali',dept:'Sales',position:'Sales Manager',managerId:null,scheduleId:'sch2',status:'Active',employeeType:'Contract',email:'sara.ali@peoplepay360.com',phone:'98200 11243',bankAccount:'AXIS •••• 8899',pan:'ABCDA1122S',joinDate:'2019-04-01'},
  ],
  schedules: [
    { id:'sch1', name:'Standard 40h', type:'Fixed', days:[
        {day:'Mon',on:true,start:'09:00',end:'18:00',brk:60},{day:'Tue',on:true,start:'09:00',end:'18:00',brk:60},{day:'Wed',on:true,start:'09:00',end:'18:00',brk:60},{day:'Thu',on:true,start:'09:00',end:'18:00',brk:60},{day:'Fri',on:true,start:'09:00',end:'18:00',brk:60},{day:'Sat',on:false,start:'',end:'',brk:0},{day:'Sun',on:false,start:'',end:'',brk:0}]},
    { id:'sch2', name:'Sales Flex 40h', type:'Flexible', days:[
        {day:'Mon',on:true,start:'10:00',end:'19:00',brk:60},{day:'Tue',on:true,start:'10:00',end:'19:00',brk:60},{day:'Wed',on:true,start:'10:00',end:'19:00',brk:60},{day:'Thu',on:true,start:'10:00',end:'19:00',brk:60},{day:'Fri',on:true,start:'10:00',end:'19:00',brk:60},{day:'Sat',on:false,start:'',end:'',brk:0},{day:'Sun',on:false,start:'',end:'',brk:0}]},
  ],
  contracts: [
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
    {id:'C12',employeeId:'E10',position:'Sales Manager',dept:'Sales',wage:80000,structureId:'st_sales',startDate:'2019-04-01',endDate:null},
  ],
  rules: [
    {id:'r_basic',code:'BASIC',name:'Basic Salary',category:'Basic',computeType:'percentage',baseCode:'CTC',amount:80,sequence:10,formula:''},
    {id:'r_hra',code:'HRA',name:'House Rent Allowance',category:'Allowances',computeType:'percentage',baseCode:'BASIC',amount:20,sequence:20,formula:''},
    {id:'r_travel',code:'TRAVEL',name:'Travel Allowance',category:'Allowances',computeType:'fixed',baseCode:'',amount:2000,sequence:30,formula:''},
    {id:'r_gross',code:'GROSS',name:'Gross Salary',category:'Gross',computeType:'formula',baseCode:'',amount:0,sequence:40,formula:'{BASIC}+{HRA}+{TRAVEL}'},
    {id:'r_pf',code:'PF',name:'Provident Fund',category:'Deductions',computeType:'percentage',baseCode:'BASIC',amount:10,sequence:50,formula:''},
    {id:'r_tax',code:'TAX',name:'Income Tax (TDS)',category:'Deductions',computeType:'formula',baseCode:'',amount:0,sequence:60,formula:'{GROSS} > 40000 ? 2000 : 0'},
    {id:'r_net',code:'NET',name:'Net Salary',category:'Net',computeType:'formula',baseCode:'',amount:0,sequence:70,formula:'{GROSS}-{PF}-{TAX}'},
  ],
  structures: [
    {id:'st_regular',name:'Regular Salary',status:'Active',ruleIds:['r_basic','r_hra','r_travel','r_gross','r_pf','r_tax','r_net']},
    {id:'st_sales',name:'Sales Incentive Salary',status:'Active',ruleIds:['r_basic','r_hra','r_gross','r_pf','r_tax','r_net']},
  ],
  attendance: [
    {id:'AT_1000',employeeId:'E1',date:'2026-09-01',checkIn:'09:03',checkOut:'18:12',status:'Normal',note:''},
    {id:'AT_1001',employeeId:'E1',date:'2026-09-02',checkIn:'09:05',checkOut:'18:10',status:'Normal',note:''},
    {id:'AT_1002',employeeId:'E1',date:'2026-09-03',checkIn:'09:40',checkOut:'18:05',status:'Late',note:'Traffic delay'},
    {id:'AT_1003',employeeId:'E1',date:'2026-09-04',checkIn:'09:01',checkOut:'18:00',status:'Normal',note:''},
    {id:'AT_1004',employeeId:'E5',date:'2026-09-01',checkIn:'09:02',checkOut:'18:03',status:'Normal',note:''},
    {id:'AT_1005',employeeId:'E5',date:'2026-09-02',checkIn:'09:55',checkOut:'18:20',status:'Late',note:''},
    {id:'AT_1006',employeeId:'E5',date:'2026-09-03',checkIn:'09:00',checkOut:'',status:'Missing Checkout',note:'Forgot to check out'},
    {id:'AT_1007',employeeId:'E3',date:'2026-09-01',checkIn:'08:58',checkOut:'18:04',status:'Normal',note:''},
    {id:'AT_1008',employeeId:'E6',date:'2026-09-01',checkIn:'10:05',checkOut:'19:10',status:'Normal',note:''},
    {id:'AT_1009',employeeId:'E6',date:'2026-09-02',checkIn:'10:45',checkOut:'19:00',status:'Late',note:''},
  ],
  timeoffTypes: [
    {id:'TT1',name:'Annual Leave',unit:'days',requiresAllocation:true,approvalRequired:true,payrollIntegration:true,color:'#0EA5A0'},
    {id:'TT2',name:'Sick Leave',unit:'days',requiresAllocation:true,approvalRequired:true,payrollIntegration:true,color:'#C77D14'},
    {id:'TT3',name:'Unpaid Leave',unit:'days',requiresAllocation:false,approvalRequired:true,payrollIntegration:false,color:'#94A0B8'},
  ],
  allocations: [],
  requests: [
    {id:'RQ_1010',employeeId:'E1',typeId:'TT1',from:'2026-09-10',to:'2026-09-12',duration:3,status:'Pending',reason:'Family function'},
    {id:'RQ_1011',employeeId:'E5',typeId:'TT2',from:'2026-08-20',to:'2026-08-20',duration:1,status:'Approved',reason:'Fever'},
    {id:'RQ_1012',employeeId:'E6',typeId:'TT1',from:'2026-09-18',to:'2026-09-19',duration:2,status:'Pending',reason:'Personal travel'},
  ],
  payruns: [],
  payslips: [],
};

// init allocations
DB.employees.forEach(e=>{
  DB.allocations.push({id:uid('AL'),employeeId:e.id,typeId:'TT1',allocated:20,used:(e.id==='E1'?5:2),validFrom:'2026-01-01',validTo:'2026-12-31',status:'Approved'});
  DB.allocations.push({id:uid('AL'),employeeId:e.id,typeId:'TT2',allocated:10,used:1,validFrom:'2026-01-01',validTo:'2026-12-31',status:'Approved'});
});

export function weeklyHours(s){ let mins=0; s.days.forEach(d=>{ if(d.on&&d.start&&d.end){ const [sh,sm]=d.start.split(':').map(Number); const [eh,em]=d.end.split(':').map(Number); mins += (eh*60+em)-(sh*60+sm)-(d.brk||0); } }); return Math.round(mins/60*10)/10; }
export function workedHours(checkIn, checkOut){ if(!checkIn||!checkOut) return 0; const [sh,sm]=checkIn.split(':').map(Number); const [eh,em]=checkOut.split(':').map(Number); return Math.round(((eh*60+em)-(sh*60+sm))/60*10)/10; }
export function isContractActive(c){ const s=new Date(c.startDate); const e=c.endDate?new Date(c.endDate):null; return s<=DEMO_TODAY && (!e||e>=DEMO_TODAY); }
export function getEmp(id){ return DB.employees.find(e=>e.id===id); }
export function getSchedule(id){ return DB.schedules.find(s=>s.id===id); }
export function empContracts(id){ return DB.contracts.filter(c=>c.employeeId===id).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)); }
export function pickContractForPeriod(employeeId, period){
  const [y,m] = period.split('-').map(Number);
  const ps = new Date(y, m-1, 1); const pe = new Date(y, m, 0);
  return empContracts(employeeId).find(c=>{ const s=new Date(c.startDate); const e=c.endDate?new Date(c.endDate):null; return s<=pe && (!e||e>=ps); });
}
export function evalExpr(expr, ctx){
  const sub = expr.replace(/\{(\w+)\}/g, (m,code)=> (ctx[code]!==undefined ? ctx[code] : 0));
  try{ return Function('"use strict"; return ('+sub+');')(); }catch{ return 0; }
}
export function computeSalaryLines(contract, structure){
  const rules = structure.ruleIds.map(id=>DB.rules.find(r=>r.id===id)).filter(Boolean);
  const ctx={CTC:contract.wage}; const lines=[];
  rules.forEach(rule=>{
    let v=0;
    if(rule.computeType==='fixed') v=rule.amount;
    else if(rule.computeType==='percentage') v=(ctx[rule.baseCode]||0)*(rule.amount/100);
    else if(rule.computeType==='formula') v=evalExpr(rule.formula, ctx);
    v=Math.round(v*100)/100; ctx[rule.code]=v;
    lines.push({code:rule.code,name:rule.name,category:rule.category,amount:v});
  });
  return lines;
}
export function getStructure(id){ return DB.structures.find(s=>s.id===id); }
export function getAlloc(employeeId,typeId){ return DB.allocations.find(a=>a.employeeId===employeeId && a.typeId===typeId); }
export function allocRemaining(a){ return a.allocated - a.used; }

// seed payruns — workedDays added per B7 spec
function seedPayrun(name, period){
  const ids=[...new Set(DB.contracts.filter(c=>c.structureId==='st_regular').map(c=>c.employeeId))];
  const pr={id:uid('PR'),name,structureId:'st_regular',period,employeeIds:ids,status:'Draft',warnings:[],sent:false,createdDate:period+'-01',payslipIds:[]};
  DB.payruns.push(pr);
  // compute
  const structure=getStructure(pr.structureId);
  pr.payslipIds=[];
  pr.employeeIds.forEach(empId=>{
    const contract=pickContractForPeriod(empId, pr.period);
    let lines=[];
    if(contract) lines=computeSalaryLines(contract, structure);
    const gross=(lines.find(l=>l.category==='Gross')||{}).amount||0;
    const ded=lines.filter(l=>l.category==='Deductions').reduce((s,l)=>s+l.amount,0);
    const net=(lines.find(l=>l.category==='Net')||{}).amount|| (gross-ded);
    const workedDays=22;
    const ps={id:uid('PS'),payrunId:pr.id,employeeId:empId,period:pr.period,contractId:contract?.id||null,structureId:structure.id,lines,gross,deductions:ded,net,workedDays,status:'Computed',sent:false};
    DB.payslips.push(ps); pr.payslipIds.push(ps.id);
  });
  pr.status='Paid'; pr.payslipIds.forEach(pid=>{ const p=DB.payslips.find(x=>x.id===pid); if(p) p.status='Paid'; });
  pr.sent=true;
}
seedPayrun('July 2026 — Regular Salary','2026-07');
seedPayrun('August 2026 — Regular Salary','2026-08');
// draft for Sep
(function(){
  const ids=[...new Set(DB.contracts.filter(c=>c.structureId==='st_regular').map(c=>c.employeeId))];
  DB.payruns.push({id:uid('PR'),name:'September 2026 — Regular Salary',structureId:'st_regular',period:'2026-09',employeeIds:ids,status:'Draft',warnings:[],sent:false,createdDate:'2026-09-01',payslipIds:[]});
})();
