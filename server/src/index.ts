import { app } from './app.js';
import { config } from './config/index.js';
import { connectDB, prisma } from './db/prisma.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database integrity guarantee: Never automatically overwrite or seed dummy data over production records
import { ensureColumns } from './db/migrations.js';

async function ensureDBSchema() {
  await ensureColumns();

  try {
    console.log('🔄 Checking database connection and schema...');
    await prisma.user.findFirst();
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected and verified. Total registered users: ${userCount}`);
  } catch (err: any) {
    console.warn('⚠️ Database schema verification note:', err.message);
    const isTableMissing =
      err.code === 'P2021' ||
      err.code === 'P2022' ||
      (err.message && (
        err.message.includes('does not exist') ||
        err.message.includes('no such table') ||
        err.message.includes('no such column') ||
        err.message.includes('The table') ||
        err.message.includes('The column')
      ));

    if (isTableMissing) {
      console.log('🔄 Required database tables/columns missing. Automatically initializing database schema safely...');
      try {
        const schemaFile = 'prisma/schema.prisma';
        const serverDir = path.resolve(__dirname, '..');
        const schemaPath = path.resolve(serverDir, schemaFile);

        console.log(`[Auto-Schema] Target schema file: ${schemaPath}`);

        let prismaCli = '';
        try {
          prismaCli = require.resolve('prisma/build/index.js');
        } catch {
          prismaCli = '';
        }

        // Push schema safely WITHOUT data loss
        const pushCmd = prismaCli
          ? `"${process.execPath}" "${prismaCli}" db push --skip-generate --schema="${schemaPath}"`
          : `npx prisma db push --skip-generate --schema="${schemaPath}"`;

        console.log(`[Auto-Schema] Executing non-destructive push: ${pushCmd}`);
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
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log(`🔒 Production user safety: ${userCount} verified accounts exist. Preserving existing accounts and skipping creation.`);
      return;
    }

    console.log('🔄 First-time setup: Initializing default Super Admin account...');
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);

    await prisma.user.create({
      data: {
        name: 'Ooting Super Admin',
        email: 'admin@ooting.com',
        passwordHash: adminPasswordHash,
        role: 'SUPER_ADMIN' as any,
        phone: '+91 8884845595',
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Initialized verified primary admin account: admin@ooting.com`);
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
