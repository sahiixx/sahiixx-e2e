import { execSync } from 'child_process';

export default async function globalSetup() {
  // Contract and service-boundary lanes are intentionally database-free. Do
  // not import Prisma or run migrations unless a DB-backed target explicitly
  // opts in; this keeps the fast lane runnable from a clean clone.
  if (process.env.RUN_DB_SETUP !== '1') {
    console.log('[e2e] RUN_DB_SETUP is not 1 — skipping DB setup');
    return;
  }
  const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!url) {
    console.warn('[e2e] DATABASE_URL_TEST not set — skipping DB setup');
    return;
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
  const { PrismaClient } = await import('@prisma/client') as unknown as {
    PrismaClient: new (options: { datasources: { db: { url: string } } }) => {
      $executeRawUnsafe: (query: string) => Promise<unknown>;
      $disconnect: () => Promise<void>;
    };
  };
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
