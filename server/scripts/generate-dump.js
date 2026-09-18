import fs from 'fs';
import path from 'path';

const backupFile = 'c:/Users/ootng/Desktop/RM/server/prisma/backup/ooting-crm-pre-migration-backup.json';
const outputFile = 'c:/Users/ootng/Desktop/RM/server/prisma/backup/dump.sql';

const raw = fs.readFileSync(backupFile, 'utf-8');
const backup = JSON.parse(raw);
const tables = backup.tables;

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'object' && val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  // Format ISO strings as MySQL DATETIME
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
    sql += `INSERT INTO \`${tableName}\` (${colList}) VALUES (${vals}) ON DUPLICATE KEY UPDATE \`updatedAt\` = VALUES(\`updatedAt\`);\n`;
  }
  return sql + '\n';
}

let out = `-- ==============================================================================\n`;
out += `-- Ooting CRM - MySQL Database Dump & Migration Script\n`;
out += `-- Exported at: ${new Date().toISOString()}\n`;
out += `-- Engine: MySQL 8.0+ (InnoDB utf8mb4)\n`;
out += `-- ==============================================================================\n\n`;
out += `SET NAMES utf8mb4;\n`;
out += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

out += generateInserts('User', tables.users);
out += generateInserts('Customer', tables.customers);
out += generateInserts('Package', tables.packages);
out += generateInserts('ItineraryDay', tables.itineraryDays);
out += generateInserts('Lead', tables.leads);
out += generateInserts('FollowUp', tables.followUps);
out += generateInserts('Quotation', tables.quotations);
out += generateInserts('Booking', tables.bookings);
out += generateInserts('Traveller', tables.travellers);
out += generateInserts('Payment', tables.payments);
out += generateInserts('Agent', tables.agents);
out += generateInserts('AgentBooking', tables.agentBookings);
out += generateInserts('Expense', tables.expenses);
out += generateInserts('CabBooking', tables.cabBookings);
out += generateInserts('CalendarEvent', tables.calendarEvents);
out += generateInserts('CompanySetting', tables.companySettings);
out += generateInserts('WhatsAppMessage', tables.whatsAppMessages);
out += generateInserts('AuditLog', tables.auditLogs);

out += `SET FOREIGN_KEY_CHECKS = 1;\n`;
out += `-- ==============================================================================\n`;
out += `-- End of Ooting CRM MySQL Dump\n`;
out += `-- ==============================================================================\n`;

fs.writeFileSync(outputFile, out, 'utf-8');
console.log(`✅ Generated MySQL dump at ${outputFile} (${out.length} bytes)`);
