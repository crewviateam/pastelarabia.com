import { Hono } from 'hono';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { authMiddleware } from '../../shared/auth';
import { sendWhatsAppPdf } from '../../shared/whatsapp';
import { generateInvoicePdfBuffer } from '../../shared/pdfGenerator';

const invoicing = new Hono<{ Variables: { user: any } }>();
invoicing.use('*', authMiddleware);

// GET /api/invoices
invoicing.get('/', async (c) => {
  const { status, customerId, page = '1', limit = '20' } = c.req.query();
  const conditions: any[] = [];

  if (status) conditions.push(eq(s.invoices.status, status as any));
  if (customerId) conditions.push(eq(s.invoices.customerId, customerId));

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const list = await db.select({
    id: s.invoices.id,
    invoiceNumber: s.invoices.invoiceNumber,
    customerId: s.invoices.customerId,
    customerName: s.customers.name,
    customerPhone: s.customers.phone,
    customerWhatsapp: s.customers.whatsapp,
    status: s.invoices.status,
    totalAmount: s.invoices.totalAmount,
    paidAmount: s.invoices.paidAmount,
    balanceDue: s.invoices.balanceDue,
    currency: s.invoices.currency,
    dueDate: s.invoices.dueDate,
    createdAt: s.invoices.createdAt,
  }).from(s.invoices)
    .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(s.invoices.createdAt))
    .limit(parseInt(limit))
    .offset(offset);

  const [total] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(s.invoices)
    .where(conditions.length ? and(...conditions) : undefined);

  return c.json({ data: list, pagination: { page: parseInt(page), limit: parseInt(limit), total: total?.count || 0 } });
});

// GET /api/invoices/stats
invoicing.get('/stats', async (c) => {
  const [stats] = await db.select({
    total: sql<number>`COUNT(*)`,
    unpaid: sql<number>`COUNT(*) FILTER (WHERE ${s.invoices.status} = 'unpaid')`,
    overdue: sql<number>`COUNT(*) FILTER (WHERE ${s.invoices.status} = 'overdue')`,
    paid: sql<number>`COUNT(*) FILTER (WHERE ${s.invoices.status} = 'paid')`,
    totalAmount: sql<string>`COALESCE(SUM(${s.invoices.totalAmount}), 0)`,
    totalPaid: sql<string>`COALESCE(SUM(${s.invoices.paidAmount}), 0)`,
    totalOutstanding: sql<string>`COALESCE(SUM(${s.invoices.balanceDue}), 0)`,
  }).from(s.invoices);

  return c.json({
    total: stats?.total || 0,
    unpaid: stats?.unpaid || 0,
    overdue: stats?.overdue || 0,
    paid: stats?.paid || 0,
    totalAmount: parseFloat(stats?.totalAmount || '0'),
    totalPaid: parseFloat(stats?.totalPaid || '0'),
    totalOutstanding: parseFloat(stats?.totalOutstanding || '0'),
  });
});

// GET /api/invoices/:id
invoicing.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [invoice] = await db.select({
    id: s.invoices.id,
    invoiceNumber: s.invoices.invoiceNumber,
    customerId: s.invoices.customerId,
    customerName: s.customers.name,
    customerPhone: s.customers.phone,
    customerEmail: s.customers.email,
    customerAddress: s.customers.address,
    customerWhatsapp: s.customers.whatsapp,
    customerTrn: s.customers.trn,
    orderId: s.invoices.orderId,
    status: s.invoices.status,
    subtotal: s.invoices.subtotal,
    vatAmount: s.invoices.vatAmount,
    discountAmount: s.invoices.discountAmount,
    totalAmount: s.invoices.totalAmount,
    paidAmount: s.invoices.paidAmount,
    balanceDue: s.invoices.balanceDue,
    currency: s.invoices.currency,
    dueDate: s.invoices.dueDate,
    notes: s.invoices.notes,
    createdAt: s.invoices.createdAt,
  }).from(s.invoices)
    .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
    .where(eq(s.invoices.id, id))
    .limit(1);

  if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

  const items = await db.select({
    id: s.invoiceItems.id,
    productId: s.invoiceItems.productId,
    productName: s.products.name,
    productSku: s.products.sku,
    variantId: s.invoiceItems.variantId,
    variantSku: s.productVariants.sku,
    shadeName: s.shades.name,
    shadeColor: s.shades.colorCode,
    description: s.invoiceItems.description,
    quantity: s.invoiceItems.quantity,
    unitPrice: s.invoiceItems.unitPrice,
    discount: s.invoiceItems.discount,
    vatRate: s.invoiceItems.vatRate,
    totalPrice: s.invoiceItems.totalPrice,
  }).from(s.invoiceItems)
    .innerJoin(s.products, eq(s.invoiceItems.productId, s.products.id))
    .leftJoin(s.productVariants, eq(s.invoiceItems.variantId, s.productVariants.id))
    .leftJoin(s.shades, eq(s.productVariants.shadeId, s.shades.id))
    .where(eq(s.invoiceItems.invoiceId, id));

  // Get business settings for PDF
  const [settings] = await db.select().from(s.businessSettings).limit(1);

  // Get payments for this invoice
  const invoicePayments = await db.select().from(s.payments)
    .where(eq(s.payments.invoiceId, id))
    .orderBy(desc(s.payments.createdAt));

  return c.json({ ...invoice, items, payments: invoicePayments, businessSettings: settings });
});

