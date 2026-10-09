import { Hono } from 'hono';
import { eq, sql, desc, asc, ilike, and, or } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';

const customers = new Hono<{ Variables: { user: any } }>();

// GET /api/customers
customers.get('/', async (c) => {
  const { search, type, contactType, status, page = '1', limit = '20' } = c.req.query();
  const conditions: any[] = [];

  if (search) {
    conditions.push(or(
      ilike(s.customers.name, `%${search}%`),
      ilike(s.customers.phone, `%${search}%`),
      ilike(s.customers.email, `%${search}%`)
    ));
  }
  if (type) conditions.push(eq(s.customers.type, type as any));
  if (contactType) conditions.push(eq(s.customers.contactType, contactType as any));
  if (status === 'active') conditions.push(eq(s.customers.isActive, true));
  if (status === 'inactive') conditions.push(eq(s.customers.isActive, false));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const list = await db.select().from(s.customers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(s.customers.name))
    .limit(parseInt(limit))
    .offset(offset);

  const [total] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(s.customers)
    .where(conditions.length ? and(...conditions) : undefined);

  return c.json({
    data: list,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total?.count || 0,
    },
  });
});

// GET /api/customers/stats
customers.get('/stats', async (c) => {
  const [stats] = await db.select({
    total: sql<number>`COUNT(*)`,
    salons: sql<number>`COUNT(*) FILTER (WHERE ${s.customers.type} = 'salon')`,
    retailers: sql<number>`COUNT(*) FILTER (WHERE ${s.customers.type} = 'retailer')`,
    distributors: sql<number>`COUNT(*) FILTER (WHERE ${s.customers.type} = 'distributor')`,
    totalOutstanding: sql<string>`COALESCE(SUM(${s.customers.outstandingBalance}), 0)`,
  }).from(s.customers).where(eq(s.customers.isActive, true));

  return c.json(stats);
});

// GET /api/customers/:id
customers.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [customer] = await db.select().from(s.customers)
    .where(eq(s.customers.id, id)).limit(1);
  if (!customer) return c.json({ error: 'Customer not found' }, 404);
  return c.json(customer);
});

// GET /api/customers/:id/orders
customers.get('/:id/orders', async (c) => {
  const id = c.req.param('id');
  const orders = await db.select().from(s.salesOrders)
    .where(eq(s.salesOrders.customerId, id))
    .orderBy(desc(s.salesOrders.createdAt));
  return c.json(orders);
});

// GET /api/customers/:id/invoices
customers.get('/:id/invoices', async (c) => {
  const id = c.req.param('id');
  const invoices = await db.select().from(s.invoices)
    .where(eq(s.invoices.customerId, id))
    .orderBy(desc(s.invoices.createdAt));
  return c.json(invoices);
});

// GET /api/customers/:id/payments
customers.get('/:id/payments', async (c) => {
  const id = c.req.param('id');
  const paymentsList = await db.select().from(s.payments)
    .where(eq(s.payments.customerId, id))
    .orderBy(desc(s.payments.createdAt));
  return c.json(paymentsList);
});

// POST /api/customers
customers.post('/', async (c) => {
  const body = await c.req.json();
  const [customer] = await db.insert(s.customers).values({
    name: body.name,
    type: body.type || 'retailer',
    email: body.email || null,
    phone: body.phone || null,
    address: body.address || null,
    trn: body.trn || null,
    creditLimit: String(body.creditLimit || 0),
    notes: body.notes || null,
  }).returning();
  return c.json(customer, 201);
});

// PUT /api/customers/:id
customers.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [updated] = await db.update(s.customers).set({
    name: body.name,
    type: body.type,
    email: body.email,
    phone: body.phone,
    address: body.address,
    trn: body.trn,
    creditLimit: body.creditLimit !== undefined ? String(body.creditLimit) : undefined,
    notes: body.notes,
    updatedAt: new Date(),
  }).where(eq(s.customers.id, id)).returning();
  return c.json(updated);
});

// DELETE /api/customers/:id
customers.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await db.update(s.customers).set({ isActive: false, updatedAt: new Date() })
    .where(eq(s.customers.id, id));
  return c.json({ message: 'Customer deactivated' });
});

export default customers;
