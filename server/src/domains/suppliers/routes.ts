import { Hono } from 'hono';
import { eq, sql, desc, asc, ilike, and, or } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';

const suppliers = new Hono<{ Variables: { user: any } }>();

// GET /api/suppliers
suppliers.get('/', async (c) => {
  const { search, status, page = '1', limit = '20' } = c.req.query();
  const conditions: any[] = [];

  if (search) {
    conditions.push(or(
      ilike(s.suppliers.name, `%${search}%`),
      ilike(s.suppliers.phone, `%${search}%`),
      ilike(s.suppliers.email, `%${search}%`)
    ));
  }
  if (status === 'active') conditions.push(eq(s.suppliers.isActive, true));
  if (status === 'inactive') conditions.push(eq(s.suppliers.isActive, false));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const list = await db.select().from(s.suppliers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(s.suppliers.name))
    .limit(parseInt(limit))
    .offset(offset);

  const [total] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(s.suppliers)
    .where(conditions.length ? and(...conditions) : undefined);

  return c.json({
    data: list,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total?.count || 0,
    }
  });
});

// GET /api/suppliers/stats
suppliers.get('/stats', async (c) => {
  const [total] = await db.select({ count: sql<number>`COUNT(*)` }).from(s.suppliers);
  const [active] = await db.select({ count: sql<number>`COUNT(*)` }).from(s.suppliers).where(eq(s.suppliers.isActive, true));
  const [inactive] = await db.select({ count: sql<number>`COUNT(*)` }).from(s.suppliers).where(eq(s.suppliers.isActive, false));
  const [outstanding] = await db.select({ total: sql<number>`SUM(${s.suppliers.outstandingPayable})` }).from(s.suppliers);

  return c.json({
    total: total?.count || 0,
    active: active?.count || 0,
    inactive: inactive?.count || 0,
    totalOutstanding: outstanding?.total || 0,
  });
});

// GET /api/suppliers/:id
suppliers.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [supplier] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, id));
  if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
  return c.json(supplier);
});

// POST /api/suppliers
suppliers.post('/', async (c) => {
  const body = await c.req.json();
  const [supplier] = await db.insert(s.suppliers).values({
    name: body.name,
    contactPerson: body.contactPerson,
    email: body.email,
    phone: body.phone,
    address: body.address,
    trn: body.trn,
    notes: body.notes,
  }).returning();
  return c.json(supplier, 201);
});

// PATCH /api/suppliers/:id
suppliers.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const [supplier] = await db.update(s.suppliers)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(s.suppliers.id, id))
    .returning();
  if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
  return c.json(supplier);
});

// DELETE /api/suppliers/:id
suppliers.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const [supplier] = await db.update(s.suppliers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(s.suppliers.id, id))
    .returning();
  if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
  return c.json({ success: true });
});

export default suppliers;
