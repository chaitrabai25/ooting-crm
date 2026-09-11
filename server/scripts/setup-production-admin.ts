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

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ooting.com').toLowerCase().trim();
  const rawPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
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
