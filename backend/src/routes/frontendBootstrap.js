const express = require('express');
const { getPrismaClient } = require('../config/prisma');

const router = express.Router();

const dayMap = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

const titleCase = (value) => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const isoDate = (value) => {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
};

const isoTime = (value) => {
  if (!value) return '';
  return new Date(value).toISOString().slice(11, 16);
};

const monthPeriod = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const toNumber = (value) => Number(value || 0);

const toFrontendEmployeeStatus = (status) => (status === 'ACTIVE' ? 'Active' : 'Inactive');
const toFrontendEmploymentType = (type) => ({
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
  TEMPORARY: 'Temporary',
}[type] || titleCase(type));

const toFrontendAttendanceStatus = (attendance) => {
  if (attendance.isManuallyEdited) return 'Corrected';
  if (!attendance.checkOut) return 'Missing Checkout';
  if (attendance.status === 'LATE') return 'Late';
  if (attendance.status === 'INCOMPLETE') return 'Missing Checkout';
  return 'Normal';
};

const toFrontendRequestStatus = (status) => {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'PENDING') return 'Pending';
  return 'Rejected';
};

const toFrontendPayrunStatus = (status) => titleCase(status);
const toFrontendPayslipStatus = (status) => titleCase(status === 'WARNING' ? 'COMPUTED' : status);

