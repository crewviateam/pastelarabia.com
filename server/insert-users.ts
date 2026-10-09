import { db } from './src/db';
import * as s from './src/db/schema';
import * as bcrypt from 'bcryptjs';

async function run() {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  await db.insert(s.users).values([
    {
      email: 'sarah.m@pastelarabia.com',
      password: passwordHash,
      name: 'Sarah (Sales Manager)',
      role: 'manager',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      isActive: true
    },
    {
      email: 'ali.k@pastelarabia.com',
      password: passwordHash,
      name: 'Ali (Storekeeper)',
      role: 'storekeeper',
      avatar: 'https://i.pravatar.cc/150?u=ali',
      isActive: true
    },
    {
      email: 'fatima.h@pastelarabia.com',
      password: passwordHash,
      name: 'Fatima (Accountant)',
      role: 'accountant',
      avatar: 'https://i.pravatar.cc/150?u=fatima',
      isActive: true
    }
  ]);
  
  console.log('Users inserted successfully');
}
run();
