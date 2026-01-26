import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local file
config({ path: '.env.local' });

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
