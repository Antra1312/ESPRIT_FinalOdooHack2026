const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

prisma.$connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    
    // First, check what employees exist
    return prisma.employee.findMany({ take: 1 });
  })
  .then((employees) => {
    console.log('Employees:', employees.length);
    
    // Check what salary structures exist
    return prisma.salaryStructure.findMany({ take: 1 });
  })
  .then((structures) => {
    console.log('Structures:', structures.length);
    
    // Try creating a payrun with minimal data
    return prisma.payrun.create({
      data: {
        name: 'Test Payrun',
        salaryStructureId: structures[0] ? structures[0].id : '',
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-30'),
        status: 'DRAFT',
      },
    });
  })
  .then((payrun) => {
    console.log('Payrun created:', payrun.id);
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });