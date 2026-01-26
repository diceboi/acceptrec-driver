
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { eq } from "drizzle-orm";

// Load .env.local manually
const result = config({ path: resolve(process.cwd(), ".env.local") });
if (result.error) {
  console.error("Error loading .env.local", result.error);
}

const targetEmail = "szasz.szabolcs1995@gmail.com";
const targetRole = "super_admin";

async function syncAndPromote() {
    // Dynamic imports
    const { db } = await import("../lib/db");
    const { users } = await import("../shared/schema");

    console.log(`Syncing and promoting ${targetEmail}...`);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing SUPABASE credentials");
        process.exit(1);
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Get User from Supabase
    const { data: { users: authUsers }, error: searchError } = await supabase.auth.admin.listUsers();
    if (searchError) {
        console.error("Failed to list users from Supabase:", searchError);
        process.exit(1);
    }

    const authUser = authUsers.find(u => u.email === targetEmail);
    if (!authUser) {
        console.error(`User ${targetEmail} not found in Supabase Auth! Cannot sync.`);
        process.exit(1);
    }

    console.log(`Found Supabase User: ${authUser.id}`);

    // 2. Upsert into Local DB
    // Check if exists
    const [existing] = await db.select().from(users).where(eq(users.id, authUser.id));
    if (!existing) {
        console.log("User missing from local DB. Inserting...");
        await db.insert(users).values({
            id: authUser.id,
            email: targetEmail,
            role: targetRole,
            firstName: "Szabolcs", // Placeholder, will be updated by user profile
            lastName: "Szasz",
        });
        console.log("User inserted into local DB.");
    } else {
        console.log("User exists in local DB. Updating role...");
        await db.update(users)
            .set({ role: targetRole })
            .where(eq(users.id, authUser.id));
        console.log("Local DB updated.");
    }

    // 3. Update Supabase Metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
            ...authUser.user_metadata,
            role: targetRole
        }
    });

    if (updateError) {
        console.error("Failed to update Supabase metadata:", updateError);
    } else {
        console.log("Supabase metadata updated successfully.");
    }

    process.exit(0);
}

syncAndPromote();
