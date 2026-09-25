import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runBackup() {
  console.log('==================================================');
  console.log('       OOTING CRM - LIVE DATABASE BACKUP');
  console.log('==================================================');

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Backup folders
  const localBackupDir = path.resolve(__dirname, '../prisma/backup');
  const userBackupDir = 'C:\\Users\\ootng\\Desktop\\CRM Backups';

  if (!fs.existsSync(localBackupDir)) {
    fs.mkdirSync(localBackupDir, { recursive: true });
  }
  if (!fs.existsSync(userBackupDir)) {
    try {
      fs.mkdirSync(userBackupDir, { recursive: true });
    } catch {}
  }

  console.log('[1/3] Reading live MySQL records...');

  const [
    users,
    customers,
    leads,
    followUps,
    packages,
    itineraries,
    quotations,
    bookings,
    travellers,
    payments,
    agents,
    agentBookings,
    expenses,
    auditLogs,
    companySettings,
    whatsAppMessages,
    cabBookings,
    calendarEvents,
    suppliers,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.lead.findMany(),
    prisma.followUp.findMany(),
    prisma.package.findMany(),
    prisma.itineraryDay.findMany(),
    prisma.quotation.findMany(),
    prisma.booking.findMany(),
    prisma.traveller.findMany(),
    prisma.payment.findMany(),
    prisma.agent.findMany(),
    prisma.agentBooking.findMany(),
    prisma.expense.findMany(),
    prisma.auditLog.findMany(),
    prisma.companySetting.findMany(),
    prisma.whatsAppMessage.findMany(),
    prisma.cabBooking.findMany(),
    prisma.calendarEvent.findMany(),
    prisma.supplier.findMany(),
  ]);

  const backupData = {
    metadata: {
      exportedAt: now.toISOString(),
      databaseEngine: 'MySQL 8.0',
      databaseName: 'ooting_crm',
      totalRecords:
        users.length +
        customers.length +
        leads.length +
        followUps.length +
        packages.length +
        itineraries.length +
        quotations.length +
        bookings.length +
        travellers.length +
        payments.length +
        agents.length +
        agentBookings.length +
        expenses.length +
        auditLogs.length +
        companySettings.length +
        whatsAppMessages.length +
        cabBookings.length +
        calendarEvents.length +
        suppliers.length,
    },
    tables: {
      user: users,
      customer: customers,
      lead: leads,
      followUp: followUps,
      package: packages,
      itineraryDay: itineraries,
      quotation: quotations,
      booking: bookings,
      traveller: travellers,
      payment: payments,
      agent: agents,
      agentBooking: agentBookings,
      expense: expenses,
      auditLog: auditLogs,
      companySetting: companySettings,
      whatsAppMessage: whatsAppMessages,
      cabBooking: cabBookings,
      calendarEvent: calendarEvents,
      supplier: suppliers,
    },
  };

  const jsonStr = JSON.stringify(backupData, null, 2);

  // Write local snapshot
  const localFile = path.join(localBackupDir, `ooting-crm-backup-${timestamp}.json`);
  fs.writeFileSync(localFile, jsonStr, 'utf-8');
  console.log(`[2/3] Saved project backup: ${localFile}`);

  // Write Desktop CRM Backups folder
  if (fs.existsSync(userBackupDir)) {
    const userFile = path.join(userBackupDir, `ooting-crm-backup-${timestamp}.json`);
    fs.writeFileSync(userFile, jsonStr, 'utf-8');
    console.log(`[3/3] Saved desktop backup:  ${userFile}`);
  }

  console.log('==================================================');
  console.log(`[SUCCESS] Total ${backupData.metadata.totalRecords} records backed up safely:`);
  console.log(` - Users:            ${users.length}`);
  console.log(` - Customers:        ${customers.length}`);
  console.log(` - Leads:            ${leads.length}`);
  console.log(` - Follow-ups:       ${followUps.length}`);
  console.log(` - Packages:         ${packages.length}`);
  console.log(` - Itineraries:      ${itineraries.length}`);
  console.log(` - Quotations:       ${quotations.length}`);
  console.log(` - Bookings:         ${bookings.length}`);
  console.log(` - Travellers:       ${travellers.length}`);
  console.log(` - Payments:         ${payments.length}`);
  console.log(` - Agents:           ${agents.length}`);
  console.log(` - Agent Bookings:   ${agentBookings.length}`);
  console.log(` - Expenses:         ${expenses.length}`);
  console.log(` - Cab Bookings:     ${cabBookings.length}`);
  console.log(` - Calendar Events:  ${calendarEvents.length}`);
  console.log(` - Settings:         ${companySettings.length}`);
  console.log(` - Audit Logs:       ${auditLogs.length}`);
  console.log('==================================================');

  await prisma.$disconnect();
}

runBackup().catch((err) => {
  console.error('[BACKUP FAILED]', err);
  process.exit(1);
});
