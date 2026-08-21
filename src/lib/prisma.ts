import { PrismaClient } from '@prisma/client';

// Singleton pattern — avoids re-creating the client on every request.
// On Cloudflare Workers, the client MUST be created once and reused.
let prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (!prisma) {
    // @ts-ignore — runtime check
    const envUrl = typeof process.env.DATABASE_URL === 'string'
      ? process.env.DATABASE_URL
      : 'file:/home/z/my-project/db/custom.db';
    prisma = new PrismaClient({ datasources: { db: { url: envUrl } } });
  }
  return prisma;
}

export default getPrisma();
