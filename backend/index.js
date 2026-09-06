const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { initializeDatabase, disconnectDatabase, DB_PROVIDER } = require('./src/config/database');
const { router: hrPayrollRouter, initPrisma } = require('./src/routes/hrPayroll');
const { buildPayslipPdf } = require('./src/services/payslipDeliveryService');
const { sendSmtp, verifySmtp } = require('./src/services/smtpService');
const { authenticate, generateToken } = require('./src/utils/jwt');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));

let prisma;
const databaseReady = initializeDatabase().then(({ client }) => {
  prisma = client;
  initPrisma(client);
  return client;
});

app.get('/health', async (req, res) => {
  try {
    await databaseReady;
    res.json({ status: 'ok', timestamp: new Date(), dbProvider: DB_PROVIDER });
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message, dbProvider: DB_PROVIDER });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await databaseReady;
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true, isActive: true, employee: { select: { id: true } } },
    });
    const valid = user && user.isActive && await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    res.json({ token: generateToken({ userId: user.id }), user: { id: user.id, email: user.email, role: user.role, employeeId: user.employee?.id || null } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    await databaseReady;
    const { firstName, lastName, email, password } = req.body || {};
    if (!firstName || !lastName || !email || !password) return res.status(400).json({ message: 'First name, last name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'An account already exists for this email' });
    const passwordHash = await bcrypt.hash(password, 12);
    const employeeCode = `EMP-${Date.now()}`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'EMPLOYEE',
        employee: {
          create: { employeeCode, firstName, lastName, workEmail: email, joiningDate: new Date(), status: 'ACTIVE', employmentType: 'FULL_TIME' },
        },
      },
      include: { employee: { select: { id: true } } },
    });
    return res.status(201).json({ token: generateToken({ userId: user.id }), user: { id: user.id, email: user.email, role: user.role, employeeId: user.employee.id } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    await databaseReady;
    const email = req.body?.email?.trim().toLowerCase();
    const generic = { message: 'If an account exists for that email, a password-reset link has been sent.' };
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(generic);
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendSmtp({ to: user.email, subject: 'PeoplePay360 password reset', text: `Use this link within 15 minutes to reset your password: ${link}` });
    return res.json(generic);
  } catch (error) { return res.status(502).json({ message: 'Unable to send the password-reset email. Please contact your administrator.' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    await databaseReady;
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 8) return res.status(400).json({ message: 'A valid token and an 8-character password are required' });
    const user = await prisma.user.findFirst({ where: { resetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), resetTokenExpiresAt: { gt: new Date() } } });
    if (!user) return res.status(400).json({ message: 'This password-reset link is invalid or has expired' });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), resetTokenHash: null, resetTokenExpiresAt: null } });
    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) { return res.status(500).json({ message: error.message }); }
});

const publicAuthPaths = new Set(['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']);

app.use('/api', async (req, res, next) => {
  try {
    await databaseReady;
    if (publicAuthPaths.has(req.path.replace(/\/+$/, '') || '/')) return next();
    if (req.headers.authorization) {
      return authenticate(req, res, next);
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const employee = await prisma.employee.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } });
    req.user = req.user || { employeeId: employee?.id || null, role: 'HR_PAYROLL_MANAGER' };
    next();
  } catch (error) {
    res.status(503).json({ message: 'Database unavailable', detail: error.message });
  }
});

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const role = req.user?.role;
  const payrollPath = /^\/(payruns|payslips|salary-structures|salary-rules|email\/verify)/.test(req.path);
  const salaryConfigPath = /^\/(salary-structures|salary-rules)/.test(req.path);
  const allowed = role === 'ADMIN'
    || (role === 'HR_PAYROLL_MANAGER')
    || (role === 'HR_PAYROLL_USER' && !salaryConfigPath)
    || (role === 'HR_MANAGER' && !payrollPath)
    || (role === 'EMPLOYEE' && /^\/(employees\/[^/]+\/time-requests|time-requests)/.test(req.path));
  if (!allowed) return res.status(403).json({ message: 'Insufficient permissions for this operation' });
  next();
});

