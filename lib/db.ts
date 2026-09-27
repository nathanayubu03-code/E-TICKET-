import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// Un seul client par processus (le rechargement à chaud de Next recrée les modules).
const globale = globalThis as unknown as { prisma?: PrismaClient };

function creer(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globale.prisma ?? creer();
if (process.env.NODE_ENV !== 'production') globale.prisma = db;

export type { PrismaClient };
export * from '@/generated/prisma/client';
