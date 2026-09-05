const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');

let prisma = null;
let mongoConnected = false;

const DB_PROVIDER = process.env.DB_PROVIDER || 'postgresql'; // 'postgresql' | 'mongodb'

const initializeDatabase = async () => {
  if (DB_PROVIDER === 'postgresql') {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    await prisma.$connect();
    console.log('✅ PostgreSQL (Prisma) connected');
    return { provider: 'postgresql', client: prisma };
  }

  if (DB_PROVIDER === 'mongodb') {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'peoplepay360';
    if (!uri) throw new Error('MONGODB_URI not set');

    await mongoose.connect(uri, { dbName });
    mongoConnected = true;
    console.log('✅ MongoDB (Mongoose) connected');
    return { provider: 'mongodb', client: mongoose };
  }

  throw new Error(`Unknown DB_PROVIDER: ${DB_PROVIDER}`);
};

const getDatabase = () => {
  if (DB_PROVIDER === 'postgresql') {
    if (!prisma) throw new Error('Prisma not initialized. Call initializeDatabase() first.');
    return { provider: 'postgresql', client: prisma };
  }
  if (DB_PROVIDER === 'mongodb') {
    if (!mongoConnected) throw new Error('Mongoose not connected. Call initializeDatabase() first.');
    return { provider: 'mongodb', client: mongoose };
  }
  throw new Error(`Unknown DB_PROVIDER: ${DB_PROVIDER}`);
};

const disconnectDatabase = async () => {
  if (DB_PROVIDER === 'postgresql' && prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('✅ PostgreSQL disconnected');
  }
  if (DB_PROVIDER === 'mongodb' && mongoConnected) {
    await mongoose.disconnect();
    mongoConnected = false;
    console.log('✅ MongoDB disconnected');
  }
};

const isPostgreSQL = () => DB_PROVIDER === 'postgresql';
const isMongoDB = () => DB_PROVIDER === 'mongodb';

module.exports = {
  initializeDatabase,
  getDatabase,
  disconnectDatabase,
  isPostgreSQL,
  isMongoDB,
  DB_PROVIDER,
};