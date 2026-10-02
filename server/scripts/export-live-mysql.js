import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(serverDir, '../.env') });
dotenv.config({ path: path.resolve(serverDir, '.env') });

const CLOUD_TIDB_URL = 'mysql://2AJqT6QgbdvDayf.root:7xCl3FL0jIFUVu5D@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict';
const dbUrl = process.env.DATABASE_URL || CLOUD_TIDB_URL;

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return val.toString();
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return `'${val.slice(0, 19).replace('T', ' ')}'`;
  }
  const str = String(val);
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${escaped}'`;
}

function generateInserts(tableName, rows) {
  if (!rows || rows.length === 0) return `-- No records for ${tableName}\n\n`;
  const cols = Object.keys(rows[0]);
  const colList = cols.map(c => `\`${c}\``).join(', ');

  let sql = `-- Records for ${tableName} (${rows.length})\n`;
  for (const row of rows) {
    const vals = cols.map(c => sqlEscape(row[c])).join(', ');
    sql += `INSERT INTO \`${tableName}\` (${colList}) VALUES (${vals}) ON DUPLICATE KEY UPDATE \`id\` = \`id\`;\n`;
  }
  return sql + '\n';
}

async function exportLiveMySQL() {
  console.log('🔄 Exporting live MySQL database to SQL script...');
  
  const [
    users,
    customers,
    packages,
    itineraryDays,
    hotels,
    places,
    leads,
    followUps,
    quotations,
    bookings,
    travellers,
    payments,
    expenses,
    cabBookings,
    agents,
    suppliers,
    calendarEvents,
    companySettings,
    auditLogs,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.package.findMany(),
    prisma.itineraryDay.findMany(),
    prisma.hotel.findMany(),
    prisma.place.findMany(),
    prisma.lead.findMany(),
    prisma.followUp.findMany(),
    prisma.quotation.findMany(),
    prisma.booking.findMany(),
    prisma.traveller.findMany(),
    prisma.payment.findMany(),
    prisma.expense.findMany(),
    prisma.cabBooking.findMany(),
    prisma.agent.findMany(),
    prisma.supplier.findMany(),
    prisma.calendarEvent.findMany(),
    prisma.companySetting.findMany(),
    prisma.auditLog.findMany(),
  ]);

  let out = `-- ==============================================================================\n`;
  out += `-- Ooting CRM - Live MySQL Database Export\n`;
  out += `-- Export Timestamp: ${new Date().toISOString()}\n`;
  out += `-- Source: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`;
  out += `-- Engine: MySQL 8.0+ (InnoDB utf8mb4)\n`;
  out += `-- ==============================================================================\n\n`;
  out += `CREATE DATABASE IF NOT EXISTS \`ooting_crm\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
  out += `USE \`ooting_crm\`;\n\n`;
  out += `SET NAMES utf8mb4;\n`;
  out += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  out += generateInserts('User', users);
  out += generateInserts('Customer', customers);
  out += generateInserts('Package', packages);
  out += generateInserts('ItineraryDay', itineraryDays);
  out += generateInserts('Hotel', hotels);
  out += generateInserts('Place', places);
  out += generateInserts('Lead', leads);
  out += generateInserts('FollowUp', followUps);
  out += generateInserts('Quotation', quotations);
  out += generateInserts('Booking', bookings);
  out += generateInserts('Traveller', travellers);
  out += generateInserts('Payment', payments);
  out += generateInserts('Expense', expenses);
  out += generateInserts('CabBooking', cabBookings);
  out += generateInserts('Agent', agents);
  out += generateInserts('Supplier', suppliers);
  out += generateInserts('CalendarEvent', calendarEvents);
  out += generateInserts('CompanySetting', companySettings);
  out += generateInserts('AuditLog', auditLogs);

  out += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  out += `-- End of MySQL Export\n`;

  const backupDir = path.resolve(serverDir, 'prisma/backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const exportFilePath = path.resolve(backupDir, 'ooting_crm_live_dump.sql');
  fs.writeFileSync(exportFilePath, out, 'utf-8');

  console.log(`✅ Successfully exported live MySQL database to:\n   ${exportFilePath}`);
  console.log(`📊 Exported ${users.length} users, ${packages.length} packages, ${itineraryDays.length} itineraries, ${hotels.length} hotels, ${places.length} places.\n`);
  
  await prisma.$disconnect();
}

exportLiveMySQL().catch((err) => {
  console.error('❌ Error exporting MySQL data:', err);
  process.exit(1);
});
