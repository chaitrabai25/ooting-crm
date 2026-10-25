import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setupProductionAdmin() {
  console.log('====================================================');
  console.log('  Ooting CRM — Production Admin Setup');
  console.log('====================================================');

  // Check if any users already exist
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`[SAFE] Database already has ${userCount} user(s).`);
    console.log('No changes made. Existing accounts and CRM data are preserved.');
    return;
  }

  // Ensure master company exists before creating child user (Guarantees zero FK #1452 failure)
  const masterCompanyId = 'c0000000-0000-0000-0000-000000000001';
  let masterCompany = await prisma.company.findUnique({ where: { id: masterCompanyId } });
  if (!masterCompany) {
    masterCompany = await prisma.company.create({
      data: {
        id: masterCompanyId,
        name: 'Ooting',
        slug: 'ooting',
        isOoting: true,
        status: 'ACTIVE',
        tagline: 'Journeys Beyond Ordinary',
        email: 'contact@ooting.com',
        phone: '+91 8884845595',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        primaryColor: '#1E3A8A',
        secondaryColor: '#E11D48',
        orgCode: 'OOTING-HQ',
        provisioningStatus: 'READY',
        maxStaffLimit: 999999,
        subscriptionTier: 'ENTERPRISE',
        enabledModules: JSON.stringify(['all']),
      },
    });
    console.log(`[SAFE] Master company created: ${masterCompany.name} (${masterCompany.id})`);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ooting.com').toLowerCase().trim();
  const rawPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      companyId: masterCompanyId,
      name: 'Ooting Super Admin',
      email: adminEmail,
      passwordHash,
      role: 'SUPER_ADMIN',
      phone: '+91 98765 00001',
      status: 'ACTIVE',
    },
  });

  console.log(`\nProduction Super Admin created successfully!`);
  console.log(`   Email:    ${adminUser.email}`);
  console.log(`   Role:     ${adminUser.role}`);
  console.log(`   Password: [Configured via ADMIN_PASSWORD or Default]`);
  console.log(`\nNote: Zero dummy records created. CRM is ready for real business data.`);
  console.log('====================================================\n');
}

setupProductionAdmin()
  .catch((err) => {
    console.error('Failed to setup production admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
