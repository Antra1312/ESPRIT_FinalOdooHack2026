const BaseService = require('./baseService');
const prisma = require('../config/prisma');

class JobPositionService extends BaseService {
  constructor() {
    super('jobPosition');
  }

  async findByCode(code) {
    return this.model.findUnique({ where: { code } });
  }

  async getByDepartment(departmentId, includeInactive = false) {
    const where = { departmentId, ...(includeInactive ? {} : { isActive: true }) };
    return this.model.findMany({
      where,
      include: { _count: { select: { employees: { where: { status: 'ACTIVE' } } } } },
      orderBy: { title: 'asc' },
    });
  }

  async getWithStats() {
    return this.model.findMany({
      where: { isActive: true },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: { where: { status: 'ACTIVE' } }, contracts: true } },
      },
      orderBy: { title: 'asc' },
    });
  }
}

module.exports = new JobPositionService();