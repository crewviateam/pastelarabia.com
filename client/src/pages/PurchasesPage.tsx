import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Truck, Plus, Search, X, Package, Lock } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function PurchasesPage() {
  const { success, error: showError } = useToast();
  const { hasPermission, canSeePricing } = useAuth();
  const canEdit = hasPermission('purchase', 'edit');
  const showPricing = canSeePricing('purchase');

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/purchases').then(r => setOrders(r.data || []))
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/purchases?${params}`).then(r => setOrders(r.data || [])).catch(console.error).finally(() => setLoading(false));
  }, [statusFilter]);



  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      draft: 'badge-muted', ordered: 'badge-info', partially_received: 'badge-warning',
      received: 'badge-success', cancelled: 'badge-error',
    };
    return m[s] || 'badge-muted';
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Purchase Orders</h1><p>Manage supplier orders and stock receiving</p></div>
        <div className="page-actions">
          {canEdit && (
            <Link to="/purchases/new" className="btn btn-primary"><Plus size={16} /> New Purchase</Link>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
        <div style={{ padding: 'var(--space-base) var(--space-xl)' }}>
          <div className="filter-bar">
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} />
              <input className="form-input" placeholder="Search purchase orders..." />
            </div>
            <select className="form-select" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="ordered">Ordered</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received</option>
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
              <div className="empty-state-icon"><Truck size={28} /></div>
              <h3>No purchase orders</h3>
              <p>Create purchase orders to replenish your inventory from suppliers.</p>
              {canEdit && (
                <Link to="/purchases/new" className="btn btn-primary"><Plus size={16} /> New Purchase</Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Supplier</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Expected</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.poNumber}</td>
                      <td>{o.supplierName}</td>
                      <td style={{ fontWeight: 500, color: showPricing ? 'inherit' : 'var(--color-text-muted)' }}>
                        {showPricing ? `AED ${fmt(parseFloat(o.totalAmount))}` : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={12} /> Hidden</span>}
                      </td>
                      <td><span className={`badge ${statusBadge(o.status)}`}>{o.status.replace('_', ' ')}</span></td>
                      <td className="cell-muted">{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '-'}</td>
                      <td className="cell-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td><Link to={`/purchases/${o.id}`} className="btn btn-ghost btn-sm">View</Link></td>
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
