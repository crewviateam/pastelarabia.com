import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Building2, ArrowLeft, Phone, Mail, MapPin, Edit2, ShoppingCart, FileText, CreditCard } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function ContactDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [contact, setContact] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => {
    if (id) {
      const isVendor = location.pathname.includes('/vendors/');
      const endpoint = isVendor ? `/suppliers/${id}` : `/customers/${id}`;
      
      Promise.all([
        api.get(endpoint),
        api.get(`/sales/orders?customerId=${id}`),
        api.get(`/invoices?customerId=${id}`),
      ])
        .then(([c, o, i]) => {
          setContact(c);
          setOrders(Array.isArray(o) ? o : o.data || []);
          setInvoices(Array.isArray(i) ? i : i.data || []);
        })
        .catch(err => {
          showError('Failed to load contact details', err.message);
          navigate(-1);
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate, showError]);

  if (loading) return (
      <div>
        <div className="page-header">
          <div>
            <div className="skeleton skeleton-text title" style={{ width: '250px' }}></div>
            <div className="skeleton skeleton-text short" style={{ width: '150px' }}></div>
          </div>
          <div className="skeleton skeleton-box" style={{ width: '120px', height: '36px' }}></div>
        </div>
        <div className="grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
          {[1,2,3].map(i => (
             <div key={i} className="card">
               <div className="card-body"><div className="skeleton skeleton-text" style={{ height: '60px' }}></div></div>
             </div>
          ))}
        </div>
        <div className="card">
          <div className="card-body">
            {[1,2,3,4,5].map(j => <div key={j} className="skeleton skeleton-table-row"></div>)}
          </div>
        </div>
      </div>
    );
  if (!contact) return null;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>{contact.name}</h1>
            <div className="flex items-center gap-sm" style={{ marginTop: 4 }}>
              <span className={`badge ${contact.contactType === 'vendor' ? 'badge-info' : 'badge-primary'}`}>{contact.contactType}</span>
              <span className="cell-muted">Customer since {new Date(contact.createdAt).getFullYear()}</span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">
            <Edit2 size={16} /> Edit Contact
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ gap: 'var(--space-xl)' }}>
        <div>
          <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
            <div className="card-header">
              <h3>Contact Info</h3>
            </div>
            <div className="card-body">
              {contact.contactPerson && (
                <div style={{ marginBottom: 16 }}>
                  <div className="cell-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 2 }}>Contact Person</div>
                  <div style={{ fontWeight: 500 }}>{contact.contactPerson}</div>
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {contact.phone && (
                  <div className="flex items-center gap-sm">
                    <Phone size={16} className="cell-muted" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-sm">
                    <Mail size={16} className="cell-muted" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-center gap-sm">
                    <MapPin size={16} className="cell-muted" />
                    <span>{contact.address}{contact.city ? `, ${contact.city}` : ''}</span>
                  </div>
                )}
                {contact.trn && (
                  <div className="flex items-center gap-sm">
                    <Building2 size={16} className="cell-muted" />
                    <span>TRN: {contact.trn}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Financial Standing</h3>
            </div>
            <div className="card-body">
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Outstanding Balance</span>
                <span style={{ fontWeight: 600, color: parseFloat(contact.outstandingBalance) > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                  AED {fmt(parseFloat(contact.outstandingBalance || '0'))}
                </span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Credit Limit</span>
                <span style={{ fontWeight: 500 }}>AED {fmt(parseFloat(contact.creditLimit || '0'))}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Available Credit</span>
                <span style={{ fontWeight: 500 }}>
                  AED {fmt(Math.max(0, parseFloat(contact.creditLimit || '0') - parseFloat(contact.outstandingBalance || '0')))}
                </span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Payment Terms</span>
                <span>{contact.paymentTerms} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="cell-muted">Price Level</span>
                <span style={{ textTransform: 'capitalize' }}>{contact.priceLevel?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div style={{ padding: '0 var(--space-xl)', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 24 }}>
              <button 
                className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
                onClick={() => setActiveTab('sales')}
                style={{ padding: '16px 0', fontWeight: 500, color: activeTab === 'sales' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'sales' ? '2px solid var(--color-primary)' : '2px solid transparent' }}
              >
                <ShoppingCart size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
                Sales Orders
              </button>
              <button 
                className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
                style={{ padding: '16px 0', fontWeight: 500, color: activeTab === 'invoices' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'invoices' ? '2px solid var(--color-primary)' : '2px solid transparent' }}
              >
                <FileText size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />
                Invoices
              </button>
            </div>

            <div className="card-body flush">
              {activeTab === 'sales' && (
                orders.length === 0 ? (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No sales orders found for this contact.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => (
                          <tr key={o.id}>
                            <td style={{ fontWeight: 600 }}>{o.orderNumber}</td>
                            <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 500 }}>AED {fmt(parseFloat(o.totalAmount))}</td>
                            <td><span className="badge badge-muted">{o.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {activeTab === 'invoices' && (
                invoices.length === 0 ? (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No invoices found for this contact.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Balance Due</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(i => (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 600 }}>{i.invoiceNumber}</td>
                            <td>{new Date(i.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 500 }}>AED {fmt(parseFloat(i.totalAmount))}</td>
                            <td style={{ fontWeight: 600, color: parseFloat(i.balanceDue) > 0 ? 'var(--color-error)' : 'inherit' }}>
                              AED {fmt(parseFloat(i.balanceDue))}
                            </td>
                            <td><span className="badge badge-muted">{i.status.replace('_', ' ')}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
