import { getDb } from './lib/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const db = getDb();
  
  try {
    console.log('Adding new rate columns...');
    await db.execute(sql`ALTER TABLE driver_class_rates ADD COLUMN IF NOT EXISTS saturday_rate real NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE driver_class_rates ADD COLUMN IF NOT EXISTS sunday_rate real NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE driver_class_rates ADD COLUMN IF NOT EXISTS holiday_rate real NOT NULL DEFAULT 0;`);
    
    console.log('Adding new holiday columns...');
    await db.execute(sql`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS monday_is_holiday boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS tuesday_is_holiday boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS wednesday_is_holiday boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS thursday_is_holiday boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS friday_is_holiday boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS saturday_is_holiday boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS sunday_is_holiday boolean NOT NULL DEFAULT false;`);
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
