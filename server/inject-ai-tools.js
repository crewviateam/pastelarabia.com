const fs = require('fs');
const path = require('path');

const agentFile = path.join(__dirname, 'src', 'domains', 'ai', 'agent.ts');
let content = fs.readFileSync(agentFile, 'utf8');

const newTools = `
export const getTodaysSalesSummaryTool = tool(
  async () => {
    const result = await db.execute(sql\`
      SELECT 
        COUNT(id) as total_orders,
        COALESCE(SUM(total_amount::numeric), 0) as total_revenue
      FROM invoices 
      WHERE created_at >= current_date
    \`);
    const data = (result as any).rows ? (result as any).rows[0] : result[0];
    
    if (parseFloat(data.total_revenue) === 0) {
      const recent = await db.execute(sql\`
        SELECT COUNT(id) as total_orders, COALESCE(SUM(total_amount::numeric), 0) as total_revenue FROM invoices WHERE created_at >= current_date - interval '30 days'
      \`);
      const recentData = (recent as any).rows ? (recent as any).rows[0] : recent[0];
      return JSON.stringify({ message: "There are no sales for today yet. However, in the last 30 days, you had " + recentData.total_orders + " orders totaling AED " + recentData.total_revenue + "." });
    }
    
    return JSON.stringify({ message: "Today you have " + data.total_orders + " orders totaling AED " + data.total_revenue + ". Keep up the great work!" });
  },
  {
    name: "get_todays_sales_summary",
    description: "Use this to answer 'Show me today's sales summary'.",
    schema: z.object({}),
  }
);

export const getOverdueInvoicesTool = tool(
  async () => {
    const overdue = await db.execute(sql\`
      SELECT i.invoice_number, i.total_amount, TO_CHAR(i.due_date, 'YYYY-MM-DD') as due_date, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.status = 'overdue'
      ORDER BY i.due_date ASC
      LIMIT 10
    \`);
    const rows = (overdue as any).rows || overdue;
    if (!rows || rows.length === 0) return JSON.stringify({ message: "Great news! You have no overdue invoices." });
    
    // Create a markdown table
    let md = "Here are your overdue invoices:\\n\\n| Invoice | Customer | Due Date | Amount |\\n|---|---|---|---|\\n";
    rows.forEach(r => {
      md += \`| \${r.invoice_number} | \${r.customer_name} | \${r.due_date} | AED \${r.total_amount} |\\n\`;
    });
    
    return JSON.stringify({ message: md });
  },
  {
    name: "get_overdue_invoices",
    description: "Use this to answer 'List all overdue invoices'. Returns overdue invoices.",
    schema: z.object({}),
  }
);

export const getTopCustomersTool = tool(
  async () => {
    const top = await db.execute(sql\`
      SELECT c.name, COALESCE(SUM(i.total_amount::numeric), 0) as total_revenue, COUNT(i.id) as total_orders
      FROM customers c
      JOIN invoices i ON c.id = i.customer_id
      GROUP BY c.name
      ORDER BY total_revenue DESC
      LIMIT 5
    \`);
    const rows = (top as any).rows || top;
    
    let md = "Here are your top 5 customers by revenue:\\n\\n| Customer | Total Revenue | Orders |\\n|---|---|---|\\n";
    rows.forEach(r => {
      md += \`| \${r.name} | AED \${parseFloat(r.total_revenue).toLocaleString()} | \${r.total_orders} |\\n\`;
    });
    return JSON.stringify({ message: md });
  },
  {
    name: "get_top_customers",
    description: "Use this to answer 'Who are my top 5 customers by revenue?'.",
    schema: z.object({}),
  }
);
`;

if (!content.includes('getTodaysSalesSummaryTool')) {
  // Insert before the tools array
  content = content.replace(
    'const tools = [',
    newTools + '\nconst tools = [getTodaysSalesSummaryTool, getOverdueInvoicesTool, getTopCustomersTool, '
  );
  fs.writeFileSync(agentFile, content, 'utf8');
  console.log('Tools injected successfully!');
} else {
  console.log('Tools already exist.');
}
