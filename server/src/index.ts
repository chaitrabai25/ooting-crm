import { app } from './app.js';
import { config } from './config/index.js';
import { connectDB, prisma } from './db/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDBSchema() {
  try {
    console.log('🔄 Checking database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected and verified. Total registered users: ${userCount}`);
  } catch (err: any) {
    console.warn('⚠️ Note during DB schema check:', err.message);
  }
}

async function ensureInitialAdmin() {
  try {
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
    const salesPasswordHash = await bcrypt.hash('Sales@12345', 10);
    const accountsPasswordHash = await bcrypt.hash('Accounts@12345', 10);

    const defaultAccounts = [
      { email: 'admin@ooting.com', name: 'Ooting Super Admin', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'chaitrabai25@gmail.com', name: 'Chaitra Bai (Super Admin)', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'chaitrabaijr@gmail.com', name: 'Chaitra Bai (Super Admin)', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'chandu@gmail.com', name: 'Chandu (Admin)', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'sales@ooting.com', name: 'Rohan Sharma (Sales)', role: 'SALES', hash: salesPasswordHash },
      { email: 'accounts@ooting.com', name: 'Priya Nair (Accounts)', role: 'ACCOUNTANT', hash: accountsPasswordHash },
    ];

    for (const acc of defaultAccounts) {
      const existing = await prisma.user.findUnique({ where: { email: acc.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            name: acc.name,
            email: acc.email,
            passwordHash: acc.hash,
            role: acc.role,
            phone: '+91 98765 00001',
            status: 'ACTIVE',
          },
        });
        console.log(`✅ Initialized verified account: ${acc.email}`);
      } else {
        // Preserve existing user passwords and data! Only ensure status is ACTIVE if inactive.
        if (existing.status !== 'ACTIVE') {
          await prisma.user.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE' },
          });
        }
        console.log(`✅ Verified active status for: ${acc.email}`);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ DB check note:', err.message);
  }
}

async function bootstrap() {
  await connectDB();
  await ensureDBSchema();
  await ensureInitialAdmin();

  const host = '0.0.0.0';
  const server = app.listen(config.port, host, () => {
    console.log(`====================================================`);
    console.log(`  Ooting CRM Backend running on http://${host}:${config.port}`);
    console.log(`  Health Check: http://${host}:${config.port}/api/health`);
    console.log(`====================================================`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully terminating Ooting CRM server...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database connection closed. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
