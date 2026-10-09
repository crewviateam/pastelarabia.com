import { Hono } from 'hono';
import { eq, sql, desc, asc, and } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { authMiddleware, roleGuard } from '../../shared/auth';

const branches = new Hono();

// All routes require auth
branches.use('*', authMiddleware);

// GET /api/branches
branches.get('/', async (c) => {
  const list = await db.select({
    id: s.branches.id,
    name: s.branches.name,
    code: s.branches.code,
    address: s.branches.address,
    city: s.branches.city,
    country: s.branches.country,
    phone: s.branches.phone,
    email: s.branches.email,
    managerId: s.branches.managerId,
    status: s.branches.status,
    isDefault: s.branches.isDefault,
    invoicePrefix: s.branches.invoicePrefix,
    createdAt: s.branches.createdAt,
  }).from(s.branches)
    .where(eq(s.branches.status, 'active'))
    .orderBy(asc(s.branches.name));

  return c.json(list);
});

// GET /api/branches/all (includes inactive)
branches.get('/all', roleGuard('owner', 'manager'), async (c) => {
  const list = await db.select().from(s.branches).orderBy(asc(s.branches.name));
  return c.json(list);
});

// GET /api/branches/:id
branches.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [branch] = await db.select().from(s.branches)
    .where(eq(s.branches.id, id)).limit(1);
  if (!branch) return c.json({ error: 'Branch not found' }, 404);

  // Get stats
  const [salesStats] = await db.select({
    totalSales: sql<string>`COALESCE(SUM(${s.invoices.totalAmount}), 0)`,
    invoiceCount: sql<number>`COUNT(*)`,
  }).from(s.invoices)
    .where(eq(s.invoices.branchId, id));

  const [staffCount] = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(s.users)
    .where(sql`${s.users.branchIds}::jsonb ? ${id}`);

  return c.json({
    ...branch,
    stats: {
      totalSales: parseFloat(salesStats?.totalSales || '0'),
      invoiceCount: salesStats?.invoiceCount || 0,
      staffCount: staffCount?.count || 0,
    }
  });
});

// POST /api/branches
branches.post('/', roleGuard('owner', 'manager'), async (c) => {
  const body = await c.req.json();

  if (!body.name || !body.code) {
    return c.json({ error: 'Branch name and code are required' }, 400);
  }

  // Check unique code
  const [existing] = await db.select({ id: s.branches.id })
    .from(s.branches).where(eq(s.branches.code, body.code)).limit(1);
  if (existing) {
    return c.json({ error: 'Branch code already exists' }, 400);
  }

  const [branch] = await db.insert(s.branches).values({
    name: body.name,
    code: body.code,
    address: body.address || null,
    city: body.city || null,
    country: body.country || 'UAE',
    phone: body.phone || null,
    email: body.email || null,
    managerId: body.managerId || null,
    isDefault: body.isDefault || false,
    invoicePrefix: body.invoicePrefix || null,
  }).returning();

  // Log activity
  const user = c.get('user') as any;
  await db.insert(s.activityLog).values({
    userId: user.userId,
    userName: user.name,
    action: 'Created branch',
    module: 'branches',
    entityId: branch.id,
    details: `Created branch ${branch.name} (${branch.code})`,
  });

  return c.json(branch, 201);
});

// PUT /api/branches/:id
branches.put('/:id', roleGuard('owner', 'manager'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const [updated] = await db.update(s.branches).set({
    name: body.name,
    code: body.code,
    address: body.address,
    city: body.city,
    country: body.country,
    phone: body.phone,
    email: body.email,
    managerId: body.managerId,
    invoicePrefix: body.invoicePrefix,
    updatedAt: new Date(),
  }).where(eq(s.branches.id, id)).returning();

  if (!updated) return c.json({ error: 'Branch not found' }, 404);
  return c.json(updated);
});

// PATCH /api/branches/:id/status
branches.patch('/:id/status', roleGuard('owner', 'manager'), async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();

  const [updated] = await db.update(s.branches).set({
    status,
    updatedAt: new Date(),
  }).where(eq(s.branches.id, id)).returning();

  if (!updated) return c.json({ error: 'Branch not found' }, 404);

  const user = c.get('user') as any;
  await db.insert(s.activityLog).values({
    userId: user.userId,
    userName: user.name,
    action: status === 'active' ? 'Activated branch' : 'Deactivated branch',
    module: 'branches',
    entityId: id,
    details: `Branch ${updated.name} ${status === 'active' ? 'activated' : 'deactivated'}`,
  });

  return c.json(updated);
});

export default branches;
