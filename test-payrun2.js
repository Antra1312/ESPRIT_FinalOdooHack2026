const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

prisma.$connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    
    // First check what fields exist on payrun
    return prisma.payrun.findMany({ take: 1 });
  })
  .then((payruns) => {
    console.log('Payruns:', payruns.length);
    if (payruns.length > 0) {
      console.log('Payrun fields:', JSON.stringify(payruns[0], null, 2).substring(0, 500));
    }
    
    // Try creating a payrun with minimal data
    return prisma.payrun.create({
      data: {
        name: 'Test Payrun',
        salaryStructureId: 'test-id',
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