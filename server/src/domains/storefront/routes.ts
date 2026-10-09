import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { activeConnections } from '../../index';
import { generateInvoicePdfBuffer } from '../../shared/pdfGenerator';
import { sendEmailWithAttachment } from '../../shared/email';
import { sendWhatsAppPdf } from '../../shared/whatsapp';

const storeRoutes = new Hono();

// POST /api/store/checkout
storeRoutes.post('/checkout', async (c) => {
  const { customer, items } = await c.req.json();
  
  if (!items || items.length === 0) {
    return c.json({ error: 'Cart is empty' }, 400);
  }

  // Find or create customer
  let dbCustomer = await db.select().from(s.customers).where(eq(s.customers.email, customer.email)).limit(1).then(res => res[0]);
  
  if (!dbCustomer) {
    [dbCustomer] = await db.insert(s.customers).values({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.phone,
      address: customer.address,
      type: 'retailer'
    }).returning();
  }

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.wholesalePrice) * item.quantity), 0);
  const vatAmount = subtotal * 0.05; // Assuming 5% VAT for UAE
  const totalAmount = subtotal + vatAmount;

  // Generate invoice number
  const invNum = `INV-WEB-${Date.now().toString().slice(-6)}`;

  // Create Invoice
  const [invoice] = await db.insert(s.invoices).values({
    invoiceNumber: invNum,
    customerId: dbCustomer.id,
    status: 'unpaid',
    subtotal: subtotal.toString(),
    vatAmount: vatAmount.toString(),
    discountAmount: '0',
    totalAmount: totalAmount.toString(),
    balanceDue: totalAmount.toString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Online Website Order',
  }).returning();

  // Create Invoice Items and prepare data for PDF
  const pdfItems = [];
  for (const item of items) {
    const totalPrice = (parseFloat(item.wholesalePrice) * item.quantity).toString();
    await db.insert(s.invoiceItems).values({
      invoiceId: invoice.id,
      productId: item.id,
      quantity: item.quantity,
      unitPrice: item.wholesalePrice,
      totalPrice: totalPrice,
    });
    pdfItems.push({
      productName: item.name,
      productSku: item.sku,
      quantity: item.quantity,
      unitPrice: item.wholesalePrice,
      totalPrice: totalPrice,
    });
  }

  // Generate PDF and send notifications in the background
  (async () => {
    try {
      const invoiceDataForPdf = {
        ...invoice,
        customerName: dbCustomer.name,
        customerPhone: dbCustomer.phone,
        customerAddress: dbCustomer.address,
        items: pdfItems,
      };
      
      const pdfBuffer = await generateInvoicePdfBuffer(invoiceDataForPdf);
      const filename = `${invoice.invoiceNumber}.pdf`;
      const message = `Thank you for your order! Please find your invoice ${invoice.invoiceNumber} attached.`;

      if (dbCustomer.email) {
        await sendEmailWithAttachment(dbCustomer.email, `Your Invoice ${invoice.invoiceNumber}`, message, pdfBuffer, filename);
      }
      
      if (dbCustomer.phone) {
        await sendWhatsAppPdf(dbCustomer.phone, pdfBuffer, filename, message).catch(err => console.error("WhatsApp Error:", err));
      }
    } catch (err) {
      console.error('Failed to generate/send invoice PDF:', err);
    }
  })();

  // Broadcast WebSocket notification to all active admin users
  const alertMsg = JSON.stringify({
    type: 'new_store_order',
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: dbCustomer.name,
      amount: totalAmount.toString()
    }
  });

  for (const [id, conn] of activeConnections.entries()) {
    if (conn.ws && conn.ws.readyState === 1) { // 1 = OPEN
      conn.ws.send(alertMsg);
    }
  }

  return c.json({ success: true, invoice });
});

export default storeRoutes;
