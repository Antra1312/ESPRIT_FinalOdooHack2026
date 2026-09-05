const { getDatabase, isPostgreSQL } = require('./database');

const getPrismaClient = () => {
  if (!isPostgreSQL()) {
    throw new Error('Prisma client only available when DB_PROVIDER=postgresql');
  }
  return getDatabase().client;
};

module.exports = { getPrismaClient };