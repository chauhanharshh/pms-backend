import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config/env';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import prisma from './config/database';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import hotelsRoutes from './modules/hotels/hotels.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import usersRoutes from './modules/users/users.routes';
import billsRoutes from './modules/bills/bills.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import advancesRoutes from './modules/advances/advances.routes';
import miscChargesRoutes from './modules/misc-charges/misc-charges.routes';
import vouchersRoutes from './modules/vouchers/vouchers.routes';
import restaurantRoutes from './modules/restaurant/restaurant.routes';
import companiesRoutes from './modules/companies/companies.routes';
import gstReportsRoutes from './modules/reports/gst-reports.routes';
import systemSettingsRoutes from './modules/system-settings/system-settings.routes';
import vendorsRoutes from './modules/vendors/vendors.routes';
import roomBlocksRoutes from './modules/room-blocks/room-blocks.routes';
import stewardsRoutes from './modules/stewards/steward.routes';
import pettyCashRoutes from './modules/petty-cash/petty-cash.routes';
import liabilitiesRoutes from './modules/liabilities/liabilities.routes';
import dayClosingRoutes from './modules/day-closing/day-closing.routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// Parse multiple CORS origins from comma-separated env var
const allowedOrigins = config.cors.origin.split(',').map((o: string) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP logging
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API health check (used by Hotels4U Connect.exe for connection testing)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Hotels4U PMS' });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hotels', hotelsRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1/rooms', roomsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/bills', billsRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/advances', advancesRoutes);
app.use('/api/v1/misc-charges', miscChargesRoutes);
app.use('/api/v1/vouchers', vouchersRoutes);
app.use('/api/v1/restaurant', restaurantRoutes);
app.use('/api/v1/companies', companiesRoutes);
app.use('/api/v1/gst-reports', gstReportsRoutes);
app.use('/api/v1/system-settings', systemSettingsRoutes);
app.use('/api/v1/vendors', vendorsRoutes);
app.use('/api/v1/room-blocks', roomBlocksRoutes);
app.use('/api/v1/petty-cash', pettyCashRoutes);
app.use('/api/v1/liabilities', liabilitiesRoutes);
app.use('/api/v1/day-closing', dayClosingRoutes);
app.use('/api/v1/stewards', stewardsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$connect();
      logger.info('📦 Database connected successfully');
      break;
    } catch (err) {
      logger.error(`Database connection failed. Retries left: ${retries - 1}`);
      retries -= 1;
      if (retries === 0) {
        logger.error('Failed to connect to database after maximum retries. Exiting.');
        process.exit(1);
      }
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  try {
    app.listen(config.port, config.host, () => {
      logger.info(`🚀 Server running on http://${config.host}:${config.port}`);
      logger.info(`📝 Environment: ${config.env}`);
      logger.info(`🏨 Multi-Hotel PMS Backend ready`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
