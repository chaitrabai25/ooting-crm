import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const targetEmails = ['chaitrabaijr@gmail.com', 'chaitrabai25@gmail.com'];
  const newName = 'Chaitra Bai J R';
  const newPhone = '+918951233134';
  const plainPassword = 'Chaitra@25';

  console.log('--- Updating Super Admin Users in TiDB Cloud ---');
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  for (const targetEmail of targetEmails) {
    const existing = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (existing) {
      const user = await prisma.user.update({
        where: { email: targetEmail },
        data: {
          name: newName,
          phone: newPhone,
          passwordHash: passwordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      });
      console.log(`✅ Updated existing user: ${user.email} (${user.name})`);
    } else {
      const user = await prisma.user.create({
        data: {
          name: newName,
          email: targetEmail,
          phone: newPhone,
          passwordHash: passwordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log(`✅ Created new user: ${user.email} (${user.name})`);
    }
  }

  // Verification test
  for (const targetEmail of targetEmails) {
    const u = await prisma.user.findUnique({ where: { email: targetEmail } });
    const isMatch = await bcrypt.compare(plainPassword, u.passwordHash);
    console.log(`Verification for ${targetEmail}: password match = ${isMatch}, role = ${u.role}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
