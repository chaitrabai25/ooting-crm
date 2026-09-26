import { prisma } from './prisma.js';

export async function ensureColumns() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  const isMysql = dbUrl.startsWith('mysql://');
  const isSqlite = dbUrl.startsWith('file:') || (!isPostgres && !isMysql);

  if (isMysql) {
    const mysqlMigrations = [
      // User
      `ALTER TABLE \`User\` ADD COLUMN \`permissions\` TEXT NULL`,

      // Customer
      `ALTER TABLE \`Customer\` ADD COLUMN \`createdById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Customer\` ADD COLUMN \`updatedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Customer\` ADD COLUMN \`isDeleted\` TINYINT(1) DEFAULT 0`,
      `ALTER TABLE \`Customer\` ADD COLUMN \`deletedAt\` DATETIME NULL`,
      `ALTER TABLE \`Customer\` ADD COLUMN \`deletedById\` VARCHAR(36) NULL`,

      // Lead
      `ALTER TABLE \`Lead\` ADD COLUMN \`createdById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Lead\` ADD COLUMN \`updatedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Lead\` ADD COLUMN \`isDeleted\` TINYINT(1) DEFAULT 0`,
      `ALTER TABLE \`Lead\` ADD COLUMN \`deletedAt\` DATETIME NULL`,
      `ALTER TABLE \`Lead\` ADD COLUMN \`deletedById\` VARCHAR(36) NULL`,

      // Booking
      `ALTER TABLE \`Booking\` ADD COLUMN \`durationDays\` INT DEFAULT 1`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`durationNights\` INT DEFAULT 0`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`tripType\` VARCHAR(50) DEFAULT 'SINGLE'`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`serviceProviders\` TEXT NULL`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`createdById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`updatedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`isDeleted\` TINYINT(1) DEFAULT 0`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`deletedAt\` DATETIME NULL`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`deletedById\` VARCHAR(36) NULL`,

      // Quotation
      `ALTER TABLE \`Quotation\` ADD COLUMN \`updatedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`isDeleted\` TINYINT(1) DEFAULT 0`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`deletedAt\` DATETIME NULL`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`deletedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`basePackagePrice\` DOUBLE NOT NULL DEFAULT 0`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`adultUnitPrice\` DOUBLE NOT NULL DEFAULT 0`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`childUnitPrice\` DOUBLE NOT NULL DEFAULT 0`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`infantUnitPrice\` DOUBLE NOT NULL DEFAULT 0`,

      // CabBooking
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`createdById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`updatedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`isDeleted\` TINYINT(1) DEFAULT 0`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`deletedAt\` DATETIME NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`deletedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`driverAllowanceType\` VARCHAR(50) NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`driverAllowanceRate\` DOUBLE NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`driverAllowanceDays\` INT NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`driverAllowanceTotal\` DOUBLE NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`dutyRange\` VARCHAR(191) NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`customTableRows\` TEXT NULL`,

      // Traveller
      `ALTER TABLE \`Traveller\` ADD COLUMN \`idNumber\` VARCHAR(100) NULL`,
      `ALTER TABLE \`Traveller\` ADD COLUMN \`address\` TEXT NULL`,

      // Payment
      `ALTER TABLE \`Payment\` ADD COLUMN \`customerId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Payment\` ADD COLUMN \`paymentTime\` VARCHAR(50) NULL`,
      `ALTER TABLE \`Payment\` ADD COLUMN \`screenshotUrl\` VARCHAR(500) NULL`,
      `ALTER TABLE \`Payment\` ADD COLUMN \`recordedById\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Payment\` ADD UNIQUE INDEX \`Payment_transactionReference_key\` (\`transactionReference\`)`,

      // Agent
      `ALTER TABLE \`Agent\` ADD COLUMN \`panNumber\` VARCHAR(50) NULL`,
      `ALTER TABLE \`Agent\` ADD COLUMN \`agentType\` VARCHAR(50) DEFAULT 'Silver'`,

      // Supplier
      `ALTER TABLE \`Supplier\` ADD COLUMN \`district\` VARCHAR(100) NULL`,
      `ALTER TABLE \`Supplier\` ADD COLUMN \`pincode\` VARCHAR(20) NULL`,
      `ALTER TABLE \`Supplier\` ADD COLUMN \`panNumber\` VARCHAR(50) NULL`,
      `ALTER TABLE \`Supplier\` ADD COLUMN \`tier\` VARCHAR(50) DEFAULT 'Silver'`,
      `ALTER TABLE \`Supplier\` ADD COLUMN \`serviceCategories\` TEXT NULL`,
      `ALTER TABLE \`Supplier\` ADD COLUMN \`categoryDetails\` TEXT NULL`,

      // AuditLog
      `ALTER TABLE \`AuditLog\` ADD COLUMN \`oldValue\` LONGTEXT NULL`,
      `ALTER TABLE \`AuditLog\` ADD COLUMN \`newValue\` LONGTEXT NULL`,

      // ItineraryDay & Package image capacity upgrade (prevents P2000 column too long on large URLs/photos)
      `ALTER TABLE \`ItineraryDay\` MODIFY COLUMN \`imageUrl\` LONGTEXT NULL`,
      `ALTER TABLE \`ItineraryDay\` MODIFY COLUMN \`images\` LONGTEXT NULL`,
      `ALTER TABLE \`Package\` MODIFY COLUMN \`imageUrl\` LONGTEXT NULL`,
      `ALTER TABLE \`Package\` MODIFY COLUMN \`gallery\` LONGTEXT NULL`,

      // Place / Destinations
      `CREATE TABLE IF NOT EXISTS \`Place\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`state\` VARCHAR(100) NOT NULL,
        \`district\` VARCHAR(100) NOT NULL,
        \`category\` VARCHAR(50) NULL DEFAULT 'Sightseeing',
        \`description\` TEXT NULL,
        \`famousReason\` TEXT NULL,
        \`suggestedDuration\` VARCHAR(100) NULL,
        \`distanceFromCenter\` VARCHAR(100) NULL,
        \`imageUrl\` TEXT NULL,
        \`gallery\` TEXT NULL,
        \`activities\` TEXT NULL,
        \`notes\` TEXT NULL,
        \`createdById\` VARCHAR(36) NULL,
        \`isDeleted\` TINYINT(1) NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`Place_state_idx\` (\`state\`),
        INDEX \`Place_district_idx\` (\`district\`),
        INDEX \`Place_name_idx\` (\`name\`),
        INDEX \`Place_isDeleted_idx\` (\`isDeleted\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ];

    for (const sql of mysqlMigrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column or index already exists, perfectly normal and safe
      }
    }
  } else if (isSqlite) {
    const sqliteMigrations = [
      `ALTER TABLE "User" ADD COLUMN "permissions" TEXT`,
      `ALTER TABLE "Customer" ADD COLUMN "createdById" TEXT`,
      `ALTER TABLE "Customer" ADD COLUMN "updatedById" TEXT`,
      `ALTER TABLE "Customer" ADD COLUMN "isDeleted" BOOLEAN DEFAULT 0`,
      `ALTER TABLE "Customer" ADD COLUMN "deletedAt" DATETIME`,
      `ALTER TABLE "Customer" ADD COLUMN "deletedById" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN "createdById" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN "updatedById" TEXT`,
      `ALTER TABLE "Lead" ADD COLUMN "isDeleted" BOOLEAN DEFAULT 0`,
      `ALTER TABLE "Lead" ADD COLUMN "deletedAt" DATETIME`,
      `ALTER TABLE "Lead" ADD COLUMN "deletedById" TEXT`,
      `ALTER TABLE "Booking" ADD COLUMN "serviceProviders" TEXT`,
      `ALTER TABLE "Booking" ADD COLUMN "durationDays" INTEGER DEFAULT 1`,
      `ALTER TABLE "Booking" ADD COLUMN "durationNights" INTEGER DEFAULT 0`,
      `ALTER TABLE "Booking" ADD COLUMN "tripType" TEXT DEFAULT 'SINGLE'`,
      `ALTER TABLE "Booking" ADD COLUMN "createdById" TEXT`,
      `ALTER TABLE "Booking" ADD COLUMN "updatedById" TEXT`,
      `ALTER TABLE "Booking" ADD COLUMN "isDeleted" BOOLEAN DEFAULT 0`,
      `ALTER TABLE "Booking" ADD COLUMN "deletedAt" DATETIME`,
      `ALTER TABLE "Booking" ADD COLUMN "deletedById" TEXT`,
      `ALTER TABLE "Quotation" ADD COLUMN "updatedById" TEXT`,
      `ALTER TABLE "Quotation" ADD COLUMN "isDeleted" BOOLEAN DEFAULT 0`,
      `ALTER TABLE "Quotation" ADD COLUMN "deletedAt" DATETIME`,
      `ALTER TABLE "Quotation" ADD COLUMN "deletedById" TEXT`,
      `ALTER TABLE "Quotation" ADD COLUMN "basePackagePrice" REAL DEFAULT 0`,
      `ALTER TABLE "Quotation" ADD COLUMN "adultUnitPrice" REAL DEFAULT 0`,
      `ALTER TABLE "Quotation" ADD COLUMN "childUnitPrice" REAL DEFAULT 0`,
      `ALTER TABLE "Quotation" ADD COLUMN "infantUnitPrice" REAL DEFAULT 0`,
      `ALTER TABLE "CabBooking" ADD COLUMN "createdById" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "updatedById" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "isDeleted" BOOLEAN DEFAULT 0`,
      `ALTER TABLE "CabBooking" ADD COLUMN "deletedAt" DATETIME`,
      `ALTER TABLE "CabBooking" ADD COLUMN "deletedById" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceType" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceRate" REAL`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceDays" INTEGER`,
      `ALTER TABLE "CabBooking" ADD COLUMN "driverAllowanceTotal" REAL`,
      `ALTER TABLE "CabBooking" ADD COLUMN "dutyRange" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN "customTableRows" TEXT`,
      `ALTER TABLE "Traveller" ADD COLUMN "idNumber" TEXT`,
      `ALTER TABLE "Traveller" ADD COLUMN "address" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN "customerId" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN "paymentTime" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN "screenshotUrl" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN "recordedById" TEXT`,
      `ALTER TABLE "Agent" ADD COLUMN "panNumber" TEXT`,
      `ALTER TABLE "Agent" ADD COLUMN "agentType" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "district" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "pincode" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "panNumber" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "tier" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "serviceCategories" TEXT`,
      `ALTER TABLE "Supplier" ADD COLUMN "categoryDetails" TEXT`,
      `ALTER TABLE "AuditLog" ADD COLUMN "oldValue" TEXT`,
      `ALTER TABLE "AuditLog" ADD COLUMN "newValue" TEXT`,
    ];
    for (const sql of sqliteMigrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column/index already exists
      }
    }
  } else if (isPostgres) {
    const pgMigrations = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT`,
      `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "createdById" VARCHAR(36)`,
      `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "updatedById" VARCHAR(36)`,
      `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
      `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "deletedById" VARCHAR(36)`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdById" VARCHAR(36)`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedById" VARCHAR(36)`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "deletedById" VARCHAR(36)`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER DEFAULT 1`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "durationNights" INTEGER DEFAULT 0`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "tripType" TEXT DEFAULT 'SINGLE'`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "createdById" VARCHAR(36)`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "updatedById" VARCHAR(36)`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
      `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "deletedById" VARCHAR(36)`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "updatedById" VARCHAR(36)`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "deletedById" VARCHAR(36)`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "createdById" VARCHAR(36)`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "updatedById" VARCHAR(36)`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "deletedById" VARCHAR(36)`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceType" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceRate" DOUBLE PRECISION`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceDays" INTEGER`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "driverAllowanceTotal" DOUBLE PRECISION`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "dutyRange" TEXT`,
      `ALTER TABLE "CabBooking" ADD COLUMN IF NOT EXISTS "customTableRows" TEXT`,
      `ALTER TABLE "Traveller" ADD COLUMN IF NOT EXISTS "idNumber" TEXT`,
      `ALTER TABLE "Traveller" ADD COLUMN IF NOT EXISTS "address" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "customerId" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentTime" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "screenshotUrl" TEXT`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "recordedById" TEXT`,
      `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "oldValue" TEXT`,
      `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newValue" TEXT`,
    ];
    for (const sql of pgMigrations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // column/index already exists
      }
    }
  }
}
