import { Hono } from 'hono';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { authMiddleware } from '../../shared/auth';

const chatRoutes = new Hono();
chatRoutes.use('*', authMiddleware);

// GET /api/chat/users
chatRoutes.get('/users', async (c) => {
  const allUsers = await db.select({
    id: s.users.id,
    userId: s.users.id,
    name: s.users.name,
    role: s.users.role,
    avatar: s.users.avatar,
  }).from(s.users)
    .where(eq(s.users.isActive, true))
    .orderBy(s.users.name);
  return c.json(allUsers);
});

// GET /api/chat/conversations
chatRoutes.get('/conversations', async (c) => {
  const user = c.get('user') as any;

  const conversations = await db.select({
    id: s.chatConversations.id,
    name: s.chatConversations.name,
    type: s.chatConversations.type,
    updatedAt: s.chatConversations.updatedAt,
    lastReadAt: s.chatParticipants.lastReadAt,
  }).from(s.chatParticipants)
    .innerJoin(s.chatConversations, eq(s.chatParticipants.conversationId, s.chatConversations.id))
    .where(eq(s.chatParticipants.userId, user.userId))
    .orderBy(desc(s.chatConversations.updatedAt));

  // Get last message & unread count for each
  const result = await Promise.all(conversations.map(async (conv) => {
    const [lastMsg] = await db.select({
      content: s.chatMessages.content,
      senderName: s.users.name,
      createdAt: s.chatMessages.createdAt,
    }).from(s.chatMessages)
      .innerJoin(s.users, eq(s.chatMessages.senderId, s.users.id))
      .where(eq(s.chatMessages.conversationId, conv.id))
      .orderBy(desc(s.chatMessages.createdAt))
      .limit(1);

    const [unread] = await db.select({
      count: sql<number>`COUNT(*)`,
    }).from(s.chatMessages)
      .where(and(
        eq(s.chatMessages.conversationId, conv.id),
        conv.lastReadAt
          ? sql`${s.chatMessages.createdAt} > ${conv.lastReadAt.toISOString()}`
          : sql`1=1`,
        sql`${s.chatMessages.senderId} != ${user.userId}`
      ));

    // Get participants
    const participants = await db.select({
      userId: s.users.id,
      name: s.users.name,
      avatar: s.users.avatar,
    }).from(s.chatParticipants)
      .innerJoin(s.users, eq(s.chatParticipants.userId, s.users.id))
      .where(eq(s.chatParticipants.conversationId, conv.id));

    return {
      ...conv,
      lastMessage: lastMsg || null,
      unreadCount: unread?.count || 0,
      participants,
    };
  }));

  return c.json(result);
});

// GET /api/chat/conversations/:id/messages
chatRoutes.get('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id');
  const { before, limit = '50' } = c.req.query();

  const conditions = [eq(s.chatMessages.conversationId, id)];
  if (before) {
    conditions.push(sql`${s.chatMessages.createdAt} < ${before}::timestamp`);
  }

  const messages = await db.select({
    id: s.chatMessages.id,
    conversationId: s.chatMessages.conversationId,
    senderId: s.chatMessages.senderId,
    senderName: s.users.name,
    senderAvatar: s.users.avatar,
    content: s.chatMessages.content,
    messageType: s.chatMessages.messageType,
    metadata: s.chatMessages.metadata,
    createdAt: s.chatMessages.createdAt,
  }).from(s.chatMessages)
    .innerJoin(s.users, eq(s.chatMessages.senderId, s.users.id))
    .where(and(...conditions))
    .orderBy(desc(s.chatMessages.createdAt))
    .limit(parseInt(limit));

  return c.json(messages.reverse());
});

// POST /api/chat/conversations — create direct or group chat
chatRoutes.post('/conversations', async (c) => {
  const body = await c.req.json();
  const user = c.get('user') as any;

  // For direct: check existing
  if (body.type === 'direct' && body.participantId) {
    const existing = await db.select({
      conversationId: s.chatParticipants.conversationId,
    }).from(s.chatParticipants)
      .innerJoin(s.chatConversations, eq(s.chatParticipants.conversationId, s.chatConversations.id))
      .where(and(
        eq(s.chatParticipants.userId, user.userId),
        eq(s.chatConversations.type, 'direct'),
      ));

    for (const conv of existing) {
      const [otherParticipant] = await db.select().from(s.chatParticipants)
        .where(and(
          eq(s.chatParticipants.conversationId, conv.conversationId),
          eq(s.chatParticipants.userId, body.participantId),
        )).limit(1);
      if (otherParticipant) {
        return c.json({ id: conv.conversationId, existing: true });
      }
    }
  }

  const [conversation] = await db.insert(s.chatConversations).values({
    name: body.name || null,
    type: body.type || 'direct',
  }).returning();

  // Add creator
  await db.insert(s.chatParticipants).values({
    conversationId: conversation.id,
    userId: user.userId,
  });

  // Add other participants
  const participantIds = body.type === 'direct'
    ? [body.participantId]
    : (body.participantIds || []);

  for (const pid of participantIds) {
    if (pid !== user.userId) {
      await db.insert(s.chatParticipants).values({
        conversationId: conversation.id,
        userId: pid,
      });
    }
  }

  return c.json(conversation, 201);
});

// GET /api/chat/users — list available users to chat with
chatRoutes.get('/users', async (c) => {
  const user = c.get('user') as any;
  const users = await db.select({
    id: s.users.id,
    name: s.users.name,
    email: s.users.email,
    avatar: s.users.avatar,
    role: s.users.role,
  }).from(s.users)
    .where(and(eq(s.users.isActive, true), sql`${s.users.id} != ${user.userId}`));
  return c.json(users);
});

export default chatRoutes;
