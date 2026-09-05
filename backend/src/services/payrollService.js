const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class PayrunService extends BaseService {
  constructor() {
    super('payrun');
  }

  async findWithDetails(id) {
    return this.model.findUnique({
      where: { id },
      include: {
        salaryStructure: { include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } } },
        createdBy: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        payslips: { include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
        warnings: { include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } } },
      },
    });
  }

  async getByPeriod(periodStart, periodEnd) {
    return this.model.findMany({
      where: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
      include: { salaryStructure: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingPayruns() {
    return this.model.findMany({
      where: { status: { in: ['DRAFT', 'COMPUTED'] } },
      include: { salaryStructure: true, _count: { select: { payslips: true, warnings: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async compute(id) {
    return getPrisma().$transaction(async (tx) => {
      const payrun = await tx.payrun.findUnique({
        where: { id },
        include: {
          salaryStructure: { include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } } },
          payslips: { include: { employee: { include: { contracts: { where: { status: 'ACTIVE' } }, workingSchedule: { include: { lines: true } } } } } },
        },
      });
      if (!payrun) throw new Error('Payrun not found');
      if (payrun.status !== 'DRAFT') throw new Error('Only DRAFT payruns can be computed');

      // Delete existing payslips for recomputation
      await tx.payslip.deleteMany({ where: { payrunId: id } });
      await tx.payrollWarning.deleteMany({ where: { payrunId: id } });

      const rules = payrun.salaryStructure.structureRules.filter(r => r.isActive).map(r => r.salaryRule);
      const results = [];

      for (const payslip of payrun.payslips) {
        const employee = payslip.employee;
        const contract = employee.contracts[0];

        // Generate warnings
        const warnings = [];
        if (!employee.bankAccountNumber || !employee.bankName) {
          warnings.push({ type: 'MISSING_BANK_DETAILS', severity: 'WARNING', message: 'Employee missing bank details' });
        }
        if (!contract) {
          warnings.push({ type: 'NO_ACTIVE_CONTRACT', severity: 'ERROR', message: 'No active contract for payroll period' });
        }
        const activeContracts = employee.contracts.filter(c => c.status === 'ACTIVE');
        if (activeContracts.length > 1) {
          warnings.push({ type: 'MULTIPLE_ACTIVE_CONTRACTS', severity: 'WARNING', message: 'Multiple active contracts found' });
        }
        if (!payrun.salaryStructure) {
          warnings.push({ type: 'MISSING_SALARY_STRUCTURE', severity: 'ERROR', message: 'No salary structure assigned to payrun' });
        }

        // Compute payslip
        let basicAmount = 0;
        let grossAmount = 0;
        let deductionAmount = 0;
        let contributionAmount = 0;
        const payslipLines = [];

        for (const rule of rules) {
          let amount = 0;
          let baseAmount = 0;
          let quantity = 1;
          let rate = 0;

          if (rule.computationType === 'FIXED') {
            amount = Number(rule.fixedAmount || 0);
          } else if (rule.computationType === 'PERCENTAGE') {
            baseAmount = grossAmount || Number(contract?.wage || 0);
            amount = (baseAmount * Number(rule.percentage || 0)) / 100;
          } else if (rule.computationType === 'FORMULA') {
            // Formula evaluation would be implemented here safely
            amount = 0;
          }

          // Categorize amounts
          if (rule.category === 'BASIC') basicAmount += amount;
          else if (rule.category === 'ALLOWANCE') grossAmount += amount;
          else if (rule.category === 'DEDUCTION') deductionAmount += amount;
          else if (rule.category === 'CONTRIBUTION') contributionAmount += amount;

          payslipLines.push({
            salaryRuleId: rule.id,
            ruleCode: rule.code,
            ruleName: rule.name,
            category: rule.category,
            sequence: rule.sequence,
            quantity,
            rate: rule.fixedAmount || rule.percentage || 0,
            baseAmount,
            amount,
          });
        }

        grossAmount += basicAmount;
        const netAmount = grossAmount - deductionAmount - contributionAmount;

        const createdPayslip = await tx.payslip.create({
          data: {
            payrunId: id,
            employeeId: employee.id,
            contractId: contract?.id,
            salaryStructureId: payrun.salaryStructureId,
            periodStart: payrun.periodStart,
            periodEnd: payrun.periodEnd,
            workedDays: 0, // Would be calculated from attendance
            workedHours: 0,
            basicAmount,
            grossAmount,
            deductionAmount,
            contributionAmount,
            netAmount,
            currency: contract?.currency || 'USD',
            status: warnings.some(w => w.severity === 'ERROR') ? 'WARNING' : 'COMPUTED',
            warningCount: warnings.length,
            computedAt: new Date(),
            lines: { create: payslipLines },
          },
        });

        if (warnings.length > 0) {
          await tx.payrollWarning.createMany({
            data: warnings.map(w => ({
              payrunId: id,
              payslipId: createdPayslip.id,
              employeeId: employee.id,
              type: w.type,
              severity: w.severity,
              message: w.message,
            })),
          });
        }

        results.push(createdPayslip);
      }

      await tx.payrun.update({ where: { id }, data: { status: 'COMPUTED', computedAt: new Date() } });
      return results;
    });
  }

  async validate(id) {
    return getPrisma().$transaction(async (tx) => {
      const payrun = await tx.payrun.findUnique({ where: { id } });
      if (!payrun) throw new Error('Payrun not found');
      if (payrun.status !== 'COMPUTED') throw new Error('Only COMPUTED payruns can be validated');

      const errorWarnings = await tx.payrollWarning.findMany({
        where: { payrunId: id, severity: 'ERROR', resolved: false },
      });
      if (errorWarnings.length > 0) {
        throw new Error('Cannot validate: unresolved ERROR warnings exist');
      }

      await tx.payrun.update({ where: { id }, data: { status: 'VALIDATED', validatedAt: new Date() } });
      await tx.payslip.updateMany({ where: { payrunId: id }, data: { status: 'VALIDATED', validatedAt: new Date() } });
      return payrun;
    });
  }

  async markPaid(id) {
    return getPrisma().$transaction(async (tx) => {
      const payrun = await tx.payrun.findUnique({ where: { id } });
      if (!payrun) throw new Error('Payrun not found');
      if (payrun.status !== 'VALIDATED') throw new Error('Only VALIDATED payruns can be marked paid');

      await tx.payrun.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
      await tx.payslip.updateMany({ where: { payrunId: id }, data: { status: 'PAID', paidAt: new Date() } });
      return payrun;
    });
  }
}

class PayslipService extends BaseService {
  constructor() {
    super('payslip');
  }

  async findWithLines(id) {
    return this.model.findUnique({
      where: { id },
      include: { lines: { orderBy: { sequence: 'asc' } }, employee: true, contract: true, payrun: true },
    });
  }

  async getByEmployee(employeeId, filters = {}) {
    const { status, startDate, endDate } = filters;
    const where = { employeeId, ...(status && { status }), ...(startDate && endDate && { periodStart: { gte: startDate }, periodEnd: { lte: endDate } }) };
    return this.model.findMany({
      where,
      include: { lines: { orderBy: { sequence: 'asc' } }, payrun: { include: { salaryStructure: true } } },
      orderBy: { periodStart: 'desc' },
    });
  }

  async getByPayrun(payrunId) {
    return this.model.findMany({
      where: { payrunId },
      include: { lines: { orderBy: { sequence: 'asc' } }, employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { employeeId: 'asc' },
    });
  }

  async recalculate(id) {
    const payslip = await this.findWithLines(id);
    if (!payslip) throw new Error('Payslip not found');
    if (payslip.status === 'PAID') throw new Error('Cannot recalculate paid payslip');

    // Recalculate using the payrun's salary structure rules
    return getPrisma().$transaction(async (tx) => {
      await tx.payslipLine.deleteMany({ where: { payslipId: id } });

      const structureRules = await tx.salaryStructureRule.findMany({
        where: { salaryStructureId: payslip.salaryStructureId, isActive: true },
        include: { salaryRule: true },
        orderBy: { sequence: 'asc' },
      });

      let basicAmount = 0;
      let grossAmount = 0;
      let deductionAmount = 0;
      let contributionAmount = 0;
      const lines = [];

      for (const sr of structureRules) {
        const rule = sr.salaryRule;
        let amount = 0;
        let baseAmount = 0;

        if (rule.computationType === 'FIXED') {
          amount = Number(rule.fixedAmount || 0);
        } else if (rule.computationType === 'PERCENTAGE') {
          baseAmount = grossAmount || Number(payslip.contract?.wage || 0);
          amount = (baseAmount * Number(rule.percentage || 0)) / 100;
        }

        if (rule.category === 'BASIC') basicAmount += amount;
        else if (rule.category === 'ALLOWANCE') grossAmount += amount;
        else if (rule.category === 'DEDUCTION') deductionAmount += amount;
        else if (rule.category === 'CONTRIBUTION') contributionAmount += amount;

        lines.push({
          salaryRuleId: rule.id,
          ruleCode: rule.code,
          ruleName: rule.name,
          category: rule.category,
          sequence: sr.sequence,
          quantity: 1,
          rate: rule.fixedAmount || rule.percentage || 0,
          baseAmount,
          amount,
        });
      }

      grossAmount += basicAmount;
      const netAmount = grossAmount - deductionAmount - contributionAmount;

      await tx.payslip.update({
        where: { id },
        data: {
          basicAmount,
          grossAmount,
          deductionAmount,
          contributionAmount,
          netAmount,
          status: 'COMPUTED',
          computedAt: new Date(),
          lines: { create: lines },
        },
      });

      return this.findWithLines(id);
    });
  }
}

class PayrollWarningService extends BaseService {
  constructor() {
    super('payrollWarning');
  }

  async getByPayrun(payrunId) {
    return this.model.findMany({
      where: { payrunId },
      include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } }, payslip: { select: { id: true } } },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getByPayslip(payslipId) {
    return this.model.findMany({
      where: { payslipId },
      include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async resolve(id, resolverId) {
    return this.update(id, { resolved: true, resolvedAt: new Date(), resolvedById: resolverId });
  }

  async getUnresolvedErrors(payrunId) {
    return this.model.findMany({
      where: { payrunId, severity: 'ERROR', resolved: false },
      include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
    });
  }
}

module.exports = {
  payrunService: new PayrunService(),
  payslipService: new PayslipService(),
  payrollWarningService: new PayrollWarningService(),
};