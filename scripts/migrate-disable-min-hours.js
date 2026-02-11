require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL);

async function migrate() {
  console.log('Migrating database: Adding disable_min_hours columns...');
  try {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
        const colName = `${day}_disable_min_hours`;
        console.log(`Processing column: ${colName}`);
        
        // Check if column exists strictly to avoid errors if IF NOT EXISTS is not supported or behaves weirdly in some pg versions via driver
        // But standard PG supports IF NOT EXISTS. Using simplest approach first.
        
        await sql.unsafe(`ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS "${colName}" boolean NOT NULL DEFAULT false`);
    }
    
    console.log('Migration successful!');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
