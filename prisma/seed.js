const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const date = (value) => new Date(`${value}T00:00:00.000Z`);
const time = (value) => new Date(`1970-01-01T${value}Z`);

async function upsertSchedule(id, name, scheduleType, lines) {
  await prisma.workingSchedule.upsert({
    where: { id },
    update: { name, scheduleType, timezone: 'Asia/Kolkata', isActive: true },
    create: { id, name, scheduleType, timezone: 'Asia/Kolkata' },
  });

  for (const [index, line] of lines.entries()) {
    await prisma.workingScheduleLine.upsert({
      where: { workingScheduleId_dayOfWeek: { workingScheduleId: id, dayOfWeek: line.dayOfWeek } },
      update: {
        startTime: time(line.startTime),
        endTime: time(line.endTime),
        breakMinutes: line.breakMinutes,
        sequence: index,
      },
      create: {
        workingScheduleId: id,
        dayOfWeek: line.dayOfWeek,
        startTime: time(line.startTime),
        endTime: time(line.endTime),
        breakMinutes: line.breakMinutes,
        sequence: index,
      },
    });
  }
}

async function upsertAllocation(data) {
  const existing = await prisma.timeOffAllocation.findFirst({
    where: { employeeId: data.employeeId, timeOffTypeId: data.timeOffTypeId, validFrom: data.validFrom },
  });
  if (existing) {
    return prisma.timeOffAllocation.update({
      where: { id: existing.id },
      data: { allocatedAmount: data.allocatedAmount, status: data.status },
    });
  }
  return prisma.timeOffAllocation.create({ data });
}

