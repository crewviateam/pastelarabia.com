import { Hono } from 'hono';
import { eq, sql, desc, asc, and, or, ilike } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { authMiddleware, roleGuard } from '../../shared/auth';

const purchases = new Hono();
purchases.use('*', authMiddleware);

// GET /api/purchases
purchases.get('/', async (c) => {
  const { status, supplierId, page = '1', limit = '20' } = c.req.query();
  const conditions: any[] = [];

  if (status) conditions.push(eq(s.purchaseOrders.status, status as any));
  if (supplierId) conditions.push(eq(s.purchaseOrders.supplierId, supplierId));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const list = await db.select({
    id: s.purchaseOrders.id,
    poNumber: s.purchaseOrders.poNumber,
    supplierId: s.purchaseOrders.supplierId,
    supplierName: s.suppliers.name,
    status: s.purchaseOrders.status,
    subtotal: s.purchaseOrders.subtotal,
    vatAmount: s.purchaseOrders.vatAmount,
    totalAmount: s.purchaseOrders.totalAmount,
    expectedDate: s.purchaseOrders.expectedDate,
    createdAt: s.purchaseOrders.createdAt,
  }).from(s.purchaseOrders)
    .innerJoin(s.suppliers, eq(s.purchaseOrders.supplierId, s.suppliers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.purchaseOrders.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  const [total] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(s.purchaseOrders)
    .where(conditions.length ? and(...conditions) : undefined);

  return c.json({ data: list, pagination: { page: parseInt(page), limit: parseInt(limit), total: total?.count || 0 } });
});

// GET /api/purchases/:id
purchases.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [po] = await db.select({
    id: s.purchaseOrders.id,
    poNumber: s.purchaseOrders.poNumber,
    supplierId: s.purchaseOrders.supplierId,
    supplierName: s.suppliers.name,
    supplierPhone: s.suppliers.phone,
    status: s.purchaseOrders.status,
    subtotal: s.purchaseOrders.subtotal,
    vatAmount: s.purchaseOrders.vatAmount,
    totalAmount: s.purchaseOrders.totalAmount,
    expectedDate: s.purchaseOrders.expectedDate,
    notes: s.purchaseOrders.notes,
    createdAt: s.purchaseOrders.createdAt,
  }).from(s.purchaseOrders)
    .innerJoin(s.suppliers, eq(s.purchaseOrders.supplierId, s.suppliers.id))
    .where(eq(s.purchaseOrders.id, id))
    .limit(1);

  if (!po) return c.json({ error: 'Purchase order not found' }, 404);

  const items = await db.select({
    id: s.purchaseOrderItems.id,
    productId: s.purchaseOrderItems.productId,
    productName: s.products.name,
    variantId: s.purchaseOrderItems.variantId,
    variantSku: s.productVariants.sku,
    quantity: s.purchaseOrderItems.quantity,
    receivedQuantity: s.purchaseOrderItems.receivedQuantity,
    unitCost: s.purchaseOrderItems.unitCost,
    vatRate: s.purchaseOrderItems.vatRate,
    totalCost: s.purchaseOrderItems.totalCost,
    batchNumber: s.purchaseOrderItems.batchNumber,
    expiryDate: s.purchaseOrderItems.expiryDate,
  }).from(s.purchaseOrderItems)
    .innerJoin(s.products, eq(s.purchaseOrderItems.productId, s.products.id))
    .leftJoin(s.productVariants, eq(s.purchaseOrderItems.variantId, s.productVariants.id))
    .where(eq(s.purchaseOrderItems.purchaseOrderId, id));

  return c.json({ ...po, items });
});

// POST /api/purchases
purchases.post('/', async (c) => {
  const body = await c.req.json();
  const user = c.get('user') as any;

  const poNum = `PO-${Date.now().toString().slice(-6)}`;

  const [po] = await db.insert(s.purchaseOrders).values({
    poNumber: poNum,
    supplierId: body.supplierId,
    status: body.status || 'draft',
    subtotal: String(body.subtotal || 0),
    vatAmount: String(body.vatAmount || 0),
    totalAmount: String(body.totalAmount || 0),
    expectedDate: body.expectedDate || null,
    notes: body.notes || null,
    createdById: user?.userId || null,
  }).returning();

  for (const item of (body.items || [])) {
    await db.insert(s.purchaseOrderItems).values({
      purchaseOrderId: po.id,
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      receivedQuantity: 0,
      unitCost: String(item.unitCost),
      vatRate: String(item.vatRate || 5),
      totalCost: String(item.totalCost),
      batchNumber: item.batchNumber || null,
      expiryDate: item.expiryDate || null,
    });
  }

  await db.insert(s.activityLog).values({
    userId: user?.userId, userName: user?.name || 'System',
    action: 'Created purchase order', module: 'purchases',
    entityId: po.id, details: `PO ${poNum} created`,
  });

  return c.json(po, 201);
});

