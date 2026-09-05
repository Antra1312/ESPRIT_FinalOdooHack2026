const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class DepartmentService extends BaseService {
  constructor() {
    super('department');
  }

  async findByCode(code) {
    return this.model.findUnique({ where: { code } });
  }

  async getWithStats(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.model.findMany({
      where,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        _count: { select: { employees: true, contracts: true, jobPositions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getHierarchy() {
    const departments = await this.model.findMany({
      where: { isActive: true },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        jobPositions: { where: { isActive: true } },
        _count: { select: { employees: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: { name: 'asc' },
    });
    return departments;
  }

  async getEmployeeCount(departmentId) {
    return getPrisma().employee.count({
      where: { departmentId, status: 'ACTIVE' },
    });
  }

  async getSalaryCost(departmentId, periodStart, periodEnd) {
    const payslips = await getPrisma().payslip.findMany({
      where: {
        employee: { departmentId },
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        status: { in: ['VALIDATED', 'PAID'] },
      },
      select: { netAmount: true },
    });

    return payslips.reduce((sum, p) => sum + Number(p.netAmount), 0);
  }
}

module.exports = new DepartmentService();