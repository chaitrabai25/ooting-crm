import { prisma } from './prisma.js';

export async function ensureColumns() {
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
      `ALTER TABLE "Booking" ADD COLUMN "durationDays" INTEGER DEFAULT 1`,
      `ALTER TABLE "Booking" ADD COLUMN "durationNights" INTEGER DEFAULT 0`,
      `ALTER TABLE "Booking" ADD COLUMN "tripType" TEXT DEFAULT 'SINGLE'`,
      `ALTER TABLE "Traveller" ADD COLUMN "idNumber" TEXT`,
      `ALTER TABLE "Traveller" ADD COLUMN "address" TEXT`,
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
      `ALTER TABLE "Payment" ADD COLUMN "customerId" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN "paymentTime" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN "screenshotUrl" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN "recordedById" TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionReference_key" ON "Payment"("transactionReference") WHERE "transactionReference" IS NOT NULL`,
    ];
    for (const sql of migrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column/index already exists
      }
    }
  } else if (isPostgres) {
    const pgMigrations = [
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER DEFAULT 1`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "durationNights" INTEGER DEFAULT 0`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "tripType" TEXT DEFAULT 'SINGLE'`,
      `ALTER TABLE "Traveller" ADD COLUMN IF NOT EXISTS "idNumber" TEXT`,
      `ALTER TABLE "Traveller" ADD COLUMN IF NOT EXISTS "address" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceType" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceRate" DOUBLE PRECISION`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceDays" INTEGER`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceTotal" DOUBLE PRECISION`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "dutyRange" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "customTableRows" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "customerId" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentTime" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "screenshotUrl" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "recordedById" TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionReference_key" ON "Payment"("transactionReference") WHERE "transactionReference" IS NOT NULL`,
    ];
    for (const sql of pgMigrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column/index already exists
      }
    }
  } else if (isMysql) {
    const mysqlMigrations = [
      `ALTER TABLE Booking ADD COLUMN durationDays INT DEFAULT 1`,
      `ALTER TABLE Booking ADD COLUMN durationNights INT DEFAULT 0`,
      `ALTER TABLE Booking ADD COLUMN tripType VARCHAR(50) DEFAULT 'SINGLE'`,
      `ALTER TABLE Traveller ADD COLUMN idNumber VARCHAR(100) NULL`,
      `ALTER TABLE Traveller ADD COLUMN address TEXT NULL`,
      `ALTER TABLE Payment ADD COLUMN customerId VARCHAR(36) NULL`,
      `ALTER TABLE Payment ADD COLUMN paymentTime VARCHAR(50) NULL`,
      `ALTER TABLE Payment ADD COLUMN screenshotUrl VARCHAR(500) NULL`,
      `ALTER TABLE Payment ADD COLUMN recordedById VARCHAR(36) NULL`,
      `ALTER TABLE Payment ADD UNIQUE INDEX Payment_transactionReference_key (transactionReference)`,
    ];
    for (const sql of mysqlMigrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column/index already exists
      }
    }
  }
}