app.get('/api/bootstrap', async (req, res) => {
  try {
    await databaseReady;
    const scopedEmployeeId = req.user?.role === 'EMPLOYEE' ? req.user.employee?.id : null;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [employees, schedules, attendance, timeOffTypes, allocations, requests, rules, structures, payruns] = await Promise.all([
      prisma.employee.findMany({
        include: { department: true, jobPosition: true, contracts: { orderBy: { startDate: 'asc' } } },
        orderBy: { employeeCode: 'asc' },
      }),
      prisma.workingSchedule.findMany({ include: { lines: true }, orderBy: { name: 'asc' } }),
      prisma.attendance.findMany({ orderBy: { attendanceDate: 'asc' } }),
      prisma.timeOffType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.timeOffAllocation.findMany({ include: { timeOffType: true } }),
      prisma.timeOffRequest.findMany({ include: { timeOffType: true }, orderBy: { startDate: 'desc' } }),
      prisma.salaryRule.findMany({ where: { isActive: true }, orderBy: { sequence: 'asc' } }),
      prisma.salaryStructure.findMany({ include: { structureRules: true }, orderBy: { name: 'asc' } }),
      prisma.payrun.findMany({
        include: {
          salaryStructure: true,
          payslips: { include: { lines: { orderBy: { sequence: 'asc' } } } },
          warnings: true,
        },
        orderBy: { periodStart: 'asc' },
      }),
    ]);
    const title = (value) => String(value || '').toLowerCase().replace(/(^|_)([a-z])/g, (_, p, c) => `${p ? ' ' : ''}${c.toUpperCase()}`);
    const period = (value) => new Date(value).toISOString().slice(0, 7);
    const departments = [...new Map(employees.filter((employee) => employee.department).map((employee) => [employee.department.id, employee.department])).values()];
    const jobPositions = [...new Map(employees.filter((employee) => employee.jobPosition).map((employee) => [employee.jobPosition.id, employee.jobPosition])).values()];
    const visibleAllocations = scopedEmployeeId ? allocations.filter((row) => row.employeeId === scopedEmployeeId) : allocations;
    const visibleRequests = scopedEmployeeId ? requests.filter((row) => row.employeeId === scopedEmployeeId) : requests;
    res.json({
      departments: departments.map((department) => ({ id: department.id, name: department.name, code: department.code })),
      jobPositions: jobPositions.map((position) => ({ id: position.id, title: position.title, code: position.code, departmentId: position.departmentId })),
      employees: employees.map((e) => ({
        id: e.id, name: `${e.firstName} ${e.lastName}`, dept: e.department?.code || e.department?.name || 'Unassigned',
        position: e.jobPosition?.title || '—', managerId: e.managerId, scheduleId: e.workingScheduleId,
        status: title(e.status), employeeType: title(e.employmentType), email: e.workEmail, phone: e.phone || '', bankAccount: e.bankAccountNumber || '', bankName: e.bankName || '',
        pan: e.taxIdentifier || '', joinDate: e.joiningDate,
      })),
      contracts: employees.flatMap((e) => e.contracts.map((c) => ({
        id: c.id, employeeId: e.id, position: e.jobPosition?.title || '—',
        dept: e.department?.code || e.department?.name || '—', wage: Number(c.wage), structureId: c.salaryStructureId,
        startDate: c.startDate, endDate: c.endDate,
      }))),
      schedules: schedules.map((s) => ({
        id: s.id, name: s.name, type: s.scheduleType,
        days: s.lines.map((l) => ({ day: title(l.dayOfWeek).slice(0, 3), on: true, start: new Date(l.startTime).toISOString().slice(11, 16), end: new Date(l.endTime).toISOString().slice(11, 16), brk: l.breakMinutes })),
      })),
      attendance: attendance.map((a) => ({
        id: a.id, employeeId: a.employeeId, date: a.attendanceDate,
        checkIn: a.checkIn ? new Date(a.checkIn).toISOString().slice(11, 16) : '',
        checkOut: a.checkOut ? new Date(a.checkOut).toISOString().slice(11, 16) : '',
        status: title(a.status), note: a.correctionReason || '',
      })),
      timeoffTypes: timeOffTypes.map((t) => ({ id: t.id, name: t.name, unit: t.unit.toLowerCase(), requiresAllocation: t.requiresAllocation, color: '#0EA5A0' })),
      allocations: visibleAllocations.map((a) => ({ id: a.id, employeeId: a.employeeId, typeId: a.timeOffTypeId, allocated: Number(a.allocatedAmount), used: Number(a.usedAmount), validFrom: a.validFrom, validTo: a.validUntil, status: title(a.status) })),
      requests: visibleRequests.map((r) => ({ id: r.id, employeeId: r.employeeId, typeId: r.timeOffTypeId, from: r.startDate, to: r.endDate, duration: Number(r.requestedAmount), status: title(r.status), reason: r.reason || '' })),
      rules: rules.map((r) => ({ id: r.id, code: r.code, name: r.name, category: title(r.category), computeType: r.computationType.toLowerCase(), baseCode: r.percentageBase || '', amount: Number(r.fixedAmount || r.percentage || 0), formula: r.formula || '' })),
      structures: structures.map((s) => ({ id: s.id, name: s.name, status: s.isActive ? 'Active' : 'Inactive', ruleIds: s.structureRules.map((r) => r.salaryRuleId) })),
      payruns: payruns.map((p) => ({ id: p.id, name: p.name, structureId: p.salaryStructureId, period: period(p.periodStart), employeeIds: p.payslips.map((s) => s.employeeId), payslipIds: p.payslips.map((s) => s.id), status: title(p.status), warnings: p.warnings.map((w) => ({ type: w.type, icon: w.severity === 'ERROR' ? '⛔' : '⚠️', employeeId: w.employeeId, message: w.message })), sent: false, createdDate: p.createdAt })),
      payslips: payruns.flatMap((p) => p.payslips.map((s) => ({ id: s.id, payrunId: s.payrunId, employeeId: s.employeeId, period: period(s.periodStart), contractId: s.contractId, structureId: s.salaryStructureId, lines: s.lines.map((l) => ({ code: l.ruleCode, name: l.ruleName, category: title(l.category), amount: Number(l.amount) })), gross: Number(s.grossAmount), deductions: Number(s.deductionAmount), net: Number(s.netAmount), status: title(s.status) }))),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    await databaseReady;
    const start = req.query.periodStart ? new Date(req.query.periodStart) : new Date('1970-01-01');
    const end = req.query.periodEnd ? new Date(req.query.periodEnd) : new Date('2999-12-31');
    const departmentId = req.query.departmentId || null;
    const employeeFilter = departmentId ? { departmentId } : {};
    const [payslips, approvedLeave, pendingLeave, attendance, payruns, employees] = await Promise.all([
      prisma.payslip.findMany({ where: { periodStart: { gte: start }, periodEnd: { lte: end }, employee: employeeFilter }, select: { netAmount: true, status: true } }),
      prisma.timeOffRequest.count({ where: { status: 'APPROVED', startDate: { gte: start }, endDate: { lte: end }, employee: employeeFilter } }),
      prisma.timeOffRequest.count({ where: { status: 'PENDING', employee: employeeFilter } }),
      prisma.attendance.findMany({ where: { attendanceDate: { gte: start, lte: end }, employee: employeeFilter }, select: { status: true } }),
      prisma.payrun.findMany({ where: { periodStart: { gte: start }, periodEnd: { lte: end } }, select: { status: true } }),
      prisma.employee.count({ where: { status: 'ACTIVE', ...employeeFilter } }),
    ]);
    const net = payslips.reduce((sum, p) => sum + Number(p.netAmount), 0);
    const attendanceCounts = attendance.reduce((out, a) => { out[a.status] = (out[a.status] || 0) + 1; return out; }, {});
    res.json({ periodStart: start, periodEnd: end, departmentId, employees, payslipsGenerated: payslips.length, paidPayslips: payslips.filter((p) => p.status === 'PAID').length, totalNetSalary: net, averageNetSalary: payslips.length ? net / payslips.length : 0, approvedLeave, pendingLeave, attendance: attendanceCounts, payruns: payruns.reduce((out, p) => { out[p.status] = (out[p.status] || 0) + 1; return out; }, {}) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/payslips/:id/pdf', async (req, res) => {
  try {
    await databaseReady;
    const payslip = await prisma.payslip.findUnique({ where: { id: req.params.id }, include: { employee: true, lines: { orderBy: { sequence: 'asc' } } } });
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    res.type('application/pdf').set('Content-Disposition', `attachment; filename="payslip-${payslip.employee.employeeCode}.pdf"`).send(buildPayslipPdf(payslip));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/email/verify', async (req, res) => {
  try {
    await verifySmtp();
    res.json({ ok: true, message: 'SMTP connection and authentication verified' });
  } catch (error) {
    res.status(502).json({ ok: false, message: error.message });
  }
});

app.post('/api/payruns/:id/send-payslips', async (req, res) => {
  try {
    await databaseReady;
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: { payslips: { include: { employee: true, lines: { orderBy: { sequence: 'asc' } } } } },
    });
    if (!payrun) return res.status(404).json({ message: 'Payrun not found' });
    if (!['VALIDATED', 'PAID'].includes(payrun.status)) return res.status(400).json({ message: 'Only validated or paid payruns can be emailed' });
    const results = [];
    for (const payslip of payrun.payslips) {
      if (!payslip.employee.workEmail) {
        results.push({ payslipId: payslip.id, status: 'failed', message: 'Employee has no work email' });
        continue;
      }
      try {
        await sendSmtp({
          to: payslip.employee.workEmail,
          subject: `Payslip ${payrun.name}`,
          text: `Hello ${payslip.employee.firstName},\n\nYour payslip for ${payrun.name} is attached.\n`,
          attachment: { filename: `payslip-${payslip.employee.employeeCode}.pdf`, content: buildPayslipPdf(payslip) },
        });
        results.push({ payslipId: payslip.id, status: 'sent', to: payslip.employee.workEmail });
      } catch (error) {
        results.push({ payslipId: payslip.id, status: 'failed', message: error.message });
      }
    }
    const sent = results.filter((result) => result.status === 'sent').length;
    res.status(sent === results.length ? 200 : 502).json({ message: `${sent}/${results.length} payslips sent`, sent, failed: results.length - sent, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use('/api', hrPayrollRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (DB: ${DB_PROVIDER})`));

process.on('SIGTERM', async () => { await disconnectDatabase(); process.exit(0); });
process.on('SIGINT', async () => { await disconnectDatabase(); process.exit(0); });

module.exports = app;
