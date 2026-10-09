import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { generateToken, authMiddleware, JWTPayload } from '../../shared/auth';

const auth = new Hono<{ Variables: { user: any } }>();

// POST /api/auth/login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      permissions: user.permissions,
    },
  });
});

// POST /api/auth/logout
auth.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user') as JWTPayload;
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    avatar: users.avatar,
    phone: users.phone,
    permissions: users.permissions,
  }).from(users).where(eq(users.id, payload.userId)).limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

// POST /api/auth/demo-login — quick role-based demo login
auth.post('/demo-login', async (c) => {
  const { role } = await c.req.json();
  
  const [user] = await db.select().from(users).where(eq(users.role, role)).limit(1);
  if (!user) {
    return c.json({ error: 'No demo user found for this role' }, 404);
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      permissions: user.permissions,
    },
  });
});

export default auth;
