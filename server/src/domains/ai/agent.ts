import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { StateGraph, MemorySaver, MessagesAnnotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { db } from '../../db';
import * as s from '../../db/schema';
import { eq, sql, ilike } from 'drizzle-orm';
import { SystemMessage } from "@langchain/core/messages";

// Define tools
export const createContactTool = tool(
  async ({ name, type, email, phone }) => {
    if (type === 'vendor') {
      await db.insert(s.suppliers).values({ name, email, phone });
      return `Successfully created vendor: ${name}`;
    } else {
      await db.insert(s.customers).values({ name, email, phone, contactType: 'customer' });
      return `Successfully created customer: ${name}`;
    }
  },
  {
    name: "create_contact",
    description: "Creates a new customer or vendor in the database.",
    schema: z.object({
      name: z.string().describe("The name of the business or person"),
      type: z.enum(["customer", "vendor"]).describe("Whether they are a customer or vendor"),
      email: z.string().optional().describe("Contact email"),
      phone: z.string().optional().describe("Contact phone"),
    }),
  }
);

export const searchProductsTool = tool(
  async ({ query }) => {
    const results = await db.select({ name: s.products.name, sku: s.products.sku, price: s.products.wholesalePrice })
      .from(s.products)
      .where(ilike(s.products.name, `%${query}%`))
      .limit(5);
    return results.length > 0 ? JSON.stringify(results) : 'No products found matching query.';
  },
  {
    name: "search_products",
    description: "Search the inventory for products and their prices/stock.",
    schema: z.object({
      query: z.string().describe("The search query to match product names or SKUs"),
    }),
  }
);

export const getLowStockTool = tool(
  async () => {
    const lowStockData = await db.select({
      id: s.products.id,
      name: s.products.name,
      stock: sql<number>`COALESCE(SUM(${s.stockLevels.quantity}), 0)`.mapWith(Number),
    }).from(s.products)
      .leftJoin(s.stockLevels, eq(s.products.id, s.stockLevels.productId))
      .groupBy(s.products.id)
      .having(sql`COALESCE(SUM(${s.stockLevels.quantity}), 0) <= ${s.products.reorderLevel}`);
      
    if (lowStockData.length === 0) {
      return JSON.stringify({ message: "Great news! You currently have no products running low on stock." });
    }

    // Return the data directly, frontend will parse this as the widget data.
    return JSON.stringify({
      message: "Here are the products currently running low on stock. You can click 'Reorder' on any item.",
      widget: { type: 'LowStockTable', data: lowStockData }
    });
  },
  {
    name: "get_low_stock_widget",
    description: "If the user asks to see products that are low in stock, use this tool to generate a visual interactive table widget for them.",
    schema: z.object({}),
  }
);

export const createPurchaseOrderTool = tool(
  async ({ productId, supplierName, quantity }) => {
    const vendor = await db.select().from(s.suppliers).where(ilike(s.suppliers.name, `%${supplierName}%`)).limit(1);
    if (vendor.length === 0) {
      return `Error: Could not find any supplier matching "${supplierName}". Ask the user to clarify the supplier name.`;
    }
    
    const product = await db.select().from(s.products).where(eq(s.products.id, productId)).limit(1);
    if (product.length === 0) {
      return `Error: Product not found.`;
    }
    
    const poNum = `PO-${Date.now().toString().slice(-6)}`;
    const unitCost = product[0].wholesalePrice || '0';
    const totalAmount = String(parseFloat(unitCost) * quantity);
    
    const [po] = await db.insert(s.purchaseOrders).values({
      poNumber: poNum,
      supplierId: vendor[0].id,
      status: 'draft',
      subtotal: totalAmount,
      totalAmount: totalAmount,
    }).returning();

    await db.insert(s.purchaseOrderItems).values({
      purchaseOrderId: po.id,
      productId: product[0].id,
      quantity: quantity,
      unitCost: unitCost,
      totalCost: totalAmount,
    });

    return JSON.stringify({
      message: `I've successfully created Purchase Order **${poNum}** for ${quantity}x ${product[0].name} from ${vendor[0].name}.`,
      widget: { type: 'SuccessCard', data: { title: 'Purchase Order Created', message: `PO ${poNum} is now pending.` } }
    });
  },
  {
    name: "create_purchase_order",
    description: "Creates a purchase order (reorder) for a product from a supplier.",
    schema: z.object({
      productId: z.string().describe("The UUID of the product to reorder"),
      supplierName: z.string().describe("The name of the vendor/supplier to order from"),
      quantity: z.number().describe("The quantity to order"),
    }),
  }
);

export const requestPurchaseOrderDetailsTool = tool(
  async ({ productId, productName }) => {
    // Get all vendors/suppliers
    const suppliers = await db.select({ id: s.suppliers.id, name: s.suppliers.name }).from(s.suppliers);
    
    let productsList: any[] = [];
    if (!productId) {
      productsList = await db.select({ id: s.products.id, name: s.products.name }).from(s.products);
    }
    
    return JSON.stringify({
      message: "Please fill out the purchase order details below.",
      widget: { 
        type: 'PurchaseOrderForm', 
        data: { 
          productId, 
          productName,
          suppliers,
          products: productsList
        } 
      }
    });
  },
  {
    name: "request_purchase_order_details",
    description: "Returns a form widget for the user to select a supplier and quantity to create a purchase order. Call this when the user wants to reorder or create a purchase order but you need details.",
    schema: z.object({
      productId: z.string().optional().describe("The UUID of the product. Omit if the user hasn't specified one."),
      productName: z.string().optional().describe("The name of the product. Omit if the user hasn't specified one.")
    }),
  }
);

const tools = [createContactTool, searchProductsTool, getLowStockTool, createPurchaseOrderTool, requestPurchaseOrderDetailsTool];

import { MODEL } from '../../shared/ai';

const model = new ChatGroq({ 
  model: MODEL, 
  apiKey: process.env.GROQ_API_KEY 
}).bindTools(tools);

async function callModel(state: typeof MessagesAnnotation.State, config: any) {
  const { systemPrompt } = config.configurable;
  const messages = [new SystemMessage(systemPrompt), ...state.messages];
  const response = await model.invoke(messages);
  return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode(tools))
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    return (lastMessage as any).tool_calls?.length ? "tools" : "__end__";
  })
  .addEdge("tools", "agent");

const checkpointer = new MemorySaver();
export const agentApp = workflow.compile({ checkpointer });
