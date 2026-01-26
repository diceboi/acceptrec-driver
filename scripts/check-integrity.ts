
import { config } from "dotenv";
import { resolve } from "path";

const result = config({ path: resolve(process.cwd(), ".env.local") });

async function checkIntegrity() {
    const { db } = await import("../lib/db");
    const { clients, clientContacts } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");

    try {
        const allClients = await db.select().from(clients);
        const allContacts = await db.select().from(clientContacts);
        
        console.log(`Clients: ${allClients.length}`);
        console.log(`Contacts: ${allContacts.length}`);
        
        for (const contact of allContacts) {
            const parent = allClients.find(c => c.id === contact.clientId);
            console.log(`Contact '${contact.name}' (id: ${contact.id}) -> Client ID: ${contact.clientId} -> Found: ${!!parent}`);
             if(parent) console.log(`   Parent Name: ${parent.companyName}`);
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

checkIntegrity();
