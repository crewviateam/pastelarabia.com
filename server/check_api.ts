import { api } from './src/lib/api'; // this will fail as it is frontend code

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cosmetics-demo-jwt-secret-2026';

const token = jwt.sign({
  userId: '617f6e69-2e21-4bfb-8180-f1cda481855c',
  email: 'mustu@example.com',
  name: 'mustu',
  role: 'manager'
}, JWT_SECRET);

console.log('Token:', token);

async function test() {
  const res = await fetch('http://localhost:3000/api/chat/conversations', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await res.json();
  console.log('Conversations:', data);
}

test();