router.get('/bootstrap', async (req, res) => {
  try {
    const prisma = getPrismaClient();

  const [
    employeesRaw,
    departmentsRaw,
    jobPositionsRaw,
    contractsRaw,
    schedulesRaw,
    attendanceRaw,
    timeOffTypesRaw,
    allocationsRaw,
    requestsRaw,
    structuresRaw,
    rulesRaw,
    payrunsRaw,
    payslipsRaw,
    usersRaw,
  ] = await Promise.all([
    prisma.employee.findMany({
      include: {
        department: true,
        jobPosition: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.jobPosition.findMany({ where: { isActive: true }, orderBy: { title: 'asc' } }),
    prisma.contract.findMany({
      include: {
        department: true,
        jobPosition: true,
        salaryStructure: true,
      },
      orderBy: { startDate: 'asc' },
    }),
    prisma.workingSchedule.findMany({
      include: { lines: { orderBy: { sequence: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.attendance.findMany({
      orderBy: [{ attendanceDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.timeOffType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.timeOffAllocation.findMany({
      include: { timeOffType: true },
      orderBy: [{ createdAt: 'asc' }],
    }),
    prisma.timeOffRequest.findMany({
      include: { timeOffType: true },
      orderBy: [{ createdAt: 'asc' }],
    }),
    prisma.salaryStructure.findMany({
      include: {
        structureRules: {
          where: { isActive: true },
          orderBy: { sequence: 'asc' },
          select: { salaryRuleId: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.salaryRule.findMany({
      where: { isActive: true },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.payrun.findMany({
      include: {
        warnings: true,
        payslips: { select: { id: true, employeeId: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payslip.findMany({
      include: {
        lines: { orderBy: { sequence: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      include: {
        employee: { select: { id: true } },
      },
    }),
  ]);

  const employees = employeesRaw.map((employee) => ({
    id: employee.id,
    name: [employee.firstName, employee.lastName].filter(Boolean).join(' '),
    dept: employee.department?.name || 'Unassigned',
    position: employee.jobPosition?.title || 'Unassigned',
    managerId: employee.managerId,
    scheduleId: employee.workingScheduleId,
    status: toFrontendEmployeeStatus(employee.status),
    employeeType: toFrontendEmploymentType(employee.employmentType),
    email: employee.workEmail,
    phone: employee.phone || '',
    bankAccount: [employee.bankName, employee.bankAccountNumber].filter(Boolean).join(' • ') || '',
    pan: employee.taxIdentifier || '',
    joinDate: isoDate(employee.joiningDate),
  }));

  const contracts = contractsRaw.map((contract) => ({
    id: contract.id,
    employeeId: contract.employeeId,
    position: contract.jobPosition?.title || 'Unassigned',
    dept: contract.department?.name || 'Unassigned',
    wage: toNumber(contract.wage),
    structureId: contract.salaryStructureId,
    startDate: isoDate(contract.startDate),
    endDate: isoDate(contract.endDate),
  }));

  const schedules = schedulesRaw.map((schedule) => ({
    id: schedule.id,
    name: schedule.name,
    type: titleCase(schedule.scheduleType),
    days: Object.keys(dayMap).map((dayKey) => {
      const line = schedule.lines.find((row) => row.dayOfWeek === dayKey);
      return {
        day: dayMap[dayKey],
        on: !!line,
        start: line ? isoTime(line.startTime) : '',
        end: line ? isoTime(line.endTime) : '',
        brk: line?.breakMinutes || 0,
      };
    }),
  }));

  const attendance = attendanceRaw.map((record) => ({
    id: record.id,
    employeeId: record.employeeId,
    date: isoDate(record.attendanceDate),
    checkIn: record.checkIn ? isoTime(record.checkIn) : '',
    checkOut: record.checkOut ? isoTime(record.checkOut) : '',
    status: toFrontendAttendanceStatus(record),
    note: record.correctionReason || '',
  }));

  const timeoffTypes = timeOffTypesRaw.map((type) => ({
    id: type.id,
    name: type.name,
    unit: type.unit.toLowerCase(),
    requiresAllocation: type.requiresAllocation,
    color: '#0EA5A0',
  }));

  const allocations = allocationsRaw.map((allocation) => ({
    id: allocation.id,
    employeeId: allocation.employeeId,
    typeId: allocation.timeOffTypeId,
    allocated: toNumber(allocation.allocatedAmount),
    used: toNumber(allocation.usedAmount),
    validFrom: isoDate(allocation.validFrom),
    validTo: isoDate(allocation.validUntil),
    status: titleCase(allocation.status),
  }));

  const requests = requestsRaw.map((request) => ({
    id: request.id,
    employeeId: request.employeeId,
    typeId: request.timeOffTypeId,
    from: isoDate(request.startDate),
    to: isoDate(request.endDate),
    duration: toNumber(request.requestedAmount),
    status: toFrontendRequestStatus(request.status),
    reason: request.reason || '',
  }));

  const rules = rulesRaw.map((rule) => ({
    id: rule.id,
    code: rule.code,
    name: rule.name,
    category: titleCase(rule.category),
    computeType: rule.computationType.toLowerCase(),
    baseCode: rule.percentageBase || '',
    amount: rule.computationType === 'PERCENTAGE' ? toNumber(rule.percentage) : toNumber(rule.fixedAmount),
    formula: rule.formula || '',
  }));

  const structures = structuresRaw.map((structure) => ({
    id: structure.id,
    name: structure.name,
    status: structure.isActive ? 'Active' : 'Inactive',
    ruleIds: structure.structureRules.map((rule) => rule.salaryRuleId),
  }));

  const payslipLookup = new Map(
    payslipsRaw.map((payslip) => [
      payslip.id,
      {
        id: payslip.id,
        payrunId: payslip.payrunId,
        employeeId: payslip.employeeId,
        period: monthPeriod(payslip.periodStart),
        contractId: payslip.contractId,
        structureId: payslip.salaryStructureId,
        lines: payslip.lines.map((line) => ({
          code: line.ruleCode,
          name: line.ruleName,
          category: titleCase(line.category),
          amount: toNumber(line.amount),
        })),
        gross: toNumber(payslip.grossAmount),
        deductions: toNumber(payslip.deductionAmount),
        net: toNumber(payslip.netAmount),
        status: toFrontendPayslipStatus(payslip.status),
        sent: payslip.status === 'PAID',
        sentDate: payslip.paidAt ? isoDate(payslip.paidAt) : null,
      },
    ])
  );

  const payslips = Array.from(payslipLookup.values());

  const payruns = payrunsRaw.map((payrun) => ({
    id: payrun.id,
    name: payrun.name,
    structureId: payrun.salaryStructureId,
    period: monthPeriod(payrun.periodStart),
    employeeIds: [...new Set(payrun.payslips.map((payslip) => payslip.employeeId))],
    status: toFrontendPayrunStatus(payrun.status),
    warnings: payrun.warnings.map((warning) => ({
      type: warning.type,
      icon: warning.severity === 'ERROR' ? '⛔' : warning.severity === 'WARNING' ? '⚠️' : 'ℹ️',
      employeeId: warning.employeeId,
      message: warning.message,
    })),
    sent: payrun.status === 'PAID',
    createdDate: isoDate(payrun.createdAt),
    payslipIds: payrun.payslips.map((payslip) => payslip.id),
  }));

  const roleDemoUsers = {
    employee: usersRaw.find((user) => user.role === 'EMPLOYEE')?.employee?.id || null,
    hr_manager: usersRaw.find((user) => user.role === 'HR_MANAGER')?.employee?.id || null,
    hr_payroll_user: usersRaw.find((user) => user.role === 'HR_PAYROLL_USER')?.employee?.id || null,
    hr_payroll_manager: usersRaw.find((user) => user.role === 'HR_PAYROLL_MANAGER')?.employee?.id || null,
    admin: usersRaw.find((user) => user.role === 'ADMIN')?.employee?.id || null,
  };

    return res.json({
      success: true,
      data: {
        departments: departmentsRaw.map((department) => ({
          id: department.id,
          name: department.name,
          code: department.code,
        })),
        jobPositions: jobPositionsRaw.map((position) => ({
          id: position.id,
          title: position.title,
          code: position.code,
          departmentId: position.departmentId,
        })),
        employees,
        contracts,
        schedules,
        attendance,
        timeoffTypes,
        allocations,
        requests,
        structures,
        rules,
        payruns,
        payslips,
        roleDemoUsers,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to build frontend bootstrap payload',
      error: error.message,
    });
  }
});

module.exports = router;
