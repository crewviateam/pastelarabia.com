import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Search, DollarSign, AlertTriangle, CheckCircle, Lock } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function InvoicesPage() {
  const { canSeePricing } = useAuth();
  const showPricing = canSeePricing('sales'); // invoices are part of sales module
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    api.get('/invoices/stats').then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/invoices?${params}`)
      .then(res => setInvoices(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      paid: 'badge-success', unpaid: 'badge-warning', overdue: 'badge-error',
      partially_paid: 'badge-info', draft: 'badge-muted', cancelled: 'badge-muted',
    };
    return m[s] || 'badge-muted';
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Invoices</h1><p>Track sales invoices and payments</p></div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon primary"><FileText size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Total Invoices</div>
              <div className="stat-card-value">{stats.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><DollarSign size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Total Received</div>
              <div className="stat-card-value">AED {fmt(stats.totalPaid)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon amber"><AlertTriangle size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Outstanding</div>
              <div className="stat-card-value">AED {fmt(stats.totalOutstanding)}</div>
              <div className="stat-card-change down">{stats.unpaid} unpaid</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon red"><AlertTriangle size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Overdue</div>
              <div className="stat-card-value">{stats.overdue}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
        <div style={{ padding: 'var(--space-base) var(--space-xl)' }}>
          <div className="filter-bar">
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} />
              <input className="form-input" placeholder="Search invoices..." />
            </div>
            <select className="form-select" style={{ width: 160 }} value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
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

          ) : invoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileText size={28} /></div>
              <h3>No invoices yet</h3>
              <p>Invoices are auto-generated when you confirm a sale.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td><Link to={`/invoices/${inv.id}`} style={{ fontWeight: 600 }}>{inv.invoiceNumber}</Link></td>
                      <td>{inv.customerName}</td>
                      <td style={{ fontWeight: 500 }}>
                        {showPricing ? `AED ${fmt(parseFloat(inv.totalAmount))}` : <span className="cell-muted flex items-center gap-xs"><Lock size={12}/></span>}
                      </td>
                      <td>
                        {showPricing ? `AED ${fmt(parseFloat(inv.paidAmount))}` : <span className="cell-muted flex items-center gap-xs"><Lock size={12}/></span>}
                      </td>
                      <td style={{ fontWeight: 600, color: parseFloat(inv.balanceDue) > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                        {showPricing ? `AED ${fmt(parseFloat(inv.balanceDue))}` : <span className="cell-muted flex items-center gap-xs"><Lock size={12}/></span>}
                      </td>
                      <td><span className={`badge ${statusColor(inv.status)}`}>{inv.status.replace('_', ' ')}</span></td>
                      <td className="cell-muted">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</td>
                      <td>
                        <Link to={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">View</Link>
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
