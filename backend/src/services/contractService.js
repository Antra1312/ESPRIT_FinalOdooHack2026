const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class ContractService extends BaseService {
  constructor() {
    super('contract');
  }

  async findByContractNumber(contractNumber) {
    return this.model.findUnique({ where: { contractNumber } });
  }

  async getEmployeeContracts(employeeId, includeInactive = false) {
    const where = { employeeId, ...(includeInactive ? {} : { status: { not: 'CANCELLED' } }) };
    return this.model.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        jobPosition: { select: { id: true, title: true, code: true } },
        workingSchedule: { include: { lines: { orderBy: { sequence: 'asc' } } } },
        salaryStructure: { include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getActiveContract(employeeId, date = new Date()) {
    return this.model.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      include: {
        department: true,
        jobPosition: true,
        workingSchedule: { include: { lines: { orderBy: { sequence: 'asc' } } } },
        salaryStructure: { include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } } },
      },
    });
  }

  async getApplicableContract(employeeId, periodStart, periodEnd) {
    return this.model.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
      include: {
        salaryStructure: { include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } } },
      },
    });
  }

  async getOverlappingContracts(employeeId, startDate, endDate, excludeId = null) {
    const where = {
      employeeId,
      status: { in: ['ACTIVE', 'DRAFT'] },
      startDate: { lte: endDate },
      OR: [{ endDate: null }, { endDate: { gte: startDate } }],
    };
    if (excludeId) where.id = { not: excludeId };
    return this.model.findMany({ where });
  }

  async getExpiringContracts(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.model.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { not: null, lte: futureDate, gte: new Date() },
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, workEmail: true } } },
      orderBy: { endDate: 'asc' },
    });
  }

  async expireContracts() {
    const now = new Date();
    return this.model.updateMany({
      where: { status: 'ACTIVE', endDate: { not: null, lt: now } },
      data: { status: 'EXPIRED' },
    });
  }

  async activateContract(id) {
    return getPrisma().$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id }, select: { employeeId: true, startDate: true, endDate: true } });
      if (!contract) throw new Error('Contract not found');

      await tx.contract.updateMany({
        where: {
          employeeId: contract.employeeId,
          id: { not: id },
          status: 'ACTIVE',
          OR: [{ endDate: null }, { endDate: { gte: contract.startDate } }],
        },
        data: { status: 'EXPIRED' },
      });

      return tx.contract.update({ where: { id }, data: { status: 'ACTIVE' } });
    });
  }
}

module.exports = new ContractService();