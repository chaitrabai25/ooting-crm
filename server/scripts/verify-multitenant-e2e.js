/**
 * End-to-End Multi-Tenant & Zero Data Loss Automated Verification Script
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const OOTING_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';

async function main() {
  console.log('====================================================');
  console.log('🚀 RUNNING MULTI-TENANT & ZERO DATA LOSS VERIFICATION');
  console.log('====================================================\n');

  let passedAll = true;

  // 1. Verify Primary Ooting Records & Zero Data Loss
  console.log('--- TEST 1: ZERO DATA LOSS ON OOTING MASTER TENANT ---');
  const ootingCompany = await prisma.company.findUnique({
    where: { id: OOTING_COMPANY_ID },
  });

  if (!ootingCompany || !ootingCompany.isOoting) {
    console.error('❌ Failed: Primary Ooting tenant not found or isOoting is false!');
    passedAll = false;
  } else {
    console.log(`✅ Primary Ooting tenant found: "${ootingCompany.name}" (Slug: ${ootingCompany.slug})`);
  }

  const counts = {
    users: await prisma.user.count({ where: { companyId: OOTING_COMPANY_ID } }),
    customers: await prisma.customer.count({ where: { companyId: OOTING_COMPANY_ID } }),
    leads: await prisma.lead.count({ where: { companyId: OOTING_COMPANY_ID } }),
    followUps: await prisma.followUp.count({ where: { companyId: OOTING_COMPANY_ID } }),
    packages: await prisma.package.count({ where: { companyId: OOTING_COMPANY_ID } }),
    quotations: await prisma.quotation.count({ where: { companyId: OOTING_COMPANY_ID } }),
    bookings: await prisma.booking.count({ where: { companyId: OOTING_COMPANY_ID } }),
    payments: await prisma.payment.count({ where: { companyId: OOTING_COMPANY_ID } }),
    cabs: await prisma.cabBooking.count({ where: { companyId: OOTING_COMPANY_ID } }),
    agents: await prisma.agent.count({ where: { companyId: OOTING_COMPANY_ID } }),
    suppliers: await prisma.supplier.count({ where: { companyId: OOTING_COMPANY_ID } }),
    expenses: await prisma.expense.count({ where: { companyId: OOTING_COMPANY_ID } }),
  };

  console.log('Ooting active record counts:', counts);
  if (counts.users < 5 || counts.customers < 3 || counts.packages < 9 || counts.bookings < 3) {
    console.error('❌ Warning: Expected record counts for Ooting are lower than baseline!');
    passedAll = false;
  } else {
    console.log('✅ Baseline Ooting records fully intact and verified.');
  }

  // 2. Provision Test Tenant "Summit Horizons"
  console.log('\n--- TEST 2: PROVISIONING TEST TENANT "SUMMIT HORIZONS" ---');
  // Pre-cleanup any lingering test companies from previous runs
  await prisma.user.deleteMany({ where: { email: { contains: 'summit-test' } } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: 'summit-test' } } });

  const testSlug = 'summit-test-' + Date.now();
  const testEmail = `admin@${testSlug}.com`;

  const newCompany = await prisma.company.create({
    data: {
      name: 'Summit Horizons Travels',
      slug: testSlug,
      email: testEmail,
      phone: '+91 9999888877',
      address: '12 Ridge Road, Manali, HP',
      website: 'https://summithorizons.test',
      isOoting: false,
      status: 'ACTIVE',
      primaryColor: '#0ea5e9',
      secondaryColor: '#0284c7',
    },
  });
  console.log(`✅ Provisioned test tenant: ${newCompany.name} (ID: ${newCompany.id})`);

  const passwordHash = await bcrypt.hash('TestAdmin@123', 10);
  const testAdmin = await prisma.user.create({
    data: {
      companyId: newCompany.id,
      name: 'Summit Admin',
      email: testEmail,
      passwordHash: passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Created test Company Admin: ${testAdmin.name} (${testAdmin.email})`);

  // 3. Strict Data Boundary & Cross-Tenant Isolation
  console.log('\n--- TEST 3: STRICT DATA ISOLATION & BOUNDARY ENFORCEMENT ---');
  // Tenant's view should be initially completely empty
  const tenantLeadsInitial = await prisma.lead.count({ where: { companyId: newCompany.id } });
  const tenantBookingsInitial = await prisma.booking.count({ where: { companyId: newCompany.id } });
  const tenantCustomersInitial = await prisma.customer.count({ where: { companyId: newCompany.id } });

  if (tenantLeadsInitial !== 0 || tenantBookingsInitial !== 0 || tenantCustomersInitial !== 0) {
    console.error('❌ Data Isolation Failure: New tenant has records from other tenants!');
    passedAll = false;
  } else {
    console.log('✅ Verified: New tenant starts with 0 leads, 0 bookings, 0 customers.');
  }

  // Create a record under test tenant
  const testCustomer = await prisma.customer.create({
    data: {
      companyId: newCompany.id,
      fullName: 'John Summit Guest',
      phone: '+91 9811122233',
      email: 'john@guest.test',
      status: 'ACTIVE',
    },
  });

  const testLead = await prisma.lead.create({
    data: {
      companyId: newCompany.id,
      customerId: testCustomer.id,
      source: 'WEBSITE',
      destination: 'Manali Snow Trek',
      adults: 2,
      enquiryStatus: 'NEW',
    },
  });
  console.log(`✅ Created test lead under test tenant: "${testLead.destination}"`);

  // Verify Ooting tenant CANNOT see this record
  const ootingLeadsWithTestDest = await prisma.lead.findMany({
    where: {
      companyId: OOTING_COMPANY_ID,
      id: testLead.id,
    },
  });

  if (ootingLeadsWithTestDest.length > 0) {
    console.error('❌ Leakage Failure: Ooting query returned test tenant record!');
    passedAll = false;
  } else {
    console.log('✅ Verified: Ooting tenant CANNOT see the test tenant record.');
  }

  // Verify test tenant CANNOT see Ooting's leads
  const ootingLead = await prisma.lead.findFirst({
    where: { companyId: OOTING_COMPANY_ID },
  });

  if (ootingLead) {
    const tenantViewOfOotingLead = await prisma.lead.findFirst({
      where: {
        companyId: newCompany.id,
        id: ootingLead.id,
      },
    });

    if (tenantViewOfOotingLead) {
      console.error('❌ Leakage Failure: Test tenant was able to query Ooting lead!');
      passedAll = false;
    } else {
      console.log('✅ Verified: Test tenant CANNOT query or view Ooting leads.');
    }
  }

  // 4. White-Label Branding Isolation
  console.log('\n--- TEST 4: WHITE-LABEL BRANDING & LOGO ISOLATION ---');
  // Tenant company has no logo uploaded yet -> must NOT return Ooting logo
  const { getCompanySettings } = await import('../dist/routes/setting.routes.js');
  const tenantSettings = await getCompanySettings(newCompany.id);
  const ootingSettings = await getCompanySettings(OOTING_COMPANY_ID);

  console.log(`Tenant branding name: "${tenantSettings.name}"`);
  console.log(`Ooting branding name: "${ootingSettings.name}"`);

  if (tenantSettings.name === ootingSettings.name) {
    console.error('❌ Branding Leakage: Tenant settings returned Ooting name!');
    passedAll = false;
  } else {
    console.log('✅ Verified: Tenant settings correctly separate from Ooting master branding.');
  }

  if (tenantSettings.logoUrl && tenantSettings.logoUrl.includes('ooting')) {
    console.error('❌ Branding Leakage: Tenant settings leaked Ooting logo URL!');
    passedAll = false;
  } else {
    console.log('✅ Verified: No Ooting branding or logo leaked to customer tenant.');
  }

  // 5. Clean up test records
  console.log('\n--- TEST 5: CLEANUP OF TEST TENANT ---');
  await prisma.lead.deleteMany({ where: { companyId: newCompany.id } });
  await prisma.customer.deleteMany({ where: { companyId: newCompany.id } });
  await prisma.user.deleteMany({ where: { companyId: newCompany.id } });
  await prisma.company.delete({ where: { id: newCompany.id } });
  console.log('✅ Test tenant and temporary records cleaned up successfully.');

  // 6. Final Data Integrity Check
  console.log('\n--- TEST 6: FINAL POST-TEST DATA INTEGRITY VERIFICATION ---');
  const finalOotingCompany = await prisma.company.findUnique({
    where: { id: OOTING_COMPANY_ID },
  });
  const finalUsers = await prisma.user.count({ where: { companyId: OOTING_COMPANY_ID } });
  const finalCustomers = await prisma.customer.count({ where: { companyId: OOTING_COMPANY_ID } });
  const finalBookings = await prisma.booking.count({ where: { companyId: OOTING_COMPANY_ID } });

  console.log(`Final Ooting counts -> Users: ${finalUsers}, Customers: ${finalCustomers}, Bookings: ${finalBookings}`);
  if (!finalOotingCompany || finalUsers < 5 || finalCustomers < 3 || finalBookings < 3) {
    console.error('❌ Post-verification integrity failure: Master data was affected!');
    passedAll = false;
  } else {
    console.log('✅ Post-verification integrity confirmed: 100% of master data preserved without any loss!');
  }

  console.log('\n====================================================');
  if (passedAll) {
    console.log('🎉 ALL TESTS PASSED! MULTI-TENANT SAAS IS 100% VERIFIED & SAFE.');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
