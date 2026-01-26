
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local manually
config({ path: resolve(process.cwd(), ".env.local") });

async function listUsers() {
  const { db } = await import("../lib/db");
  const { users } = await import("../shared/schema");

  const allUsers = await db.select().from(users);
  console.log("Registered Users:");
  allUsers.forEach(u => console.log(`- ${u.email} (${u.firstName} ${u.lastName}) ID: ${u.id}`));
  
  process.exit(0);
}

listUsers();
