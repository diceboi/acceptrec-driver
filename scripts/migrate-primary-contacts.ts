
import { config } from "dotenv";
import { resolve } from "path";
import { eq } from "drizzle-orm";

// Load env first
const result = config({ path: resolve(process.cwd(), ".env.local") });

async function migratePrimaryContacts() {
    // Dynamic import
    const { db } = await import("../lib/db");
    const { clients, clientContacts } = await import("../shared/schema");

    console.log("Starting Primary Contact Migration...");

    try {
        const allClients = await db.select().from(clients);
        console.log(`Found ${allClients.length} clients.`);

        for (const client of allClients) {
            console.log(`Checking client: ${client.companyName} (${client.contactName})`);
            
            // Check if any contacts exist for this client
            const existingContacts = await db
                .select()
                .from(clientContacts)
                .where(eq(clientContacts.clientId, client.id));

            if (existingContacts.length > 0) {
                console.log(`  - Has ${existingContacts.length} contacts. Skipping.`);
                continue;
            }

            console.log(`  - No contacts found. Creating primary contact from client details...`);
            
            // Validate email
            if (!client.email || !client.email.includes('@')) {
                console.log(`  - Invalid email '${client.email}', skipping creation.`);
                continue;
            }

            // Create contact
            await db.insert(clientContacts).values({
                clientId: client.id,
                name: client.contactName,
                email: client.email,
                phone: client.phone,
                isPrimary: 1,
            });
            console.log(`  - Created contact: ${client.contactName}`);
        }
        
    } catch (e) {
        console.error("Error during migration:", e);
    }
    
    console.log("Migration finished.");
    process.exit(0);
}

migratePrimaryContacts();
