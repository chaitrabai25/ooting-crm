import { PrismaClient } from '@prisma/client';

// ==============================================================================
// Ooting CRM - Prisma Database Client Singleton
// Purpose: Prevents connection pool exhaustion in serverless environments (Vercel)
// and ensures connection reuse across local & production backend lifecycles.
// ==============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const CLOUD_TIDB_URL = 'mysql://2AJqT6QgbdvDayf.root:7xCl3FL0jIFUVu5D@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict&connect_timeout=20&pool_timeout=20';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = CLOUD_TIDB_URL;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || CLOUD_TIDB_URL,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Reuse Prisma instance across both local development and Vercel serverless invocations
globalForPrisma.prisma = prisma;


export async function connectDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$connect();
      console.log('Successfully connected to the database.');
      return;
    } catch (error) {
      retries--;
      console.error(`Database connection attempt failed (${retries} retries remaining):`, error);
      if (retries === 0) {
        if (process.env.NODE_ENV !== 'production') {
          process.exit(1);
        }
      } else {
        await new Promise((res) => setTimeout(res, 2500));
      }
    }
  }
}