// POST /api/invoices/:id/send-whatsapp
invoicing.post('/:id/send-whatsapp', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as any;
  const body = await c.req.json();

  const [invoice] = await db.select({
    invoiceNumber: s.invoices.invoiceNumber,
    totalAmount: s.invoices.totalAmount,
    balanceDue: s.invoices.balanceDue,
    customerName: s.customers.name,
    customerWhatsapp: s.customers.whatsapp,
  }).from(s.invoices)
    .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
    .where(eq(s.invoices.id, id))
    .limit(1);

  if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

  const recipientNumber = body.whatsappNumber || invoice.customerWhatsapp;
  if (!recipientNumber) {
    return c.json({ error: 'No WhatsApp number available for this customer' }, 400);
  }

  // Construct the invoice message
  const textMsg = `Hello ${invoice.customerName},\n\nHere is your invoice *${invoice.invoiceNumber}* from Glow Wholesale.\n\n` +
    `Thank you for your business!`;

  try {
    // Fetch the full invoice details to generate the PDF
    const [fullInvoice] = await db.select({
      id: s.invoices.id,
      invoiceNumber: s.invoices.invoiceNumber,
      customerName: s.customers.name,
      customerPhone: s.customers.phone,
      customerAddress: s.customers.address,
      customerTrn: s.customers.trn,
      subtotal: s.invoices.subtotal,
      vatAmount: s.invoices.vatAmount,
      discountAmount: s.invoices.discountAmount,
      totalAmount: s.invoices.totalAmount,
      createdAt: s.invoices.createdAt,
    }).from(s.invoices)
      .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
      .where(eq(s.invoices.id, id))
      .limit(1);

    const items = await db.select({
      productName: s.products.name,
      productSku: s.products.sku,
      variantSku: s.productVariants.sku,
      shadeName: s.shades.name,
      quantity: s.invoiceItems.quantity,
      unitPrice: s.invoiceItems.unitPrice,
      totalPrice: s.invoiceItems.totalPrice,
    }).from(s.invoiceItems)
      .innerJoin(s.products, eq(s.invoiceItems.productId, s.products.id))
      .leftJoin(s.productVariants, eq(s.invoiceItems.variantId, s.productVariants.id))
      .leftJoin(s.shades, eq(s.productVariants.shadeId, s.shades.id))
      .where(eq(s.invoiceItems.invoiceId, id));

    const [settings] = await db.select().from(s.businessSettings).limit(1);

    const invoiceDataForPdf = { ...fullInvoice, items, businessSettings: settings };

    // Generate the UAE-compliant PDF
    const pdfBuffer = await generateInvoicePdfBuffer(invoiceDataForPdf);

    const caption = `Hello ${invoice.customerName},\n\nPlease find attached your tax invoice *${invoice.invoiceNumber}* from Glow Wholesale.\n\nThank you for your business!`;

    // Attempt to send in background
    await sendWhatsAppPdf(recipientNumber, pdfBuffer, `Invoice_${invoice.invoiceNumber}.pdf`, caption);

    await db.insert(s.activityLog).values({
      userId: user?.userId, userName: user?.name || 'System',
      action: 'Sent invoice PDF via automated WhatsApp',
      module: 'invoices', entityId: id,
      details: `Invoice ${invoice.invoiceNumber} PDF sent to ${recipientNumber} automatically via whatsapp-web.js`,
    });

    return c.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} PDF sent to ${recipientNumber} via automated WhatsApp!`,
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to send WhatsApp message. Ensure the backend WhatsApp is connected (scan QR). Detail: ' + error.message }, 500);
  }
});

// GET /api/invoices/:id/pdf
invoicing.get('/:id/pdf', async (c) => {
  const id = c.req.param('id');
  
  const [fullInvoice] = await db.select({
    id: s.invoices.id,
    invoiceNumber: s.invoices.invoiceNumber,
    customerName: s.customers.name,
    customerPhone: s.customers.phone,
    customerAddress: s.customers.address,
    customerTrn: s.customers.trn,
    subtotal: s.invoices.subtotal,
    vatAmount: s.invoices.vatAmount,
    discountAmount: s.invoices.discountAmount,
    totalAmount: s.invoices.totalAmount,
    status: s.invoices.status,
    createdAt: s.invoices.createdAt,
  }).from(s.invoices)
    .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
    .where(eq(s.invoices.id, id))
    .limit(1);

  if (!fullInvoice) return c.json({ error: 'Invoice not found' }, 404);

  const items = await db.select({
    productName: s.products.name,
    productSku: s.products.sku,
    variantSku: s.productVariants.sku,
    shadeName: s.shades.name,
    quantity: s.invoiceItems.quantity,
    unitPrice: s.invoiceItems.unitPrice,
    totalPrice: s.invoiceItems.totalPrice,
  }).from(s.invoiceItems)
    .innerJoin(s.products, eq(s.invoiceItems.productId, s.products.id))
    .leftJoin(s.productVariants, eq(s.invoiceItems.variantId, s.productVariants.id))
    .leftJoin(s.shades, eq(s.productVariants.shadeId, s.shades.id))
    .where(eq(s.invoiceItems.invoiceId, id));

  const [settings] = await db.select().from(s.businessSettings).limit(1);

  const invoiceDataForPdf = { ...fullInvoice, items, businessSettings: settings };
  const pdfBuffer = await generateInvoicePdfBuffer(invoiceDataForPdf);

  return c.body(pdfBuffer, 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="Invoice_${fullInvoice.invoiceNumber}.pdf"`,
  });
});

export default invoicing;
