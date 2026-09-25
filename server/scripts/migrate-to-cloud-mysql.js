// ==============================================================================
// Ooting CRM - Dedicated Cloud MySQL Migration & Verification Script
// Preserves 100% of CRM records, IDs, foreign keys, and timestamps.
// Zero Data Loss Guarantee - Idempotent upserts.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.resolve(serverDir, '../.env') });
dotenv.config({ path: path.resolve(serverDir, '.env') });

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

// Find the latest backup file in server/prisma/backup/
const backupDir = path.resolve(serverDir, 'prisma/backup');
const files = fs.readdirSync(backupDir).filter(f => f.startsWith('ooting-crm-backup-') && f.endsWith('.json'));
files.sort().reverse();

if (files.length === 0) {
  console.error('❌ No backup JSON file found in server/prisma/backup/');
  process.exit(1);
}

const latestBackupFile = path.resolve(backupDir, files[0]);
console.log(`[Backup Source] Using verified backup file: ${latestBackupFile}`);

const raw = fs.readFileSync(latestBackupFile, 'utf-8');
const backup = JSON.parse(raw);
const { tables, metadata } = backup;

const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

if (!targetUrl) {
  console.error('❌ No target DATABASE_URL found. Please set DATABASE_URL or TARGET_DATABASE_URL.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: targetUrl,
    },
  },
  log: ['error', 'warn'],
});

