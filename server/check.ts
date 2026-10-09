import { db } from './src/db';
import * as s from './src/db/schema';
import { sql } from 'drizzle-orm';

async function check() {
  const users = await db.select().from(s.users);
  console.log('Users:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
  
  const convs = await db.select().from(s.chatConversations);
  console.log('Convs:', convs);
  
  const parts = await db.select().from(s.chatParticipants);
  console.log('Parts:', parts);
  
  const msgs = await db.select().from(s.chatMessages);
  console.log('Msgs:', msgs.length);
  process.exit(0);
}
check();
