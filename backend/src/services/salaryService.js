const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class SalaryStructureService extends BaseService {
  constructor() {
    super('salaryStructure');
  }

  async findByCode(code) {
    return this.model.findUnique({ where: { code } });
  }

  async getWithRules(id) {
    return this.model.findUnique({
      where: { id },
      include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } },
    });
  }

  async getActiveStructures() {
    return this.model.findMany({
      where: { isActive: true },
      include: { _count: { select: { contracts: true, payruns: true, structureRules: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createWithRules(data, rules) {
    return getPrisma().$transaction(async (tx) => {
      const structure = await tx.salaryStructure.create({ data });
      if (rules && rules.length > 0) {
        await tx.salaryStructureRule.createMany({
          data: rules.map((rule, index) => ({
            salaryStructureId: structure.id,
            salaryRuleId: rule.salaryRuleId,
            sequence: rule.sequence ?? index,
            isActive: rule.isActive ?? true,
          })),
        });
      }
      return this.getWithRules(structure.id);
    });
  }

  async updateWithRules(id, data, rules) {
    return getPrisma().$transaction(async (tx) => {
      await tx.salaryStructure.update({ where: { id }, data });
      if (rules) {
        await tx.salaryStructureRule.deleteMany({ where: { salaryStructureId: id } });
        if (rules.length > 0) {
          await tx.salaryStructureRule.createMany({
            data: rules.map((rule, index) => ({
              salaryStructureId: id,
              salaryRuleId: rule.salaryRuleId,
              sequence: rule.sequence ?? index,
              isActive: rule.isActive ?? true,
            })),
          });
        }
      }
      return this.getWithRules(id);
    });
  }
}

class SalaryRuleService extends BaseService {
  constructor() {
    super('salaryRule');
  }

  async findByCode(code) {
    return this.model.findUnique({ where: { code } });
  }

  async getByCategory(category) {
    return this.model.findMany({
      where: { category, isActive: true },
      orderBy: { sequence: 'asc' },
    });
  }

  async getActiveRules() {
    return this.model.findMany({
      where: { isActive: true },
      orderBy: { sequence: 'asc' },
    });
  }

  async getOrderedRules(structureId) {
    return getPrisma().salaryStructureRule.findMany({
      where: { salaryStructureId: structureId, isActive: true },
      include: { salaryRule: true },
      orderBy: { sequence: 'asc' },
    });
  }
}

class SalaryStructureRuleService extends BaseService {
  constructor() {
    super('salaryStructureRule');
  }
}

module.exports = {
  salaryStructureService: new SalaryStructureService(),
  salaryRuleService: new SalaryRuleService(),
  salaryStructureRuleService: new SalaryStructureRuleService(),
};