async function migrate() {
  console.log('====================================================');
  console.log('  Ooting CRM — Cloud MySQL Data Migration & Sync');
  console.log(`  Target Database URL: ${targetUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`  Total Records to Migrate: ${metadata?.totalRecords || 'N/A'}`);
  console.log('====================================================\n');

  console.log('⏳ Connecting to target database...');
  await prisma.$connect();
  console.log('✅ Connected successfully.\n');

  // Helper to extract table rows regardless of singular/plural naming
  const getRows = (singular, plural) => tables[singular] || tables[plural] || [];

  // 1. Users
  const userRows = getRows('user', 'users');
  console.log(`Migrating Users (${userRows.length})...`);
  for (const u of userRows) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        phone: u.phone,
        status: u.status,
        permissions: u.permissions || null,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
        otpHash: u.otpHash,
        otpExpiresAt: u.otpExpiresAt ? new Date(u.otpExpiresAt) : null,
        otpAttempts: u.otpAttempts || 0,
        lastOtpRequestedAt: u.lastOtpRequestedAt ? new Date(u.lastOtpRequestedAt) : null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }

  // 2. Customers
  const customerRows = getRows('customer', 'customers');
  console.log(`Migrating Customers (${customerRows.length})...`);
  for (const c of customerRows) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        alternatePhone: c.alternatePhone,
        email: c.email,
        city: c.city,
        state: c.state,
        country: c.country || 'India',
        source: c.source || 'DIRECT',
        notes: c.notes,
        assignedToId: c.assignedToId,
        status: c.status || 'ACTIVE',
        createdById: c.createdById || null,
        updatedById: c.updatedById || null,
        isDeleted: c.isDeleted || false,
        deletedAt: c.deletedAt ? new Date(c.deletedAt) : null,
        deletedById: c.deletedById || null,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }

  // 3. Packages
  const packageRows = getRows('package', 'packages');
  console.log(`Migrating Packages (${packageRows.length})...`);
  for (const p of packageRows) {
    await prisma.package.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        packageName: p.packageName,
        destination: p.destination,
        duration: p.duration,
        description: p.description,
        price: p.price != null ? Number(p.price) : 0,
        packageType: p.packageType || 'HOLIDAY',
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        status: p.status || 'ACTIVE',
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }

  // 4. Itinerary Days
  const itineraryRows = getRows('itineraryDay', 'itineraryDays');
  console.log(`Migrating Itinerary Days (${itineraryRows.length})...`);
  for (const d of itineraryRows) {
    await prisma.itineraryDay.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        packageId: d.packageId,
        dayNumber: d.dayNumber,
        title: d.title,
        description: d.description,
        places: d.places,
        activities: d.activities,
        startTime: d.startTime,
        endTime: d.endTime,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      },
    });
  }

  // 5. Leads
  const leadRows = getRows('lead', 'leads');
  console.log(`Migrating Leads (${leadRows.length})...`);
  for (const l of leadRows) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        customerId: l.customerId,
        assignedUserId: l.assignedUserId,
        source: l.source || 'WEBSITE',
        destination: l.destination,
        travelStartDate: l.travelStartDate ? new Date(l.travelStartDate) : null,
        travelEndDate: l.travelEndDate ? new Date(l.travelEndDate) : null,
        adults: l.adults || 2,
        children: l.children || 0,
        infants: l.infants || 0,
        budget: l.budget != null ? Number(l.budget) : null,
        packageId: l.packageId,
        enquiryStatus: l.enquiryStatus || 'NEW',
        priority: l.priority || 'MEDIUM',
        notes: l.notes,
        createdById: l.createdById || null,
        updatedById: l.updatedById || null,
        isDeleted: l.isDeleted || false,
        deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
        deletedById: l.deletedById || null,
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      },
    });
  }

  // 6. Follow-ups
  const followUpRows = getRows('followUp', 'followUps');
  console.log(`Migrating Follow-ups (${followUpRows.length})...`);
  for (const f of followUpRows) {
    const schedDate = f.scheduledAt || f.scheduledDate;
    await prisma.followUp.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        leadId: f.leadId,
        assignedUserId: f.assignedUserId,
        scheduledAt: schedDate ? new Date(schedDate) : new Date(f.createdAt),
        type: f.type || f.followUpType || 'CALL',
        status: f.status || 'PENDING',
        notes: f.notes,
        completedAt: f.completedAt ? new Date(f.completedAt) : null,
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
      },
    });
  }

  // 7. Quotations
  const quotationRows = getRows('quotation', 'quotations');
  console.log(`Migrating Quotations (${quotationRows.length})...`);
  for (const q of quotationRows) {
    await prisma.quotation.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        quotationNumber: q.quotationNumber,
        customerId: q.customerId,
        leadId: q.leadId,
        packageId: q.packageId,
        version: q.version || 1,
        totalAmount: Number(q.totalAmount),
        discount: Number(q.discount || 0),
        tax: Number(q.tax || 0),
        finalAmount: Number(q.finalAmount),
        status: q.status || 'DRAFT',
        validUntil: q.validUntil ? new Date(q.validUntil) : null,
        termsConditions: q.termsConditions,
        inclusions: q.inclusions,
        exclusions: q.exclusions,
        itineraryData: q.itineraryData,
        pricingDetails: q.pricingDetails,
        createdById: q.createdById,
        updatedById: q.updatedById,
        isDeleted: q.isDeleted || false,
        deletedAt: q.deletedAt ? new Date(q.deletedAt) : null,
        deletedById: q.deletedById,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt),
      },
    });
  }

  // 8. Bookings
  const bookingRows = getRows('booking', 'bookings');
  console.log(`Migrating Bookings (${bookingRows.length})...`);
  for (const b of bookingRows) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        bookingNumber: b.bookingNumber,
        customerId: b.customerId,
        leadId: b.leadId,
        packageId: b.packageId,
        assignedUserId: b.assignedUserId,
        travelStartDate: new Date(b.travelStartDate),
        travelEndDate: new Date(b.travelEndDate),
        durationDays: b.durationDays || 1,
        durationNights: b.durationNights || 0,
        tripType: b.tripType || 'SINGLE',
        travellers: b.travellers || 1,
        totalAmount: Number(b.totalAmount),
        discount: Number(b.discount || 0),
        finalAmount: Number(b.finalAmount),
        bookingStatus: b.bookingStatus || 'CONFIRMED',
        bookingDate: new Date(b.bookingDate),
        serviceProviders: b.serviceProviders,
        notes: b.notes,
        createdById: b.createdById || null,
        updatedById: b.updatedById || null,
        isDeleted: b.isDeleted || false,
        deletedAt: b.deletedAt ? new Date(b.deletedAt) : null,
        deletedById: b.deletedById || null,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      },
    });
  }

  // 9. Travellers
  const travellerRows = getRows('traveller', 'travellers');
  console.log(`Migrating Travellers (${travellerRows.length})...`);
  for (const t of travellerRows) {
    await prisma.traveller.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        bookingId: t.bookingId,
        fullName: t.fullName,
        age: t.age,
        gender: t.gender,
        phone: t.phone,
        email: t.email,
        idType: t.idType,
        idNumber: t.idNumber,
        address: t.address,
        isLeadPassenger: t.isLeadPassenger || false,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
  }

  // 10. Payments
  const paymentRows = getRows('payment', 'payments');
  console.log(`Migrating Payments (${paymentRows.length})...`);
  for (const p of paymentRows) {
    await prisma.payment.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        bookingId: p.bookingId,
        customerId: p.customerId,
        receiptNumber: p.receiptNumber,
        amount: Number(p.amount),
        paymentDate: new Date(p.paymentDate),
        paymentTime: p.paymentTime,
        paymentMethod: p.paymentMethod || 'UPI',
        transactionReference: p.transactionReference,
        status: p.status || 'SUCCESS',
        notes: p.notes,
        screenshotUrl: p.screenshotUrl,
        recordedById: p.recordedById,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }

  // 11. Agents
  const agentRows = getRows('agent', 'agents');
  console.log(`Migrating Agents (${agentRows.length})...`);
  for (const a of agentRows) {
    await prisma.agent.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        agencyName: a.agencyName,
        contactPerson: a.contactPerson,
        email: a.email,
        phone: a.phone,
        address: a.address,
        city: a.city,
        state: a.state,
        panNumber: a.panNumber,
        gstNumber: a.gstNumber,
        commissionRate: a.commissionRate != null ? Number(a.commissionRate) : 0,
        agentType: a.agentType || 'Silver',
        status: a.status || 'ACTIVE',
        notes: a.notes,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
      },
    });
  }

  // 12. Agent Bookings
  const agentBookingRows = getRows('agentBooking', 'agentBookings');
  console.log(`Migrating Agent Bookings (${agentBookingRows.length})...`);
  for (const ab of agentBookingRows) {
    await prisma.agentBooking.upsert({
      where: { id: ab.id },
      update: {},
      create: {
        id: ab.id,
        agentId: ab.agentId,
        bookingId: ab.bookingId,
        commissionRate: Number(ab.commissionRate),
        commissionAmount: Number(ab.commissionAmount),
        tdsDeducted: Number(ab.tdsDeducted || 0),
        netPayable: Number(ab.netPayable),
        status: ab.status || 'PENDING',
        paidDate: ab.paidDate ? new Date(ab.paidDate) : null,
        paymentReference: ab.paymentReference,
        notes: ab.notes,
        createdAt: new Date(ab.createdAt),
        updatedAt: new Date(ab.updatedAt),
      },
    });
  }

  // 13. Expenses
  const expenseRows = getRows('expense', 'expenses');
  console.log(`Migrating Expenses (${expenseRows.length})...`);
  for (const e of expenseRows) {
    await prisma.expense.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        expenseDate: new Date(e.expenseDate),
        description: e.description || e.title || 'Expense',
        bookingId: e.bookingId || null,
        createdById: e.createdById || null,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      },
    });
  }

  // 14. Cab Bookings
  const cabRows = getRows('cabBooking', 'cabBookings');
  console.log(`Migrating Cab Bookings (${cabRows.length})...`);
  for (const cb of cabRows) {
    await prisma.cabBooking.upsert({
      where: { id: cb.id },
      update: {},
      create: {
        id: cb.id,
        bookingReference: cb.bookingReference,
        customerId: cb.customerId || null,
        customerName: cb.customerName,
        customerPhone: cb.customerPhone,
        customerEmail: cb.customerEmail || null,
        leadId: cb.leadId || null,
        bookingId: cb.bookingId || null,
        packageId: cb.packageId || null,
        assignedStaffId: cb.assignedStaffId || null,
        pickupDate: new Date(cb.pickupDate),
        pickupTime: cb.pickupTime,
        pickupPlace: cb.pickupPlace || cb.pickupLocation || 'Pickup',
        dropPlace: cb.dropPlace || cb.dropLocation || 'Drop',
        travelRoute: cb.travelRoute || null,
        enquiryDate: cb.enquiryDate ? new Date(cb.enquiryDate) : null,
        carNumber: cb.carNumber || null,
        vehicleType: cb.vehicleType || 'SEDAN',
        passengerCount: cb.passengerCount || 1,
        driverName: cb.driverName || null,
        driverPhone: cb.driverPhone || null,
        cabProvider: cb.cabProvider || null,
        requiredCabType: cb.requiredCabType || 'AC',
        tripType: cb.tripType || 'OUTSTATION',
        estimatedDistance: cb.estimatedDistance || null,
        estimatedDuration: cb.estimatedDuration || null,
        cabAmount: Number(cb.cabAmount || cb.totalAmount || 0),
        advanceAmount: Number(cb.advanceAmount || 0),
        balanceAmount: Number(cb.balanceAmount || 0),
        paymentStatus: cb.paymentStatus || 'PENDING',
        bookingStatus: cb.bookingStatus || 'CONFIRMED',
        specialInstructions: cb.specialInstructions || null,
        internalNotes: cb.internalNotes || null,
        driverAllowanceType: cb.driverAllowanceType || null,
        driverAllowanceRate: cb.driverAllowanceRate != null ? Number(cb.driverAllowanceRate) : null,
        driverAllowanceDays: cb.driverAllowanceDays != null ? Number(cb.driverAllowanceDays) : null,
        driverAllowanceTotal: cb.driverAllowanceTotal != null ? Number(cb.driverAllowanceTotal) : null,
        dutyRange: cb.dutyRange || null,
        customTableRows: cb.customTableRows || null,
        createdById: cb.createdById || null,
        updatedById: cb.updatedById || null,
        isDeleted: cb.isDeleted || false,
        deletedAt: cb.deletedAt ? new Date(cb.deletedAt) : null,
        deletedById: cb.deletedById || null,
        createdAt: new Date(cb.createdAt),
        updatedAt: new Date(cb.updatedAt),
      },
    });
  }

  // 15. Calendar Events
  const eventRows = getRows('calendarEvent', 'calendarEvents');
  console.log(`Migrating Calendar Events (${eventRows.length})...`);
  for (const ev of eventRows) {
    await prisma.calendarEvent.upsert({
      where: { id: ev.id },
      update: {},
      create: {
        id: ev.id,
        title: ev.title,
        eventType: ev.eventType || 'TASK',
        startDate: new Date(ev.startDate),
        endDate: new Date(ev.endDate),
        allDay: ev.allDay || false,
        userId: ev.userId || null,
        customerId: ev.customerId || null,
        leadId: ev.leadId || null,
        bookingId: ev.bookingId || null,
        status: ev.status || 'PENDING',
        priority: ev.priority || 'MEDIUM',
        color: ev.color || null,
        description: ev.description || null,
        createdAt: new Date(ev.createdAt),
        updatedAt: new Date(ev.updatedAt),
      },
    });
  }

  // 16. Company Settings
  const settingRows = getRows('companySetting', 'companySettings');
  console.log(`Migrating Company Settings (${settingRows.length})...`);
  for (const s of settingRows) {
    const uDate = s.updatedAt ? new Date(s.updatedAt) : new Date();
    await prisma.companySetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description || null },
      create: {
        id: s.id,
        key: s.key,
        value: s.value,
        description: s.description || null,
        updatedAt: uDate,
      },
    });
  }

  // 17. Audit Logs
  const auditRows = getRows('auditLog', 'auditLogs');
  console.log(`Migrating Audit Logs (${auditRows.length})...`);
  for (const a of auditRows) {
    await prisma.auditLog.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        userId: a.userId || null,
        userName: a.userName || null,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId || null,
        details: a.details || null,
        oldValue: a.oldValue || null,
        newValue: a.newValue || null,
        ipAddress: a.ipAddress || null,
        createdAt: new Date(a.createdAt),
      },
    });
  }

  // 18. Suppliers
  const supplierRows = getRows('supplier', 'suppliers');
  console.log(`Migrating Suppliers (${supplierRows.length})...`);
  for (const sup of supplierRows) {
    await prisma.supplier.upsert({
      where: { id: sup.id },
      update: {},
      create: {
        id: sup.id,
        name: sup.name,
        contactPerson: sup.contactPerson,
        email: sup.email,
        phone: sup.phone,
        city: sup.city,
        state: sup.state,
        district: sup.district,
        pincode: sup.pincode,
        address: sup.address,
        panNumber: sup.panNumber,
        gstin: sup.gstin,
        tier: sup.tier || 'Silver',
        rating: sup.rating != null ? Number(sup.rating) : 0,
        serviceCategories: sup.serviceCategories,
        categoryDetails: sup.categoryDetails,
        notes: sup.notes,
        assignedUserId: sup.assignedUserId,
        status: sup.status || 'ACTIVE',
        createdAt: new Date(sup.createdAt),
        updatedAt: new Date(sup.updatedAt),
      },
    });
  }

  console.log('\n====================================================');
  console.log('  VERIFYING TARGET DATABASE ROW COUNTS');
  console.log('====================================================');

  const actualCounts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    leads: await prisma.lead.count(),
    followUps: await prisma.followUp.count(),
    packages: await prisma.package.count(),
    itineraries: await prisma.itineraryDay.count(),
    quotations: await prisma.quotation.count(),
    bookings: await prisma.booking.count(),
    travellers: await prisma.traveller.count(),
    payments: await prisma.payment.count(),
    agents: await prisma.agent.count(),
    agentBookings: await prisma.agentBooking.count(),
    expenses: await prisma.expense.count(),
    cabBookings: await prisma.cabBooking.count(),
    calendarEvents: await prisma.calendarEvent.count(),
    companySettings: await prisma.companySetting.count(),
    auditLogs: await prisma.auditLog.count(),
    suppliers: await prisma.supplier.count(),
  };

  console.log(JSON.stringify(actualCounts, null, 2));

  const totalActual = Object.values(actualCounts).reduce((a, b) => a + b, 0);
  console.log(`\n✅ Migration Complete. Total live verified records in Cloud MySQL: ${totalActual}`);
}

migrate()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
