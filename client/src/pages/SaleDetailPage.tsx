import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { ShoppingCart, ArrowLeft, Printer, FileText } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/sales/orders/${id}`)
        .then(setSale)
        .catch(err => {
          showError('Failed to load sale', err.message);
          navigate('/sales');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate, showError]);

  const handleConvertToInvoice = async () => {
    setConverting(true);
    try {
      const res = await api.post(`/sales/orders/${id}/convert-invoice`);
      success('Invoice generated successfully');
      navigate(`/invoices/${res.id || ''}`);
    } catch (err: any) {
      showError('Failed to convert to invoice', err.message);
    } finally {
      setConverting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.put(`/sales/orders/${id}/status`, { status: newStatus });
      setSale((prev: any) => ({ ...prev, status: newStatus }));
      success(`Order marked as ${newStatus}`);
    } catch (err: any) {
      showError('Failed to update status', err.message);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'badge-muted', confirmed: 'badge-info', processing: 'badge-warning',
      shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-error',
    };
    return map[s] || 'badge-muted';
  };

  if (loading) {
    return (
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
  }

  if (!sale) return null;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/sales')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Sale Order: {sale.orderNumber}</h1>
            <div className="flex items-center gap-sm" style={{ marginTop: 4 }}>
              <span className={`badge ${statusBadge(sale.status)}`}>{sale.status}</span>
              <span className="cell-muted">{new Date(sale.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <select 
            className="form-select" 
            style={{ width: 140 }}
            value={sale.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-secondary">
            <Printer size={16} /> Print
          </button>
          {sale.status === 'confirmed' && (
            <button className="btn btn-primary" onClick={handleConvertToInvoice} disabled={converting}>
              {converting ? <span className="loading-spinner" /> : <><FileText size={16} /> Generate Invoice</>}
            </button>
          )}
        </div>
      </div>

      <div className="grid-3" style={{ gap: 'var(--space-xl)' }}>
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          <div className="card">
            <div className="card-header">
              <h3>Order Items</h3>
            </div>
            <div className="card-body flush">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ width: 80 }}>Qty</th>
                      <th style={{ width: 100 }}>Price</th>
                      <th style={{ width: 120 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.productName}</div>
                          <div className="flex items-center gap-sm">
                            {item.shadeColor && <span className="shade-swatch" style={{ background: item.shadeColor, width: 12, height: 12 }} />}
                            <span className="cell-muted">{item.shadeName || item.sku}</span>
                          </div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>AED {fmt(item.unitPrice)}</td>
                        <td style={{ fontWeight: 600 }}>AED {fmt(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
            <div className="card-header">
              <h3>Customer Info</h3>
            </div>
            <div className="card-body">
              <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: 8 }}>{sale.customerName}</div>
              {sale.customerPhone && <div className="cell-muted" style={{ marginBottom: 4 }}>Phone: {sale.customerPhone}</div>}
              {sale.customerEmail && <div className="cell-muted" style={{ marginBottom: 4 }}>Email: {sale.customerEmail}</div>}
              {sale.customerAddress && <div className="cell-muted">Address: {sale.customerAddress}</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Order Summary</h3>
            </div>
            <div className="card-body">
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Subtotal</span>
                <span>AED {fmt(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">VAT (5%)</span>
                <span>AED {fmt(sale.vatAmount)}</span>
              </div>
              {parseFloat(sale.discountAmount) > 0 && (
                <div className="flex justify-between" style={{ marginBottom: 12, color: 'var(--color-success)' }}>
                  <span>Discount</span>
                  <span>- AED {fmt(sale.discountAmount)}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                <div className="flex justify-between">
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                    AED {fmt(sale.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
