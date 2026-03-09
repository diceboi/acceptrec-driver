const { db } = require('./lib/db');
const { users } = require('./shared/schema');

async function test() {
  const allUsers = await db.select().from(users).limit(1);
  console.log(allUsers);
  process.exit(0);
}

test();
