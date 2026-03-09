const { db } = require('./lib/db');
const { users } = require('./shared/schema');
const { eq } = require('drizzle-orm');

async function test() {
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length > 0) {
    console.log("Found user:", allUsers[0]);
    const id = allUsers[0].id;
    const res = await db.update(users).set({ lastName: "TestName" }).where(eq(users.id, id)).returning();
    console.log("Updated user:", res);
  } else {
    console.log("No users found");
  }
}

test().catch(console.error).then(() => process.exit(0));
