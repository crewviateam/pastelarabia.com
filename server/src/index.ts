import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { db } from './db';
import * as s from './db/schema';
import { authMiddleware } from './shared/auth';
import { eq, sql } from 'drizzle-orm';

// Import Routes
import auth from './domains/auth/routes';
import dashboard from './domains/inventory/dashboard.routes';
import inventory from './domains/inventory/routes';
import customers from './domains/customers/routes';
import suppliers from './domains/suppliers/routes';
import sales from './domains/sales/routes';
import ai from './domains/ai/routes';
import branches from './domains/settings/branches.routes';
import purchases from './domains/purchasing/routes';
import invoicing from './domains/invoicing/routes';
import payments from './domains/payments/routes';
import staffRoutes from './domains/staff/routes';
import chatRoutes from './domains/chat/routes';
import notifications from './domains/notifications/routes';
import whatsappRoutes from './domains/whatsapp/routes';
import shopify from './domains/integrations/shopify';
import { initWhatsApp, whatsappClient } from './shared/whatsapp';

// Initialize WhatsApp Client (in background)
initWhatsApp();

// Graceful shutdown to prevent Chrome zombie processes
const cleanup = async () => {
  console.log('Shutting down server, closing WhatsApp client...');
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
    } catch (e) {
      // ignore
    }
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGUSR2', cleanup); // for nodemon

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://pastelarabia-com-sigma.vercel.app', 'https://pastelarabia.com'],
  credentials: true,
}));

// Setup WebSocket
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Store active connections for broadcasting
const activeConnections = new Map<string, { ws: any; userId: string }>();

// WebSocket Chat Endpoint
app.get('/ws/chat', upgradeWebSocket((c) => {
  const connectionId = Math.random().toString(36).substring(7);
  let userId = '';

  return {
    onOpen(_event, ws) {
      console.log(`WS Connection opened: ${connectionId}`);
    },
    async onMessage(event, ws) {
      try {
        const data = JSON.parse(event.data.toString());

        // Auth handshake
        if (data.type === 'auth') {
          userId = data.userId;
          activeConnections.set(connectionId, { ws, userId });
          
          const onlineUsers = Array.from(activeConnections.values()).map(c => c.userId);
          ws.send(JSON.stringify({ type: 'auth_success', onlineUsers }));
          
          // Broadcast online status
          broadcastToAll({ type: 'user_online', userId }, connectionId);
          return;
        }

        if (!userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }

        if (data.type === 'send_message') {
          // Save to DB
          const [msg] = await db.insert(s.chatMessages).values({
            conversationId: data.conversationId,
            senderId: userId,
            content: data.content,
            messageType: data.messageType || 'text',
            metadata: data.metadata || null,
          }).returning();

          // Update conversation
          await db.update(s.chatConversations).set({
            updatedAt: new Date(),
          }).where(eq(s.chatConversations.id, data.conversationId));

          // Get participants to broadcast to
          const participants = await db.select({
            userId: s.chatParticipants.userId,
          }).from(s.chatParticipants)
            .where(eq(s.chatParticipants.conversationId, data.conversationId));

          const participantIds = participants.map(p => p.userId);

          // Broadcast to participants
          const broadcastMsg = JSON.stringify({
            type: 'new_message',
            message: { ...msg, senderName: data.senderName },
            conversationId: data.conversationId,
          });

          for (const [id, conn] of activeConnections.entries()) {
            if (participantIds.includes(conn.userId)) {
              conn.ws.send(broadcastMsg);
            }
          }
        }

        if (data.type === 'typing') {
          // Broadcast typing indicator
          const participants = await db.select({
            userId: s.chatParticipants.userId,
          }).from(s.chatParticipants)
            .where(eq(s.chatParticipants.conversationId, data.conversationId));

          const broadcastMsg = JSON.stringify({
            type: 'typing',
            userId,
            userName: data.userName,
            conversationId: data.conversationId,
          });

          for (const [id, conn] of activeConnections.entries()) {
            if (conn.userId !== userId && participants.some(p => p.userId === conn.userId)) {
              conn.ws.send(broadcastMsg);
            }
          }
        }

        if (data.type === 'mark_read') {
          await db.update(s.chatParticipants).set({
            lastReadAt: new Date(),
          }).where(
            sql`${s.chatParticipants.conversationId} = ${data.conversationId} AND ${s.chatParticipants.userId} = ${userId}`
          );
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    },
    onClose() {
      console.log(`WS Connection closed: ${connectionId}`);
      if (userId) {
        broadcastToAll({ type: 'user_offline', userId }, connectionId);
      }
      activeConnections.delete(connectionId);
    },
  };
}));

function broadcastToAll(data: any, excludeId?: string) {
  const msg = JSON.stringify(data);
  for (const [id, conn] of activeConnections.entries()) {
    if (id !== excludeId) {
      conn.ws.send(msg);
    }
  }
}

// API Routes
app.route('/api/auth', auth);
app.route('/api/dashboard', dashboard);
app.route('/api/inventory', inventory);
app.route('/api/customers', customers);
app.route('/api/suppliers', suppliers);
app.route('/api/sales', sales);
app.route('/api/ai', ai);
app.route('/api/branches', branches);
app.route('/api/purchases', purchases);
app.route('/api/invoices', invoicing);
app.route('/api/payments', payments);
app.route('/api/staff', staffRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/notifications', notifications);
app.route('/api/whatsapp', whatsappRoutes);
app.route('/api/integrations/shopify', shopify);

app.get('/', (c) => {
  return c.text('Glow Wholesale API is running!');
});

const port = parseInt(process.env.PORT || '3000');
console.log(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port
});

injectWebSocket(server);
