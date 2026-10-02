import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
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

async function main() {
  console.log('\n======================================================');
  console.log('       OOTING CRM — LIVE MYSQL DATABASE VIEWER');
  console.log('======================================================');
  console.log(`Connected to: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    const [
      users,
      packages,
      itineraries,
      hotels,
      places,
      leads,
      customers,
      bookings,
      payments,
      settings,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true, role: true } }),
      prisma.package.findMany({ select: { id: true, packageName: true, destination: true, duration: true, price: true } }),
      prisma.itineraryDay.findMany({ select: { id: true, dayNumber: true, title: true, hotelName: true } }),
      prisma.hotel.findMany({ select: { id: true, name: true, starCategory: true, state: true, district: true } }),
      prisma.place.findMany({ select: { id: true, name: true, state: true, district: true } }),
      prisma.lead.findMany({ select: { id: true, destination: true, enquiryStatus: true, budget: true } }),
      prisma.customer.findMany({ select: { id: true, fullName: true, phone: true, email: true } }),
      prisma.booking.findMany({ select: { id: true, bookingNumber: true, bookingStatus: true, totalAmount: true } }),
      prisma.payment.findMany({ select: { id: true, amount: true, paymentStatus: true, paymentMethod: true } }),
      prisma.companySetting.findMany(),
    ]);

    console.log('📊 DATABASE RECORD SUMMARY:');
    console.log(`  • Users:         ${users.length}`);
    console.log(`  • Packages:      ${packages.length}`);
    console.log(`  • Itineraries:   ${itineraries.length}`);
    console.log(`  • Hotels:        ${hotels.length}`);
    console.log(`  • Places:        ${places.length}`);
    console.log(`  • Leads:         ${leads.length}`);
    console.log(`  • Customers:     ${customers.length}`);
    console.log(`  • Bookings:      ${bookings.length}`);
    console.log(`  • Payments:      ${payments.length}`);
    console.log(`  • Settings:      ${settings.length}\n`);

    console.log('👥 USERS IN MYSQL:');
    users.forEach((u, i) => {
      console.log(`  [${i + 1}] ${u.name} | ${u.email} | Phone: ${u.phone || 'N/A'} | Role: ${u.role}`);
    });

    console.log('\n📦 PACKAGES IN MYSQL:');
    packages.forEach((p, i) => {
      console.log(`  [${i + 1}] ${p.packageName} | ${p.destination} | ${p.duration} | ₹${p.price}`);
    });

    console.log('\n🏨 HOTELS IN MYSQL:');
    hotels.forEach((h, i) => {
      console.log(`  [${i + 1}] ${h.name} (${h.starCategory}) | ${h.district}, ${h.state}`);
    });

    console.log('\n======================================================');
    console.log('✅ MySQL Database is active, connected, and healthy!');
    console.log('💡 Tip: Run "npm run prisma:studio" to open visual database in your browser.');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Failed to query MySQL database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
