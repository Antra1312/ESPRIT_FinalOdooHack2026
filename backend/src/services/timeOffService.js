const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class TimeOffTypeService extends BaseService {
  constructor() {
    super('timeOffType');
  }

  async findByCode(code) {
    return this.model.findUnique({ where: { code } });
  }

  async getActiveTypes() {
    return this.model.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

class TimeOffAllocationService extends BaseService {
  constructor() {
    super('timeOffAllocation');
  }

  async getEmployeeAllocations(employeeId, date = new Date()) {
    return this.model.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        validFrom: { lte: date },
        validUntil: { gte: date },
      },
      include: { timeOffType: true },
      orderBy: { validFrom: 'asc' },
    });
  }

  async getPendingApprovals() {
    return this.model.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, workEmail: true } },
        timeOffType: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id, approverId) {
    return this.update(id, {
      status: 'APPROVED',
      approvedById: approverId,
      approvedAt: new Date(),
    });
  }

  async refuse(id, approverId) {
    return this.update(id, {
      status: 'REFUSED',
      approvedById: approverId,
      approvedAt: new Date(),
    });
  }
}

class TimeOffRequestService extends BaseService {
  constructor() {
    super('timeOffRequest');
  }

  async getEmployeeRequests(employeeId, filters = {}) {
    const { status, startDate, endDate } = filters;
    const where = { employeeId, ...(status && { status }), ...(startDate && endDate && { startDate: { gte: startDate }, endDate: { lte: endDate } }) };
    return this.model.findMany({
      where,
      include: { timeOffType: true, allocation: { include: { timeOffType: true } }, approvedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingRequests(filters = {}) {
    const { departmentId } = filters;
    const where = { status: 'PENDING', ...(departmentId && { employee: { departmentId } }) };
    return this.model.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, workEmail: true, department: { select: { id: true, name: true } } } },
        timeOffType: true,
        allocation: { include: { timeOffType: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id, approverId) {
    return getPrisma().$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: { id },
        include: { allocation: true },
      });
      if (!request) throw new Error('Request not found');
      if (request.status !== 'PENDING') throw new Error('Request already processed');

      if (request.allocationId) {
        const allocation = await tx.timeOffAllocation.findUnique({ where: { id: request.allocationId } });
        if (!allocation) throw new Error('Allocation not found');
        if (Number(allocation.usedAmount) + Number(request.requestedAmount) > Number(allocation.allocatedAmount)) {
          throw new Error('Insufficient leave balance');
        }
        await tx.timeOffAllocation.update({
          where: { id: request.allocationId },
          data: { usedAmount: { increment: request.requestedAmount } },
        });
      }

      return tx.timeOffRequest.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
        include: { timeOffType: true, allocation: true },
      });
    });
  }

  async refuse(id, approverId, refusalReason) {
    return this.update(id, {
      status: 'REFUSED',
      approvedById: approverId,
      approvedAt: new Date(),
      refusalReason,
    });
  }

  async cancel(id) {
    return getPrisma().$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({ where: { id }, include: { allocation: true } });
      if (!request) throw new Error('Request not found');
      if (request.status !== 'APPROVED') throw new Error('Only approved requests can be cancelled');

      if (request.allocationId) {
        await tx.timeOffAllocation.update({
          where: { id: request.allocationId },
          data: { usedAmount: { decrement: request.requestedAmount } },
        });
      }

      return tx.timeOffRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }
}

module.exports = {
  timeOffTypeService: new TimeOffTypeService(),
  timeOffAllocationService: new TimeOffAllocationService(),
  timeOffRequestService: new TimeOffRequestService(),
};