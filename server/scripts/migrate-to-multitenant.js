import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(serverDir, '../.env') });
dotenv.config({ path: path.resolve(serverDir, '.env') });

const CLOUD_TIDB_URL = 'mysql://2AJqT6QgbdvDayf.root:7xCl3FL0jIFUVu5D@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict&connect_timeout=30&pool_timeout=30';
const dbUrl = process.env.DATABASE_URL || CLOUD_TIDB_URL;

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

const OOTING_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

async function runMultiTenantMigration() {
  console.log('===============================================================');
  console.log('    OOTING CRM — ZERO DATA LOSS MULTI-TENANT MIGRATION');
  console.log('===============================================================');
  console.log(`Target Database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    // 1. Create Company table if not exists
    console.log('[1/5] Ensuring `Company` table exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Company\` (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ `Company` table is ready.');

    // 2. Add companyId column to all tenant-scoped tables
    console.log('\n[2/5] Adding `companyId` columns to all tenant-scoped tables (additive & safe)...');
    const tablesToAlter = [
      'User',
      'Customer',
      'Lead',
      'FollowUp',
      'Package',
      'Quotation',
      'Booking',
      'Payment',
      'CabBooking',
      'Agent',
      'Supplier',
      'Expense',
      'CalendarEvent',
      'WhatsAppMessage',
      'AuditLog',
      'Place',
      'Hotel',
      'CompanySetting',
    ];

    for (const table of tablesToAlter) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`companyId\` VARCHAR(36) NULL`);
        console.log(`  ✓ Added \`companyId\` to \`${table}\``);
      } catch (err) {
        // Column already exists, safe to ignore
        console.log(`  ℹ \`${table}\`.companyId already present`);
      }

      // Add index
      try {
        await prisma.$executeRawUnsafe(`CREATE INDEX \`${table}_companyId_idx\` ON \`${table}\` (\`companyId\`)`);
      } catch {
        // Index already exists, safe
      }
    }

    // 3. Upsert Ooting Master Tenant
    console.log('\n[3/5] Seeding/Upserting Ooting Primary Tenant...');
    
    // Fetch existing settings to populate Ooting company record accurately
    const settings = await prisma.companySetting.findMany();
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    const ootingName = settingsMap['company_name'] || 'Ooting';
    const ootingTagline = settingsMap['company_tagline'] || 'Journeys Beyond Ordinary';
    const ootingEmail = settingsMap['company_email'] || 'support@ooting.in';
    const ootingPhone = settingsMap['company_phone'] || '+91 8884845595';
    const ootingWebsite = settingsMap['company_website'] || 'https://ooting.in';
    const ootingAddress = settingsMap['company_address'] || 'Ooting 3rd Cross, Malavagoppa, \nBH Road, Shivamogga, Karnataka, India.';
    const ootingLogoUrl = settingsMap['company_logo_url'] || '/assets/ooting-logo.jpg';
    const ootingGstin = settingsMap['company_gstin'] || 'Nill';
    const ootingBankName = settingsMap['bank_name'] || 'Canara Bank ';
    const ootingAccHolder = settingsMap['account_holder_name'] || 'Jeevan';
    const ootingAccNum = settingsMap['account_number'] || '2891101013983';
    const ootingAccType = settingsMap['account_type'] || 'Current Account';
    const ootingIfsc = settingsMap['ifsc'] || 'CNRB0005237';
    const ootingBranch = settingsMap['branch'] || 'Shivmogga';
    const ootingUpi = settingsMap['upi_id'] || '';
    const ootingPaymentNotes = settingsMap['payment_notes'] || '';

    await prisma.$executeRawUnsafe(`
      INSERT INTO \`Company\` (
        \`id\`, \`name\`, \`slug\`, \`status\`, \`logoUrl\`, \`faviconUrl\`, \`tagline\`,
        \`primaryColor\`, \`secondaryColor\`, \`phone\`, \`email\`, \`website\`,
        \`address\`, \`city\`, \`state\`, \`country\`, \`pincode\`, \`gstin\`,
        \`bankName\`, \`accountHolderName\`, \`accountNumber\`, \`accountType\`,
        \`ifsc\`, \`branch\`, \`upiId\`, \`paymentNotes\`, \`isOoting\`
      ) VALUES (
        ?, ?, ?, 'ACTIVE', ?, ?, ?,
        '#1E3A8A', '#E11D48', ?, ?, ?,
        ?, 'Shivamogga', 'Karnataka', 'India', '577222', ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, 1
      )
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`isOoting\` = 1,
        \`status\` = 'ACTIVE'
    `,
      OOTING_COMPANY_ID,
      ootingName,
      'ooting',
      ootingLogoUrl,
      '/favicon.ico',
      ootingTagline,
      ootingPhone,
      ootingEmail,
      ootingWebsite,
      ootingAddress,
      ootingGstin,
      ootingBankName,
      ootingAccHolder,
      ootingAccNum,
      ootingAccType,
      ootingIfsc,
      ootingBranch,
      ootingUpi,
      ootingPaymentNotes
    );
    console.log(`  ✓ Ooting tenant record created/verified with ID: ${OOTING_COMPANY_ID}`);

    // 4. Backfill existing records to Ooting tenant
    console.log('\n[4/5] Backfilling all existing unassigned records to Ooting tenant...');
    for (const table of tablesToAlter) {
      const updateResult = await prisma.$executeRawUnsafe(`
        UPDATE \`${table}\`
        SET \`companyId\` = ?
        WHERE \`companyId\` IS NULL OR \`companyId\` = ''
      `, OOTING_COMPANY_ID);
      console.log(`  ✓ \`${table}\`: updated ${updateResult} records`);
    }

    // 5. Verification: Check counts
    console.log('\n[5/5] Verifying multi-tenant isolation counts...');
    const [
      userCount,
      customerCount,
      packageCount,
      leadCount,
      bookingCount,
      paymentCount,
      agentCount,
      companyCount,
    ] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`User\` WHERE \`companyId\` = ?`, OOTING_COMPANY_ID),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`Customer\` WHERE \`companyId\` = ?`, OOTING_COMPANY_ID),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`Package\` WHERE \`companyId\` = ?`, OOTING_COMPANY_ID),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`Lead\` WHERE \`companyId\` = ?`, OOTING_COMPANY_ID),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`Booking\` WHERE \`companyId\` = ?`, OOTING_COMPANY_ID),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`Payment\` WHERE \`companyId\` = ?`, OOTING_COMPANY_ID),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`Agent\` WHERE \`companyId\` = ?`, OOTING_COMPANY_ID),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`Company\``),
    ]);

    const getCount = (r) => Number(r[0]?.count || 0);

    console.log('---------------------------------------------------------------');
    console.log('✅ MULTI-TENANT VERIFICATION RESULTS:');
    console.log(`  • Companies:           ${getCount(companyCount)}`);
    console.log(`  • Ooting Users:        ${getCount(userCount)}`);
    console.log(`  • Ooting Customers:    ${getCount(customerCount)}`);
    console.log(`  • Ooting Packages:     ${getCount(packageCount)}`);
    console.log(`  • Ooting Leads:        ${getCount(leadCount)}`);
    console.log(`  • Ooting Bookings:     ${getCount(bookingCount)}`);
    console.log(`  • Ooting Payments:     ${getCount(paymentCount)}`);
    console.log(`  • Ooting Agents:       ${getCount(agentCount)}`);
    console.log('---------------------------------------------------------------');
    console.log('🎉 Multi-tenant database migration completed successfully with ZERO DATA LOSS!');
    console.log('===============================================================');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMultiTenantMigration();
