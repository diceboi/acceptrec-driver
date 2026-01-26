
import { config } from "dotenv";
import { resolve } from "path";

// Load env first
const result = config({ path: resolve(process.cwd(), ".env.local") });

async function checkData() {
    // Dynamic import to ensure process.env is ready
    const { db } = await import("../lib/db");
    const { clients, clientContacts } = await import("../shared/schema");

    try {
        const clientCount = await db.select().from(clients);
        const contactCount = await db.select().from(clientContacts);
        console.log(`Clients: ${clientCount.length}`);
        console.log(`Contacts: ${contactCount.length}`);
        
        if (clientCount.length > 0) {
            console.log("First client:", clientCount[0].companyName);
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

checkData();
