const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    await sql`ALTER TABLE "timesheets" ADD COLUMN IF NOT EXISTS "client_po_number" text;`;
    console.log("Migration successful: Added client_po_number to timesheets table.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

main();
