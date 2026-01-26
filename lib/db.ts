import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/shared/schema';

// Lazy initialization - only create connection when needed (at runtime)
let _db: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
    if (_db) return _db;
    
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }

    // Debug connection (mask password)
    const url = process.env.DATABASE_URL;
    try {
      const u = new URL(url);
      console.log(`Connecting to DB host: ${u.hostname} (SSL: require)`);
    } catch {
      console.log("Connecting to DB (could not parse URL for logging)");
    }

    const client = postgres(url, {
        ssl: 'require', 
        max: 1, // Reduce pool for script stability
        idle_timeout: 20,
        connect_timeout: 30, // Increase timeout
    });
    
    _db = drizzle(client, { schema });
    return _db;
};

// For backwards compatibility - but this is now lazy
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get: (target, prop) => {
    const actualDb = getDb();
    return (actualDb as any)[prop];
  }
});

