import { app } from './app.js';
import { config } from './config/index.js';
import { connectDB, prisma } from './db/prisma.js';

import bcrypt from 'bcryptjs';

async function ensureInitialAdmin() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('⚡ Initializing default Super Admin for fresh production database...');
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ooting.com').toLowerCase().trim();
      const rawPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      await prisma.user.create({
        data: {
          name: 'Ooting Super Admin',
          email: adminEmail,
          passwordHash,
          role: 'SUPER_ADMIN',
          phone: '+91 98765 00001',
          status: 'ACTIVE',
        },
      });
      console.log(`✅ Default Super Admin created: ${adminEmail}`);
    }
  } catch (err: any) {
    console.warn('⚠️ DB tables check note:', err.message);
  }
}

async function bootstrap() {
  await connectDB();
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
