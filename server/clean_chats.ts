import { db } from './src/db/index.js'; import * as s from './src/db/schema.js'; async function run() { await db.delete(s.chatConversations); console.log('Deleted all'); process.exit(0); } run();
