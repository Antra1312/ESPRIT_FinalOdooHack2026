const BaseService = require('./baseService');
const { getPrismaClient } = require('../config/prisma');

const getPrisma = () => getPrismaClient();

class WorkingScheduleService extends BaseService {
  constructor() {
    super('workingSchedule');
  }

  async findWithLines(id) {
    return this.model.findUnique({
      where: { id },
      include: { lines: { orderBy: { sequence: 'asc' } } },
    });
  }

  async getActiveSchedules() {
    return this.model.findMany({
      where: { isActive: true },
      include: { lines: { orderBy: { sequence: 'asc' } }, _count: { select: { employees: true, contracts: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async calculateWeeklyHours(scheduleId) {
    const schedule = await this.findWithLines(scheduleId);
    if (!schedule) return 0;

    let totalMinutes = 0;
    schedule.lines.forEach(line => {
      const start = new Date(`1970-01-01T${line.startTime.toISOString().substr(11, 8)}Z`);
      const end = new Date(`1970-01-01T${line.endTime.toISOString().substr(11, 8)}Z`);
      const diffMinutes = (end - start) / 60000;
      totalMinutes += diffMinutes - (line.breakMinutes || 0);
    });

    return Math.round(totalMinutes / 60 * 100) / 100;
  }

  async createWithLines(data, lines) {
    return getPrisma().$transaction(async (tx) => {
      const schedule = await tx.workingSchedule.create({ data });
      if (lines && lines.length > 0) {
        await tx.workingScheduleLine.createMany({
          data: lines.map((line, index) => ({
            ...line,
            workingScheduleId: schedule.id,
            sequence: line.sequence ?? index,
          })),
        });
      }
      return this.findWithLines(schedule.id);
    });
  }

  async updateWithLines(id, data, lines) {
    return getPrisma().$transaction(async (tx) => {
      await tx.workingSchedule.update({ where: { id }, data });
      if (lines) {
        await tx.workingScheduleLine.deleteMany({ where: { workingScheduleId: id } });
        if (lines.length > 0) {
          await tx.workingScheduleLine.createMany({
            data: lines.map((line, index) => ({
              ...line,
              workingScheduleId: id,
              sequence: line.sequence ?? index,
            })),
          });
        }
      }
      return this.findWithLines(id);
    });
  }
}

module.exports = new WorkingScheduleService();