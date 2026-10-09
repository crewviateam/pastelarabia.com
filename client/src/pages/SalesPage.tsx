import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Plus, Search, Eye, Lock } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function SalesPage() {
  const { hasPermission, canSeePricing } = useAuth();
  const canEdit = hasPermission('sales', 'edit');
  const showPricing = canSeePricing('sales');

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/sales/orders?${params}`)
      .then(res => setOrders(Array.isArray(res) ? res : res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'badge-muted', confirmed: 'badge-info', processing: 'badge-warning',
      shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-error',
    };
    return map[s] || 'badge-muted';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sales Orders</h1>
          <p>Manage wholesale sales and orders</p>
        </div>
        <div className="page-actions">
          {canEdit && (
            <Link to="/sales/new" className="btn btn-primary"><Plus size={16} /> New Sale</Link>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
        <div style={{ padding: 'var(--space-base) var(--space-xl)' }}>
          <div className="filter-bar">
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} />
              <input className="form-input" placeholder="Search orders..." />
            </div>
            <select className="form-select" style={{ width: 160 }} value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body flush">
          {loading ? (
            
            <div style={{ padding: 'var(--space-xl)' }}>
              {[1,2,3,4,5,6].map(j => <div key={j} className="skeleton skeleton-table-row"></div>)}
            </div>

          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ShoppingCart size={28} /></div>
              <h3>No sales orders yet</h3>
              <p>Create your first sale to start tracking revenue.</p>
              {canEdit && (
                <Link to="/sales/new" className="btn btn-primary"><Plus size={16} /> New Sale</Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td><Link to={`/sales/${o.id}`} style={{ fontWeight: 600 }}>{o.orderNumber}</Link></td>
                      <td>{o.customerName}</td>
                      <td>{o.itemCount || '-'}</td>
                      <td style={{ fontWeight: 600, color: showPricing ? 'inherit' : 'var(--color-text-muted)' }}>
                        {showPricing ? `AED ${fmt(parseFloat(o.totalAmount))}` : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={12} /> Hidden</span>}
                      </td>
                      <td><span className={`badge ${statusBadge(o.status)}`}>{o.status}</span></td>
                      <td className="cell-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Link to={`/sales/${o.id}`} className="btn btn-ghost btn-sm"><Eye size={14} /> View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
