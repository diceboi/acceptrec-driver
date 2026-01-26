
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { eq, sql } from "drizzle-orm";

// Load .env.local manually BEFORE other imports
const result = config({ path: resolve(process.cwd(), ".env.local") });
if (result.error) {
  console.error("Error loading .env.local", result.error);
}

async function migrateUsers() {
  // Dynamic imports to ensure env vars are loaded first
  const { db } = await import("../lib/db");
  const { users, timesheets, approvalBatches, rosters, rosterEntries, systemAuditLog, approvalAuditLog } = await import("../shared/schema");

  console.log("Starting user migration...");
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE credentials in .env.local");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} users to migrate.`);
  
  // Default password for all migrated users
  const DEFAULT_PASSWORD = "Acceptrec2026!";

  for (const user of allUsers) {
    console.log(`Processing user: ${user.email}`);

    try {
        let authUser;
        let created = false;

        // 1. Check if user already exists in Auth (by email) or create
        // listUsers is paginated but we can try createUser and handle "already exists" error,
        // OR filtering.
        // Better: create and catch error.
        
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                role: user.role,
                first_name: user.firstName,
                last_name: user.lastName,
                phone: user.phone,
            }
        });

        if (error) {
            // Check if user already exists
            // "User already registered" returns status 400 or 422 usually.
            console.log(`User creation attempt for ${user.email} returned: ${error.message}`);
            
            // If exists, define authUser by fetching
            // Admin API listUsers filtering by email
            const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) throw listError;
            
            const existing = listData.users.find(u => u.email === user.email);
            if (existing) {
                console.log(`User ${user.email} already exists in Supabase. Linking...`);
                authUser = existing;
                // Update metadata for existing user?
                 await supabase.auth.admin.updateUserById(existing.id, {
                    user_metadata: {
                        full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                        role: user.role,
                        first_name: user.firstName,
                        last_name: user.lastName,
                        phone: user.phone,
                    }
                });
            } else {
                console.error("Could not create nor find user!");
                continue;
            }
        } else {
            authUser = data.user;
            created = true;
            console.log(`Created new Supabase user: ${authUser.id}`);
        }

        if (!authUser) continue;

        const newId = authUser.id;
        const oldId = user.id;

        if (newId === oldId) {
            console.log("IDs match, skipping DB update.");
            continue;
        }

        console.log(`Migrating ID from ${oldId} to ${newId}...`);

        // Update DB relationships
        // Using raw SQL might be easier for FK updates if Drizzle complains,
        // but let's try Drizzle first.

        // Note: We cannot simply update the primary key of 'users' if FKs exist.
        // We must update the FKs referencing oldId to point to newId.
        // BUT, newId must exist in 'users' table first? 
        // No, 'users' table is the parent. We can't insert newId user if we don't handle it carefully.
        
        // Strategy:
        // 1. Rename old user's email to avoid unique constraint violation
        // 2. Insert new user record with newId and original email
        // 3. Update all child tables to point to newId
        // 4. Delete old user record
        
        const tempEmail = `migrated_${oldId}_${user.email}`;
        
        try {
            // 1. Rename old email
            await db.update(users)
                .set({ email: tempEmail })
                .where(eq(users.id, oldId));
                
            // 2. Insert new user
            // Check if newId already in users (maybe partially migrated?)
            const [existingDbUser] = await db.select().from(users).where(eq(users.id, newId));
            if (!existingDbUser) {
                await db.insert(users).values({
                    ...user,
                    id: newId,
                    email: user.email, // Use original email
                });
            } else {
                console.log("User record with New ID already exists in DB. Merging/Updating...");
            }
        } catch (e) {
            console.error("Failed to swap user records:", e);
            // Revert email change if possible?
             await db.update(users)
                .set({ email: user.email })
                .where(eq(users.id, oldId));
            continue;
        }

        // 3. Update child tables
        // timesheets
        await db.update(timesheets)
            .set({ userId: newId })
            .where(eq(timesheets.userId, oldId));
            
        // approvalBatches (createdBy)
        await db.update(approvalBatches)
            .set({ createdBy: newId })
            .where(eq(approvalBatches.createdBy, oldId));
        
        // rosters (uploadedBy)
        await db.update(rosters)
            .set({ uploadedBy: newId })
            .where(eq(rosters.uploadedBy, oldId));
            
        // rosterEntries (userId)
        await db.update(rosterEntries)
            .set({ userId: newId })
            .where(eq(rosterEntries.userId, oldId));

        // audit logs?
        // systemAuditLog (userId)
        await db.update(systemAuditLog)
             .set({ userId: newId })
             .where(eq(systemAuditLog.userId, oldId));
             
        // 4. Delete old user
        await db.delete(users).where(eq(users.id, oldId));
        
        console.log(`Successfully migrated ${user.email} to ID ${newId}`);

    } catch (err: any) {
        console.error(`Error migrating user ${user.email}:`, err.message);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrateUsers();
