import { app } from './app.js';
import { config } from './config/index.js';
import { connectDB, prisma } from './db/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDBSchema() {
  try {
    console.log('🔄 Checking database connection and schema...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected and verified. Total registered users: ${userCount}`);
  } catch (err: any) {
    console.warn('⚠️ Database schema verification note:', err.message);
    const isTableMissing =
      err.code === 'P2021' ||
      (err.message && (
        err.message.includes('does not exist') ||
        err.message.includes('no such table') ||
        err.message.includes('The table')
      ));

    if (isTableMissing) {
      console.log('🔄 Required database tables missing. Automatically initializing database schema...');
      try {
        const dbUrl = process.env.DATABASE_URL || '';
        const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
        const schemaFile = isPostgres ? 'prisma/schema.postgresql.prisma' : 'prisma/schema.prisma';
        const serverDir = path.resolve(__dirname, '..');
        const schemaPath = path.resolve(serverDir, schemaFile);

        console.log(`[Auto-Schema] Target schema file: ${schemaPath}`);

        let prismaCli = '';
        try {
          prismaCli = require.resolve('prisma/build/index.js');
        } catch {
          prismaCli = '';
        }

        const pushCmd = prismaCli
          ? `"${process.execPath}" "${prismaCli}" db push --skip-generate --schema="${schemaPath}"`
          : `npx prisma db push --skip-generate --schema="${schemaPath}"`;

        console.log(`[Auto-Schema] Executing: ${pushCmd}`);
        execSync(pushCmd, {
          cwd: serverDir,
          stdio: 'inherit',
          env: { ...process.env },
        });

        // Reconnect prisma client to refresh metadata
        await prisma.$disconnect();
        await prisma.$connect();

        const count = await prisma.user.count();
        console.log(`✅ Database schema successfully pushed! Total registered users: ${count}`);
      } catch (pushErr: any) {
        console.error('❌ Failed to push database schema automatically:', pushErr.message);
      }
    }
  }
}

async function ensureInitialAdmin() {
  try {
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
    const salesPasswordHash = await bcrypt.hash('Sales@12345', 10);
    const accountsPasswordHash = await bcrypt.hash('Accounts@12345', 10);
    const darshanPasswordHash = await bcrypt.hash('123456', 10);

    const defaultAccounts = [
      { email: 'admin@ooting.com', name: 'Ooting Super Admin', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'chaitrabai25@gmail.com', name: 'Chaitra Bai (Super Admin)', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'chaitrabaijr@gmail.com', name: 'Chaitra Bai (Super Admin)', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'chandu@gmail.com', name: 'Chandu (Admin)', role: 'SUPER_ADMIN', hash: adminPasswordHash },
      { email: 'sales@ooting.com', name: 'Rohan Sharma (Sales)', role: 'SALES', hash: salesPasswordHash },
      { email: 'darshan@gmail.com', name: 'Darshan (Sales)', role: 'SALES', hash: darshanPasswordHash },
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
            role: acc.role as any,
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
