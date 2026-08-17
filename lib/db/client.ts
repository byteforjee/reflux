import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * Singleton Prisma client for Next.js (Prisma v7 adapter pattern).
 *
 * In development, Next.js hot-reload creates multiple module instances,
 * which would exhaust database connections without this guard.
 * The global variable persists the single client across reloads.
 *
 * Usage: import { db } from "@/lib/db/client"
 *
 * Architecture note (architecture.md, Storage Model):
 * The database is a staging and cache layer only. Balances, scores,
 * and repayment status are always read from chain — never trusted
 * from this client alone.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const pool = new pg.Pool({ connectionString: "" });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
