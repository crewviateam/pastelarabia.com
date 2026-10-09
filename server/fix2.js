const fs = require('fs');

let aiRoutes = fs.readFileSync('src/domains/ai/routes.ts', 'utf8');
aiRoutes = aiRoutes.replace(/JSON\.parse\(msg\.content\)/g, 'JSON.parse(msg.content as string)');
aiRoutes = aiRoutes.replace(/response: lastMessage\.content/g, 'response: lastMessage.content as string');
fs.writeFileSync('src/domains/ai/routes.ts', aiRoutes);

let dashRoutes = fs.readFileSync('src/domains/inventory/dashboard.routes.ts', 'utf8');
dashRoutes = dashRoutes.replace(/salesData\.rows/g, '(salesData as any).rows');
dashRoutes = dashRoutes.replace(/expenseData\.rows/g, '(expenseData as any).rows');
dashRoutes = dashRoutes.replace(/data\.rows/g, '(data as any).rows');
fs.writeFileSync('src/domains/inventory/dashboard.routes.ts', dashRoutes);

console.log('Fixed types');
