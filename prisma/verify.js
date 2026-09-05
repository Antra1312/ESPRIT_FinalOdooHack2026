const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying database connection and queries...\n');

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected');

    // Count departments
    const deptCount = await prisma.department.count();
    console.log(`📁 Departments found: ${deptCount}`);

    // Count job positions
    const jobCount = await prisma.jobPosition.count();
    console.log(`💼 Job positions found: ${jobCount}`);

    // Count working schedules
    const scheduleCount = await prisma.workingSchedule.count();
    console.log(`📅 Working schedules found: ${scheduleCount}`);

    // Count schedule lines
    const lineCount = await prisma.workingScheduleLine.count();
    console.log(`📋 Schedule lines found: ${lineCount}`);

    // Count time off types
    const timeOffTypeCount = await prisma.timeOffType.count();
    console.log(`🏖️ Time off types found: ${timeOffTypeCount}`);

    // Count salary rules
    const salaryRuleCount = await prisma.salaryRule.count();
    console.log(`💰 Salary rules found: ${salaryRuleCount}`);

    // Count salary structures
    const structureCount = await prisma.salaryStructure.count();
    console.log(`📊 Salary structures found: ${structureCount}`);

    // Test relations
    console.log('\n🔗 Testing relations...');

    // Department -> Employees
    const deptWithEmployees = await prisma.department.findFirst({
      include: { _count: { select: { employees: true } } },
    });
    if (deptWithEmployees) {
      console.log(`  Department "${deptWithEmployees.name}" has ${deptWithEmployees._count.employees} employees`);
    }

    // WorkingSchedule -> Lines
    const scheduleWithLines = await prisma.workingSchedule.findFirst({
      include: { lines: { orderBy: { sequence: 'asc' } } },
    });
    if (scheduleWithLines) {
      console.log(`  Schedule "${scheduleWithLines.name}" has ${scheduleWithLines.lines.length} day lines`);
    }

    // SalaryStructure -> Rules
    const structureWithRules = await prisma.salaryStructure.findFirst({
      include: { structureRules: { include: { salaryRule: true }, orderBy: { sequence: 'asc' } } },
    });
    if (structureWithRules) {
      console.log(`  Structure "${structureWithRules.name}" has ${structureWithRules.structureRules.length} rules`);
      for (const sr of structureWithRules.structureRules) {
        console.log(`    - ${sr.salaryRule.code} (${sr.salaryRule.category}) seq: ${sr.sequence}`);
      }
    }

    // JobPosition -> Department
    const jobWithDept = await prisma.jobPosition.findFirst({
      include: { department: true },
    });
    if (jobWithDept) {
      console.log(`  Job "${jobWithDept.title}" belongs to department "${jobWithDept.department?.name}"`);
    }

    console.log('\n✅ All database queries verified successfully!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();