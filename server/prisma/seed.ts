import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Ooting CRM Database Seeding (Development Mode) ---');

  // 1. Create Super Admin User
  const adminEmail = 'admin@ooting.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let adminUser;
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@12345', 10);
    adminUser = await prisma.user.create({
      data: {
        name: 'Ooting Super Admin',
        email: adminEmail,
        passwordHash,
        role: 'SUPER_ADMIN',
        phone: '+91 98765 00001',
        status: 'ACTIVE',
      },
    });
    console.log(`Created Super Admin: ${adminUser.email} (Password: Admin@12345)`);
  } else {
    adminUser = existingAdmin;
    console.log(`Super Admin already exists: ${adminUser.email}`);
  }

  // 2. Create Sample Sales Staff
  const salesEmail = 'sales@ooting.com';
  const existingSales = await prisma.user.findUnique({ where: { email: salesEmail } });
  let salesUser;
  if (!existingSales) {
    const passwordHash = await bcrypt.hash('Sales@12345', 10);
    salesUser = await prisma.user.create({
      data: {
        name: 'Rohan Sharma',
        email: salesEmail,
        passwordHash,
        role: 'SALES',
        phone: '+91 98765 00002',
        status: 'ACTIVE',
      },
    });
    console.log(`Created Sales Consultant: ${salesUser.email}`);
  } else {
    salesUser = existingSales;
  }

  // 3. Create Sample Accountant Staff
  const accountsEmail = 'accounts@ooting.com';
  const existingAccounts = await prisma.user.findUnique({ where: { email: accountsEmail } });
  if (!existingAccounts) {
    const passwordHash = await bcrypt.hash('Accounts@12345', 10);
    await prisma.user.create({
      data: {
        name: 'Priya Nair',
        email: accountsEmail,
        passwordHash,
        role: 'ACCOUNTANT',
        phone: '+91 98765 00003',
        status: 'ACTIVE',
      },
    });
    console.log(`Created Accountant: ${accountsEmail}`);
  }

  // 4. Create Company Settings
  const defaultSettings = [
    { key: 'company_name', value: 'Ooting' },
    { key: 'company_tagline', value: 'Journeys Beyond Ordinary' },
    { key: 'company_email', value: 'contact@ooting.com' },
    { key: 'company_phone', value: '+91 98765 43210' },
    { key: 'company_address', value: 'Ooting Holidays Private Limited, Bangalore, Karnataka, India' },
    { key: 'company_gstin', value: '29AABCO1234F1Z5' },
    { key: 'company_logo_url', value: '/assets/ooting-logo.jpg' },
  ];

  for (const s of defaultSettings) {
    await prisma.companySetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log('Initialized Company Settings');

  // 5. Create Authentic Sample Travel Packages with Itineraries (only if none exist)
  const packageCount = await prisma.package.count();
  if (packageCount === 0) {
    console.log('Seeding authentic Ooting holiday packages...');

    // Package 1: Mysore & Coorg
    await prisma.package.create({
      data: {
        packageName: 'Royal Mysore & Coorg Serenity',
        destination: 'Mysore & Coorg',
        duration: '4 Days / 3 Nights',
        description: 'Immerse in the heritage of the Mysore Wodeyars followed by misty coffee plantations and waterfalls in Coorg.',
        price: 24500,
        packageType: 'HOLIDAY',
        inclusions: '3 Nights 4-Star Accommodation, Breakfast & Dinner, AC Sedan with chauffeur, Sightseeing transfers, Entry tickets to Mysore Palace',
        exclusions: 'Airfare, Personal expenses, Meals not mentioned in inclusions, Camera fees',
        status: 'ACTIVE',
        itineraries: {
          create: [
            {
              dayNumber: 1,
              title: 'Arrival in Bangalore to Mysore Heritage',
              description: 'Pick up from Bangalore Airport/Station, scenic drive to Mysore. Check-in and visit the illuminated Mysore Palace and Brindavan Gardens musical fountain.',
              places: 'Mysore Palace, Brindavan Gardens',
              activities: 'Palace architectural tour, evening garden stroll',
              startTime: '09:00 AM',
              endTime: '08:00 PM',
            },
            {
              dayNumber: 2,
              title: 'Chamundi Hills to Coorg Coffee Highlands',
              description: 'Visit Chamundi Hill temple, St. Philomena Church, then transfer through winding ghats into Madikeri, Coorg.',
              places: 'Chamundi Temple, St. Philomena Church, Madikeri Fort',
              activities: 'Temple darshan, scenic hill drive, sunset at Raja Seat',
              startTime: '08:30 AM',
              endTime: '07:30 PM',
            },
            {
              dayNumber: 3,
              title: 'Abbey Falls & Dubare Elephant Camp',
              description: 'Morning interaction with gentle giants at Dubare Camp along Cauvery river, followed by the roar of Abbey Falls and spice plantation walk.',
              places: 'Dubare Elephant Camp, Abbey Falls, Coffee Plantation',
              activities: 'Elephant bathing experience, coffee plantation tasting walk',
              startTime: '08:00 AM',
              endTime: '06:00 PM',
            },
            {
              dayNumber: 4,
              title: 'Namdroling Golden Temple & Return',
              description: 'Visit the stunning Tibetan Monastery at Bylakuppe, shop for fragrant local spices, homemade chocolates and filter coffee, and drive back to Bangalore.',
              places: 'Golden Temple (Bylakuppe), Cauvery Nisargadhama',
              activities: 'Monastery prayer walk, local handicraft shopping',
              startTime: '09:00 AM',
              endTime: '06:00 PM',
            },
          ],
        },
      },
    });

    // Package 2: Ooty Hills
    await prisma.package.create({
      data: {
        packageName: 'Enchanting Ooty & Nilgiris Hills',
        destination: 'Ooty',
        duration: '3 Days / 2 Nights',
        description: 'Explore the Queen of Hill Stations: botanical gardens, emerald lakes, tea factories, and panoramic viewpoints.',
        price: 18500,
        packageType: 'HOLIDAY',
        inclusions: '2 Nights Resort Stay, Daily Breakfast, Nilgiri Mountain Toy Train tickets, Private Cab for transfers',
        exclusions: 'Lunch/Dinner, Boating charges at Ooty Lake, Personal shopping',
        status: 'ACTIVE',
        itineraries: {
          create: [
            {
              dayNumber: 1,
              title: 'Arrival in Ooty & Botanical Wonder',
              description: 'Check in at mountain resort. Afternoon stroll in the 55-acre Government Botanical Gardens and tranquil boating on Ooty Lake.',
              places: 'Botanical Garden, Ooty Lake, Rose Garden',
              activities: 'Row boating, photography, botanical tour',
              startTime: '10:00 AM',
              endTime: '07:00 PM',
            },
            {
              dayNumber: 2,
              title: 'Coonoor Sightseeing & Nilgiri Toy Train',
              description: 'Ride the UNESCO World Heritage Toy Train to Coonoor. Visit Sim\'s Park, Dolphin\'s Nose viewpoint, and a lush Nilgiri tea factory with fresh tea tasting.',
              places: 'Sim\'s Park, Dolphin\'s Nose, Tea Factory',
              activities: 'Heritage toy train ride, tea estate walk and tea tasting',
              startTime: '09:00 AM',
              endTime: '06:00 PM',
            },
            {
              dayNumber: 3,
              title: 'Doddabetta Peak & Departure',
              description: 'Ascend to the highest peak in the Nilgiris at Doddabetta for 360-degree valley views, followed by shopping for homemade chocolates before return transfer.',
              places: 'Doddabetta Peak, Pine Forest',
              activities: 'Telescope house viewing, pine forest walk',
              startTime: '09:00 AM',
              endTime: '04:00 PM',
            },
          ],
        },
      },
    });

    // Package 3: Andaman Islands
    await prisma.package.create({
      data: {
        packageName: 'Andaman Island Paradise & Radhanagar Waters',
        destination: 'Andaman',
        duration: '5 Days / 4 Nights',
        description: 'Turquoise waters, historic Cellular Jail, and Asia’s best beach at Radhanagar in Havelock Island.',
        price: 42000,
        packageType: 'HOLIDAY',
        inclusions: '4 Nights Beachfront Resort, Daily Breakfast, Makruzz / Nautika High-Speed Catamaran Ferries, Cellular Jail Light & Sound show',
        exclusions: 'Flight tickets, Scuba diving / Snorkeling add-ons, Personal water sports',
        status: 'ACTIVE',
      },
    });

    // Package 4: Ayodhya & Kashi
    await prisma.package.create({
      data: {
        packageName: 'Spiritual Kashi & Holy Ayodhya Darshan',
        destination: 'Ayodhya & Kashi',
        duration: '4 Days / 3 Nights',
        description: 'A deeply moving spiritual journey through sacred Ghats of Varanasi, Ganga Aarti, and the divine Ram Janmabhoomi in Ayodhya.',
        price: 28000,
        packageType: 'HOLIDAY',
        inclusions: '3 Nights Hotel Stay, Breakfast, VIP Darshan facilitation assistance, Private AC Coach, Sunrise Boat Ride at Varanasi Ghats',
        exclusions: 'Prasad offerings, Train/Airfare to Varanasi, Personal expenses',
        status: 'ACTIVE',
      },
    });

    console.log('Successfully seeded 4 authentic Ooting travel packages.');
  }

  console.log('--- Database seeding completed successfully! ---');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
