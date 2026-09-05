const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.DB_HOST, {
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  pass: process.env.DB_PASSWORD,
})
  .then(() => console.log('✅ Database connected'))
  .catch((err) => console.error('❌ Database connection error:', err));

// Routes
app.use('/api/employees', require('./backend/routes/employeeRoutes'));
app.use('/api/contracts', require('./backend/routes/contractRoutes'));
app.use('/api/attendance', require('./backend/routes/attendanceRoutes'));
app.use('/api/timeoff', require('./backend/routes/timeoffRoutes'));
app.use('/api/payroll', require('./backend/routes/payrollRoutes'));
app.use('/api/payslips', require('./backend/routes/payslipRoutes'));
app.use('/api/dashboard', require('./backend/routes/dashboardRoute'));

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;