import { Hono } from 'hono';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { authMiddleware } from '../../shared/auth';

const payments = new Hono();
payments.use('*', authMiddleware);

// GET /api/payments
payments.get('/', async (c) => {
  const { type, customerId, supplierId, page = '1', limit = '20' } = c.req.query();
  const conditions: any[] = [];

  if (type) conditions.push(eq(s.payments.type, type as any));
  if (customerId) conditions.push(eq(s.payments.customerId, customerId));
  if (supplierId) conditions.push(eq(s.payments.supplierId, supplierId));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const list = await db.select({
    id: s.payments.id,
    referenceNumber: s.payments.referenceNumber,
    type: s.payments.type,
    customerId: s.payments.customerId,
    supplierId: s.payments.supplierId,
    invoiceId: s.payments.invoiceId,
    amount: s.payments.amount,
    method: s.payments.method,
    date: s.payments.date,
    notes: s.payments.notes,
    createdAt: s.payments.createdAt,
    customerName: s.customers.name,
  }).from(s.payments)
    .leftJoin(s.customers, eq(s.payments.customerId, s.customers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.payments.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  return c.json(list);
});

// POST /api/payments — record payment
payments.post('/', async (c) => {
  const body = await c.req.json();
  const user = c.get('user') as any;

  if (!body.amount || body.amount <= 0) {
    return c.json({ error: 'Valid payment amount is required' }, 400);
  }

  const refNum = `PAY-${Date.now().toString().slice(-6)}`;

  const [payment] = await db.insert(s.payments).values({
    referenceNumber: refNum,
    type: body.type || 'incoming',
    customerId: body.customerId || null,
    supplierId: body.supplierId || null,
    invoiceId: body.invoiceId || null,
    purchaseOrderId: body.purchaseOrderId || null,
    amount: String(body.amount),
    method: body.method || 'cash',
    date: body.date || new Date().toISOString().split('T')[0],
    notes: body.notes || null,
    createdById: user?.userId || null,
  }).returning();

  // Update invoice if linked
  if (body.invoiceId) {
    const [invoice] = await db.select().from(s.invoices)
      .where(eq(s.invoices.id, body.invoiceId)).limit(1);
    if (invoice) {
      const newPaid = parseFloat(invoice.paidAmount) + body.amount;
      const newBalance = parseFloat(invoice.totalAmount) - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

      await db.update(s.invoices).set({
        paidAmount: String(newPaid),
        balanceDue: String(Math.max(0, newBalance)),
        status: newStatus as any,
        updatedAt: new Date(),
      }).where(eq(s.invoices.id, body.invoiceId));
    }
  }

  // Update customer outstanding balance
  if (body.customerId && body.type === 'incoming') {
    await db.execute(sql`
      UPDATE customers SET outstanding_balance = outstanding_balance - ${body.amount}, updated_at = NOW()
      WHERE id = ${body.customerId}
    `);
  }

  // Update supplier outstanding balance
  if (body.supplierId && body.type === 'outgoing') {
    await db.execute(sql`
      UPDATE suppliers SET outstanding_payable = outstanding_payable - ${body.amount}, updated_at = NOW()
      WHERE id = ${body.supplierId}
    `);
  }

  await db.insert(s.activityLog).values({
    userId: user?.userId, userName: user?.name || 'System',
    action: 'Recorded payment', module: 'payments',
    entityId: payment.id,
    details: `Payment ${refNum} — AED ${body.amount} (${body.method})`,
  });

  return c.json(payment, 201);
});

// GET /api/payments/stats
payments.get('/stats', async (c) => {
  const [incomeResult] = await db.select({ total: sql<number>`SUM(amount)` }).from(s.payments).where(eq(s.payments.type, 'incoming'));
  const [expenseResult] = await db.select({ total: sql<number>`SUM(amount)` }).from(s.payments).where(eq(s.payments.type, 'outgoing'));
  
  const [receivablesResult] = await db.select({ total: sql<number>`SUM(outstanding_balance)` }).from(s.customers);
  const [payablesResult] = await db.select({ total: sql<number>`SUM(outstanding_payable)` }).from(s.suppliers);

  const [directExpenses] = await db.select({ total: sql<number>`SUM(amount)` }).from(s.expenses);

  const totalIncome = parseFloat((incomeResult?.total as any) || '0');
  const paymentsOutgoing = parseFloat((expenseResult?.total as any) || '0');
  const otherExpenses = parseFloat((directExpenses?.total as any) || '0');
  const totalExpenses = paymentsOutgoing + otherExpenses;

  const recentPayments = await db.select({
    id: s.payments.id,
    date: s.payments.date,
    type: s.payments.type,
    amount: s.payments.amount,
    method: s.payments.method,
    referenceNumber: s.payments.referenceNumber,
    customerName: s.customers.name,
    supplierName: s.suppliers.name,
    createdAt: s.payments.createdAt,
  }).from(s.payments)
    .leftJoin(s.customers, eq(s.payments.customerId, s.customers.id))
    .leftJoin(s.suppliers, eq(s.payments.supplierId, s.suppliers.id))
    .orderBy(desc(s.payments.createdAt))
    .limit(10);

  return c.json({
    totalIncome,
    totalExpenses,
    netCashflow: totalIncome - totalExpenses,
    outstandingReceivables: parseFloat((receivablesResult?.total as any) || '0'),
    outstandingPayables: parseFloat((payablesResult?.total as any) || '0'),
    recentTransactions: recentPayments.map(p => ({
      id: p.id,
      date: p.date,
      description: `Payment ${p.referenceNumber} ${p.type === 'incoming' ? 'from ' + (p.customerName || 'Customer') : 'to ' + (p.supplierName || 'Supplier')}`,
      type: p.type,
      amount: p.amount,
      status: 'Completed'
    }))
  });
});

export default payments;