// POST /api/purchases/:id/receive — receive stock
purchases.post('/:id/receive', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = c.get('user') as any;

  const [po] = await db.select().from(s.purchaseOrders).where(eq(s.purchaseOrders.id, id)).limit(1);
  if (!po) return c.json({ error: 'PO not found' }, 404);

  // body.items: [{ itemId, receivedQty, batchNumber, expiryDate }]
  for (const recv of (body.items || [])) {
    const [item] = await db.select().from(s.purchaseOrderItems)
      .where(eq(s.purchaseOrderItems.id, recv.itemId)).limit(1);
    if (!item) continue;

    const newReceived = (item.receivedQuantity || 0) + recv.receivedQty;

    // Update PO item
    await db.update(s.purchaseOrderItems).set({
      receivedQuantity: newReceived,
      batchNumber: recv.batchNumber || item.batchNumber,
      expiryDate: recv.expiryDate || item.expiryDate,
    }).where(eq(s.purchaseOrderItems.id, recv.itemId));

    // Get default warehouse
    const [warehouse] = await db.select().from(s.warehouses)
      .where(eq(s.warehouses.isDefault, true)).limit(1);

    if (warehouse) {
      // Update/insert stock level
      const [existing] = await db.select().from(s.stockLevels)
        .where(and(
          eq(s.stockLevels.productId, item.productId),
          eq(s.stockLevels.warehouseId, warehouse.id),
          item.variantId ? eq(s.stockLevels.variantId, item.variantId) : sql`${s.stockLevels.variantId} IS NULL`
        )).limit(1);

      if (existing) {
        await db.execute(sql`
          UPDATE stock_levels SET quantity = quantity + ${recv.receivedQty}, updated_at = NOW()
          WHERE id = ${existing.id}
        `);
      } else {
        await db.insert(s.stockLevels).values({
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: warehouse.id,
          quantity: recv.receivedQty,
        });
      }

      // Create stock movement
      await db.insert(s.stockMovements).values({
        productId: item.productId,
        variantId: item.variantId,
        warehouseId: warehouse.id,
        type: 'purchase',
        quantity: recv.receivedQty,
        referenceType: 'purchase_order',
        referenceId: po.id,
        referenceNumber: po.poNumber,
        batchNumber: recv.batchNumber || null,
        createdById: user?.userId || null,
      });

      // Create batch if has batch/expiry
      if (recv.batchNumber || recv.expiryDate) {
        await db.insert(s.batches).values({
          productId: item.productId,
          variantId: item.variantId,
          batchNumber: recv.batchNumber || `BATCH-${Date.now()}`,
          expiryDate: recv.expiryDate || null,
          quantity: recv.receivedQty,
        });
      }
    }
  }

  // Check if all items fully received
  const allItems = await db.select().from(s.purchaseOrderItems)
    .where(eq(s.purchaseOrderItems.purchaseOrderId, id));

  const allReceived = allItems.every(i => i.receivedQuantity >= i.quantity);
  const someReceived = allItems.some(i => (i.receivedQuantity || 0) > 0);

  const newStatus = allReceived ? 'received' : someReceived ? 'partially_received' : po.status;

  await db.update(s.purchaseOrders).set({
    status: newStatus as any,
    updatedAt: new Date(),
  }).where(eq(s.purchaseOrders.id, id));

  // Update supplier balance
  const totalReceived = body.items?.reduce((sum: number, i: any) => {
    const poItem = allItems.find(ai => ai.id === i.itemId);
    if (!poItem) return sum;
    return sum + (i.receivedQty * parseFloat(poItem.unitCost));
  }, 0) || 0;

  if (totalReceived > 0) {
    // We are auto-recording payment for the received stock instead of increasing outstanding payable
    // But we need to insert the outgoing payment

    const refNum = `PAY-${Date.now().toString().slice(-6)}`;
    await db.insert(s.payments).values({
      referenceNumber: refNum,
      type: 'outgoing',
      supplierId: po.supplierId,
      purchaseOrderId: po.id,
      amount: String(totalReceived),
      method: 'cash',
      date: new Date().toISOString().split('T')[0],
      notes: 'Auto-recorded from Purchase Receive',
      createdById: user?.userId || null,
    });
  }

  await db.insert(s.activityLog).values({
    userId: user?.userId, userName: user?.name || 'System',
    action: 'Received purchase stock', module: 'purchases',
    entityId: po.id, details: `Received stock for ${po.poNumber}`,
  });

  return c.json({ message: 'Stock received successfully', status: newStatus });
});

export default purchases;