async function main() {
  const departments = {};
  for (const department of [
    { code: 'IT', name: 'Information Technology' },
    { code: 'HR', name: 'Human Resources' },
    { code: 'FIN', name: 'Finance' },
    { code: 'SALES', name: 'Sales' },
  ]) {
    departments[department.code] = await prisma.department.upsert({
      where: { code: department.code },
      update: { name: department.name, isActive: true },
      create: department,
    });
  }

  const positions = {};
  for (const position of [
    { code: 'SWE', title: 'Software Developer', departmentId: departments.IT.id },
    { code: 'IT-MGR', title: 'Engineering Manager', departmentId: departments.IT.id },
    { code: 'HR-EXEC', title: 'HR Executive', departmentId: departments.HR.id },
    { code: 'FIN-ANL', title: 'Financial Analyst', departmentId: departments.FIN.id },
    { code: 'SALES-EXEC', title: 'Sales Executive', departmentId: departments.SALES.id },
  ]) {
    positions[position.code] = await prisma.jobPosition.upsert({
      where: { code: position.code },
      update: { title: position.title, departmentId: position.departmentId, isActive: true },
      create: position,
    });
  }

  await upsertSchedule('seed_standard_40', 'Standard 40 Hours', 'FIXED', [
    { dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
    { dayOfWeek: 'TUESDAY', startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
    { dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
    { dayOfWeek: 'THURSDAY', startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
    { dayOfWeek: 'FRIDAY', startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
  ]);
  await upsertSchedule('seed_sales_flex', 'Sales Flexible Schedule', 'FLEXIBLE', [
    { dayOfWeek: 'MONDAY', startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
    { dayOfWeek: 'TUESDAY', startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
    { dayOfWeek: 'WEDNESDAY', startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
    { dayOfWeek: 'THURSDAY', startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
    { dayOfWeek: 'FRIDAY', startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
  ]);

  const rules = {};
  for (const rule of [
    { code: 'BASIC', name: 'Basic Salary', category: 'BASIC', sequence: 10, computationType: 'PERCENTAGE', percentage: 80, percentageBase: 'CTC' },
    { code: 'HRA', name: 'House Rent Allowance', category: 'ALLOWANCE', sequence: 20, computationType: 'PERCENTAGE', percentage: 20, percentageBase: 'BASIC' },
    { code: 'TRAVEL', name: 'Travel Allowance', category: 'ALLOWANCE', sequence: 30, computationType: 'FIXED', fixedAmount: 2000 },
    { code: 'GROSS', name: 'Gross Salary', category: 'GROSS', sequence: 40, computationType: 'FORMULA', formula: '{BASIC}+{HRA}+{TRAVEL}' },
    { code: 'PF', name: 'Provident Fund', category: 'DEDUCTION', sequence: 50, computationType: 'PERCENTAGE', percentage: 10, percentageBase: 'BASIC' },
    { code: 'TAX', name: 'Income Tax', category: 'DEDUCTION', sequence: 60, computationType: 'FORMULA', formula: '{GROSS}>40000?2000:0' },
    { code: 'NET', name: 'Net Salary', category: 'NET', sequence: 70, computationType: 'FORMULA', formula: '{GROSS}-{PF}-{TAX}' },
  ]) {
    rules[rule.code] = await prisma.salaryRule.upsert({
      where: { code: rule.code },
      update: { ...rule, isActive: true },
      create: { ...rule, isActive: true },
    });
  }

  const regularStructure = await prisma.salaryStructure.upsert({
    where: { code: 'REGULAR' },
    update: { name: 'Regular Salary', isActive: true },
    create: { name: 'Regular Salary', code: 'REGULAR', description: 'Monthly salary with basic, allowances, deductions, and net pay.' },
  });
  for (const code of ['BASIC', 'HRA', 'TRAVEL', 'GROSS', 'PF', 'TAX', 'NET']) {
    await prisma.salaryStructureRule.upsert({
      where: { salaryStructureId_salaryRuleId: { salaryStructureId: regularStructure.id, salaryRuleId: rules[code].id } },
      update: { sequence: rules[code].sequence, isActive: true },
      create: { salaryStructureId: regularStructure.id, salaryRuleId: rules[code].id, sequence: rules[code].sequence },
    });
  }

  const employees = {};
  const employeeData = [
    { code: 'EMP-1001', firstName: 'Antra', lastName: 'Gajjar', email: 'antra.gajjar@peoplepay360.com', dept: 'IT', position: 'SWE', wage: 50000, bank: 'HDFC-4521', tax: 'ABCDP1234F' },
    { code: 'EMP-1002', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@peoplepay360.com', dept: 'IT', position: 'IT-MGR', wage: 95000, bank: 'ICICI-7788', tax: 'ABCDR5678K' },
    { code: 'EMP-1003', firstName: 'Priya', lastName: 'Verma', email: 'priya.verma@peoplepay360.com', dept: 'HR', position: 'HR-EXEC', wage: 42000, bank: 'SBI-3321', tax: 'ABCDV4455L' },
    { code: 'EMP-1004', firstName: 'Yash', lastName: 'Kumavat', email: 'yash.kumavat@peoplepay360.com', dept: 'FIN', position: 'FIN-ANL', wage: 55000, bank: null, tax: null },
    { code: 'EMP-1005', firstName: 'Aisha', lastName: 'Khan', email: 'aisha.khan@peoplepay360.com', dept: 'SALES', position: 'SALES-EXEC', wage: 38000, bank: 'KOTAK-6677', tax: 'ABCDK2233P' },
  ];

  for (const item of employeeData) {
    const employeeFields = {
      employeeCode: item.code,
      firstName: item.firstName,
      lastName: item.lastName,
      workEmail: item.email,
      joiningDate: date('2023-01-01'),
      departmentId: departments[item.dept].id,
      jobPositionId: positions[item.position].id,
      workingScheduleId: item.dept === 'SALES' ? 'seed_sales_flex' : 'seed_standard_40',
      bankAccountNumber: item.bank,
      bankName: item.bank ? 'Demo Bank' : null,
      taxIdentifier: item.tax,
      status: 'ACTIVE',
    };
    const existingEmployee = await prisma.employee.findUnique({ where: { workEmail: item.email } });
    employees[item.code] = existingEmployee
      ? await prisma.employee.update({ where: { id: existingEmployee.id }, data: employeeFields })
      : await prisma.employee.create({ data: employeeFields });
    await prisma.contract.upsert({
      where: { contractNumber: `${item.code}-CURRENT` },
      update: { wage: item.wage, status: 'ACTIVE', salaryStructureId: regularStructure.id },
      create: {
        employeeId: employees[item.code].id, contractNumber: `${item.code}-CURRENT`,
        startDate: date('2026-01-01'), wage: item.wage, currency: 'INR', status: 'ACTIVE',
        departmentId: departments[item.dept].id, jobPositionId: positions[item.position].id,
        workingScheduleId: item.dept === 'SALES' ? 'seed_sales_flex' : 'seed_standard_40',
        salaryStructureId: regularStructure.id,
      },
    });
  }
  await prisma.contract.upsert({
    where: { contractNumber: 'EMP-1001-HISTORY' },
    update: { status: 'EXPIRED' },
    create: {
      employeeId: employees['EMP-1001'].id, contractNumber: 'EMP-1001-HISTORY', startDate: date('2024-01-01'), endDate: date('2025-12-31'),
      wage: 45000, currency: 'INR', status: 'EXPIRED', salaryStructureId: regularStructure.id,
    },
  });

  for (const [index, employee] of Object.values(employees).entries()) {
    for (const day of ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']) {
      await prisma.attendance.upsert({
        where: { employeeId_attendanceDate: { employeeId: employee.id, attendanceDate: date(day) } },
        update: { status: index === 3 && day === '2026-09-03' ? 'INCOMPLETE' : 'PRESENT', workedMinutes: 480, checkIn: new Date(`${day}T09:00:00Z`), checkOut: new Date(`${day}T18:00:00Z`) },
        create: { employeeId: employee.id, attendanceDate: date(day), status: index === 3 && day === '2026-09-03' ? 'INCOMPLETE' : 'PRESENT', workedMinutes: 480, checkIn: new Date(`${day}T09:00:00Z`), checkOut: new Date(`${day}T18:00:00Z`) },
      });
    }
  }

  const annual = await prisma.timeOffType.upsert({
    where: { code: 'ANNUAL' },
    update: { name: 'Annual Leave', isActive: true },
    create: { name: 'Annual Leave', code: 'ANNUAL', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, isPaid: true },
  });
  const sick = await prisma.timeOffType.upsert({
    where: { code: 'SICK' },
    update: { name: 'Sick Leave', isActive: true },
    create: { name: 'Sick Leave', code: 'SICK', unit: 'DAYS', requiresAllocation: true, requiresApproval: true, isPaid: true },
  });
  for (const employee of Object.values(employees)) {
    await upsertAllocation({
      employeeId: employee.id, timeOffTypeId: annual.id, allocatedAmount: 20, usedAmount: employee.employeeCode === 'EMP-1001' ? 5 : 2,
      validFrom: date('2026-01-01'), validUntil: date('2026-12-31'), status: 'APPROVED',
    });
    await upsertAllocation({
      employeeId: employee.id, timeOffTypeId: sick.id, allocatedAmount: 10, usedAmount: 1,
      validFrom: date('2026-01-01'), validUntil: date('2026-12-31'), status: 'APPROVED',
    });
  }

  const antraAllocation = await prisma.timeOffAllocation.findFirst({ where: { employeeId: employees['EMP-1001'].id, timeOffTypeId: annual.id } });
  await prisma.timeOffRequest.upsert({
    where: { id: 'seed_request_antra_annual' },
    update: { status: 'PENDING', requestedAmount: 3, allocationId: antraAllocation.id },
    create: {
      id: 'seed_request_antra_annual', employeeId: employees['EMP-1001'].id, timeOffTypeId: annual.id, allocationId: antraAllocation.id,
      startDate: date('2026-09-10'), endDate: date('2026-09-12'), requestedAmount: 3, reason: 'Family function', status: 'PENDING',
    },
  });
  const priyaAllocation = await prisma.timeOffAllocation.findFirst({ where: { employeeId: employees['EMP-1003'].id, timeOffTypeId: annual.id } });
  await prisma.timeOffAllocation.update({
    where: { id: priyaAllocation.id },
    data: { usedAmount: 3, status: 'APPROVED' },
  });
  await prisma.timeOffRequest.upsert({
    where: { id: 'seed_request_priya_annual' },
    update: {
      status: 'APPROVED', requestedAmount: 1, allocationId: priyaAllocation.id,
      startDate: date('2026-09-18'), endDate: date('2026-09-18'),
      approvedById: employees['EMP-1002'].id, approvedAt: date('2026-09-15'),
    },
    create: {
      id: 'seed_request_priya_annual', employeeId: employees['EMP-1003'].id, timeOffTypeId: annual.id, allocationId: priyaAllocation.id,
      startDate: date('2026-09-18'), endDate: date('2026-09-18'), requestedAmount: 1, reason: 'Personal day',
      status: 'APPROVED', approvedById: employees['EMP-1002'].id, approvedAt: date('2026-08-15'),
    },
  });

  async function seedPayroll(id, name, periodStart, periodEnd, computedAt, validatedAt, paidAt) {
    const payrun = await prisma.payrun.upsert({
      where: { id },
      update: { name, status: 'PAID', periodStart: date(periodStart), periodEnd: date(periodEnd), paidAt: date(paidAt) },
      create: {
        id, name, salaryStructureId: regularStructure.id, periodStart: date(periodStart), periodEnd: date(periodEnd),
        status: 'PAID', createdById: employees['EMP-1002'].id,
        computedAt: date(computedAt), validatedAt: date(validatedAt), paidAt: date(paidAt),
      },
    });
    for (const item of employeeData) {
      const employee = employees[item.code];
      const contract = await prisma.contract.findFirst({ where: { employeeId: employee.id, contractNumber: `${item.code}-CURRENT` } });
      const basic = Math.round(item.wage * 0.8 * 100) / 100;
      const hra = Math.round(basic * 0.2 * 100) / 100;
      const gross = basic + hra + 2000;
      const pf = Math.round(basic * 0.1 * 100) / 100;
      const tax = gross > 40000 ? 2000 : 0;
      const net = gross - pf - tax;
      const payslip = await prisma.payslip.upsert({
        where: { payrunId_employeeId: { payrunId: payrun.id, employeeId: employee.id } },
        update: { status: 'PAID', basicAmount: basic, grossAmount: gross, deductionAmount: pf + tax, netAmount: net, contractId: contract.id },
        create: {
          payrunId: payrun.id, employeeId: employee.id, contractId: contract.id, salaryStructureId: regularStructure.id,
          periodStart: payrun.periodStart, periodEnd: payrun.periodEnd, workedDays: 22, workedHours: 176,
          basicAmount: basic, grossAmount: gross, deductionAmount: pf + tax, netAmount: net, currency: 'INR',
          status: 'PAID', computedAt: date(computedAt), validatedAt: date(validatedAt), paidAt: date(paidAt),
        },
      });
      await prisma.payslipLine.deleteMany({ where: { payslipId: payslip.id } });
      for (const line of [
        ['BASIC', 'Basic Salary', 'BASIC', basic, 10],
        ['HRA', 'House Rent Allowance', 'ALLOWANCE', hra, 20],
        ['TRAVEL', 'Travel Allowance', 'ALLOWANCE', 2000, 30],
        ['PF', 'Provident Fund', 'DEDUCTION', pf, 50],
        ['TAX', 'Income Tax', 'DEDUCTION', tax, 60],
      ]) {
        await prisma.payslipLine.create({
          data: {
            id: `seed_line_${id}_${item.code}_${line[0]}`, payslipId: payslip.id, salaryRuleId: rules[line[0]].id,
            ruleCode: line[0], ruleName: line[1], category: line[2], sequence: line[4], baseAmount: line[3], amount: line[3],
          },
        });
      }
    }
  }

  await seedPayroll('seed_payrun_july_2026', 'July 2026 Payroll', '2026-07-01', '2026-07-31', '2026-07-28', '2026-07-29', '2026-08-01');
  await seedPayroll('seed_payrun_august_2026', 'August 2026 Payroll', '2026-08-01', '2026-08-31', '2026-08-28', '2026-08-29', '2026-09-01');
  await seedPayroll('seed_payrun_september_2026', 'September 2026 Payroll', '2026-09-01', '2026-09-30', '2026-09-28', '2026-09-29', '2026-10-01');

  console.log('PeoplePay360 seed complete: employees, contracts, attendance, leave, salary rules, and July–September 2026 payroll history.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
