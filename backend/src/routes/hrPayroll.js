const express = require('express');
const router = express.Router();

// Database initialization - will be available after app startup
let prismaClient = null;
const selectedEmployeesByPayrun = new Map();

// Initialize prisma client (called from app startup)
const initPrisma = (client) => {
  prismaClient = client;
};

// Helper: calculate weekly worked hours from schedule
const calculateWorkedHours = (schedule) => {
  if (!schedule || !schedule.lines) return 0;
  return schedule.lines.reduce((sum, line) => {
    const start = new Date(line.startTime).getTime();
    const end = new Date(line.endTime).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return sum;
    const breakMs = line.breakMinutes * 60 * 1000;
    return sum + Math.max(0, (end - start - breakMs) / (1000 * 60 * 60));
  }, 0) * 4.33;
};

// ==========================================
// EMPLOYEE ROUTES
// ==========================================
router.get('/employees', async (req, res) => {
  try {
    const employees = await prismaClient.employee.findMany({
      include: {
        user: true,
        department: true,
        jobPosition: true,
        workingSchedule: true,
        contracts: {
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/employees/:id', async (req, res) => {
  try {
    const employee = await prismaClient.employee.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        department: true,
        jobPosition: true,
        workingSchedule: true,
        contracts: {
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const input = req.body || {};
    const [firstName, ...lastNameParts] = String(input.name || `${input.firstName || ''} ${input.lastName || ''}`).trim().split(/\s+/);
    if (!firstName || !(input.email || input.workEmail)) return res.status(400).json({ message: 'Name and work email are required' });
    const departmentValue = input.dept || input.departmentId;
    const positionValue = input.position || input.jobPositionId;
    const department = departmentValue ? await prismaClient.department.findFirst({ where: { OR: [{ id: departmentValue }, { name: { equals: departmentValue, mode: 'insensitive' } }, { code: { equals: departmentValue, mode: 'insensitive' } }] } }) : null;
    const jobPosition = positionValue ? await prismaClient.jobPosition.findFirst({ where: { OR: [{ id: positionValue }, { title: { equals: positionValue, mode: 'insensitive' } }] } }) : null;
    const typeMap = { 'Full-time': 'FULL_TIME', 'Full Time': 'FULL_TIME', 'Part-time': 'PART_TIME', 'Part Time': 'PART_TIME', Contract: 'CONTRACT', Intern: 'INTERN' };
    const statusMap = { Active: 'ACTIVE', Inactive: 'TERMINATED', 'On Leave': 'ON_LEAVE', Probation: 'PROBATION' };
    const employee = await prismaClient.employee.create({
      data: {
        employeeCode: `EMP-${Date.now()}`,
        firstName,
        lastName: lastNameParts.join(' ') || firstName,
        workEmail: input.email || input.workEmail,
        personalEmail: input.personalEmail || null,
        phone: input.phone || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender || null,
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : new Date(),
        employmentType: typeMap[input.employeeType] || input.employmentType || 'FULL_TIME',
        status: statusMap[input.status] || input.status || 'ACTIVE',
        departmentId: department?.id || null,
        jobPositionId: jobPosition?.id || null,
        managerId: input.managerId || null,
        workingScheduleId: input.scheduleId || input.workingScheduleId || null,
        bankAccountNumber: input.bankAccount || input.bankAccountNumber || null,
        bankName: input.bankName || null,
        taxIdentifier: input.pan || input.taxIdentifier || null,
        // user will be created separately or linked later
      },
      include: {
        department: true,
        jobPosition: true,
        workingSchedule: true,
        contracts: {
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });
    res.status(201).json(employee);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'An employee profile already exists for this work email. Search for the employee and edit the existing profile.' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'The selected department, position, manager, or schedule is no longer valid. Refresh and try again.' });
    res.status(500).json({ message: error.message });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const input = req.body || {};
    const [firstName, ...lastNameParts] = String(input.name || '').trim().split(/\s+/);
    const department = input.dept ? await prismaClient.department.findFirst({ where: { OR: [{ name: { equals: input.dept, mode: 'insensitive' } }, { code: { equals: input.dept, mode: 'insensitive' } }] } }) : null;
    const jobPosition = input.position ? await prismaClient.jobPosition.findFirst({ where: { title: { equals: input.position, mode: 'insensitive' } } }) : null;
    const statusMap = { Active: 'ACTIVE', Inactive: 'TERMINATED', 'On Leave': 'ON_LEAVE', Probation: 'PROBATION' };
    const typeMap = { 'Full-time': 'FULL_TIME', 'Full Time': 'FULL_TIME', 'Part-time': 'PART_TIME', 'Part Time': 'PART_TIME', Contract: 'CONTRACT', Intern: 'INTERN', Temporary: 'TEMPORARY' };
    const data = {
      ...(firstName && { firstName, lastName: lastNameParts.join(' ') || firstName }),
      ...(input.email && { workEmail: input.email }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.dept !== undefined && { departmentId: department?.id || null }),
      ...(input.position !== undefined && { jobPositionId: jobPosition?.id || null }),
      ...(input.managerId !== undefined && { managerId: input.managerId || null }),
      ...(input.scheduleId !== undefined && { workingScheduleId: input.scheduleId || null }),
      ...(input.status && { status: statusMap[input.status] || input.status }),
      ...(input.employeeType && { employmentType: typeMap[input.employeeType] || input.employeeType }),
      ...(input.bankAccount !== undefined && { bankAccountNumber: input.bankAccount || null }),
      ...(input.bankName !== undefined && { bankName: input.bankName || null }),
      ...(input.pan !== undefined && { taxIdentifier: input.pan || null }),
    };
    const employee = await prismaClient.employee.update({
      where: { id: req.params.id },
      data,
    });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await prismaClient.employee.delete({ where: { id: req.params.id } });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// CONTRACT ROUTES
// ==========================================
router.get('/employees/:employeeId/contracts', async (req, res) => {
  try {
    const contracts = await prismaClient.contract.findMany({
      where: { employeeId: req.params.employeeId },
      include: { employee: true },
      orderBy: { startDate: 'desc' },
    });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/employees/:employeeId/contracts', async (req, res) => {
  try {
    const { employeeId, contractNumber, startDate, endDate, departmentId, jobPositionId,
      workingScheduleId, salaryStructureId, wage, currency, status, notes } = req.body;

    // Check for overlapping active contracts
    const overlapping = await prismaClient.contract.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: new Date(endDate || '2999-12-31') },
        OR: [{ endDate: null }, { endDate: { gte: new Date(startDate) } }],
      },
    });

    if (overlapping) {
      return res.status(400).json({ message: 'Cannot create contract: overlapping active contract exists.' });
    }

    const contract = await prismaClient.contract.create({
      data: {
        employeeId,
        contractNumber,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        departmentId,
        jobPositionId,
        workingScheduleId,
        salaryStructureId,
        wage,
        currency,
        status,
        notes,
      },
      include: { employee: true },
    });
    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/employees/:employeeId/active-contract', async (req, res) => {
  try {
    const contract = await prismaClient.contract.findFirst({
      where: {
        employeeId: req.params.employeeId,
        status: 'ACTIVE',
      },
      orderBy: { startDate: 'desc' },
    });

    if (!contract) {
      return res.status(404).json({ message: 'No active contract found for this employee' });
    }
    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// WORKING SCHEDULE ROUTES
// ==========================================
router.get('/working-schedules', async (req, res) => {
  try {
    const schedules = await prismaClient.workingSchedule.findMany({
      where: { isActive: true },
      include: { lines: true },
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/working-schedules/:id', async (req, res) => {
  try {
    const schedule = await prismaClient.workingSchedule.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/working-schedules', async (req, res) => {
  try {
    const { name, scheduleType, timezone } = req.body;

    const schedule = await prismaClient.workingSchedule.create({
      data: {
        name,
        scheduleType,
        timezone,
        lines: {
          create: [
            { dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'TUESDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'THURSDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'FRIDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
          ],
        },
      },
      include: { lines: true },
    });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// TIME OFF ROUTES
// ==========================================
const employeeForRequest = (req) => req.user?.employee?.id || req.user?.employeeId;
const dateTimeFor = (date, time) => new Date(`${date}T${time || '00:00'}:00`);

router.post('/attendance/check-in', async (req, res) => {
  try {
    const employeeId = employeeForRequest(req);
    if (!employeeId) return res.status(400).json({ message: 'Your user account is not linked to an employee profile' });
    const date = req.body?.date || new Date().toISOString().slice(0, 10);
    const checkIn = dateTimeFor(date, req.body?.time);
    if (Number.isNaN(checkIn.getTime())) return res.status(400).json({ message: 'A valid check-in time is required' });
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);
    const existing = await prismaClient.attendance.findUnique({ where: { employeeId_attendanceDate: { employeeId, attendanceDate } } });
    if (existing?.checkIn) return res.status(409).json({ message: 'You have already checked in for this date' });
    const attendance = existing
      ? await prismaClient.attendance.update({ where: { id: existing.id }, data: { checkIn, status: 'PRESENT', source: 'EMPLOYEE' } })
      : await prismaClient.attendance.create({ data: { employeeId, attendanceDate, checkIn, status: 'PRESENT', source: 'EMPLOYEE' } });
    res.status(existing ? 200 : 201).json(attendance);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/attendance/check-out', async (req, res) => {
  try {
    const employeeId = employeeForRequest(req);
    if (!employeeId) return res.status(400).json({ message: 'Your user account is not linked to an employee profile' });
    const date = req.body?.date || new Date().toISOString().slice(0, 10);
    const checkOut = dateTimeFor(date, req.body?.time);
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);
    const existing = await prismaClient.attendance.findUnique({ where: { employeeId_attendanceDate: { employeeId, attendanceDate } } });
    if (!existing?.checkIn) return res.status(400).json({ message: 'Check in before checking out' });
    if (existing.checkOut) return res.status(409).json({ message: 'You have already checked out for this date' });
    if (Number.isNaN(checkOut.getTime()) || checkOut <= existing.checkIn) return res.status(400).json({ message: 'Check-out time must be after check-in time' });
    const workedMinutes = Math.round((checkOut - existing.checkIn) / 60000);
    const attendance = await prismaClient.attendance.update({ where: { id: existing.id }, data: { checkOut, workedMinutes, status: 'PRESENT' } });
    res.json(attendance);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/time-off/types', async (req, res) => {
  try {
    const types = await prismaClient.timeOffType.findMany({ where: { isActive: true } });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/employees/:employeeId/time-allocations', async (req, res) => {
  try {
    const allocations = await prismaClient.timeOffAllocation.findMany({
      where: { employeeId: req.params.employeeId },
      include: { timeOffType: true },
    });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/time-allocations', async (req, res) => {
  try {
    const { employeeId, timeOffTypeId, allocatedAmount, validFrom, validUntil } = req.body;

    const allocation = await prismaClient.timeOffAllocation.create({
      data: {
        employeeId,
        timeOffTypeId,
        allocatedAmount,
        usedAmount: 0,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        status: 'PENDING',
      },
    });
    res.status(201).json(allocation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/time-allocations/:id/approve', async (req, res) => {
  try {
    const allocation = await prismaClient.timeOffAllocation.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedById: req.user.employeeId, approvedAt: new Date() },
    });
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/employees/:employeeId/time-requests', async (req, res) => {
  try {
    if (req.user?.role === 'EMPLOYEE' && req.params.employeeId !== employeeForRequest(req)) return res.status(403).json({ message: 'Employees can view only their own time-off requests' });
    const requests = await prismaClient.timeOffRequest.findMany({
      where: { employeeId: req.params.employeeId },
      include: { timeOffType: true },
      orderBy: { startDate: 'desc' },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/time-requests', async (req, res) => {
  try {
    const { timeOffTypeId, allocationId, startDate, endDate, requestedAmount, reason } = req.body;
    const ownEmployeeId = employeeForRequest(req);
    const employeeId = req.user?.role === 'EMPLOYEE' ? ownEmployeeId : req.body.employeeId;
    if (!employeeId) return res.status(400).json({ message: 'An employee is required for the time-off request' });
    if (req.user?.role === 'EMPLOYEE' && req.body.employeeId && req.body.employeeId !== ownEmployeeId) return res.status(403).json({ message: 'Employees can create time-off requests only for themselves' });

    // Check allocation balance if provided
    let availableBalance = 0;
    if (allocationId) {
      const allocation = await prismaClient.timeOffAllocation.findUnique({
        where: { id: allocationId },
      });
      if (!allocation || allocation.status !== 'APPROVED') return res.status(400).json({ message: 'A valid approved allocation is required' });
      availableBalance = Number(allocation.allocatedAmount) - Number(allocation.usedAmount);
    }

    if (allocationId && Number(requestedAmount) > availableBalance) {
      return res.status(400).json({
        message: `Insufficient leave balance. Available: ${availableBalance}, Requested: ${requestedAmount}`,
      });
    }

    const request = await prismaClient.timeOffRequest.create({
      data: {
        employeeId,
        timeOffTypeId,
        allocationId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        requestedAmount,
        reason,
        status: 'PENDING',
      },
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/time-requests/:id/approve', async (req, res) => {
  try {
    const request = await prismaClient.$transaction(async (tx) => {
      const current = await tx.timeOffRequest.findUnique({ where: { id: req.params.id } });
      if (!current) throw new Error('Request not found');
      if (current.status !== 'PENDING') throw new Error('Request already processed');
      if (current.allocationId) {
        const allocation = await tx.timeOffAllocation.findUnique({ where: { id: current.allocationId } });
        if (!allocation || allocation.status !== 'APPROVED') throw new Error('Allocation is not approved');
        const remaining = Number(allocation.allocatedAmount) - Number(allocation.usedAmount);
        if (Number(current.requestedAmount) > remaining) throw new Error(`Insufficient leave balance. Available: ${remaining}`);
        await tx.timeOffAllocation.update({ where: { id: allocation.id }, data: { usedAmount: { increment: current.requestedAmount } } });
      }
      return tx.timeOffRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approvedById: req.user.employeeId, approvedAt: new Date() },
      });
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// SALARY STRUCTURE & RULE ROUTES
// ==========================================
router.get('/salary-structures', async (req, res) => {
  try {
    const structures = await prismaClient.salaryStructure.findMany({
      include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } },
    });
    res.json(structures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/salary-structures/:id', async (req, res) => {
  try {
    const structure = await prismaClient.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: {
        structureRules: {
          include: { salaryRule: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });
    if (!structure) return res.status(404).json({ message: 'Salary structure not found' });
    res.json(structure);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/salary-structures', async (req, res) => {
  try {
    const { name, code, description, rules } = req.body;

    const structure = await prismaClient.salaryStructure.create({
      data: {
        name,
        code,
        description,
        structureRules: {
          create: rules.map((ruleId) => ({
            salaryRuleId: ruleId,
            sequence: 0,
            isActive: true,
          })),
        },
      },
    });
    res.status(201).json(structure);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/salary-rules', async (req, res) => {
  try {
    const rules = await prismaClient.salaryRule.findMany({
      where: { isActive: true },
      orderBy: { sequence: 'asc' },
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/salary-rules', async (req, res) => {
  try {
    const { name, code, category, computationType, fixedAmount, percentage, percentageBase, formula } = req.body;

    const rule = await prismaClient.salaryRule.create({
      data: {
        name,
        code,
        category,
        computationType,
        fixedAmount,
        percentage,
        percentageBase,
        formula,
        isActive: true,
      },
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/salary-structures/:structureId/compute', async (req, res) => {
  try {
    const { payrunId } = req.params;
    const result = await prismaClient.$transaction(async (tx) => {
      // Get payrun with salary structure
      const payrun = await tx.payrun.findUnique({
        where: { id: payrunId },
        include: { salaryStructure: { include: { structureRules: { include: { salaryRule: true } } } } },
      });

      if (!payrun) throw new Error('Payrun not found');

      // Compute payroll
      const rules = payrun.salaryStructure.structureRules
        .sort((a, b) => a.sequence - b.sequence)
        .map((sr) => sr.salaryRule);

      let basicAmount = 0;
      let allowanceAmount = 0;
      let deductionAmount = 0;
      let contributionAmount = 0;
      let grossAmount = 0;

      for (const rule of rules) {
        const ruleValue = rule.computationType === 'FIXED'
          ? rule.fixedAmount || 0
          : rule.computationType === 'PERCENTAGE'
            ? 0
            : 0;

        switch (rule.category) {
          case 'BASIC':
            basicAmount += ruleValue;
            break;
          case 'ALLOWANCE':
            allowanceAmount += ruleValue;
            break;
          case 'DEDUCTION':
            deductionAmount += ruleValue;
            break;
          case 'CONTRIBUTION':
            contributionAmount += ruleValue;
            break;
          case 'GROSS':
            grossAmount = basicAmount + allowanceAmount - deductionAmount;
            break;
          case 'NET':
            // Net = Gross - Contributions (simplified)
            break;
        }
      }

      return {
        basicAmount,
        allowanceAmount,
        deductionAmount,
        contributionAmount,
        grossAmount,
        netAmount: grossAmount - contributionAmount,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// PAYRUN ROUTES (Two-step workflow)
// ==========================================
router.post('/payruns', async (req, res) => {
  try {
    const { name, salaryStructureId, periodStart, periodEnd, employeeIds = [] } = req.body;
    if (!name || !salaryStructureId || !periodStart || !periodEnd) return res.status(400).json({ message: 'Name, salary structure, and payrun period are required' });
    if (!Array.isArray(employeeIds) || !employeeIds.length) return res.status(400).json({ message: 'Select at least one employee for the payrun' });
    const createdById = req.user?.employee?.id || req.user?.employeeId;
    if (!createdById) return res.status(400).json({ message: 'The signed-in user does not have an employee profile and cannot create a payrun' });
    const employeeCount = await prismaClient.employee.count({ where: { id: { in: employeeIds } } });
    if (employeeCount !== new Set(employeeIds).size) return res.status(400).json({ message: 'One or more selected employees no longer exist. Refresh and try again.' });

    const payrun = await prismaClient.payrun.create({
      data: {
        name,
        salaryStructureId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: 'DRAFT',
        createdById,
      },
      include: { salaryStructure: true },
    });

    selectedEmployeesByPayrun.set(payrun.id, [...new Set(employeeIds)]);

    res.status(201).json(payrun);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/payruns/:id/employees', async (req, res) => {
  try {
    const payrun = await prismaClient.payrun.findUnique({
      where: { id: req.params.id },
      include: { payslips: { include: { employee: true } } },
    });

    // Get employees with active contracts in the payrun period
    const employeesWithContracts = await prismaClient.employee.findMany({
      where: {
        contracts: {
          some: {
            status: 'ACTIVE',
            startDate: { lte: payrun.periodEnd },
            OR: [{ endDate: null }, { endDate: { gte: payrun.periodStart } }],
          },
        },
      },
      include: { user: true, contracts: { where: { status: 'ACTIVE', startDate: { lte: payrun.periodEnd }, OR: [{ endDate: null }, { endDate: { gte: payrun.periodStart } }] } } },
    });

    const selectedEmployees = selectedEmployeesByPayrun.get(req.params.id) || payrun.payslips.map((p) => p.employeeId);

    res.json({
      payrun,
      allEligible: employeesWithContracts,
      selected: selectedEmployees,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/payruns/:id/select-employees', async (req, res) => {
  try {
    const { employeeIds } = req.body;
    if (!Array.isArray(employeeIds)) return res.status(400).json({ message: 'employeeIds must be an array' });
    const payrun = await prismaClient.payrun.findUnique({ where: { id: req.params.id } });
    if (!payrun || payrun.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT payruns can select employees' });

    const employees = await prismaClient.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { user: true, contracts: { where: { status: 'ACTIVE', startDate: { lte: payrun.periodEnd }, OR: [{ endDate: null }, { endDate: { gte: payrun.periodStart } }] }, orderBy: { startDate: 'desc' }, take: 1 } },
    });
    if (employees.length !== employeeIds.length) return res.status(400).json({ message: 'One or more selected employees are not eligible for this period' });
    selectedEmployeesByPayrun.set(req.params.id, employeeIds);

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/payruns/:id/compute', async (req, res) => {
  try {
    const payrunId = req.params.id;

    const payrun = await prismaClient.payrun.findUnique({
      where: { id: payrunId },
      include: { salaryStructure: { include: { structureRules: { include: { salaryRule: true } } } } },
    });

    if (!payrun || payrun.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Payrun not in DRAFT status' });
    }

    let selectedIds = selectedEmployeesByPayrun.get(payrunId) || [];
    // The selection cache is in memory. Rebuild it after a backend restart so
    // an already-created draft payrun can still be computed.
    if (!selectedIds.length) {
      const eligible = await prismaClient.employee.findMany({
        where: {
          contracts: {
            some: {
              status: 'ACTIVE',
              startDate: { lte: payrun.periodEnd },
              OR: [{ endDate: null }, { endDate: { gte: payrun.periodStart } }],
            },
          },
        },
        select: { id: true },
      });
      selectedIds = eligible.map((employee) => employee.id);
      if (selectedIds.length) selectedEmployeesByPayrun.set(payrunId, selectedIds);
    }
    if (!selectedIds.length) return res.status(400).json({ message: 'Select at least one employee before computing the payrun' });
    const employees = await prismaClient.employee.findMany({
      where: { id: { in: selectedIds } },
      include: { user: true, contracts: { where: { status: 'ACTIVE', startDate: { lte: payrun.periodEnd }, OR: [{ endDate: null }, { endDate: { gte: payrun.periodStart } }] }, orderBy: { startDate: 'desc' }, take: 2 }, workingSchedule: { include: { lines: true } } },
    });

    // Compute payslips for each employee
    const warnings = [];
    const payslipPromises = employees.map(async (employee) => {
        // Find active contract for this period
        const contract = employee.contracts.find(
          (c) => c.status === 'ACTIVE' &&
          c.startDate <= payrun.periodEnd &&
          (!c.endDate || c.endDate >= payrun.periodStart)
        );

        if (!contract) {
          warnings.push({
            type: 'NO_ACTIVE_CONTRACT',
            severity: 'ERROR',
            message: `Employee ${employee.firstName} ${employee.lastName} has no active contract for period`,
            employeeId: employee.id,
          });
          return null;
        }

        // Get salary rules in sequence order
        const rules = payrun.salaryStructure.structureRules
          .sort((a, b) => a.sequence - b.sequence)
          .map((sr) => sr.salaryRule);

        // Compute amounts
        let basicAmount = 0;
        let allowanceAmount = 0;
        let deductionAmount = 0;
        let contributionAmount = 0;
        let grossAmount = 0;

        for (const rule of rules) {
          const ruleValue = rule.computationType === 'FIXED'
            ? Number(rule.fixedAmount || 0)
            : rule.computationType === 'PERCENTAGE'
              ? (Number(contract.wage) * Number(rule.percentage || 0) / 100)
              : 0;

          switch (rule.category) {
            case 'BASIC':
              basicAmount += ruleValue;
              break;
            case 'ALLOWANCE':
              allowanceAmount += ruleValue;
              break;
            case 'DEDUCTION':
              deductionAmount += ruleValue;
              break;
            case 'CONTRIBUTION':
              contributionAmount += ruleValue;
              break;
            case 'GROSS':
              grossAmount = basicAmount + allowanceAmount - deductionAmount;
              break;
            case 'NET':
              // Net = Gross - Contributions (simplified, no tax in this demo)
              break;
          }
        }

        const attendance = await prismaClient.attendance.findMany({ where: { employeeId: employee.id, attendanceDate: { gte: payrun.periodStart, lte: payrun.periodEnd } } });
        const workedDays = attendance.filter((entry) => ['PRESENT', 'LATE', 'OVERTIME'].includes(entry.status)).length;
        const workedHours = employee.workingSchedule && employee.workingSchedule.lines
          ? calculateWorkedHours(employee.workingSchedule)
          : 0;

        const netAmount = grossAmount - contributionAmount;

        // Create payslip
        const payslip = await prismaClient.payslip.create({
          data: {
            payrun: { connect: { id: payrun.id } },
            employee: { connect: { id: employee.id } },
            contract: { connect: { id: contract.id } },
            salaryStructure: { connect: { id: payrun.salaryStructureId } },
            periodStart: payrun.periodStart,
            periodEnd: payrun.periodEnd,
            workedDays,
            workedHours,
            basicAmount,
            grossAmount: basicAmount + allowanceAmount,
            deductionAmount,
            contributionAmount,
            netAmount,
            currency: contract.currency,
            status: 'COMPUTED',
          },
        });

        // Check for warnings
        if (!employee.bankAccountNumber) {
          await prismaClient.payrollWarning.create({
            data: {
              payrun: { connect: { id: payrun.id } },
              payslip: { connect: { id: payslip.id } },
              employee: { connect: { id: employee.id } },
              type: 'MISSING_BANK_DETAILS',
              severity: 'WARNING',
              message: `Employee missing bank account details`,
            },
          });
        }

        return payslip;
    });

    const results = await Promise.all(payslipPromises);
    const validPayslips = results.filter((r) => r !== null);

    await prismaClient.payrun.update({
      where: { id: payrunId },
      data: { status: 'COMPUTED', computedAt: new Date() },
    });

    res.json({
      payrunId,
      computedPayslips: validPayslips.length,
      totalEmployees: employees.length,
      warningsCount: warnings.length,
      warnings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/payruns/:id/validate', async (req, res) => {
  try {
    const payrun = await prismaClient.payrun.findUnique({
      where: { id: req.params.id },
      include: { warnings: true, payslips: true },
    });

    if (!payrun) return res.status(404).json({ message: 'Payrun not found' });

    // Check for critical warnings
    if (payrun.status !== 'COMPUTED') return res.status(400).json({ message: 'Only COMPUTED payruns can be validated' });
    const criticalWarnings = payrun.warnings.filter((w) => w.severity === 'ERROR' && !w.resolved);

    if (criticalWarnings.length > 0) {
      return res.status(400).json({
        message: 'Payrun has critical warnings that must be resolved',
        criticalWarnings,
      });
    }

    await prismaClient.payrun.update({
      where: { id: req.params.id },
      data: { status: 'VALIDATED', validatedAt: new Date() },
    });
    await prismaClient.payslip.updateMany({ where: { payrunId: req.params.id }, data: { status: 'VALIDATED', validatedAt: new Date() } });

    res.json({ message: 'Payrun validated successfully', payrun });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/payruns/:id/pay', async (req, res) => {
  try {
    const payrun = await prismaClient.payrun.findUnique({ where: { id: req.params.id } });
    if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
    if (payrun.status !== 'VALIDATED') return res.status(400).json({ message: 'Only VALIDATED payruns can be marked paid' });
    await prismaClient.payrun.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await prismaClient.payslip.updateMany({ where: { payrunId: req.params.id }, data: { status: 'PAID', paidAt: new Date() } });

    res.json({ message: 'Payrun marked as paid' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/payruns/:id/warnings', async (req, res) => {
  try {
    const warnings = await prismaClient.payrollWarning.findMany({
      where: { payrunId: req.params.id },
      include: { payslip: true, employee: true },
    });
    res.json(warnings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = {
  router,
  initPrisma,
};
