const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeDatabase, disconnectDatabase, isPostgreSQL, DB_PROVIDER } = require('./src/config/database');

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database based on provider
initializeDatabase()
  .then(({ provider }) => {
    console.log(`📦 Database provider: ${provider}`);
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });

// Health Check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date(),
  dbProvider: DB_PROVIDER,
}));

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (DB: ${DB_PROVIDER})`));

module.exports = app;