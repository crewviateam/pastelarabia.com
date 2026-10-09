import { Hono } from 'hono';
import { sql, eq, desc, asc, lt, lte, gte, and, count, sum } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';

const dashboard = new Hono();

// GET /api/dashboard/stats
dashboard.get('/stats', async (c) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Today's sales
  const [todaySales] = await db.select({
    total: sql<string>`COALESCE(SUM(${s.invoices.totalAmount}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(s.invoices).where(sql`DATE(${s.invoices.createdAt}) = ${today}`);

  // Today's purchases
  const [todayPurchases] = await db.select({
    total: sql<string>`COALESCE(SUM(${s.purchaseOrders.totalAmount}), 0)`,
  }).from(s.purchaseOrders).where(sql`DATE(${s.purchaseOrders.createdAt}) = ${today}`);

  // Payments received today
  const [paymentsReceived] = await db.select({
    total: sql<string>`COALESCE(SUM(${s.payments.amount}), 0)`,
  }).from(s.payments).where(
    and(
      eq(s.payments.type, 'incoming'),
      sql`DATE(${s.payments.createdAt}) = ${today}`
    )
  );

  // Outstanding customer payments
  const [outstandingPayments] = await db.select({
    total: sql<string>`COALESCE(SUM(${s.invoices.balanceDue}), 0)`,
  }).from(s.invoices).where(
    sql`${s.invoices.balanceDue} > 0 AND ${s.invoices.status} != 'cancelled'`
  );

  // Stock value
  const [stockValue] = await db.select({
    total: sql<string>`COALESCE(SUM(${s.stockLevels.quantity} * ${s.products.costPrice}), 0)`,
  }).from(s.stockLevels)
    .innerJoin(s.products, eq(s.stockLevels.productId, s.products.id));

  // Low stock items
  const [lowStock] = await db.select({
    count: sql<number>`COUNT(DISTINCT ${s.products.id})`,
  }).from(s.products)
    .innerJoin(s.stockLevels, eq(s.products.id, s.stockLevels.productId))
    .where(sql`${s.stockLevels.quantity} <= ${s.products.reorderLevel}`);

  return c.json({
    todaySales: parseFloat(todaySales?.total || '0'),
    todaySalesCount: todaySales?.count || 0,
    todayPurchases: parseFloat(todayPurchases?.total || '0'),
    paymentsReceived: parseFloat(paymentsReceived?.total || '0'),
    outstandingPayments: parseFloat(outstandingPayments?.total || '0'),
    stockValue: parseFloat(stockValue?.total || '0'),
    lowStockItems: lowStock?.count || 0,
  });
});

// GET /api/dashboard/sales-chart
dashboard.get('/sales-chart', async (c) => {
  const period = c.req.query('period') || 'weekly';
  
  let dateFormat: string;
  let daysBack: number;
  
  switch (period) {
    case 'daily': dateFormat = 'YYYY-MM-DD'; daysBack = 30; break;
    case 'monthly': dateFormat = 'YYYY-MM'; daysBack = 365; break;
    default: dateFormat = 'YYYY-MM-DD'; daysBack = 7 * 12; break;
  }

  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const salesData = await db.execute(sql`
    SELECT TO_CHAR(created_at, ${sql.raw(`'${dateFormat}'`)}) as date,
           COALESCE(SUM(total_amount::numeric), 0) as revenue,
           COUNT(*) as count
    FROM invoices
    WHERE created_at >= ${startDate}::timestamp AND status != 'cancelled'
    GROUP BY TO_CHAR(created_at, ${sql.raw(`'${dateFormat}'`)})
    ORDER BY date
  `);

  const expenseData = await db.execute(sql`
    SELECT TO_CHAR(created_at, ${sql.raw(`'${dateFormat}'`)}) as date,
           COALESCE(SUM(amount::numeric), 0) as total
    FROM expenses
    WHERE created_at >= ${startDate}::timestamp
    GROUP BY TO_CHAR(created_at, ${sql.raw(`'${dateFormat}'`)})
    ORDER BY date
  `);

  const sales = (salesData.rows || salesData).map((d: any) => ({
    ...d,
    revenue: parseFloat(d.revenue)
  }));
  const expenses = (expenseData.rows || expenseData).map((d: any) => ({
    ...d,
    total: parseFloat(d.total)
  }));

  return c.json({ sales, expenses });
});

// GET /api/dashboard/recent-invoices
dashboard.get('/recent-invoices', async (c) => {
  const recentInvoices = await db.select({
    id: s.invoices.id,
    invoiceNumber: s.invoices.invoiceNumber,
    customerName: s.customers.name,
    totalAmount: s.invoices.totalAmount,
    paidAmount: s.invoices.paidAmount,
    balanceDue: s.invoices.balanceDue,
    status: s.invoices.status,
    dueDate: s.invoices.dueDate,
    createdAt: s.invoices.createdAt,
  }).from(s.invoices)
    .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
    .orderBy(desc(s.invoices.createdAt))
    .limit(10);

  return c.json(recentInvoices);
});

// GET /api/dashboard/low-stock
dashboard.get('/low-stock', async (c) => {
  const lowStockProducts = await db.select({
    productId: s.products.id,
    productName: s.products.name,
    sku: s.products.sku,
    image: s.products.image,
    category: s.categories.name,
    reorderLevel: s.products.reorderLevel,
    totalStock: sql<number>`COALESCE(SUM(${s.stockLevels.quantity}), 0)`,
  }).from(s.products)
    .leftJoin(s.stockLevels, eq(s.products.id, s.stockLevels.productId))
    .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
    .groupBy(s.products.id, s.categories.name)
    .having(sql`COALESCE(SUM(${s.stockLevels.quantity}), 0) <= ${s.products.reorderLevel}`)
    .orderBy(sql`COALESCE(SUM(${s.stockLevels.quantity}), 0)`)
    .limit(10);

  return c.json(lowStockProducts);
});

// GET /api/dashboard/best-sellers
dashboard.get('/best-sellers', async (c) => {
  const bestSellers = await db.select({
    productId: s.products.id,
    productName: s.products.name,
    image: s.products.image,
    category: s.categories.name,
    unitsSold: sql<number>`COALESCE(SUM(${s.invoiceItems.quantity}), 0)`,
    revenue: sql<string>`COALESCE(SUM(${s.invoiceItems.totalPrice}), 0)`,
  }).from(s.invoiceItems)
    .innerJoin(s.products, eq(s.invoiceItems.productId, s.products.id))
    .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
    .innerJoin(s.invoices, eq(s.invoiceItems.invoiceId, s.invoices.id))
    .where(sql`${s.invoices.status} != 'cancelled'`)
    .groupBy(s.products.id, s.categories.name)
    .orderBy(sql`COALESCE(SUM(${s.invoiceItems.quantity}), 0) DESC`)
    .limit(5);

  return c.json(bestSellers);
});

// GET /api/dashboard/outstanding-payments
dashboard.get('/outstanding-payments', async (c) => {
  const outstanding = await db.select({
    customerId: s.customers.id,
    customerName: s.customers.name,
    customerType: s.customers.type,
    totalOutstanding: sql<string>`COALESCE(SUM(${s.invoices.balanceDue}), 0)`,
    oldestDueDate: sql<string>`MIN(${s.invoices.dueDate})`,
    invoiceCount: sql<number>`COUNT(*)`,
  }).from(s.invoices)
    .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
    .where(sql`${s.invoices.balanceDue} > 0 AND ${s.invoices.status} != 'cancelled'`)
    .groupBy(s.customers.id)
    .orderBy(sql`COALESCE(SUM(${s.invoices.balanceDue}), 0) DESC`)
    .limit(10);

  return c.json(outstanding);
});

// GET /api/dashboard/staff-performance
dashboard.get('/staff-performance', async (c) => {
  const performance = await db.select({
    staffId: s.staff.id,
    staffName: s.staff.name,
    role: s.staff.role,
    avatar: s.staff.avatar,
    salesTarget: s.staff.salesTarget,
    salesAmount: sql<string>`COALESCE(SUM(${s.invoices.totalAmount}), 0)`,
    ordersHandled: sql<number>`COUNT(DISTINCT ${s.salesOrders.id})`,
  }).from(s.staff)
    .leftJoin(s.users, eq(s.staff.userId, s.users.id))
    .leftJoin(s.salesOrders, eq(s.salesOrders.createdById, s.users.id))
    .leftJoin(s.invoices, eq(s.invoices.createdById, s.users.id))
    .where(eq(s.staff.status, 'active'))
    .groupBy(s.staff.id)
    .limit(5);

  return c.json(performance);
});


// GET /api/dashboard/advanced
dashboard.get('/advanced', async (c) => {
  // Variant Velocity
  const velocityData = await db.execute(sql`
    SELECT p.name as product_name, s.name as shade_name, s.color_code, SUM(ii.quantity) as total_sold
    FROM invoice_items ii
    JOIN product_variants v ON ii.variant_id = v.id
    JOIN products p ON ii.product_id = p.id
    LEFT JOIN shades s ON v.shade_id = s.id
    GROUP BY p.name, s.name, s.color_code
    ORDER BY total_sold DESC
    LIMIT 10
  `);

  // Expiry Exposure
  const expiryData = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN expiry_date < CURRENT_DATE + INTERVAL '3 months' THEN quantity * 10 ELSE 0 END) as expires_3m,
      SUM(CASE WHEN expiry_date >= CURRENT_DATE + INTERVAL '3 months' AND expiry_date < CURRENT_DATE + INTERVAL '6 months' THEN quantity * 10 ELSE 0 END) as expires_6m,
      SUM(CASE WHEN expiry_date >= CURRENT_DATE + INTERVAL '6 months' THEN quantity * 10 ELSE 0 END) as safe
    FROM batches
    WHERE expiry_date IS NOT NULL
  `);

  // Margins Trend
  const marginsData = await db.execute(sql`
    SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date,
           COALESCE(SUM(total_amount::numeric), 0) as revenue,
           COALESCE(SUM(total_amount::numeric * 0.4), 0) as cogs,
           COALESCE(SUM(total_amount::numeric * 0.6), 0) as gross_margin
    FROM invoices
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND status != 'cancelled'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date
  `);

  // Customer LTV (Wholesale vs Retail)
  const channelSplit = await db.execute(sql`
    SELECT c.type as channel, SUM(i.total_amount::numeric) as revenue
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    GROUP BY c.type
  `);

  // Stockout Risk (Predictive Restock)
  const stockoutRisk = await db.execute(sql`
    SELECT p.name as product_name, p.sku, sl.quantity as stock_left, p.reorder_level
    FROM stock_levels sl
    JOIN products p ON sl.product_id = p.id
    WHERE sl.quantity <= p.reorder_level * 2
    ORDER BY sl.quantity ASC
    LIMIT 5
  `);

  // Dead Stock Radar
  const deadStock = await db.execute(sql`
    SELECT p.name as product_name, p.sku, sl.quantity, (sl.quantity * COALESCE(p.cost_price, 10)) as capital_locked
    FROM stock_levels sl
    JOIN products p ON sl.product_id = p.id
    WHERE sl.quantity > 0 AND p.id NOT IN (
      SELECT product_id FROM invoice_items ii 
      JOIN invoices i ON ii.invoice_id = i.id 
      WHERE i.created_at >= CURRENT_DATE - INTERVAL '30 days'
    )
    ORDER BY capital_locked DESC
    LIMIT 5
  `);

  // Category Momentum
  const categoryMomentum = await db.execute(sql`
    SELECT c.name as category_name, SUM(ii.total_price::numeric) as revenue
    FROM invoice_items ii
    JOIN products p ON ii.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    GROUP BY c.name
  `);

  return c.json({
    variantVelocity: velocityData.rows || velocityData,
    expiryExposure: (expiryData.rows || expiryData)[0] || { expires_3m: 0, expires_6m: 0, safe: 0 },
    marginsTrend: marginsData.rows || marginsData,
    channelSplit: channelSplit.rows || channelSplit,
    stockoutRisk: stockoutRisk.rows || stockoutRisk,
    deadStock: deadStock.rows || deadStock,
    categoryMomentum: categoryMomentum.rows || categoryMomentum
  });
});

export default dashboard;

