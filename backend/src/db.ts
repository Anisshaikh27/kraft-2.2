import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * Wraps any Prisma call with retry logic.
 * Useful for the first request after Supabase wakes from sleep.
 * Usage: await withRetry(() => prisma.project.findMany(...))
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isConnectionError =
        error?.code === 'P1001' ||
        error?.code === 'P1002' ||
        error?.message?.includes("Can't reach database");

      if (isConnectionError && attempt < retries) {
        console.warn(`DB connection failed (attempt ${attempt}/${retries}), retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}