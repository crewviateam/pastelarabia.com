import { Hono } from 'hono';
import { eq, sql, desc, and, ilike } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { groqClient, MODEL } from '../../shared/ai';

const ai = new Hono<{ Variables: { user: any } }>();

import { agentApp } from './agent';

// POST /api/ai/chat
ai.post('/chat', async (c) => {
  const { message, context } = await c.req.json();
  const threadId = context?.userName || "default-thread";

  try {
    // Fetch contextual data to inject into AI prompt
    const [salesStats] = await db.select({
      total: sql<string>`COALESCE(SUM(total_amount), 0)`,
    }).from(s.invoices).where(sql`created_at >= NOW() - INTERVAL '30 days'`);

    const [lowStock] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(sql`(SELECT product_id, SUM(quantity) as qty FROM stock_levels GROUP BY product_id) sl`)
      .innerJoin(s.products, eq(sql`sl.product_id`, s.products.id))
      .where(sql`sl.qty <= ${s.products.reorderLevel} AND sl.qty > 0`);

    const [overdueInvoices] = await db.select({
      count: sql<number>`COUNT(*)`,
      total: sql<string>`COALESCE(SUM(balance_due), 0)`
    }).from(s.invoices).where(eq(s.invoices.status, 'overdue'));

    const systemPrompt = `You are an intelligent business assistant for 'Glow Wholesale', a B2B cosmetics supplier in the UAE. 
You can answer questions based on the business context and perform actions using the tools provided to you.
Current Business Context (Last 30 Days):
- Sales Revenue: AED ${salesStats?.total || '0'}
- Low Stock Items: ${lowStock?.count || '0'} items
- Overdue Invoices: ${overdueInvoices?.count || '0'} (Total: AED ${overdueInvoices?.total || '0'})

Keep answers professional, concise, and helpful. Use beautiful formatting. If you return multiple items or data from the database, you MUST format it as a clean Markdown table. Use bolding and lists where appropriate to enhance readability.
If a user asks you to create a customer or vendor, you MUST use the create_contact tool.
If a user asks to search for products or stock, use the search_products tool.
Always let the user know what you have done.`;

    const config = { configurable: { thread_id: threadId, systemPrompt } };
    
    // The graph automatically handles memory, tool execution, and thinking loops!
    const finalState = await agentApp.invoke(
      { messages: [{ role: "user", content: message }] },
      config
    );

    const lastMessage = finalState.messages[finalState.messages.length - 1];
    
    // Extract custom UI widgets from tool outputs if necessary
    let widget = undefined;
    for (let i = finalState.messages.length - 1; i >= 0; i--) {
      const msg = finalState.messages[i];
      if (msg._getType() === 'tool') {
         try {
           const parsed = JSON.parse(msg.content as string);
           if (parsed.widget) {
             widget = parsed.widget;
           }
         } catch (e) {}
         break;
      }
    }

    return c.json({ response: lastMessage.content as string, widget });
  } catch (error: any) {
    console.error('AI error:', error);
    return c.json({ response: 'Sorry, I encountered an error while processing your request.' }, 500);
  }
});

// GET /api/ai/insights
ai.get('/insights', async (c) => {
  // Generate insights based on DB data
  const insights = [];

  // 1. Reorder suggestions
  const reorderItems = await db.select({
    name: s.products.name,
    qty: sql<number>`COALESCE(SUM(${s.stockLevels.quantity}), 0)`,
  }).from(s.products)
    .leftJoin(s.stockLevels, eq(s.products.id, s.stockLevels.productId))
    .groupBy(s.products.id)
    .having(sql`COALESCE(SUM(${s.stockLevels.quantity}), 0) <= ${s.products.reorderLevel}`)
    .limit(3);

  if (reorderItems.length > 0) {
    insights.push({
      type: 'reorder',
      severity: 'warning',
      title: 'Reorder Recommended',
      description: `${reorderItems.length} products are running low. Top priority: ${reorderItems[0].name} (${reorderItems[0].qty} left).`
    });
  }

  // 2. Overdue payments
  const overdueCount = await db.select({
    customer: s.customers.name,
    amount: s.invoices.balanceDue,
  }).from(s.invoices)
    .innerJoin(s.customers, eq(s.invoices.customerId, s.customers.id))
    .where(eq(s.invoices.status, 'overdue'))
    .orderBy(desc(s.invoices.balanceDue))
    .limit(1);

  if (overdueCount.length > 0) {
    insights.push({
      type: 'payment',
      severity: 'error',
      title: 'Payment Risk',
      description: `${overdueCount[0].customer} has an overdue balance of AED ${overdueCount[0].amount}. Consider sending a reminder.`
    });
  }

  return c.json(insights);
});

export default ai;
