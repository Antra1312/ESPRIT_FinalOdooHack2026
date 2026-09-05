const express = require('express');
const { getPrismaClient } = require('../config/prisma');
const employeeService = require('../services/employeeService');
const contractService = require('../services/contractService');
const {
  payrunService,
  payslipService,
  payrollWarningService,
} = require('../services/payrollService');

const router = express.Router();

const parseDate = (value, field) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error(`${field} must be a valid date`);
    error.status = 400;
    throw error;
  }
  return date;
};

const response = (res, data, status = 200) => res.status(status).json({ success: true, data });

router.get('/employees', async (req, res, next) => {
  try {
    const { q, departmentId, jobPositionId, status, employmentType } = req.query;
    const employees = q
      ? await employeeService.searchEmployees(q, { departmentId, jobPositionId, status, employmentType })
      : await employeeService.getWithRelations({
          where: {
            ...(departmentId && { departmentId }),
            ...(jobPositionId && { jobPositionId }),
            ...(status && { status }),
            ...(employmentType && { employmentType }),
          },
        });
    return response(res, employees);
  } catch (error) {
    return next(error);
  }
});

router.get('/employees/:id', async (req, res, next) => {
  try {
    const employee = await employeeService.findById(req.params.id, {
      department: true,
      jobPosition: true,
      manager: { select: { id: true, firstName: true, lastName: true } },
      workingSchedule: { include: { lines: { orderBy: { sequence: 'asc' } } } },
      contracts: { orderBy: { startDate: 'asc' }, include: { salaryStructure: true } },
      attendances: { orderBy: { attendanceDate: 'desc' } },
      timeOffRequests: { include: { timeOffType: true }, orderBy: { startDate: 'desc' } },
      timeOffAllocations: { include: { timeOffType: true }, orderBy: { validFrom: 'desc' } },
    });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    return response(res, employee);
  } catch (error) {
    return next(error);
  }
});

router.post('/employees', async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const input = req.body;
    const nameParts = String(input.name || '').trim().split(/\s+/);
    const firstName = input.firstName || nameParts.shift();
    const lastName = input.lastName || nameParts.join(' ') || firstName;
    const workEmail = input.workEmail || input.email;
    const employeeCode = input.employeeCode || `EMP-${Date.now()}`;
    const department = input.departmentId
      ? null
      : input.dept ? await prisma.department.findFirst({ where: { name: { equals: input.dept, mode: 'insensitive' } } }) : null;
    const jobPosition = input.jobPositionId
      ? null
      : input.position ? await prisma.jobPosition.findFirst({ where: { title: { equals: input.position, mode: 'insensitive' } } }) : null;
    const statusMap = { Active: 'ACTIVE', Inactive: 'TERMINATED', 'On Leave': 'ON_LEAVE', Probation: 'PROBATION' };
    const employmentTypeMap = { 'Full-time': 'FULL_TIME', Contract: 'CONTRACT', Intern: 'INTERN', 'Part-time': 'PART_TIME' };
    const { name, email, dept, position, employeeType, managerId, scheduleId, ...rest } = input;
    if (!firstName || !lastName || !workEmail || !employeeCode || !joiningDate) {
      return res.status(400).json({ success: false, message: 'firstName, lastName, workEmail, employeeCode and joiningDate are required' });
    }
    const employee = await employeeService.create({
      firstName,
      lastName,
      workEmail,
      employeeCode,
      joiningDate: parseDate(joiningDate, 'joiningDate'),
      phone: input.phone || null,
      departmentId: input.departmentId || department?.id || null,
      jobPositionId: input.jobPositionId || jobPosition?.id || null,
      managerId: managerId || null,
      workingScheduleId: input.workingScheduleId || scheduleId || null,
      ...rest,
      status: statusMap[input.status] || input.status || undefined,
      employmentType: employmentTypeMap[employeeType] || input.employmentType || undefined,
    });
    return response(res, employee, 201);
  } catch (error) {
    return next(error);
  }
});

router.patch('/employees/:id', async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const input = req.body;
    const data = { ...input };
    if (input.name) {
      const parts = input.name.trim().split(/\s+/);
      data.firstName = parts.shift();
      data.lastName = parts.join(' ') || data.firstName;
      delete data.name;
    }
    if (input.email) {
      data.workEmail = input.email;
      delete data.email;
    }
    if (input.dept) {
      const department = await prisma.department.findFirst({ where: { name: { equals: input.dept, mode: 'insensitive' } } });
      data.departmentId = department?.id;
      delete data.dept;
    }
    if (input.position) {
      const position = await prisma.jobPosition.findFirst({ where: { title: { equals: input.position, mode: 'insensitive' } } });
      data.jobPositionId = position?.id;
      delete data.position;
    }
    if (input.employeeType) data.employmentType = { 'Full-time': 'FULL_TIME', Contract: 'CONTRACT', Intern: 'INTERN', 'Part-time': 'PART_TIME' }[input.employeeType] || input.employeeType;
    if (input.status) data.status = { Active: 'ACTIVE', Inactive: 'TERMINATED', 'On Leave': 'ON_LEAVE', Probation: 'PROBATION' }[input.status] || input.status;
    if (input.scheduleId) {
      data.workingScheduleId = input.scheduleId;
      delete data.scheduleId;
    }
    delete data.employeeType;
    if (data.joiningDate) data.joiningDate = parseDate(data.joiningDate, 'joiningDate');
    const employee = await employeeService.update(req.params.id, data);
    return response(res, employee);
  } catch (error) {
    return next(error);
  }
});

