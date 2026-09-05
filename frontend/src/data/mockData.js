export const DEMO_TODAY = new Date();

export const DB = {
  departments: [],
  jobPositions: [],
  employees: [],
  schedules: [],
  contracts: [],
  rules: [],
  structures: [],
  attendance: [],
  timeoffTypes: [],
  allocations: [],
  requests: [],
  payruns: [],
  payslips: [],
};

let uidCounter = 0;
export const uid = (prefix) => `${prefix}_${Date.now()}_${uidCounter++}`;
export const fmtMoney = (value) => `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
export const fmtDate = (value) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
export const periodLabel = (period) => {
  if (!period) return '—';
  const [year, month] = period.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};
export const initials = (name = '') => name.split(' ').filter(Boolean).map((word) => word[0]).slice(0, 2).join('').toUpperCase();

export function weeklyHours(schedule) {
  if (!schedule?.days) return 0;
  let minutes = 0;
  schedule.days.forEach((day) => {
    if (!day.on || !day.start || !day.end) return;
    const [startHour, startMinute] = day.start.split(':').map(Number);
    const [endHour, endMinute] = day.end.split(':').map(Number);
    minutes += (endHour * 60 + endMinute) - (startHour * 60 + startMinute) - Number(day.brk || 0);
  });
  return Math.round((minutes / 60) * 10) / 10;
}

export function workedHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [startHour, startMinute] = checkIn.split(':').map(Number);
  const [endHour, endMinute] = checkOut.split(':').map(Number);
  return Math.round((((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60) * 10) / 10;
}

export const getEmp = (id) => DB.employees.find((employee) => employee.id === id);
export const getSchedule = (id) => DB.schedules.find((schedule) => schedule.id === id);
export const empContracts = (id) => DB.contracts
  .filter((contract) => contract.employeeId === id)
  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
export const getStructure = (id) => DB.structures.find((structure) => structure.id === id);
export const getAlloc = (employeeId, typeId) => DB.allocations.find((allocation) => allocation.employeeId === employeeId && allocation.typeId === typeId);
export const allocRemaining = (allocation) => Number(allocation?.allocated || 0) - Number(allocation?.used || 0);
export const isContractActive = (contract) => {
  const start = new Date(contract.startDate);
  const end = contract.endDate ? new Date(contract.endDate) : null;
  return start <= DEMO_TODAY && (!end || end >= DEMO_TODAY);
};

export function pickContractForPeriod(employeeId, period) {
  const [year, month] = period.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  return empContracts(employeeId).find((contract) => {
    const start = new Date(contract.startDate);
    const end = contract.endDate ? new Date(contract.endDate) : null;
    return start <= periodEnd && (!end || end >= periodStart);
  });
}

export function computeSalaryLines(contract, structure) {
  const rules = (structure?.ruleIds || [])
    .map((id) => DB.rules.find((rule) => rule.id === id))
    .filter(Boolean);
  const context = { CTC: Number(contract?.wage || 0) };
  return rules.map((rule) => {
    let amount = 0;
    if (rule.computeType === 'fixed') amount = Number(rule.amount || 0);
    if (rule.computeType === 'percentage') amount = Number(context[rule.baseCode] || 0) * (Number(rule.amount || 0) / 100);
    context[rule.code] = Math.round(amount * 100) / 100;
    return { code: rule.code, name: rule.name, category: rule.category, amount: context[rule.code] };
  });
}
