import { Hono } from 'hono';
import { eq, sql, desc, asc, and } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';

const sales = new Hono<{ Variables: { user: any } }>();

// GET /api/sales/orders
sales.get('/orders', async (c) => {
  const { status, customerId, page = '1', limit = '20' } = c.req.query();
  const conditions: any[] = [];

  if (status) conditions.push(eq(s.salesOrders.status, status as any));
  if (customerId) conditions.push(eq(s.salesOrders.customerId, customerId));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const list = await db.select({
    id: s.salesOrders.id,
    orderNumber: s.salesOrders.orderNumber,
    customerId: s.salesOrders.customerId,
    customerName: s.customers.name,
    status: s.salesOrders.status,
    totalAmount: s.salesOrders.totalAmount,
    createdAt: s.salesOrders.createdAt,
    itemCount: sql<number>`(SELECT SUM(quantity) FROM sales_order_items WHERE order_id = ${s.salesOrders.id})`,
  }).from(s.salesOrders)
    .innerJoin(s.customers, eq(s.salesOrders.customerId, s.customers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.salesOrders.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(list);
});

// GET /api/sales/orders/:id
sales.get('/orders/:id', async (c) => {
  const id = c.req.param('id');
  
  const [order] = await db.select({
    id: s.salesOrders.id,
    orderNumber: s.salesOrders.orderNumber,
    customerId: s.salesOrders.customerId,
    customerName: s.customers.name,
    customerEmail: s.customers.email,
    customerPhone: s.customers.phone,
    customerAddress: s.customers.address,
    status: s.salesOrders.status,
    subtotal: s.salesOrders.subtotal,
    vatAmount: s.salesOrders.vatAmount,
    discountAmount: s.salesOrders.discountAmount,
    totalAmount: s.salesOrders.totalAmount,
    notes: s.salesOrders.notes,
    createdAt: s.salesOrders.createdAt,
  }).from(s.salesOrders)
    .innerJoin(s.customers, eq(s.salesOrders.customerId, s.customers.id))
    .where(eq(s.salesOrders.id, id))
    .limit(1);

  if (!order) return c.json({ error: 'Order not found' }, 404);

  const items = await db.select({
    id: s.salesOrderItems.id,
    productId: s.salesOrderItems.productId,
    productName: s.products.name,
    variantId: s.salesOrderItems.variantId,
    sku: s.productVariants.sku,
    shadeName: s.shades.name,
    quantity: s.salesOrderItems.quantity,
    unitPrice: s.salesOrderItems.unitPrice,
    totalPrice: s.salesOrderItems.totalPrice,
  }).from(s.salesOrderItems)
    .innerJoin(s.products, eq(s.salesOrderItems.productId, s.products.id))
    .leftJoin(s.productVariants, eq(s.salesOrderItems.variantId, s.productVariants.id))
    .leftJoin(s.shades, eq(s.productVariants.shadeId, s.shades.id))
    .where(eq(s.salesOrderItems.orderId, id));

  return c.json({ ...order, items });
});

// POST /api/sales/orders
sales.post('/orders', async (c) => {
  const body = await c.req.json();
  const user = c.get('user') as any;

  // Generate order number
  const orderNum = `ORD-${Date.now().toString().slice(-6)}`;

  const [order] = await db.insert(s.salesOrders).values({
    orderNumber: orderNum,
    customerId: body.customerId,
    status: body.status || 'draft',
    subtotal: String(body.subtotal),
    vatAmount: String(body.vatAmount),
    discountAmount: String(body.discountAmount || 0),
    totalAmount: String(body.totalAmount),
    notes: body.notes || null,
    createdById: user?.userId || null,
  }).returning();

  for (const item of body.items) {
    await db.insert(s.salesOrderItems).values({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      discount: String(item.discount || 0),
      vatRate: String(item.vatRate || 5),
      totalPrice: String(item.totalPrice),
    });
  }

  return c.json(order, 201);
});

// PUT /api/sales/orders/:id/status
sales.put('/orders/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = c.get('user') as any;

  if (!['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(body.status)) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const [updated] = await db.update(s.salesOrders)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(s.salesOrders.id, id))
    .returning();

  if (!updated) return c.json({ error: 'Order not found' }, 404);

  await db.insert(s.activityLog).values({
    userId: user?.userId,
    userName: user?.name || 'System',
    action: 'Updated Order Status',
    module: 'sales',
    entityId: id,
    details: `Updated order ${updated.orderNumber} status to ${body.status}`,
  });

  return c.json(updated);
});

// POST /api/sales/orders/:id/convert-invoice
sales.post('/orders/:id/convert-invoice', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as any;

  const [order] = await db.select().from(s.salesOrders).where(eq(s.salesOrders.id, id)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  // Generate invoice number
  const invNum = `INV-${Date.now().toString().slice(-6)}`;

  const [invoice] = await db.insert(s.invoices).values({
    invoiceNumber: invNum,
    customerId: order.customerId,
    orderId: order.id,
    status: 'paid', // Mark as paid since we auto-create payment
    subtotal: order.subtotal,
    vatAmount: order.vatAmount,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    paidAmount: order.totalAmount, // Fully paid
    balanceDue: '0',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
    createdById: user?.userId || null,
  }).returning();

  const items = await db.select().from(s.salesOrderItems).where(eq(s.salesOrderItems.orderId, id));

  for (const item of items) {
    await db.insert(s.invoiceItems).values({
      invoiceId: invoice.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      vatRate: item.vatRate,
      totalPrice: item.totalPrice,
    });
    
    // Reduce stock
    if (item.variantId) {
      // Find default or first warehouse to deduct from
      const [stock] = await db.select().from(s.stockLevels).where(eq(s.stockLevels.variantId, item.variantId)).limit(1);
      if (stock) {
        await db.execute(sql`
          UPDATE stock_levels SET quantity = quantity - ${item.quantity}, updated_at = NOW()
          WHERE id = ${stock.id}
        `);
      }
    }
  }

  await db.update(s.salesOrders).set({ status: 'processing', paidAmount: order.totalAmount, balanceDue: '0' }).where(eq(s.salesOrders.id, id));

  // Auto-record a payment
  const refNum = `PAY-${Date.now().toString().slice(-6)}`;
  await db.insert(s.payments).values({
    referenceNumber: refNum,
    type: 'incoming',
    customerId: order.customerId,
    invoiceId: invoice.id,
    amount: order.totalAmount,
    method: 'cash',
    date: new Date().toISOString().split('T')[0],
    notes: 'Auto-recorded from Sales Order',
    createdById: user?.userId || null,
  });

  // Note: we don't increase outstanding_balance because it's instantly offset by the payment.
  // Instead, if it were unpaid, we would increase it. Since we auto-pay, net change is 0.

  return c.json({ invoice, message: 'Converted and paid successfully' });
});

export default sales;
