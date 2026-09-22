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

function ensureDatabaseSeed() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  const isMysql = dbUrl.startsWith('mysql://');
  const isSqlite = dbUrl.startsWith('file:') || (!isPostgres && !isMysql);

  if (isSqlite) {
    const serverDir = path.resolve(__dirname, '..');
    const backupDb = path.resolve(serverDir, 'prisma', 'backup', 'ooting.db.backup');
    if (fs.existsSync(backupDb)) {
      const candidatePaths = [
        path.resolve(serverDir, 'prisma', 'ooting.db'),
        path.resolve(serverDir, 'ooting.db'),
        path.resolve(process.cwd(), 'ooting.db'),
        path.resolve(process.cwd(), 'server', 'prisma', 'ooting.db'),
      ];
      for (const dest of candidatePaths) {
        try {
          const dir = path.dirname(dest);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          if (!fs.existsSync(dest) || fs.statSync(dest).size < 10000) {
            fs.copyFileSync(backupDb, dest);
            console.log(`[Auto-Seed] Pre-seeded verified database to: ${dest}`);
          }
        } catch (copyErr: any) {
          console.warn(`[Auto-Seed] Note:`, copyErr?.message);
        }
      }
    }
  }
}

async function ensureColumns() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  const isMysql = dbUrl.startsWith('mysql://');
  const isSqlite = dbUrl.startsWith('file:') || (!isPostgres && !isMysql);

  if (isSqlite) {
    const migrations = [
      `ALTER TABLE "User" ADD COLUMN "permissions" TEXT`,
      `ALTER TABLE "Agent" ADD COLUMN "panNumber" TEXT`,
      `ALTER TABLE "Agent" ADD COLUMN "agentType" TEXT`,
      `ALTER TABLE "Booking" ADD COLUMN "serviceProviders" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "district" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "pincode" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "panNumber" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "tier" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "serviceCategories" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "categoryDetails" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceType" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceRate" REAL`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceDays" INTEGER`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceTotal" REAL`,
      `ALTER TABLE "CabBooking" ADD COLUMN "dutyRange" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "customTableRows" TEXT`,
    ];
    for (const sql of migrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column already exists
      }
    }
  } else if (isPostgres) {
    const pgMigrations = [
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceType" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceRate" DOUBLE PRECISION`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceDays" INTEGER`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceTotal" DOUBLE PRECISION`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "dutyRange" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "customTableRows" TEXT`,
    ];
    for (const sql of pgMigrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column already exists
      }
    }
  }
}

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
      console.log('🔄 Required database tables/columns missing. Automatically initializing database schema...');
      try {
        const dbUrl = process.env.DATABASE_URL || '';
        const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
        const isMysql = dbUrl.startsWith('mysql://');
        const isSqlite = dbUrl.startsWith('file:') || (!isPostgres && !isMysql);

        let schemaFile = 'prisma/schema.mysql.prisma';
        if (isPostgres) {
          schemaFile = 'prisma/schema.postgresql.prisma';
        } else if (isSqlite) {
          schemaFile = 'prisma/schema.sqlite.prisma';
        } else if (isMysql) {
          schemaFile = 'prisma/schema.mysql.prisma';
        }

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
          ? `"${process.execPath}" "${prismaCli}" db push --accept-data-loss --skip-generate --schema="${schemaPath}"`
          : `npx prisma db push --accept-data-loss --skip-generate --schema="${schemaPath}"`;

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
  ensureDatabaseSeed();
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
