import { hash } from 'bcryptjs';

type E2EPrisma = {
  user: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    deleteMany: (args: { where: { email: { contains: string } } }) => Promise<unknown>;
  };
};

let prisma: E2EPrisma;

async function getPrisma(): Promise<E2EPrisma> {
  if (prisma) return prisma;
  const { PrismaClient } = (await import('@prisma/client')) as unknown as {
    PrismaClient: new (options: { datasources: { db: { url: string | undefined } } }) => E2EPrisma;
  };
  prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL } },
  });
  return prisma;
}

export async function createTestUser(email = 'e2e@sahiixx.dev') {
  const db = await getPrisma();
  return db.user.create({
    data: {
      email,
      name: 'E2E Test User',
      hashedPassword: await hash('testpass123', 12),
      emailVerified: new Date(),
    },
  });
}

export async function cleanupTestData() {
  // ponytail: deleteMany with contains 'e2e' — single predicate, no transaction boilerplate unless you hit FK races
  const db = await getPrisma();
  await db.user.deleteMany({ where: { email: { contains: 'e2e' } } });
}

export { getPrisma };
