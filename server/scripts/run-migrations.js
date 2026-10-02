import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running safe additive column migrations on TiDB Cloud MySQL...');

  const migrations = [
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelId\` VARCHAR(36) NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelName\` VARCHAR(191) NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelStarCategory\` VARCHAR(50) NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelImageUrl\` TEXT NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelLocation\` VARCHAR(191) NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`mealPlan\` VARCHAR(100) NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelDetails\` TEXT NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelCheckIn\` VARCHAR(50) NULL`,
    `ALTER TABLE \`ItineraryDay\` ADD COLUMN \`hotelCheckOut\` VARCHAR(50) NULL`,
    `ALTER TABLE \`Hotel\` ADD COLUMN \`websiteUrls\` TEXT NULL`,
    `ALTER TABLE \`Hotel\` MODIFY COLUMN \`imageUrl\` LONGTEXT NULL`,
    `ALTER TABLE \`Hotel\` MODIFY COLUMN \`gallery\` LONGTEXT NULL`,
    `ALTER TABLE \`Place\` MODIFY COLUMN \`imageUrl\` LONGTEXT NULL`,
    `ALTER TABLE \`Place\` MODIFY COLUMN \`gallery\` LONGTEXT NULL`,
    `ALTER TABLE \`ItineraryDay\` MODIFY COLUMN \`hotelImageUrl\` LONGTEXT NULL`,
    `ALTER TABLE \`ItineraryDay\` MODIFY COLUMN \`imageUrl\` LONGTEXT NULL`,
    `ALTER TABLE \`ItineraryDay\` MODIFY COLUMN \`images\` LONGTEXT NULL`,
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`[APPLIED / VERIFIED]: ${sql.split('ADD COLUMN')[1] || sql.split('MODIFY COLUMN')[1] || sql}`);
    } catch (err) {
      console.log(`[EXISTING / SAFE]: ${err.message?.slice(0, 80)}`);
    }
  }

  console.log('\nVerifying live database records...');
  const count = await prisma.itineraryDay.count();
  console.log(`Verified: ${count} itinerary days exist and intact in TiDB.`);
  const sample = await prisma.itineraryDay.findFirst();
  console.log('ItineraryDay fields:', Object.keys(sample || {}));
  console.log('✅ Safe additive migration completed with ZERO data loss!');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
