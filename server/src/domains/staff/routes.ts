import { Hono } from 'hono';
import { eq, sql, desc, asc, and, ilike, or } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { authMiddleware, roleGuard } from '../../shared/auth';
import bcrypt from 'bcryptjs';

const staffRoutes = new Hono();
staffRoutes.use('*', authMiddleware);

// GET /api/staff
staffRoutes.get('/', async (c) => {
  const { search, status, page = '1', limit = '20' } = c.req.query();
  const conditions: any[] = [];

  if (search) {
    conditions.push(or(
      ilike(s.staff.name, `%${search}%`),
      ilike(s.staff.email, `%${search}%`),
    ));
  }
  if (status) conditions.push(eq(s.staff.status, status as any));

  const list = await db.select({
    id: s.staff.id,
    userId: s.staff.userId,
    name: s.staff.name,
    role: s.staff.role,
    phone: s.staff.phone,
    email: s.staff.email,
    status: s.staff.status,
    joinedDate: s.staff.joinedDate,
    salary: s.staff.salary,
    commissionRate: s.staff.commissionRate,
    salesTarget: s.staff.salesTarget,
    avatar: s.staff.avatar,
    permissions: s.users.permissions,
    branchIds: s.users.branchIds,
  }).from(s.staff)
    .leftJoin(s.users, eq(s.staff.userId, s.users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(s.staff.name))
    .limit(parseInt(limit));

  return c.json(list);
});

// GET /api/staff/:id
staffRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [member] = await db.select().from(s.staff)
    .where(eq(s.staff.id, id)).limit(1);
  if (!member) return c.json({ error: 'Staff member not found' }, 404);

  // Get linked user permissions
  let userPermissions = null;
  let userBranches: string[] = [];
  if (member.userId) {
    const [user] = await db.select({
      permissions: s.users.permissions,
      branchIds: s.users.branchIds,
      role: s.users.role,
    }).from(s.users).where(eq(s.users.id, member.userId)).limit(1);
    if (user) {
      userPermissions = user.permissions;
      userBranches = (user.branchIds as string[]) || [];
    }
  }

  // Get sales performance
  let salesPerformance = null;
  if (member.userId) {
    const [perf] = await db.select({
      totalSales: sql<string>`COALESCE(SUM(${s.invoices.totalAmount}), 0)`,
      orderCount: sql<number>`COUNT(DISTINCT ${s.salesOrders.id})`,
    }).from(s.salesOrders)
      .leftJoin(s.invoices, eq(s.invoices.orderId, s.salesOrders.id))
      .where(eq(s.salesOrders.createdById, member.userId));
    salesPerformance = perf;
  }

  // Get tasks
  const tasks = await db.select().from(s.tasks)
    .where(eq(s.tasks.assignedToId, id))
    .orderBy(desc(s.tasks.createdAt))
    .limit(10);

  return c.json({
    ...member,
    permissions: userPermissions,
    branchIds: userBranches,
    salesPerformance,
    tasks,
  });
});

// POST /api/staff — create staff + user account
staffRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const jwtUser = c.get('user') as any;

  // Check permissions
  const [currentUser] = await db.select({ role: s.users.role, permissions: s.users.permissions })
    .from(s.users).where(eq(s.users.id, jwtUser.userId)).limit(1);
  if (!currentUser || (currentUser.role !== 'owner' && !(currentUser.permissions as any)?.staff?.edit)) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  if (!body.name || !body.email) {
    return c.json({ error: 'Name and email are required' }, 400);
  }

  // Check email unique
  const [existingUser] = await db.select({ id: s.users.id })
    .from(s.users).where(eq(s.users.email, body.email)).limit(1);
  if (existingUser) {
    return c.json({ error: 'A user with this email already exists' }, 400);
  }

  // Create user account
  const passwordHash = await bcrypt.hash(body.password || 'password123', 10);
  const [newUser] = await db.insert(s.users).values({
    email: body.email,
    password: passwordHash,
    name: body.name,
    role: body.role || 'sales_executive',
    phone: body.phone || null,
    permissions: body.permissions || null,
    branchIds: body.branchIds || null,
  }).returning();

  // Create staff record
  const [newStaff] = await db.insert(s.staff).values({
    userId: newUser.id,
    name: body.name,
    role: body.role || 'sales_executive',
    phone: body.phone || null,
    email: body.email,
    joinedDate: body.joinedDate || new Date().toISOString().split('T')[0],
    salary: body.salary ? String(body.salary) : null,
    commissionRate: body.commissionRate ? String(body.commissionRate) : null,
    salesTarget: body.salesTarget ? String(body.salesTarget) : null,
  }).returning();

  await db.insert(s.activityLog).values({
    userId: jwtUser?.userId, userName: jwtUser?.name || 'System',
    action: 'Created staff member', module: 'staff',
    entityId: newStaff.id,
    details: `Created ${body.name} (${body.role})`,
  });

  return c.json({ staff: newStaff, user: { id: newUser.id, email: newUser.email } }, 201);
});

// PUT /api/staff/:id — update staff + permissions
staffRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const jwtUser = c.get('user') as any;

  // Check permissions
  const [currentUser] = await db.select({ role: s.users.role, permissions: s.users.permissions })
    .from(s.users).where(eq(s.users.id, jwtUser.userId)).limit(1);
  if (!currentUser || (currentUser.role !== 'owner' && !(currentUser.permissions as any)?.staff?.edit)) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  const [updated] = await db.update(s.staff).set({
    name: body.name,
    role: body.role,
    phone: body.phone,
    email: body.email,
    salary: body.salary === undefined ? undefined : (body.salary === null ? null : String(body.salary)),
    commissionRate: body.commissionRate === undefined ? undefined : (body.commissionRate === null ? null : String(body.commissionRate)),
    salesTarget: body.salesTarget === undefined ? undefined : (body.salesTarget === null ? null : String(body.salesTarget)),
    status: body.status,
    updatedAt: new Date(),
  }).where(eq(s.staff.id, id)).returning();

  if (!updated) return c.json({ error: 'Staff not found' }, 404);

  // Update user permissions if userId exists
  if (updated.userId && (body.permissions !== undefined || body.branchIds !== undefined)) {
    await db.update(s.users).set({
      role: body.role || undefined,
      permissions: body.permissions,
      branchIds: body.branchIds,
      updatedAt: new Date(),
    }).where(eq(s.users.id, updated.userId));
  }

  return c.json(updated);
});

// GET /api/staff/permissions/template
staffRoutes.get('/permissions/template', async (c) => {
  return c.json({
    modules: [
      { key: 'ai', label: 'AI' },
      { key: 'chat', label: 'Chat' },
      { key: 'sales', label: 'Sales' },
      { key: 'customer', label: 'Customer' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'purchase', label: 'Purchase' },
      { key: 'accounts', label: 'Accounts' },
      { key: 'payments', label: 'Payments' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'analytics', label: 'Analytics' },
      { key: 'staff', label: 'Staff' }
    ],
    rights: [
      { key: 'read', label: 'Read' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ],
    specials: [
      { key: 'show_pricing', label: 'View Pricing' },
      { key: 'show_contact_details', label: 'View Contact Details' }
    ]
  });
});

export default staffRoutes;
