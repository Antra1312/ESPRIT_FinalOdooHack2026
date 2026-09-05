const express = require('express');
const router = express.Router();

// Database initialization - will be available after app startup
let prismaClient = null;

// Initialize prisma client (called from app startup)
const initPrisma = (client) => {
  prismaClient = client;
};

// Helper: calculate weekly worked hours from schedule
const calculateWorkedHours = (schedule) => {
  if (!schedule || !schedule.scheduleLines) return 0;
  return schedule.scheduleLines.reduce((sum, line) => {
    const start = new Date(`1970-01-01T${line.startTime}`);
    const end = new Date(`1970-01-01T${line.endTime}`);
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
    const employee = await prismaClient.employee.create({
      data: {
        employeeCode: `EMP-${Date.now()}`,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        workEmail: req.body.workEmail,
        personalEmail: req.body.personalEmail,
        phone: req.body.phone,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        employmentType: req.body.employmentType || 'FULL_TIME',
        status: req.body.status || 'ACTIVE',
        departmentId: req.body.departmentId,
        jobPositionId: req.body.jobPositionId,
        managerId: req.body.managerId,
        workingScheduleId: req.body.workingScheduleId,
        bankAccountNumber: req.body.bankAccountNumber,
        bankName: req.body.bankName,
        taxIdentifier: req.body.taxIdentifier,
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
    res.status(500).json({ message: error.message });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const employee = await prismaClient.employee.update({
      where: { id: req.params.id },
      data: { ...req.body },
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
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
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
      include: { scheduleLines: true },
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
      include: { scheduleLines: true },
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
        scheduleLines: {
          create: [
            { dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'TUESDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'THURSDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
            { dayOfWeek: 'FRIDAY', startTime: '09:00:00', endTime: '17:00:00', breakMinutes: 60 },
          ],
        },
      },
      include: { scheduleLines: true },
    });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// TIME OFF ROUTES
// ==========================================
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
    const { employeeId, timeOffTypeId, allocationId, startDate, endDate, requestedAmount, reason } = req.body;

    // Check allocation balance if provided
    let availableBalance = 0;
    if (allocationId) {
      const allocation = await prismaClient.timeOffAllocation.findUnique({
        where: { id: allocationId },
      });
      availableBalance = allocation ? allocation.allocatedAmount - allocation.usedAmount : 0;
    }

    if (requestedAmount > availableBalance) {
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
    const request = await prismaClient.timeOffRequest.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedById: req.user.employeeId, approvedAt: new Date() },
    });

    // Deduct from allocation
    if (request.allocationId) {
      await prismaClient.timeOffAllocation.update({
        where: { id: request.allocationId },
        data: { usedAmount: { increment: request.requestedAmount } },
      });
    }

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
      include: { salaryRules: { orderBy: { salaryStructureRules: 'sequence' } } },
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
        salaryStructureRules: {
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
        salaryStructureRules: {
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
        include: { salaryStructure: { include: { salaryStructureRules: { include: { salaryRule: true } } } } },
      });

      if (!payrun) throw new Error('Payrun not found');

      // Compute payroll
      const rules = payrun.salaryStructure.salaryStructureRules
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
    const { name, salaryStructureId, periodStart, periodEnd } = req.body;

    const payrun = await prismaClient.payrun.create({
      data: {
        name,
        salaryStructureId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: 'DRAFT',
        createdById: req.user.employeeId,
      },
      include: { salaryStructure: true },
    });

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
            OR: [
              { startDate: { lte: payrun.periodEnd }, endDate: { gte: payrun.periodStart } },
            ],
          },
        },
      },
      include: { user: true, contracts: true },
    });

    const selectedEmployees = payrun.payslips.map((p) => p.employeeId);

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

    const employees = await prismaClient.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { user: true, contracts: { where: { status: 'ACTIVE' }, take: 1 } },
    });

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
      include: { salaryStructure: { include: { salaryStructureRules: { include: { salaryRule: true } } } } },
    });

    if (!payrun || payrun.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Payrun not in DRAFT status' });
    }

    // Get all eligible employees
    const employees = await prismaClient.employee.findMany({
      where: {
        contracts: {
          some: {
            status: 'ACTIVE',
            OR: [
              { startDate: { lte: payrun.periodEnd }, endDate: { gte: payrun.periodStart } },
            ],
          },
        },
      },
      include: { user: true, contracts: true, workingSchedule: true },
    });

    // Compute payslips for each employee
    const warnings = [];
    const payslipPromises = employees.map((employee) =>
      prismaClient.$transaction(async (tx) => {
        // Find active contract for this period
        const contract = employee.contracts.find(
          (c) => c.status === 'ACTIVE' &&
          c.startDate <= payrun.periodEnd &&
          c.endDate >= payrun.periodStart
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
        const rules = payrun.salaryStructure.salaryStructureRules
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
            ? rule.fixedAmount || 0
            : rule.computationType === 'PERCENTAGE'
              ? (contract.wage * (rule.percentage / 100))
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

        const workedDays = 22; // Would come from attendance records
        const workedHours = employee.workingSchedule && employee.workingSchedule.scheduleLines
          ? calculateWorkedHours(employee.workingSchedule)
          : 0;

        const netAmount = grossAmount - contributionAmount;

        // Create payslip
        const payslip = await tx.payslip.create({
          data: {
            payrunId: payrun.id,
            employeeId: employee.id,
            contractId: contract.id,
            salaryStructureId: payrun.salaryStructureId,
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
          await tx.payrollWarning.create({
            data: {
              payrunId: payrun.id,
              payslipId: payslip.id,
              employeeId: employee.id,
              type: 'MISSING_BANK_DETAILS',
              severity: 'WARNING',
              message: `Employee missing bank account details`,
            },
          });
        }

        return payslip;
      })
    );

    const results = await Promise.all(payslipPromises);
    const validPayslips = results.filter((r) => r !== null);

    await prismaClient.payrun.update({
      where: { id: payrunId },
      data: { status: 'COMPUTED' },
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
    const criticalWarnings = payrun.warnings.filter((w) => w.severity === 'ERROR');

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

    res.json({ message: 'Payrun validated successfully', payrun });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/payruns/:id/pay', async (req, res) => {
  try {
    await prismaClient.payrun.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

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