import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma, connectDB } from './db/prisma.js';
import { ensureColumns } from './db/migrations.js';

let dbInitPromise: Promise<void> | null = null;
export async function ensureDbReady() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await connectDB();
        // In cloud production (TiDB MySQL), the schema is already pushed and verified.
        // Avoid executing 40+ sequential ALTER TABLE network calls on lambda startup.
        if (process.env.RUN_AUTO_MIGRATIONS === 'true') {
          await ensureColumns();
        }
      } catch (err: any) {
        console.warn('[DB Init] Warning during database initialization:', err?.message);
      }
    })();
  }
  return dbInitPromise;
}

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import customerRoutes from './routes/customer.routes.js';
import leadRoutes from './routes/lead.routes.js';
import followupRoutes from './routes/followup.routes.js';
import packageRoutes from './routes/package.routes.js';
import quotationRoutes from './routes/quotation.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import agentRoutes from './routes/agent.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import reportRoutes from './routes/report.routes.js';
import settingRoutes from './routes/setting.routes.js';
import searchRoutes from './routes/search.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import cabRoutes from './routes/cab.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import placeRoutes from './routes/place.routes.js';

import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security and utility middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving (ensures directory exists)
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {
    // Safe fallback for serverless read-only filesystems (e.g. Vercel)
  }
}
app.use('/uploads', express.static(uploadsDir));

// Ensure database connection and columns exist before serving any API route (crucial for Vercel Serverless)
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    await ensureDbReady();
  }
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'healthy',
    system: 'Ooting CRM API Server',
    version: '1.0.2',
    database: {
      status: dbStatus,
      userCount,
    },
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/cabs', cabRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/places', placeRoutes);

// Serve compiled client frontend if available (Production Full-Stack Mode)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use(errorHandler);

export default app;