router.get('/employees/:id/contracts', async (req, res, next) => {
  try {
    return response(res, await contractService.getEmployeeContracts(req.params.id, req.query.includeInactive === 'true'));
  } catch (error) {
    return next(error);
  }
});

router.post('/contracts', async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const {
      employeeId, position, dept, wage, structureId, startDate, endDate,
    } = req.body;
    const department = await prisma.department.findFirst({ where: { name: { equals: dept, mode: 'insensitive' } } });
    const jobPosition = await prisma.jobPosition.findFirst({ where: { title: { equals: position, mode: 'insensitive' } } });
    if (!employeeId || !position || !wage || !structureId || !startDate) {
      return res.status(400).json({ success: false, message: 'employeeId, position, wage, structureId and startDate are required' });
    }
    const contract = await contractService.create({
      employeeId,
      contractNumber: `CON-${Date.now()}`,
      startDate: parseDate(startDate, 'startDate'),
      endDate: endDate ? parseDate(endDate, 'endDate') : null,
      departmentId: department?.id || null,
      jobPositionId: jobPosition?.id || null,
      salaryStructureId: structureId,
      wage: Number(wage),
      status: 'DRAFT',
    });
    return response(res, contract, 201);
  } catch (error) {
    return next(error);
  }
});

router.get('/payroll/payruns', async (req, res, next) => {
  try {
    const payruns = await payrunService.findMany({
      include: { salaryStructure: true, payslips: { select: { id: true, employeeId: true } }, warnings: true },
      orderBy: { createdAt: 'desc' },
    });
    return response(res, payruns);
  } catch (error) {
    return next(error);
  }
});

router.post('/payroll/payruns', async (req, res, next) => {
  try {
    const { name, salaryStructureId, periodStart, periodEnd, employeeIds = [], createdById } = req.body;
    if (!name || !salaryStructureId || !periodStart || !periodEnd || !employeeIds.length) {
      return res.status(400).json({ success: false, message: 'name, salaryStructureId, periodStart, periodEnd and employeeIds are required' });
    }
    const prisma = getPrismaClient();
    const creator = createdById || (await prisma.employee.findFirst({ orderBy: { createdAt: 'asc' } }))?.id;
    if (!creator) return res.status(400).json({ success: false, message: 'A payrun creator is required' });
    const payrun = await payrunService.create({
      name,
      salaryStructureId,
      periodStart: parseDate(periodStart, 'periodStart'),
      periodEnd: parseDate(periodEnd, 'periodEnd'),
      createdById: creator,
    });
    const contracts = await Promise.all(employeeIds.map((id) => contractService.getApplicableContract(id, parseDate(periodStart, 'periodStart'), parseDate(periodEnd, 'periodEnd'))));
    await prisma.payslip.createMany({
      data: contracts.filter(Boolean).map((contract) => ({
        payrunId: payrun.id,
        employeeId: contract.employeeId,
        contractId: contract.id,
        salaryStructureId,
        periodStart: parseDate(periodStart, 'periodStart'),
        periodEnd: parseDate(periodEnd, 'periodEnd'),
      })),
    });
    return response(res, await payrunService.findWithDetails(payrun.id), 201);
  } catch (error) {
    return next(error);
  }
});

router.get('/payroll/payruns/:id', async (req, res, next) => {
  try {
    const payrun = await payrunService.findWithDetails(req.params.id);
    if (!payrun) return res.status(404).json({ success: false, message: 'Payrun not found' });
    return response(res, payrun);
  } catch (error) {
    return next(error);
  }
});

router.post('/payroll/payruns/:id/compute', async (req, res, next) => {
  try {
    await payrunService.compute(req.params.id);
    return response(res, await payrunService.findWithDetails(req.params.id));
  } catch (error) {
    return next(error);
  }
});

router.post('/payroll/payruns/:id/validate', async (req, res, next) => {
  try {
    await payrunService.validate(req.params.id);
    return response(res, await payrunService.findWithDetails(req.params.id));
  } catch (error) {
    return next(error);
  }
});

router.post('/payroll/payruns/:id/pay', async (req, res, next) => {
  try {
    await payrunService.markPaid(req.params.id);
    return response(res, await payrunService.findWithDetails(req.params.id));
  } catch (error) {
    return next(error);
  }
});

router.post('/payroll/payruns/:id/send', async (req, res, next) => {
  try {
    const payrun = await payrunService.findWithDetails(req.params.id);
    if (!payrun) return res.status(404).json({ success: false, message: 'Payrun not found' });
    return response(res, { payrunId: req.params.id, sent: true, payslipIds: payrun.payslips.map(({ id }) => id) });
  } catch (error) {
    return next(error);
  }
});

router.get('/payroll/payslips', async (req, res, next) => {
  try {
    const where = req.query.employeeId ? { employeeId: req.query.employeeId } : undefined;
    return response(res, await payslipService.findMany({
      where,
      include: { lines: { orderBy: { sequence: 'asc' } }, employee: true, payrun: true },
      orderBy: { periodStart: 'desc' },
    }));
  } catch (error) {
    return next(error);
  }
});

router.get('/payroll/payslips/:id', async (req, res, next) => {
  try {
    const payslip = await payslipService.findWithLines(req.params.id);
    if (!payslip) return res.status(404).json({ success: false, message: 'Payslip not found' });
    return response(res, payslip);
  } catch (error) {
    return next(error);
  }
});

router.get('/payroll/warnings/:payrunId', async (req, res, next) => {
  try {
    return response(res, await payrollWarningService.getByPayrun(req.params.payrunId));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
