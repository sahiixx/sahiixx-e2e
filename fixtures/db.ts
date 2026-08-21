import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL } },
});

export async function createTestUser(email = 'e2e@sahiixx.dev') {
  return prisma.user.create({
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
  await prisma.user.deleteMany({ where: { email: { contains: 'e2e' } } });
}

export { prisma };
