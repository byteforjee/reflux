const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Connecting to PostgreSQL...");
  const client = await pool.connect();
  try {
    console.log("Executing SQL migration...");
    await client.query(`
      ALTER TABLE "InvoiceSubmission" ADD COLUMN IF NOT EXISTS "fundedAmount" DECIMAL DEFAULT 0;
      ALTER TABLE "InvoiceSubmission" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
      ALTER TABLE "InvoiceSubmission" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
      ALTER TABLE "InvoiceSubmission" ADD COLUMN IF NOT EXISTS "resubmissionCount" INTEGER DEFAULT 0;
      ALTER TABLE "InvoiceSubmission" ADD COLUMN IF NOT EXISTS "parentSubmissionId" TEXT;

      CREATE TABLE IF NOT EXISTS "WalletTrustProfile" (
        "walletAddress" TEXT NOT NULL PRIMARY KEY,
        "cancellationCount" INTEGER NOT NULL DEFAULT 0,
        "isFlaggedForReview" BOOLEAN NOT NULL DEFAULT false,
        "trustTier" TEXT NOT NULL DEFAULT 'TIER_1',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("SQL Migration successful!");
  } catch (e) {
    console.error("SQL Migration failed:", e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
