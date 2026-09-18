import { PrismaClient } from '@prisma/client';

// ==============================================================================
// Ooting CRM - Prisma Database Client Singleton
// Purpose: Prevents connection pool exhaustion in serverless environments (Vercel)
// and ensures connection reuse across local & production backend lifecycles.
// ==============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

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

