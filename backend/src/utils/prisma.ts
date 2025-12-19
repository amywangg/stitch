import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Log connection info in development
if (process.env.NODE_ENV === 'development') {
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl?.replace(/:[^:@]+@/, ':****@');
  console.log('[Prisma] Connecting to:', maskedUrl);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
