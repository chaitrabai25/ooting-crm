import { prisma } from './prisma.js';

export async function ensureColumns() {
  const mysqlMigrations = [
      // Multi-Tenant Company Table
      `CREATE TABLE IF NOT EXISTS \`Company\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`slug\` VARCHAR(100) NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        \`logoUrl\` LONGTEXT NULL,
        \`faviconUrl\` LONGTEXT NULL,
        \`tagline\` VARCHAR(255) NULL,
        \`primaryColor\` VARCHAR(50) NULL DEFAULT '#1E3A8A',
        \`secondaryColor\` VARCHAR(50) NULL DEFAULT '#E11D48',
        \`phone\` VARCHAR(50) NULL,
        \`email\` VARCHAR(191) NULL,
        \`website\` VARCHAR(191) NULL,
        \`address\` TEXT NULL,
        \`city\` VARCHAR(100) NULL,
        \`state\` VARCHAR(100) NULL,
        \`country\` VARCHAR(100) NULL DEFAULT 'India',
        \`pincode\` VARCHAR(20) NULL,
        \`gstin\` VARCHAR(50) NULL,
        \`bankName\` VARCHAR(191) NULL,
        \`accountHolderName\` VARCHAR(191) NULL,
        \`accountNumber\` VARCHAR(100) NULL,
        \`accountType\` VARCHAR(50) NULL DEFAULT 'CURRENT',
        \`ifsc\` VARCHAR(50) NULL,
        \`branch\` VARCHAR(100) NULL,
        \`upiId\` VARCHAR(100) NULL,
        \`paymentNotes\` TEXT NULL,
        \`isOoting\` TINYINT(1) NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`Company_slug_key\` (\`slug\`),
        INDEX \`Company_status_idx\` (\`status\`),
        INDEX \`Company_isOoting_idx\` (\`isOoting\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Multi-Tenant Scoping columns
      `ALTER TABLE \`User\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Customer\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Lead\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`FollowUp\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Quotation\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Booking\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Payment\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`CabBooking\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Agent\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Supplier\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Expense\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`CalendarEvent\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`WhatsAppMessage\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`AuditLog\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Place\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Hotel\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`CompanySetting\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`,

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
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`date\` VARCHAR(50) NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`highlights\` TEXT NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`travelDetails\` TEXT NULL`,
      `ALTER TABLE \`Payment\` ADD UNIQUE INDEX \`Payment_transactionReference_key\` (\`transactionReference\`)`,

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

      `ALTER TABLE \`Place\` ADD COLUMN \`highlights\` TEXT NULL`,
      `ALTER TABLE \`Place\` ADD COLUMN \`bestTime\` VARCHAR(100) NULL`,

      // Hotel Master Library
      `CREATE TABLE IF NOT EXISTS \`Hotel\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`state\` VARCHAR(100) NOT NULL,
        \`district\` VARCHAR(100) NOT NULL,
        \`city\` VARCHAR(100) NULL,
        \`starCategory\` VARCHAR(50) NULL DEFAULT '3 Star',
        \`address\` TEXT NULL,
        \`description\` TEXT NULL,
        \`imageUrl\` TEXT NULL,
        \`gallery\` TEXT NULL,
        \`contactPhone\` VARCHAR(50) NULL,
        \`contactEmail\` VARCHAR(191) NULL,
        \`checkInTime\` VARCHAR(50) NULL DEFAULT '12:00 PM',
        \`checkOutTime\` VARCHAR(50) NULL DEFAULT '11:00 AM',
        \`amenities\` TEXT NULL,
        \`createdById\` VARCHAR(36) NULL,
        \`isDeleted\` TINYINT(1) NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`Hotel_state_idx\` (\`state\`),
        INDEX \`Hotel_district_idx\` (\`district\`),
        INDEX \`Hotel_city_idx\` (\`city\`),
        INDEX \`Hotel_name_idx\` (\`name\`),
        INDEX \`Hotel_starCategory_idx\` (\`starCategory\`),
        INDEX \`Hotel_isDeleted_idx\` (\`isDeleted\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // ItineraryDay Hotel Integration
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelName\` VARCHAR(191) NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelStarCategory\` VARCHAR(50) NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelImageUrl\` TEXT NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelLocation\` VARCHAR(191) NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`mealPlan\` VARCHAR(100) NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelDetails\` TEXT NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelCheckIn\` VARCHAR(50) NULL`,
      `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelCheckOut\` VARCHAR(50) NULL`,
      `ALTER TABLE \`Hotel\` ADD COLUMN \`websiteUrls\` TEXT NULL`,
      `ALTER TABLE \`Hotel\` MODIFY COLUMN \`imageUrl\` LONGTEXT NULL`,
      `ALTER TABLE \`Hotel\` MODIFY COLUMN \`gallery\` LONGTEXT NULL`,
      `ALTER TABLE \`Place\` MODIFY COLUMN \`imageUrl\` LONGTEXT NULL`,
      `ALTER TABLE \`ItineraryDay\` MODIFY COLUMN \`hotelImageUrl\` LONGTEXT NULL`,

      // Package B2B Travel Agent Branding Snapshot
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bAgentId\` VARCHAR(36) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bAgencyName\` VARCHAR(191) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bAgencyLogo\` LONGTEXT NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bContactPerson\` VARCHAR(191) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bPhone\` VARCHAR(50) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bAlternatePhone\` VARCHAR(50) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bEmail\` VARCHAR(191) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bAddress\` TEXT NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bCity\` VARCHAR(100) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bState\` VARCHAR(100) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bGstin\` VARCHAR(50) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bWebsite\` VARCHAR(191) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`b2bTagline\` VARCHAR(255) NULL`,
      `ALTER TABLE \`Package\` ADD COLUMN \`customBranding\` LONGTEXT NULL`,
    ];

  for (const sql of mysqlMigrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // column or index already exists, perfectly normal and safe
    }
  }
}
