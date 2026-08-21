import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!url) {
    console.warn('[e2e] DATABASE_URL_TEST not set — skipping DB setup');
    return;
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    // ponytail: TRUNCATE with CASCADE — one statement, no per-table logic
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User", "Session", "Account" CASCADE');
  } catch {
    // tables may not exist on first run
  } finally {
    await prisma.$disconnect();
  }
}
