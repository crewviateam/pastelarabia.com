import { Hono } from 'hono';
import { db } from '../../db';
import * as s from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

const shopify = new Hono();

shopify.post('/webhook/orders-create', async (c) => {
  try {
    const payload = await c.req.json();
    const { id, total_price, customer, line_items } = payload;
    
    await db.transaction(async (tx) => {
      // 1. Sync Customer
      let custId;
      const existingCust = await tx.select().from(s.customers).where(eq(s.customers.email, customer.email)).limit(1);
      if (existingCust.length > 0) {
        custId = existingCust[0].id;
      } else {
        const [newCust] = await tx.insert(s.customers).values({
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          phone: customer.phone,
          contactType: 'customer'
        }).returning();
        custId = newCust.id;
      }

      // 2. Create Invoice
      const invoiceNumber = `INV-SH-${String(id).slice(-6)}`;
      
      const total = parseFloat(total_price);
      const subtotal = total / 1.05;
      const vatAmount = total - subtotal;
      
      const [invoice] = await tx.insert(s.invoices).values({
        invoiceNumber,
        customerId: custId,
        subtotal: subtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: total.toFixed(2),
        paidAmount: total.toFixed(2),
        balanceDue: '0',
        status: 'paid',
        dueDate: new Date().toISOString().split('T')[0],
        notes: `Shopify Order #${id}`
      }).returning();

      const [warehouse] = await tx.select({ id: s.warehouses.id }).from(s.warehouses).limit(1);
      const whId = warehouse?.id;

      // 3. Process Line Items and Stock
      for (const item of line_items) {
        const productId = item.product_id;
        const variantId = item.variant_id || null;
        
        await tx.insert(s.invoiceItems).values({
          invoiceId: invoice.id,
          productId: productId,
          variantId: variantId,
          quantity: item.quantity,
          unitPrice: String(item.price),
          totalPrice: String(parseFloat(item.price) * item.quantity),
        });

        // 4. Deduct Stock properly at the variant level
        if (whId) {
          if (variantId) {
             await tx.execute(sql`
               UPDATE stock_levels SET quantity = quantity - ${item.quantity}, updated_at = NOW()
               WHERE product_id = ${productId} AND variant_id = ${variantId} AND warehouse_id = ${whId}
             `);
          } else {
             await tx.execute(sql`
               UPDATE stock_levels SET quantity = quantity - ${item.quantity}, updated_at = NOW()
               WHERE product_id = ${productId} AND variant_id IS NULL AND warehouse_id = ${whId}
             `);
          }
        }
      }
    });

    return c.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error('Shopify Webhook Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default shopify;
