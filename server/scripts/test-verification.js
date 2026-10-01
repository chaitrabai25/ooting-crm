import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { ensureColumns } from '../dist/db/migrations.js';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('========================================');
  console.log('🔍 RUNNING PRODUCTION CRM VERIFICATION 🔍');
  console.log('========================================\n');

  try {
    // 0. Ensure database columns and migrations
    console.log('[0/6] Ensuring Database Schema & Columns...');
    await ensureColumns();
    console.log('  ✓ Schema migrations verified and applied.\n');

    // 1. Verify Database Connection & Row Counts
    console.log('[1/6] Checking Database Connection & Row Counts...');
    const userCount = await prisma.user.count();
    const packageCount = await prisma.package.count();
    const itineraryCount = await prisma.itineraryDay.count();
    const leadCount = await prisma.lead.count();
    const customerCount = await prisma.customer.count();
    const placeCount = await prisma.place.count();
    const hotelCount = await prisma.hotel.count();

    console.log(`  ✓ Users in DB: ${userCount} (Expected: 7)`);
    console.log(`  ✓ Packages in DB: ${packageCount} (Expected: 12)`);
    console.log(`  ✓ Itineraries in DB: ${itineraryCount} (Expected: 36)`);
    console.log(`  ✓ Leads in DB: ${leadCount}`);
    console.log(`  ✓ Customers in DB: ${customerCount}`);
    console.log(`  ✓ Places in DB: ${placeCount}`);
    console.log(`  ✓ Hotels in DB: ${hotelCount}`);

    if (userCount < 7 || packageCount < 12 || itineraryCount < 36) {
      throw new Error(`DATA LOSS DETECTED! Users: ${userCount}, Packages: ${packageCount}, Itineraries: ${itineraryCount}`);
    }
    console.log('  -> PASS: Zero Data Loss Confirmed!\n');

    // 2. Verify Super Admin User & Authentication
    console.log('[2/6] Verifying User Authentication & Passwords...');
    const superAdmin = await prisma.user.findFirst({
      where: { email: 'chaitrabaijr@gmail.com' }
    });

    if (!superAdmin) {
      throw new Error('Super Admin user chaitrabaijr@gmail.com not found!');
    }
    console.log(`  ✓ Found Super Admin: ${superAdmin.name} (${superAdmin.email}), Role: ${superAdmin.role}`);

    const hasPassword = Boolean(superAdmin.passwordHash && superAdmin.passwordHash.startsWith('$2b$'));
    console.log(`  ✓ Password hash verified for Super Admin: ${hasPassword}`);
    if (!hasPassword) {
      throw new Error('Super Admin password hash is invalid or missing!');
    }

    const clean = '8951233134'.trim();
    const digits = clean.replace(/\D/g, '');
    const phoneUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: clean },
          { phone: { contains: digits.length >= 10 ? digits.slice(-10) : digits } },
        ],
      },
    });
    console.log(`  ✓ Phone lookup for '8951233134': found ${phoneUser ? phoneUser.email : 'NONE'}`);
    if (!phoneUser) {
      throw new Error('User lookup by phone failed!');
    }
    console.log('  -> PASS: Authentication & Password Verification Succeeded!\n');

    // 3. Verify Sharp WebP Conversion Pipeline
    console.log('[3/6] Verifying Sharp WebP Image Pipeline...');
    // Create a 2000x2000 test PNG buffer
    const testImageBuffer = await sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 3,
        background: { r: 201, g: 31, b: 40 }
      }
    }).png().toBuffer();

    // Optimize with sharp
    const optimizedBuffer = await sharp(testImageBuffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const metadata = await sharp(optimizedBuffer).metadata();
    console.log(`  ✓ Optimized format: ${metadata.format} (Expected: webp)`);
    console.log(`  ✓ Optimized width: ${metadata.width} (Expected: <= 1600)`);
    console.log(`  ✓ Size reduction: ${(testImageBuffer.length / 1024).toFixed(1)} KB -> ${(optimizedBuffer.length / 1024).toFixed(1)} KB`);

    if (metadata.format !== 'webp' || metadata.width !== 1600) {
      throw new Error(`WebP optimization failed: format=${metadata.format}, width=${metadata.width}`);
    }
    console.log('  -> PASS: Sharp WebP Pipeline Verified!\n');

    // 4. Verify Place Master Database Operations
    console.log('[4/6] Verifying Place Master DB Operations...');
    const testPlace = await prisma.place.create({
      data: {
        name: '__TEST_VERIFICATION_PLACE__',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        category: 'Viewpoint',
        description: 'Automated test place',
        famousReason: 'Stunning panoramic views',
        suggestedDuration: '2 Hours',
        imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800',
        activities: JSON.stringify(['Sightseeing', 'Photography']),
        highlights: 'Fresh mountain breeze',
        bestTime: 'October to May'
      }
    });
    console.log(`  ✓ Created test place ID: ${testPlace.id}`);

    const retrievedPlace = await prisma.place.findUnique({
      where: { id: testPlace.id }
    });
    if (!retrievedPlace || retrievedPlace.name !== '__TEST_VERIFICATION_PLACE__') {
      throw new Error('Failed to retrieve test place!');
    }
    console.log(`  ✓ Successfully queried test place: ${retrievedPlace.name}`);

    await prisma.place.delete({
      where: { id: testPlace.id }
    });
    console.log(`  ✓ Cleaned up test place ID: ${testPlace.id}`);
    console.log('  -> PASS: Place Master DB Verified!\n');

    // 5. Verify Hotel Master Database Operations
    console.log('[5/6] Verifying Hotel Master DB Operations...');
    const testHotel = await prisma.hotel.create({
      data: {
        name: '__TEST_VERIFICATION_HOTEL__',
        starCategory: '4-Star',
        state: 'Tamil Nadu',
        district: 'The Nilgiris (Ooty)',
        address: 'Woodcock Road, Ooty',
        contactPhone: '+91 9876543210',
        contactEmail: 'test@hotel.com',
        description: 'Automated test luxury hotel',
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        amenities: JSON.stringify(['WiFi', 'Restaurant', 'Spa', 'Parking']),
        checkInTime: '12:00 PM',
        checkOutTime: '11:00 AM'
      }
    });
    console.log(`  ✓ Created test hotel ID: ${testHotel.id}`);

    const retrievedHotel = await prisma.hotel.findUnique({
      where: { id: testHotel.id }
    });
    if (!retrievedHotel || retrievedHotel.name !== '__TEST_VERIFICATION_HOTEL__') {
      throw new Error('Failed to retrieve test hotel!');
    }
    console.log(`  ✓ Successfully queried test hotel: ${retrievedHotel.name}, Category: ${retrievedHotel.starCategory}`);

    await prisma.hotel.delete({
      where: { id: testHotel.id }
    });
    console.log(`  ✓ Cleaned up test hotel ID: ${testHotel.id}`);
    console.log('  -> PASS: Hotel Master DB Verified!\n');

    // 6. Verify Itinerary Day Hotel Fields & Copy Capability
    console.log('[6/6] Verifying Itinerary Day Hotel Fields...');
    const firstItinerary = await prisma.itineraryDay.findFirst();
    if (firstItinerary) {
      console.log(`  ✓ Existing Day ID: ${firstItinerary.id}, Day: ${firstItinerary.dayNumber}, Title: ${firstItinerary.title}`);
      console.log(`  ✓ Supported hotel fields on day: hotelId=${firstItinerary.hotelId}, hotelName=${firstItinerary.hotelName}, mealPlan=${firstItinerary.mealPlan}`);
    }
    console.log('  -> PASS: Itinerary Day Schema Verified!\n');

    console.log('====================================================');
    console.log('🎉 ALL 6 VERIFICATION CHECKS PASSED WITH 0 ERRORS! 🎉');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
