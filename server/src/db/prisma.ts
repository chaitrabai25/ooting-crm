import { PrismaClient } from '@prisma/client';

// ==============================================================================
// Ooting CRM - Prisma Database Client Singleton
// Purpose: Prevents connection pool exhaustion in serverless environments (Vercel)
// and ensures connection reuse across local & production backend lifecycles.
// ==============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const CLOUD_TIDB_URL = 'mysql://2AJqT6QgbdvDayf.root:7xCl3FL0jIFUVu5D@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict';
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
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database.');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

