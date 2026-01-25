import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/shared/schema';

// Create a connection using postgres.js (compatible with Supabase)
export const getDb = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }

    const client = postgres(process.env.DATABASE_URL);
    return drizzle(client, { schema });
};

// Export a singleton instance
export const db = getDb();
