const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

prisma.$connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    return prisma.employee.create({
      data: {
        employeeCode: 'TEST-001',
        firstName: 'Test',
        lastName: 'User',
        workEmail: 'test@test.com',
        joiningDate: new Date('1990-01-01'),
      },
    });
  })
  .then((employee) => {
    console.log('Created employee:', employee.id, employee.firstName);
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });