const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class EmployeeService extends BaseService {
  constructor() {
    super('employee');
  }

  async findByEmployeeCode(employeeCode) {
    return this.model.findUnique({
      where: { employeeCode },
      include: {
        department: true,
        jobPosition: true,
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        workingSchedule: { include: { lines: { orderBy: { sequence: 'asc' } } } },
        user: { select: { id: true, email: true, role: true } },
        contracts: { where: { status: 'ACTIVE' }, include: { salaryStructure: true } },
      },
    });
  }

  async findByWorkEmail(workEmail) {
    return this.model.findUnique({
      where: { workEmail },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }

  async findByUserId(userId) {
    return this.model.findUnique({
      where: { userId },
      include: {
        department: true,
        jobPosition: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        workingSchedule: { include: { lines: { orderBy: { sequence: 'asc' } } } },
        contracts: { where: { status: 'ACTIVE' } },
      },
    });
  }

  async getSubordinates(managerId) {
    return this.model.findMany({
      where: { managerId },
      include: { department: true, jobPosition: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async getWithRelations(params = {}) {
    const { where, include, orderBy, skip, take } = params;
    return this.model.findMany({
      where,
      include: {
        department: true,
        jobPosition: true,
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        workingSchedule: { include: { lines: { orderBy: { sequence: 'asc' } } } },
        user: { select: { id: true, email: true, role: true } },
        _count: { select: { contracts: true, attendances: true, timeOffRequests: true, payslips: true } },
        ...include,
      },
      orderBy: orderBy || { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getActiveContracts(employeeId, date = new Date()) {
    return getPrisma().contract.findMany({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      include: { salaryStructure: { include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } } } },
    });
  }

  async getApplicableContract(employeeId, periodStart, periodEnd) {
    return getPrisma().contract.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
      include: { salaryStructure: { include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } } } },
    });
  }

  async getAttendanceStats(employeeId, startDate, endDate) {
    const attendances = await getPrisma().attendance.findMany({
      where: {
        employeeId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
    });

    const stats = {
      totalDays: attendances.length,
      present: 0,
      late: 0,
      absent: 0,
      overtime: 0,
      incomplete: 0,
      totalWorkedMinutes: 0,
      totalOvertimeMinutes: 0,
    };

    attendances.forEach(a => {
      stats[a.status.toLowerCase()]++;
      stats.totalWorkedMinutes += a.workedMinutes || 0;
      stats.totalOvertimeMinutes += a.overtimeMinutes || 0;
    });

    return stats;
  }

  async getLeaveBalances(employeeId, date = new Date()) {
    const allocations = await getPrisma().timeOffAllocation.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        validFrom: { lte: date },
        validUntil: { gte: date },
      },
      include: { timeOffType: true, requests: { where: { status: 'APPROVED' } } },
    });

    return allocations.map(a => ({
      id: a.id,
      timeOffType: a.timeOffType,
      allocated: a.allocatedAmount,
      used: a.usedAmount,
      remaining: Number(a.allocatedAmount) - Number(a.usedAmount),
      validFrom: a.validFrom,
      validUntil: a.validUntil,
    }));
  }

  async searchEmployees(query, filters = {}) {
    const { departmentId, jobPositionId, status, employmentType } = filters;
    const where = {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { employeeCode: { contains: query, mode: 'insensitive' } },
        { workEmail: { contains: query, mode: 'insensitive' } },
      ],
      ...(departmentId && { departmentId }),
      ...(jobPositionId && { jobPositionId }),
      ...(status && { status }),
      ...(employmentType && { employmentType }),
    };

    return this.model.findMany({
      where,
      include: { department: true, jobPosition: true, manager: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { firstName: 'asc' },
      take: 50,
    });
  }
}

module.exports = new EmployeeService();