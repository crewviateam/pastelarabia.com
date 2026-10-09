import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Search, Send, Plus, MoreVertical, MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load conversations and staff for new chats
    Promise.all([
      api.get('/chat/conversations').then(setConversations),
      api.get('/chat/users').then(setStaff)
    ]).finally(() => setLoading(false));

    // Initialize WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:3000/ws/chat`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', userId: user?.id }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        // Update messages if we are in this conversation
        setMessages(prev => {
          if (data.conversationId === activeConvId) {
            return [...prev, data.message];
          }
          return prev;
        });

        // Update conversation list to bump it and update last message
        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.id === data.conversationId) {
              const isSenderMe = data.message?.senderId === user?.id;
              const isConvActive = c.id === activeConvId;
              
              return {
                ...c,
                lastMessage: data.message,
                unreadCount: (isConvActive || isSenderMe) ? 0 : c.unreadCount + 1,
                updatedAt: new Date().toISOString()
              };
            }
            return c;
          });
          // Sort by updated at
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
        
        if (data.conversationId === activeConvId) {
          ws.send(JSON.stringify({ type: 'mark_read', conversationId: activeConvId }));
        }
      } else if (data.type === 'auth_success') {
        if (data.onlineUsers) {
          setOnlineUsers(new Set(data.onlineUsers));
        }
      } else if (data.type === 'user_online') {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(data.userId);
          return newSet;
        });
      } else if (data.type === 'user_offline') {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [user?.id, activeConvId]);

  useEffect(() => {
    if (activeConvId) {
      api.get(`/chat/conversations/${activeConvId}/messages`).then(data => {
        setMessages(data.reverse()); // Messages usually come back newest first from DB, we want oldest first for chat
        scrollToBottom();
      });
      // Emit mark read over WS and HTTP
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'mark_read', conversationId: activeConvId }));
      }
      
      // Update local unread count
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unreadCount: 0 } : c));
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConvId || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'send_message',
      conversationId: activeConvId,
      content: input,
      senderName: user?.name
    }));

    setInput('');
  };

  const handleCreateChat = async (targetUserId: string) => {
    try {
      // Create new DM
      const res = await api.post('/chat/conversations', {
        type: 'direct',
        participantId: targetUserId
      });
      
      const newConv = {
        id: res.id,
        type: 'direct',
        participants: staff.filter(s => s.userId === targetUserId || s.userId === user?.id).map(s => ({ userId: s.userId, name: s.name })),
        unreadCount: 0,
        updatedAt: new Date().toISOString()
      };
      
      setConversations(prev => {
        if (!prev.some(c => c.id === res.id)) {
          return [newConv, ...prev];
        }
        return prev;
      });
      
      setActiveConvId(res.id);
      setShowNewChat(false);
    } catch (err) {
      console.error('Failed to create chat', err);
    }
  };

  const getChatName = (conv: any) => {
    if (!conv) return 'Unknown User';
    if (conv.type === 'group') return conv.name || 'Group Chat';
    const otherParticipant = conv.participants?.find((p: any) => p.userId !== user?.id);
    return otherParticipant?.name || 'Unknown User';
  };

  if (loading) return (
    <div style={{ padding: 'var(--space-xl)' }}>
      <div className="skeleton skeleton-text title" style={{ width: '200px' }}></div>
      <div className="skeleton skeleton-text short" style={{ width: '300px' }}></div>
      <div className="skeleton skeleton-card" style={{ marginTop: '24px' }}></div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--header-height) - 48px)', gap: 16 }}>
      
      {/* Sidebar: Conversation List */}
      <div className="card" style={{ width: 340, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Messages</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowNewChat(true)}>
            <Plus size={18} />
          </button>
        </div>
        
        {showNewChat ? (
          <div style={{ padding: 16, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 8 }}>Start a conversation</div>
            {staff.filter(s => s.userId !== user?.id).map(s => (
              <div key={s.id} onClick={() => handleCreateChat(s.userId)} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-bg-muted)', marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                  {s.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{s.name}</div>
                  <div className="cell-muted" style={{ fontSize: 'var(--text-xs)' }}>{s.role.replace('_', ' ')}</div>
                </div>
                {onlineUsers.has(s.userId) && <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-success)', marginLeft: 'auto' }} title="Online" />}
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowNewChat(false)}>Cancel</button>
          </div>
        ) : (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <div className="search-input-wrapper">
              <Search size={16} />
              <input className="form-input" placeholder="Search messages..." />
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No conversations yet.
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.id === activeConvId;
              const chatName = getChatName(conv);
              const otherParticipantId = conv.participants?.find((p: any) => p.userId !== user?.id)?.userId;
              const isOnline = otherParticipantId && onlineUsers.has(otherParticipantId);

              return (
                <div 
                  key={conv.id} 
                  onClick={() => setActiveConvId(conv.id)}
                  style={{ 
                    padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--color-bg-muted)',
                    background: isActive ? 'var(--color-primary-50)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent'
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: conv.type === 'group' ? 'var(--color-accent)' : 'var(--color-bg-subtle)', color: conv.type === 'group' ? 'white' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                    {chatName.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <div style={{ fontWeight: isActive || conv.unreadCount > 0 ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {chatName}
                        {isOnline && <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--color-success)' }} title="Online" />}
                      </div>
                      <div className="cell-muted" style={{ fontSize: 'var(--text-xs)', flexShrink: 0 }}>
                        {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="cell-muted" style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: conv.unreadCount > 0 ? 500 : 400, color: conv.unreadCount > 0 ? 'var(--color-text)' : undefined }}>
                        {conv.lastMessage ? `${conv.lastMessage.senderName}: ${conv.lastMessage.content}` : 'No messages'}
                      </div>
                      {conv.unreadCount > 0 && (
                        <div style={{ background: 'var(--color-primary)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, flexShrink: 0 }}>
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeConvId ? (
          (() => {
            const activeConv = conversations.find(c => c.id === activeConvId);
            const otherParticipantId = activeConv?.participants?.find((p: any) => p.userId !== user?.id)?.userId;
            const isOnline = otherParticipantId && onlineUsers.has(otherParticipantId);
            
            return (
              <>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>
                      {getChatName(activeConv)}
                    </div>
                    {isOnline && <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-success)' }} title="Online"></div>}
                  </div>
              <button className="btn btn-ghost btn-icon">
                <MoreVertical size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id;
                const showSender = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                
                return (
                  <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {showSender && <div className="cell-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 4, marginLeft: 12 }}>{msg.senderName}</div>}
                    <div style={{
                      maxWidth: '70%',
                      padding: '10px 14px',
                      borderRadius: 16,
                      background: isMe ? 'var(--color-primary)' : 'var(--color-bg-muted)',
                      color: isMe ? 'white' : 'var(--color-text)',
                      borderBottomRightRadius: isMe ? 4 : 16,
                      borderBottomLeftRadius: !isMe ? 4 : 16,
                      fontSize: 'var(--text-sm)',
                      lineHeight: 1.5
                    }}>
                      {msg.content}
                    </div>
                    <div className="cell-muted" style={{ fontSize: 10, marginTop: 4, marginRight: isMe ? 4 : 0, marginLeft: !isMe ? 4 : 0 }}>
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: 16, borderTop: '1px solid var(--color-border)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 12 }}>
                <input 
                  className="form-input" 
                  style={{ flex: 1, borderRadius: 24, padding: '10px 20px' }}
                  placeholder="Type a message..." 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ borderRadius: 24, width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={!input.trim()}
                >
                  <Send size={18} style={{ marginLeft: -2 }} />
                </button>
              </form>
            </div>
              </>
            );
          })()
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <MessageSquare size={32} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Your Messages</h3>
            <p>Select a conversation or start a new chat with your team.</p>
          </div>
        )}
      </div>
    </div>
  );
}
