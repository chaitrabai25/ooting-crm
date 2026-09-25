import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('================================================================');
  console.log('  CRM PERSISTENCE & DATABASE MASTER VERIFICATION SUITE');
  console.log('  Engine: MySQL 8.0 | Database: ooting_crm');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[✅ PASS] ${testName}`);
      if (details) console.log(`         ${details}`);
      passed++;
    } else {
      console.error(`[❌ FAIL] ${testName}`);
      if (details) console.error(`         ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // BASELINE: Verify Zero Data Loss from Migration
    // -------------------------------------------------------------
    console.log('--- 1. Baseline Data Integrity Check ---');
    const userCount = await prisma.user.count();
    const pkgCount = await prisma.package.count();
    const itinCount = await prisma.itineraryDay.count();
    const custCount = await prisma.customer.count();
    const leadCount = await prisma.lead.count();
    const bkCount = await prisma.booking.count();
    const cabCount = await prisma.cabBooking.count();
    const expCount = await prisma.expense.count();
    const settingCount = await prisma.companySetting.count();
    const auditCount = await prisma.auditLog.count();

    assert(userCount >= 7, 'Existing Users Preserved', `Found ${userCount} users (expected >= 7)`);
    assert(custCount >= 3, 'Existing Customers Preserved', `Found ${custCount} customers (expected >= 3)`);
    assert(pkgCount >= 4, 'Existing Tour Packages Preserved', `Found ${pkgCount} packages (expected >= 4)`);
    assert(itinCount >= 7, 'Existing Itinerary Days Preserved', `Found ${itinCount} itinerary days (expected >= 7)`);
    assert(leadCount >= 1, 'Existing Leads Preserved', `Found ${leadCount} leads (expected >= 1)`);
    assert(bkCount >= 1, 'Existing Bookings Preserved', `Found ${bkCount} bookings (expected >= 1)`);
    assert(cabCount >= 1, 'Existing Cab Bookings Preserved', `Found ${cabCount} cab bookings (expected >= 1)`);
    assert(expCount >= 1, 'Existing Expenses Preserved', `Found ${expCount} expenses (expected >= 1)`);
    assert(settingCount >= 7, 'Existing Company Settings Preserved', `Found ${settingCount} settings (expected >= 7)`);
    assert(auditCount >= 37, 'Existing Audit Logs Preserved', `Found ${auditCount} audit logs (expected >= 37)`);

    // Fetch an admin user for relations
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    assert(!!adminUser, 'Admin User available for foreign key attribution', `Admin: ${adminUser?.email}`);

    // -------------------------------------------------------------
    // TEST A: Customer Creation & MySQL Row Insertion
    // -------------------------------------------------------------
    console.log('\n--- 2. Test A: Customer Persistence in MySQL ---');
    const testPhone = '9999999999';
    // Clean any previous test run customer
    await prisma.customer.deleteMany({ where: { phone: testPhone } });

    const createdCustomer = await prisma.customer.create({
      data: {
        fullName: 'Test Customer',
        phone: testPhone,
        email: 'test.customer@ooting.com',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        source: 'WEBSITE',
        status: 'ACTIVE',
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });

    assert(!!createdCustomer && createdCustomer.id.length > 0, 'Test A.1: Customer row inserted into MySQL', `ID: ${createdCustomer.id}`);

    // Verify row directly in MySQL
    const mysqlCustomer = await prisma.customer.findUnique({
      where: { id: createdCustomer.id },
    });
    assert(
      mysqlCustomer?.fullName === 'Test Customer' && mysqlCustomer?.phone === testPhone,
      'Test A.2: Direct MySQL query returns exact customer values',
      `Name: ${mysqlCustomer?.fullName}, Phone: ${mysqlCustomer?.phone}`
    );

    // -------------------------------------------------------------
    // TEST B: Customer Listing with isDeleted: false
    // -------------------------------------------------------------
    console.log('\n--- 3. Test B: Customer Listing Query ---');
    const activeCustomers = await prisma.customer.findMany({
      where: { isDeleted: false, phone: testPhone },
    });
    assert(activeCustomers.length === 1, 'Test B: Customer is present in active customer directory query');

    // -------------------------------------------------------------
    // TEST C: Edit Customer & Timestamp Integrity
    // -------------------------------------------------------------
    console.log('\n--- 4. Test C: Customer Edit & Timestamp Integrity ---');
    const originalCreatedAt = createdCustomer.createdAt;
    // Wait 50ms so updatedAt difference is guaranteed
    await new Promise((r) => setTimeout(r, 60));

    const updatedCustomer = await prisma.customer.update({
      where: { id: createdCustomer.id },
      data: {
        email: 'updated.test.customer@ooting.com',
        city: 'Mysuru',
        updatedById: adminUser.id,
      },
    });

    assert(
      updatedCustomer.createdAt.getTime() === originalCreatedAt.getTime(),
      'Test C.1: createdAt remained strictly unchanged',
      `Original: ${originalCreatedAt.toISOString()}, Current: ${updatedCustomer.createdAt.toISOString()}`
    );
    assert(
      updatedCustomer.updatedAt.getTime() > originalCreatedAt.getTime(),
      'Test C.2: updatedAt was automatically updated to newer timestamp',
      `UpdatedAt: ${updatedCustomer.updatedAt.toISOString()}`
    );
    assert(updatedCustomer.city === 'Mysuru', 'Test C.3: Updated city value persisted in MySQL');

    // -------------------------------------------------------------
    // TEST D: Soft-Delete Verification
    // -------------------------------------------------------------
    console.log('\n--- 5. Test D: Soft Deletion (Zero Data Loss) ---');
    const softDeletedCustomer = await prisma.customer.update({
      where: { id: createdCustomer.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: adminUser.id,
      },
    });

    // Check directly in MySQL: Row must STILL EXIST!
    const rowInMySQL = await prisma.customer.findUnique({
      where: { id: createdCustomer.id },
    });
    assert(rowInMySQL !== null, 'Test D.1: Row was NOT deleted from MySQL database (preserved)');
    assert(rowInMySQL?.isDeleted === true, 'Test D.2: isDeleted flag is set to true (1 in MySQL)');
    assert(rowInMySQL?.deletedAt !== null, 'Test D.3: deletedAt timestamp recorded');
    assert(rowInMySQL?.deletedById === adminUser.id, 'Test D.4: deletedById tracks user who performed action');

    // Filtered query must hide it
    const normalView = await prisma.customer.findMany({
      where: { isDeleted: false, id: createdCustomer.id },
    });
    assert(normalView.length === 0, 'Test D.5: Soft-deleted record is excluded from normal CRM views');

    // Restore for subsequent relational tests
    await prisma.customer.update({
      where: { id: createdCustomer.id },
      data: { isDeleted: false, deletedAt: null, deletedById: null },
    });

    // -------------------------------------------------------------
    // TEST E: Lead Creation & Persistence
    // -------------------------------------------------------------
    console.log('\n--- 6. Test E: Lead Creation & MySQL Persistence ---');
    const testLead = await prisma.lead.create({
      data: {
        customerId: createdCustomer.id,
        destination: 'Ooty Hills & Tea Gardens',
        adults: 2,
        children: 1,
        budget: 25000,
        source: 'WEBSITE',
        enquiryStatus: 'NEW',
        priority: 'HIGH',
        notes: 'Interested in 3D2N weekend getaway',
        assignedUserId: adminUser.id,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
      include: { customer: true },
    });

    assert(!!testLead.id, 'Test E.1: Lead inserted into MySQL', `Lead ID: ${testLead.id}`);
    assert(testLead.destination === 'Ooty Hills & Tea Gardens', 'Test E.2: Destination persisted accurately');
    assert(testLead.customer.phone === testPhone, 'Test E.3: Foreign key relation to customer resolved');

    // -------------------------------------------------------------
    // TEST F: Quotation Creation & Persistence
    // -------------------------------------------------------------
    console.log('\n--- 7. Test F: Quotation Creation & MySQL Persistence ---');
    const quoteNum = `OOT-QT-TEST-${Date.now()}`;
    const testQuotation = await prisma.quotation.create({
      data: {
        quotationNumber: quoteNum,
        customerId: createdCustomer.id,
        leadId: testLead.id,
        destination: 'Ooty Hills & Tea Gardens',
        basePrice: 22000,
        discount: 2000,
        tax: 1000,
        finalAmount: 21000,
        status: 'SENT',
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });

    assert(!!testQuotation.id, 'Test F.1: Quotation inserted into MySQL', `Quotation No: ${testQuotation.quotationNumber}`);
    assert(testQuotation.finalAmount === 21000, 'Test F.2: Final amount math preserved accurately in MySQL (Float DOUBLE)');

    // -------------------------------------------------------------
    // TEST G: Booking Creation & Transactional Integrity
    // -------------------------------------------------------------
    console.log('\n--- 8. Test G: Booking & Passenger Creation with Transaction ---');
    const bkNum = `OOT-BK-TEST-${Date.now()}`;
    const testBooking = await prisma.$transaction(async (tx) => {
      return await tx.booking.create({
        data: {
          bookingNumber: bkNum,
          customerId: createdCustomer.id,
          leadId: testLead.id,
          assignedUserId: adminUser.id,
          travelStartDate: new Date('2026-10-15'),
          travelEndDate: new Date('2026-10-18'),
          travellers: 2,
          totalAmount: 25000,
          discount: 2000,
          finalAmount: 23000,
          bookingStatus: 'CONFIRMED',
          createdById: adminUser.id,
          updatedById: adminUser.id,
          travellersList: {
            create: [
              {
                name: 'Test Customer',
                phone: testPhone,
                isPrimary: true,
              },
              {
                name: 'Guest Traveller',
                isPrimary: false,
              },
            ],
          },
        },
        include: { travellersList: true },
      });
    });

    assert(!!testBooking.id, 'Test G.1: Booking created in transaction', `Booking: ${testBooking.bookingNumber}`);
    assert(testBooking.travellersList.length === 2, 'Test G.2: Associated travellers created in same transaction');

    // -------------------------------------------------------------
    // TEST H: Backend Restart & Client Reconnect Simulation
    // -------------------------------------------------------------
    console.log('\n--- 9. Test H: Persistence Across Connection Restarts ---');
    // Disconnect client to simulate server restart / network disconnect
    await prisma.$disconnect();

    // Create a new fresh PrismaClient instance
    const freshPrisma = new PrismaClient();
    const reconnectedBooking = await freshPrisma.booking.findUnique({
      where: { bookingNumber: bkNum },
      include: { customer: true, travellersList: true },
    });

    assert(
      reconnectedBooking !== null && reconnectedBooking.finalAmount === 23000,
      'Test H.1: Booking survived connection disconnect and server restart simulation',
      `Booking No: ${reconnectedBooking?.bookingNumber}, Customer: ${reconnectedBooking?.customer.fullName}`
    );
    assert(
      reconnectedBooking?.travellersList.length === 2,
      'Test H.2: Relational traveller rows survived restart intact in MySQL'
    );

    // -------------------------------------------------------------
    // TEST I: Dashboard & Analytics Dynamic Calculation Check
    // -------------------------------------------------------------
    console.log('\n--- 10. Test I: Live Dynamic Analytics Calculations ---');
    const totalBookingsCount = await freshPrisma.booking.count({
      where: { isDeleted: false },
    });
    const confirmedCount = await freshPrisma.booking.count({
      where: { isDeleted: false, bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } },
    });
    const confirmedBookingsList = await freshPrisma.booking.findMany({
      where: { isDeleted: false, bookingStatus: { in: ['CONFIRMED', 'COMPLETED'] } },
      select: { finalAmount: true },
    });
    const calculatedRevenue = confirmedBookingsList.reduce((sum, b) => sum + Number(b.finalAmount || 0), 0);

    assert(totalBookingsCount >= 2, 'Test I.1: Total bookings counted dynamically from MySQL', `Total Count: ${totalBookingsCount}`);
    assert(confirmedCount >= 1, 'Test I.2: Confirmed bookings counted dynamically from MySQL', `Confirmed Count: ${confirmedCount}`);
    assert(calculatedRevenue > 0, 'Test I.3: Total revenue calculated live from database rows', `Calculated: ₹${calculatedRevenue.toLocaleString('en-IN')}`);

    // -------------------------------------------------------------
    // TEST J: Audit Trail Verification
    // -------------------------------------------------------------
    console.log('\n--- 11. Test J: Audit Logging & Traceability ---');
    await freshPrisma.auditLog.create({
      data: {
        userId: adminUser.id,
        userName: adminUser.name,
        action: 'VERIFICATION',
        entity: 'SYSTEM',
        entityId: 'MYSQL_VERIFICATION_TEST',
        details: 'Automated persistence and zero-data-loss validation test executed successfully.',
        oldValue: JSON.stringify({ status: 'PRE_CHECK' }),
        newValue: JSON.stringify({ status: 'POST_CHECK_PASSED' }),
      },
    });

    const recentAudit = await freshPrisma.auditLog.findFirst({
      where: { entityId: 'MYSQL_VERIFICATION_TEST' },
    });
    assert(!!recentAudit, 'Test J.1: Audit log entry saved with full context in MySQL');
    assert(
      recentAudit?.oldValue?.includes('PRE_CHECK') && recentAudit?.newValue?.includes('POST_CHECK_PASSED'),
      'Test J.2: Audit oldValue and newValue change tracking preserved'
    );

    // -------------------------------------------------------------
    // Cleanup Test Records (Soft-delete or delete test-specific IDs only)
    // -------------------------------------------------------------
    console.log('\n--- 12. Cleanup of Temporary Test Rows ---');
    await freshPrisma.traveller.deleteMany({ where: { bookingId: testBooking.id } });
    await freshPrisma.booking.delete({ where: { id: testBooking.id } });
    await freshPrisma.quotation.delete({ where: { id: testQuotation.id } });
    await freshPrisma.lead.delete({ where: { id: testLead.id } });
    await freshPrisma.customer.delete({ where: { id: createdCustomer.id } });
    await freshPrisma.auditLog.deleteMany({ where: { entityId: 'MYSQL_VERIFICATION_TEST' } });

    // Final check that original records were NOT touched
    const finalCustCount = await freshPrisma.customer.count();
    const finalUserCount = await freshPrisma.user.count();
    const finalPkgCount = await freshPrisma.package.count();
    assert(finalUserCount === userCount, 'Zero Data Loss: All original users preserved intact');
    assert(finalCustCount === custCount, 'Zero Data Loss: All original customers preserved intact');
    assert(finalPkgCount === pkgCount, 'Zero Data Loss: All original packages preserved intact');

    await freshPrisma.$disconnect();

    console.log('\n================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[CRITICAL TEST FAILURE]', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runTests();
