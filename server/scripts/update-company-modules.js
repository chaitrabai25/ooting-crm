import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ALL_MODULES = [
  'dashboard',
  'calendar',
  'leads',
  'followups',
  'quotations',
  'bookings',
  'cabs',
  'guides',
  'customers',
  'passengers',
  'packages',
  'places',
  'hotels',
  'agents',
  'suppliers',
  'payments',
  'expenses',
  'import-export',
  'reports',
  'analytics',
  'whatsapp',
  'users',
  'settings',
  'audit-logs',
  'companies'
];

async function main() {
  const allJson = JSON.stringify(ALL_MODULES);

  const updated = await prisma.company.updateMany({
    data: {
      enabledModules: allJson,
    },
  });

  console.log(`Updated ${updated.count} companies with all enabled modules.`);

  const companies = await prisma.company.findMany();
  for (const c of companies) {
    console.log(`Company: ${c.name} (${c.id}) -> enabledModules: ${c.enabledModules}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
