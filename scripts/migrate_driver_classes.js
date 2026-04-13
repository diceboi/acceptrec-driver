// Run migration for driver_classes tables
const { config } = require('dotenv');
config({ path: '.env.local' });

const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function main() {
  try {
    // Create driver_classes table
    await sql`
      CREATE TABLE IF NOT EXISTS driver_classes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        deleted_at TIMESTAMP,
        deleted_by VARCHAR
      )
    `;
    console.log('✅ driver_classes table created');

    // Create driver_class_rates table
    await sql`
      CREATE TABLE IF NOT EXISTS driver_class_rates (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_class_id VARCHAR NOT NULL REFERENCES driver_classes(id) ON DELETE CASCADE,
        client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        hourly_rate REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    console.log('✅ driver_class_rates table created');

    // Create unique index
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_class_client 
      ON driver_class_rates(driver_class_id, client_id)
    `;
    console.log('✅ unique_class_client index created');

    console.log('\n🎉 Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

main();
