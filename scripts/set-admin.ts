
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { eq, like } from "drizzle-orm";

// Load .env.local manually BEFORE other imports
const result = config({ path: resolve(process.cwd(), ".env.local") });
if (result.error) {
  console.error("Error loading .env.local", result.error);
}

const targetEmail = "szasz.szabolcs1995@gmail.com";
const newRole = "super_admin";

async function setAdmin() {
  // Dynamic imports
  const { db } = await import("../lib/db");
  const { users } = await import("../shared/schema");

  console.log(`Setting ${targetEmail} to ${newRole}...`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE credentials");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Find user in DB
  const [user] = await db.select().from(users).where(like(users.email, targetEmail));
  
  if (!user) {
    console.error("User not found in local DB!");
    // Try searching purely by email string if first attempt fails?
    // Using like just in case
    process.exit(1);
  }
  
  console.log(`Found DB user: ${user.id} (${user.email}) - Current role: ${user.role}`);

  // 2. Update DB
  await db.update(users).set({ role: newRole }).where(eq(users.id, user.id));
  console.log("Updated local DB role.");

  // 3. Update Supabase
  const { data: { users: authUsers }, error: searchError } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.find(u => u.email === targetEmail);

  if (authUser) {
      console.log(`Found Supabase user: ${authUser.id}`);
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: {
              ...authUser.user_metadata,
              role: newRole
          }
      });
      if (error) {
          console.error("Error updating Supabase:", error);
      } else {
          console.log("Updated Supabase metadata role.");
      }
  } else {
      console.error("User not found in Supabase Auth!");
  }

  process.exit(0);
}

setAdmin();
