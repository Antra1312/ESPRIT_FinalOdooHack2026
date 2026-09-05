const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class AttendanceService extends BaseService {
  constructor() {
    super('attendance');
  }

  async findByEmployeeAndDate(employeeId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.model.findFirst({
      where: { employeeId, attendanceDate: { gte: startOfDay, lte: endOfDay } },
    });
  }

  async getEmployeeAttendance(employeeId, startDate, endDate) {
    return this.model.findMany({
      where: {
        employeeId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
      include: { editedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { attendanceDate: 'asc' },
    });
  }

  async getAttendanceByDateRange(startDate, endDate, filters = {}) {
    const { departmentId, employeeId, status } = filters;
    const where = {
      attendanceDate: { gte: startDate, lte: endDate },
      ...(employeeId && { employeeId }),
      ...(status && { status }),
    };

    if (departmentId) {
      where.employee = { departmentId };
    }

    return this.model.findMany({
      where,
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, department: { select: { id: true, name: true } } },
        },
        editedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ attendanceDate: 'asc' }, { employeeId: 'asc' }],
    });
  }

  async checkIn(employeeId, date = new Date(), source = 'EMPLOYEE') {
    const existing = await this.findByEmployeeAndDate(employeeId, date);
    if (existing) {
      if (existing.checkIn) throw new Error('Already checked in today');
      return this.update(existing.id, { checkIn: date, source, status: await this.determineStatus(employeeId, date, 'checkIn') });
    }
    return this.create({
      employeeId,
      attendanceDate: date,
      checkIn: date,
      source,
      status: await this.determineStatus(employeeId, date, 'checkIn'),
    });
  }

  async checkOut(employeeId, date = new Date(), source = 'EMPLOYEE') {
    const record = await this.findByEmployeeAndDate(employeeId, date);
    if (!record) throw new Error('No check-in record found for today');
    if (record.checkOut) throw new Error('Already checked out today');

    const workedMinutes = this.calculateWorkedMinutes(record.checkIn, date);
    const schedule = await this.getEmployeeSchedule(employeeId, date);
    const expectedMinutes = schedule ? this.getExpectedMinutes(schedule, date) : workedMinutes;
    const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);

    let status = 'PRESENT';
    if (workedMinutes < expectedMinutes * 0.75) status = 'INCOMPLETE';
    else if (overtimeMinutes > 0) status = 'OVERTIME';

    return this.update(record.id, {
      checkOut: date,
      workedMinutes,
      overtimeMinutes,
      status,
      source,
    });
  }

  async correctAttendance(id, data, editorId, reason) {
    const record = await this.findById(id);
    if (!record) throw new Error('Attendance record not found');

    return this.update(id, {
      ...data,
      isManuallyEdited: true,
      editedByUserId: editorId,
      correctionReason: reason,
    });
  }

  async bulkCreate(records) {
    return getPrisma().$transaction(async (tx) => {
      const results = [];
      for (const record of records) {
        const existing = await tx.attendance.findUnique({
          where: { employeeId_attendanceDate: { employeeId: record.employeeId, attendanceDate: record.attendanceDate } },
        });
        if (existing) {
          results.push({ ...existing, skipped: true });
        } else {
          results.push(await tx.attendance.create({ data: record }));
        }
      }
      return results;
    });
  }

  async getAttendanceStats(employeeId, startDate, endDate) {
    const attendances = await this.model.findMany({
      where: { employeeId, attendanceDate: { gte: startDate, lte: endDate } },
    });

    return {
      totalDays: attendances.length,
      present: attendances.filter(a => a.status === 'PRESENT').length,
      late: attendances.filter(a => a.status === 'LATE').length,
      absent: attendances.filter(a => a.status === 'ABSENT').length,
      overtime: attendances.filter(a => a.status === 'OVERTIME').length,
      incomplete: attendances.filter(a => a.status === 'INCOMPLETE').length,
      totalWorkedMinutes: attendances.reduce((sum, a) => sum + (a.workedMinutes || 0), 0),
      totalOvertimeMinutes: attendances.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0),
    };
  }

  async getDepartmentAttendance(departmentId, startDate, endDate) {
    const employees = await getPrisma().employee.findMany({
      where: { departmentId, status: 'ACTIVE' },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });

    const attendances = await this.model.findMany({
      where: { employeeId: { in: employees.map(e => e.id) }, attendanceDate: { gte: startDate, lte: endDate } },
    });

    return employees.map(emp => {
      const empAtt = attendances.filter(a => a.employeeId === emp.id);
      return {
        employee: emp,
        stats: {
          totalDays: empAtt.length,
          present: empAtt.filter(a => a.status === 'PRESENT').length,
          late: empAtt.filter(a => a.status === 'LATE').length,
          absent: empAtt.filter(a => a.status === 'ABSENT').length,
          overtime: empAtt.filter(a => a.status === 'OVERTIME').length,
          incomplete: empAtt.filter(a => a.status === 'INCOMPLETE').length,
        },
      };
    });
  }

  calculateWorkedMinutes(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    return Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
  }

  async determineStatus(employeeId, date, type) {
    const schedule = await this.getEmployeeSchedule(employeeId, date);
    if (!schedule) return 'PRESENT';

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'uppercase' });
    const dayLine = schedule.lines.find(l => l.dayOfWeek === dayOfWeek);
    if (!dayLine) return 'PRESENT';

    const checkTime = new Date(date);
    const startTime = new Date(`1970-01-01T${dayLine.startTime.toISOString().substr(11, 8)}Z`);
    const lateThreshold = new Date(startTime.getTime() + 15 * 60000);

    if (type === 'checkIn' && checkTime > lateThreshold) return 'LATE';
    return 'PRESENT';
  }

  async getEmployeeSchedule(employeeId, date) {
    const employee = await getPrisma().employee.findUnique({
      where: { id: employeeId },
      select: { workingScheduleId: true, contracts: { where: { status: 'ACTIVE', startDate: { lte: date }, OR: [{ endDate: null }, { endDate: { gte: date } }] }, select: { workingScheduleId: true }, take: 1 } },
    });

    const scheduleId = employee?.contracts?.[0]?.workingScheduleId || employee?.workingScheduleId;
    if (!scheduleId) return null;

    return getPrisma().workingSchedule.findUnique({
      where: { id: scheduleId },
      include: { lines: { orderBy: { sequence: 'asc' } } },
    });
  }

  getExpectedMinutes(schedule, date) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'uppercase' });
    const dayLine = schedule.lines.find(l => l.dayOfWeek === dayOfWeek);
    if (!dayLine) return 0;

    const start = new Date(`1970-01-01T${dayLine.startTime.toISOString().substr(11, 8)}Z`);
    const end = new Date(`1970-01-01T${dayLine.endTime.toISOString().substr(11, 8)}Z`);
    return Math.round((end - start) / 60000) - (dayLine.breakMinutes || 0);
  }
}

module.exports = new AttendanceService();