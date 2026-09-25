// ==============================================================================
// Ooting CRM - Automated MySQL Data Migration & Verification Script
// Imports records from JSON backup into the configured MySQL database.
// Idempotent: Can be run multiple times safely without duplicating data.
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

const backupPath = path.resolve(__dirname, '../prisma/backup/ooting-crm-pre-migration-backup.json');

if (!fs.existsSync(backupPath)) {
  console.error(`❌ Backup file not found at: ${backupPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(backupPath, 'utf-8');
const backup = JSON.parse(raw);
const { tables, summary: expected } = backup;

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function migrate() {
  console.log('====================================================');
  console.log('  Ooting CRM — Automated MySQL Data Migration');
  console.log(`  Target Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'from .env'}`);
  console.log('====================================================\n');

  console.log('⏳ Connecting to database...');
  await prisma.$connect();
  console.log('✅ Connected successfully.\n');

  console.log('🔄 Migrating records in dependency order...\n');

  // 1. Users
  for (const u of tables.users || []) {
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
  console.log(`✓ Users migrated: ${tables.users.length}`);

  // 2. Customers
  for (const c of tables.customers || []) {
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
  console.log(`✓ Customers migrated: ${tables.customers.length}`);

  // 3. Packages
  for (const p of tables.packages || []) {
    await prisma.package.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        packageName: p.packageName,
        destination: p.destination,
        duration: p.duration,
        description: p.description,
        price: Number(p.price || 0),
        packageType: p.packageType || 'HOLIDAY',
        inclusions: p.inclusions,
        exclusions: p.exclusions,
        imageUrl: p.imageUrl,
        gallery: p.gallery,
        status: p.status || 'ACTIVE',
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }
  console.log(`✓ Packages migrated: ${tables.packages.length}`);

  // 4. Itinerary Days
  for (const it of tables.itineraryDays || []) {
    await prisma.itineraryDay.upsert({
      where: { id: it.id },
      update: {},
      create: {
        id: it.id,
        packageId: it.packageId,
        dayNumber: it.dayNumber,
        title: it.title,
        description: it.description,
        activities: it.activities,
        places: it.places,
        startTime: it.startTime,
        endTime: it.endTime,
        imageUrl: it.imageUrl,
        images: it.images,
        createdAt: new Date(it.createdAt),
        updatedAt: new Date(it.updatedAt),
      },
    });
  }
  console.log(`✓ Itinerary Days migrated: ${tables.itineraryDays.length}`);

  // 5. Leads
  for (const l of tables.leads || []) {
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
        budget: l.budget !== null && l.budget !== undefined ? Number(l.budget) : null,
        packageId: l.packageId,
        enquiryStatus: l.enquiryStatus || 'NEW',
        priority: l.priority || 'MEDIUM',
        notes: l.notes,
        nextFollowUpAt: l.nextFollowUpAt ? new Date(l.nextFollowUpAt) : null,
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
  console.log(`✓ Leads migrated: ${tables.leads.length}`);

  // 6. Follow-ups
  for (const f of tables.followUps || []) {
    await prisma.followUp.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        leadId: f.leadId,
        assignedUserId: f.assignedUserId,
        scheduledAt: new Date(f.scheduledAt),
        type: f.type || 'CALL',
        notes: f.notes,
        status: f.status || 'PENDING',
        completedAt: f.completedAt ? new Date(f.completedAt) : null,
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
      },
    });
  }
  console.log(`✓ Follow-ups migrated: ${tables.followUps.length}`);

  // 7. Quotations
  for (const q of tables.quotations || []) {
    await prisma.quotation.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        quotationNumber: q.quotationNumber,
        leadId: q.leadId,
        customerId: q.customerId,
        packageId: q.packageId,
        destination: q.destination,
        travelStartDate: q.travelStartDate ? new Date(q.travelStartDate) : null,
        travelEndDate: q.travelEndDate ? new Date(q.travelEndDate) : null,
        adults: q.adults || 2,
        children: q.children || 0,
        infants: q.infants || 0,
        accommodation: q.accommodation,
        transport: q.transport,
        activities: q.activities,
        inclusions: q.inclusions,
        exclusions: q.exclusions,
        cabDetails: q.cabDetails,
        additionalCharges: Number(q.additionalCharges || 0),
        paymentTerms: q.paymentTerms,
        cancellationTerms: q.cancellationTerms,
        notes: q.notes,
        basePrice: Number(q.basePrice || 0),
        discount: Number(q.discount || 0),
        tax: Number(q.tax || 0),
        finalAmount: Number(q.finalAmount || 0),
        status: q.status || 'DRAFT',
        termsAndConditions: q.termsAndConditions,
        createdById: q.createdById,
        updatedById: q.updatedById || null,
        isDeleted: q.isDeleted || false,
        deletedAt: q.deletedAt ? new Date(q.deletedAt) : null,
        deletedById: q.deletedById || null,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt),
      },
    });
  }
  console.log(`✓ Quotations migrated: ${tables.quotations.length}`);

  // 8. Bookings
  for (const b of tables.bookings || []) {
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
        durationDays: b.durationDays ?? 1,
        durationNights: b.durationNights ?? 0,
        tripType: b.tripType || 'SINGLE',
        travellers: b.travellers || 1,
        totalAmount: Number(b.totalAmount || 0),
        discount: Number(b.discount || 0),
        finalAmount: Number(b.finalAmount || 0),
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
  console.log(`✓ Bookings migrated: ${tables.bookings.length}`);

  // 9. Travellers
  for (const tr of tables.travellers || []) {
    await prisma.traveller.upsert({
      where: { id: tr.id },
      update: {},
      create: {
        id: tr.id,
        bookingId: tr.bookingId,
        name: tr.name,
        age: tr.age,
        gender: tr.gender,
        phone: tr.phone,
        email: tr.email,
        idNumber: tr.idNumber,
        address: tr.address,
        isPrimary: tr.isPrimary || false,
        createdAt: new Date(tr.createdAt),
        updatedAt: new Date(tr.updatedAt),
      },
    });
  }
  console.log(`✓ Travellers migrated: ${tables.travellers.length}`);

  // 10. Payments
  for (const py of tables.payments || []) {
    await prisma.payment.upsert({
      where: { id: py.id },
      update: {},
      create: {
        id: py.id,
        bookingId: py.bookingId,
        customerId: py.customerId || null,
        amount: Number(py.amount || 0),
        paymentDate: new Date(py.paymentDate),
        paymentTime: py.paymentTime || null,
        paymentMethod: py.paymentMethod || 'UPI',
        transactionReference: py.transactionReference,
        screenshotUrl: py.screenshotUrl || null,
        recordedById: py.recordedById || null,
        paymentStatus: py.paymentStatus || 'SUCCESS',
        notes: py.notes,
        createdAt: new Date(py.createdAt),
        updatedAt: new Date(py.updatedAt),
      },
    });
  }
  console.log(`✓ Payments migrated: ${tables.payments.length}`);

  // 11. Agents & AgentBookings
  for (const ag of tables.agents || []) {
    await prisma.agent.upsert({
      where: { id: ag.id },
      update: {},
      create: {
        id: ag.id,
        companyName: ag.companyName,
        contactPerson: ag.contactPerson,
        phone: ag.phone,
        email: ag.email,
        city: ag.city,
        state: ag.state,
        gstNumber: ag.gstNumber,
        panNumber: ag.panNumber || null,
        agentType: ag.agentType || 'Silver',
        status: ag.status || 'ACTIVE',
        googleReviewUrl: ag.googleReviewUrl,
        googleReviewRating: ag.googleReviewRating,
        googleReviewNotes: ag.googleReviewNotes,
        notes: ag.notes,
        createdAt: new Date(ag.createdAt),
        updatedAt: new Date(ag.updatedAt),
      },
    });
  }
  for (const ab of tables.agentBookings || []) {
    await prisma.agentBooking.upsert({
      where: { id: ab.id },
      update: {},
      create: {
        id: ab.id,
        agentId: ab.agentId,
        bookingId: ab.bookingId,
        commissionRate: Number(ab.commissionRate || 0),
        commissionAmount: Number(ab.commissionAmount || 0),
        netAmount: Number(ab.netAmount || 0),
        payoutStatus: ab.payoutStatus || 'PENDING',
        createdAt: new Date(ab.createdAt),
        updatedAt: new Date(ab.updatedAt),
      },
    });
  }
  console.log(`✓ Agents migrated: ${tables.agents.length}`);

  // 12. Expenses
  for (const ex of tables.expenses || []) {
    await prisma.expense.upsert({
      where: { id: ex.id },
      update: {},
      create: {
        id: ex.id,
        category: ex.category,
        amount: Number(ex.amount || 0),
        expenseDate: new Date(ex.expenseDate),
        description: ex.description,
        bookingId: ex.bookingId,
        createdById: ex.createdById,
        createdAt: new Date(ex.createdAt),
        updatedAt: new Date(ex.updatedAt),
      },
    });
  }
  console.log(`✓ Expenses migrated: ${tables.expenses.length}`);

  // 13. Cab Bookings
  for (const cab of tables.cabBookings || []) {
    await prisma.cabBooking.upsert({
      where: { id: cab.id },
      update: {},
      create: {
        id: cab.id,
        bookingReference: cab.bookingReference,
        customerId: cab.customerId,
        customerName: cab.customerName,
        customerPhone: cab.customerPhone,
        customerEmail: cab.customerEmail,
        leadId: cab.leadId,
        bookingId: cab.bookingId,
        packageId: cab.packageId,
        assignedStaffId: cab.assignedStaffId,
        pickupDate: new Date(cab.pickupDate),
        pickupTime: cab.pickupTime,
        pickupPlace: cab.pickupPlace,
        dropPlace: cab.dropPlace,
        travelRoute: cab.travelRoute,
        enquiryDate: cab.enquiryDate ? new Date(cab.enquiryDate) : null,
        carNumber: cab.carNumber,
        vehicleType: cab.vehicleType || 'SEDAN',
        passengerCount: cab.passengerCount || 1,
        driverName: cab.driverName,
        driverPhone: cab.driverPhone,
        cabProvider: cab.cabProvider,
        requiredCabType: cab.requiredCabType || 'AC',
        tripType: cab.tripType || 'OUTSTATION',
        estimatedDistance: cab.estimatedDistance,
        estimatedDuration: cab.estimatedDuration,
        cabAmount: Number(cab.cabAmount || 0),
        advanceAmount: Number(cab.advanceAmount || 0),
        balanceAmount: Number(cab.balanceAmount || 0),
        paymentStatus: cab.paymentStatus || 'PENDING',
        bookingStatus: cab.bookingStatus || 'CONFIRMED',
        specialInstructions: cab.specialInstructions,
        internalNotes: cab.internalNotes,
        driverAllowanceType: cab.driverAllowanceType || null,
        driverAllowanceRate: cab.driverAllowanceRate ? Number(cab.driverAllowanceRate) : null,
        driverAllowanceDays: cab.driverAllowanceDays ? Number(cab.driverAllowanceDays) : null,
        driverAllowanceTotal: cab.driverAllowanceTotal ? Number(cab.driverAllowanceTotal) : null,
        dutyRange: cab.dutyRange || null,
        customTableRows: cab.customTableRows || null,
        createdById: cab.createdById || null,
        updatedById: cab.updatedById || null,
        isDeleted: cab.isDeleted || false,
        deletedAt: cab.deletedAt ? new Date(cab.deletedAt) : null,
        deletedById: cab.deletedById || null,
        createdAt: new Date(cab.createdAt),
        updatedAt: new Date(cab.updatedAt),
      },
    });
  }
  console.log(`✓ Cab Bookings migrated: ${tables.cabBookings.length}`);

  // 14. Calendar Events
  for (const ev of tables.calendarEvents || []) {
    await prisma.calendarEvent.upsert({
      where: { id: ev.id },
      update: {},
      create: {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        eventType: ev.eventType || 'TASK',
        startDate: new Date(ev.startDate),
        endDate: ev.endDate ? new Date(ev.endDate) : null,
        allDay: ev.allDay || false,
        userId: ev.userId,
        customerId: ev.customerId,
        leadId: ev.leadId,
        bookingId: ev.bookingId,
        status: ev.status || 'PENDING',
        priority: ev.priority || 'MEDIUM',
        color: ev.color,
        createdAt: new Date(ev.createdAt),
        updatedAt: new Date(ev.updatedAt),
      },
    });
  }
  console.log(`✓ Calendar Events migrated: ${tables.calendarEvents.length}`);

  // 15. Company Settings
  for (const cs of tables.companySettings || []) {
    await prisma.companySetting.upsert({
      where: { key: cs.key },
      update: { value: cs.value },
      create: {
        id: cs.id,
        key: cs.key,
        value: cs.value,
        description: cs.description,
        updatedAt: new Date(cs.updatedAt),
      },
    });
  }
  console.log(`✓ Company Settings migrated: ${tables.companySettings.length}`);

  // 16. WhatsApp Messages
  for (const wm of tables.whatsAppMessages || []) {
    await prisma.whatsAppMessage.upsert({
      where: { id: wm.id },
      update: {},
      create: {
        id: wm.id,
        customerId: wm.customerId,
        phone: wm.phone,
        messageContent: wm.messageContent,
        templateName: wm.templateName,
        status: wm.status || 'PENDING',
        provider: wm.provider,
        externalId: wm.externalId,
        errorDetails: wm.errorDetails,
        sentByUserId: wm.sentByUserId,
        createdAt: new Date(wm.createdAt),
      },
    });
  }

  // 17. Audit Logs
  for (const al of tables.auditLogs || []) {
    await prisma.auditLog.upsert({
      where: { id: al.id },
      update: {},
      create: {
        id: al.id,
        userId: al.userId,
        userName: al.userName,
        action: al.action,
        entity: al.entity,
        entityId: al.entityId,
        details: al.details,
        oldValue: al.oldValue || null,
        newValue: al.newValue || null,
        ipAddress: al.ipAddress,
        createdAt: new Date(al.createdAt),
      },
    });
  }
  console.log(`✓ Audit Logs migrated: ${tables.auditLogs.length}`);

  // 18. Suppliers
  for (const s of tables.suppliers || []) {
    await prisma.supplier.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.name,
        supplierType: s.supplierType || 'HOTEL',
        contactPerson: s.contactPerson,
        phone: s.phone,
        whatsapp: s.whatsapp,
        email: s.email,
        alternateContact: s.alternateContact,
        website: s.website,
        address: s.address,
        city: s.city,
        district: s.district,
        state: s.state,
        country: s.country || 'India',
        pincode: s.pincode,
        gstNumber: s.gstNumber,
        panNumber: s.panNumber,
        tier: s.tier || 'Silver',
        serviceCategories: s.serviceCategories,
        categoryDetails: s.categoryDetails,
        category: s.category,
        servicesProvided: s.servicesProvided,
        destinationsCovered: s.destinationsCovered,
        contractDetails: s.contractDetails,
        paymentTerms: s.paymentTerms,
        creditLimit: s.creditLimit ? Number(s.creditLimit) : 0,
        commissionDetails: s.commissionDetails,
        bankDetails: s.bankDetails,
        status: s.status || 'ACTIVE',
        assignedToId: s.assignedToId,
        tags: s.tags,
        notes: s.notes,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log(`✓ Suppliers migrated: ${(tables.suppliers || []).length}`);

  // --------------------------------------------------------------------------
  // Verification Comparison
  // --------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log('  DATA INTEGRITY VERIFICATION');
  console.log('====================================================');

  const [
    actualUsers,
    actualCustomers,
    actualLeads,
    actualFollowUps,
    actualPackages,
    actualItineraryDays,
    actualQuotations,
    actualBookings,
    actualTravellers,
    actualPayments,
    actualAgents,
    actualExpenses,
    actualCabBookings,
    actualCalendarEvents,
    actualCompanySettings,
    actualAuditLogs,
    actualSuppliers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.lead.count(),
    prisma.followUp.count(),
    prisma.package.count(),
    prisma.itineraryDay.count(),
    prisma.quotation.count(),
    prisma.booking.count(),
    prisma.traveller.count(),
    prisma.payment.count(),
    prisma.agent.count(),
    prisma.expense.count(),
    prisma.cabBooking.count(),
    prisma.calendarEvent.count(),
    prisma.companySetting.count(),
    prisma.auditLog.count(),
    prisma.supplier.count(),
  ]);

  const checks = [
    { table: 'Users', expected: expected.users || 0, actual: actualUsers },
    { table: 'Customers', expected: expected.customers || 0, actual: actualCustomers },
    { table: 'Leads', expected: expected.leads || 0, actual: actualLeads },
    { table: 'Follow-ups', expected: expected.followUps || 0, actual: actualFollowUps },
    { table: 'Packages', expected: expected.packages || 0, actual: actualPackages },
    { table: 'Itinerary Days', expected: expected.itineraryDays || 0, actual: actualItineraryDays },
    { table: 'Quotations', expected: expected.quotations || 0, actual: actualQuotations },
    { table: 'Bookings', expected: expected.bookings || 0, actual: actualBookings },
    { table: 'Travellers', expected: expected.travellers || 0, actual: actualTravellers },
    { table: 'Payments', expected: expected.payments || 0, actual: actualPayments },
    { table: 'Agents', expected: expected.agents || 0, actual: actualAgents },
    { table: 'Expenses', expected: expected.expenses || 0, actual: actualExpenses },
    { table: 'Cab Bookings', expected: expected.cabBookings || 0, actual: actualCabBookings },
    { table: 'Calendar Events', expected: expected.calendarEvents || 0, actual: actualCalendarEvents },
    { table: 'Company Settings', expected: expected.companySettings || 0, actual: actualCompanySettings },
    { table: 'Audit Logs', expected: expected.auditLogs || 0, actual: actualAuditLogs },
    { table: 'Suppliers', expected: (expected.suppliers || 0), actual: actualSuppliers },
  ];

  let allPassed = true;
  for (const c of checks) {
    const passed = c.actual >= c.expected;
    if (!passed) allPassed = false;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${c.table.padEnd(18)} Expected: ${String(c.expected).padEnd(4)} Actual: ${String(c.actual).padEnd(4)} [${status}]`);
  }

  console.log('====================================================');
  if (allPassed) {
    console.log('🎉 ALL DATA VERIFIED SUCCESSFULLY IN DATABASE!');
  } else {
    console.error('⚠️ Warning: Some record counts did not match expected backup.');
  }
  console.log('====================================================\n');
}

migrate()
  .catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
