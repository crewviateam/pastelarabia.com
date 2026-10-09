import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, Sparkles, Package, FileText, Users, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  widget?: any;
}

const suggestions = [
  { icon: <TrendingUp size={16} />, text: 'Show me today\'s sales summary' },
  { icon: <Package size={16} />, text: 'Which products are running low on stock?' },
  { icon: <FileText size={16} />, text: 'List all overdue invoices' },
  { icon: <Users size={16} />, text: 'Who are my top 5 customers by revenue?' },
];

export default function AIAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: messageText,
        context: {
          userName: user?.name,
          userRole: user?.role,
        },
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.response || response.message || response.reply || response.content || "I couldn't generate a response.",
        timestamp: new Date().toISOString(),
        widget: response.widget,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Failed to get response from AI'}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - 48px)' }}>
      <div className="page-header" style={{ marginBottom: 'var(--space-base)' }}>
        <div>
          <h1 className="flex items-center gap-sm"><Sparkles size={24} style={{ color: 'var(--color-accent)' }} /> AI Assistant</h1>
          <p>Ask questions about your business data and get instant insights</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-xl)' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{
                width: 72, height: 72, margin: '0 auto 20px',
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-rose))',
                borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={32} color="white" />
              </div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 8 }}>
                Hi {user?.name?.split(' ')[0]}! How can I help?
              </h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                I can analyze your sales data, check inventory levels, summarize outstanding payments, and more.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxWidth: 500, margin: '0 auto' }}>
                {suggestions.map((s, i) => (
                  <button key={i} className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                    onClick={() => sendMessage(s.text)}>
                    {s.icon}
                    <span style={{ fontSize: 'var(--text-sm)' }}>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12,
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(135deg, var(--color-accent), var(--color-rose))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Bot size={16} color="white" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '85%', padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-muted)',
                    color: msg.role === 'user' ? 'white' : 'var(--color-text)',
                    fontSize: 'var(--text-sm)', lineHeight: 1.6, overflowX: 'auto',
                  }}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, marginBottom: 8 }} {...props} />,
                          th: ({node, ...props}) => <th style={{ borderBottom: '1px solid var(--color-border-light)', padding: '8px', textAlign: 'left', fontWeight: 'bold' }} {...props} />,
                          td: ({node, ...props}) => <td style={{ borderBottom: '1px solid var(--color-border-light)', padding: '8px' }} {...props} />,
                          a: ({node, ...props}) => <a style={{ color: 'var(--color-primary)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" {...props} />,
                          p: ({node, ...props}) => <p style={{ marginBottom: 8 }} {...props} />,
                          ul: ({node, ...props}) => <ul style={{ paddingLeft: 20, marginBottom: 8, listStyleType: 'disc' }} {...props} />,
                          ol: ({node, ...props}) => <ol style={{ paddingLeft: 20, marginBottom: 8, listStyleType: 'decimal' }} {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    )}
                  
                  {/* GENERATIVE UI WIDGETS */}
                  {msg.widget && msg.widget.type === 'LowStockTable' && (
                    <div style={{ marginTop: 12, background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden', width: '100%', minWidth: 400 }}>
                      <table className="table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Stock</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {msg.widget.data.map((item: any) => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td><span className="badge badge-error">{item.stock} left</span></td>
                              <td>
                                <button className="btn btn-sm btn-primary" onClick={() => sendMessage(`I want to reorder product ID: ${item.id} (${item.name}). Please use the request_purchase_order_details tool to give me a form to fill out.`)}>
                                  Reorder
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {msg.widget && msg.widget.type === 'SuccessCard' && (
                    <div style={{ marginTop: 12, background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-success)', padding: 16, width: '100%', minWidth: 300 }}>
                      <div style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={20} /> {msg.widget.data.title}
                      </div>
                      <p style={{ marginTop: 8, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{msg.widget.data.message}</p>
                    </div>
                  )}

                  {msg.widget && msg.widget.type === 'PurchaseOrderForm' && (
                    <div style={{ marginTop: 12, background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: 16, width: '100%', minWidth: 350 }}>
                      <h4 style={{ marginBottom: 12, fontWeight: 600 }}>Create Purchase Order</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {msg.widget.data.productId ? (
                          <p style={{ marginBottom: 4, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Product: {msg.widget.data.productName}</p>
                        ) : (
                          <div>
                            <label style={{ display: 'block', fontSize: 'var(--text-xs)', marginBottom: 4 }}>Select Product</label>
                            <select 
                              id={`product-${i}`}
                              className="form-input" 
                              style={{ width: '100%' }}
                            >
                              <option value="">-- Choose Product --</option>
                              {msg.widget.data.products?.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label style={{ display: 'block', fontSize: 'var(--text-xs)', marginBottom: 4 }}>Select Supplier</label>
                          <select 
                            id={`supplier-${i}`}
                            className="form-input" 
                            style={{ width: '100%' }}
                          >
                            <option value="">-- Choose Supplier --</option>
                            {msg.widget.data.suppliers.map((sup: any) => (
                              <option key={sup.id} value={sup.name}>{sup.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 'var(--text-xs)', marginBottom: 4 }}>Quantity</label>
                          <input 
                            id={`qty-${i}`}
                            type="number" 
                            className="form-input" 
                            style={{ width: '100%' }}
                            defaultValue={100}
                          />
                        </div>
                        <button 
                          className="btn btn-primary"
                          style={{ marginTop: 8 }}
                          onClick={() => {
                            const supplier = (document.getElementById(`supplier-${i}`) as HTMLSelectElement).value;
                            const qty = (document.getElementById(`qty-${i}`) as HTMLInputElement).value;
                            let pId = msg.widget.data.productId;
                            if (!pId) {
                               const pSelect = document.getElementById(`product-${i}`) as HTMLSelectElement;
                               if(pSelect) pId = pSelect.value;
                            }
                            if (!supplier || !qty || !pId) {
                              alert("Please select a product, a supplier and enter a quantity.");
                              return;
                            }
                            sendMessage(`Confirm purchase order for product ID: ${pId}, supplier: ${supplier}, quantity: ${qty}`);
                          }}
                        >
                          Send Details
                        </button>
                      </div>
                    </div>
                  )}

                  </div>
                  {msg.role === 'user' && (
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-full)',
                      background: 'var(--color-primary-100)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      color: 'var(--color-primary)',
                    }}>
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--color-accent), var(--color-rose))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Bot size={16} color="white" />
                  </div>
                  <div style={{
                    padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
                    background: 'var(--color-bg-muted)',
                  }}>
                    <div className="flex items-center gap-sm">
                      <div className="loading-spinner" />
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          borderTop: '1px solid var(--color-border-light)',
          padding: 'var(--space-base) var(--space-xl)',
          background: 'var(--color-bg-card)',
        }}>
          <div className="flex items-center gap-sm">
            <textarea
              className="form-input"
              placeholder="Ask about sales, inventory, customers..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{
                flex: 1, resize: 'none', minHeight: 42, maxHeight: 120,
                paddingTop: 10, paddingBottom: 10,
              }}
            />
            <button className="btn btn-primary btn-icon" onClick={() => sendMessage()}
              disabled={!input.trim() || loading} style={{ height: 42, width: 42 }}>
              <Send size={18} />
            </button>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 6, textAlign: 'center' }}>
            AI can analyze your business data. Press Enter to send, Shift+Enter for new line.
          </div>
        </div>
      </div>
    </div>
  );
}
