import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function run() {
  await db.execute(sql`UPDATE customers SET contact_type = 'both'`);
  console.log('updated');
  process.exit(0);
}
run();
