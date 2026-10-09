import { Hono } from 'hono';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { authMiddleware } from '../../shared/auth';

const notifications = new Hono<{ Variables: { user: any } }>();
notifications.use('*', authMiddleware);

// GET /api/notifications
notifications.get('/', async (c) => {
  const user = c.get('user') as any;
  const list = await db.select().from(s.notifications)
    .where(eq(s.notifications.userId, user.userId))
    .orderBy(desc(s.notifications.createdAt))
    .limit(30);
  return c.json(list);
});

// GET /api/notifications/unread-count
notifications.get('/unread-count', async (c) => {
  const user = c.get('user') as any;
  const [result] = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(s.notifications)
    .where(and(eq(s.notifications.userId, user.userId), eq(s.notifications.isRead, false)));
  return c.json({ count: result?.count || 0 });
});

// PATCH /api/notifications/:id/read
notifications.patch('/:id/read', async (c) => {
  const id = c.req.param('id');
  await db.update(s.notifications).set({ isRead: true }).where(eq(s.notifications.id, id));
  return c.json({ message: 'Marked as read' });
});

// PATCH /api/notifications/read-all
notifications.patch('/read-all', async (c) => {
  const user = c.get('user') as any;
  await db.update(s.notifications).set({ isRead: true })
    .where(and(eq(s.notifications.userId, user.userId), eq(s.notifications.isRead, false)));
  return c.json({ message: 'All marked as read' });
});

export default notifications;
