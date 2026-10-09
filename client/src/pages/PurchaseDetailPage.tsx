import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Truck, ArrowLeft, CheckCircle, Package } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/purchases/${id}`)
        .then(setPurchase)
        .catch(err => {
          showError('Failed to load purchase order', err.message);
          navigate('/purchases');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate, showError]);

  const handleMarkReceived = async () => {
    setReceiving(true);
    try {
      const itemsToReceive = purchase.items?.map((item: any) => ({
        itemId: item.id,
        receivedQty: item.quantity,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate || null,
      })) || [];

      await api.post(`/purchases/${id}/receive`, { items: itemsToReceive });
      success('Purchase order marked as received');
      setPurchase({ ...purchase, status: 'received' });
    } catch (err: any) {
      showError('Failed to update status', err.message);
    } finally {
      setReceiving(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'badge-muted', ordered: 'badge-info', partially_received: 'badge-warning',
      received: 'badge-success', cancelled: 'badge-error',
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

  if (!purchase) return null;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/purchases')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Purchase Order: {purchase.poNumber}</h1>
            <div className="flex items-center gap-sm" style={{ marginTop: 4 }}>
              <span className={`badge ${statusBadge(purchase.status)}`}>{purchase.status.replace('_', ' ')}</span>
              <span className="cell-muted">{new Date(purchase.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          {purchase.status !== 'received' && purchase.status !== 'cancelled' && (
            <button className="btn btn-success" onClick={handleMarkReceived} disabled={receiving}>
              {receiving ? <span className="loading-spinner" /> : <><CheckCircle size={16} /> Mark as Received</>}
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
                      <th style={{ width: 100 }}>Unit Cost</th>
                      <th style={{ width: 120 }}>Total Cost</th>
                      <th>Batch/Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.productName}</div>
                          <div className="flex items-center gap-sm">
                            {item.shadeColor && <span className="shade-swatch" style={{ background: item.shadeColor, width: 12, height: 12 }} />}
                            <span className="cell-muted">{item.shadeName || item.sku}</span>
                          </div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>AED {fmt(item.unitCost)}</td>
                        <td style={{ fontWeight: 600 }}>AED {fmt(item.totalCost)}</td>
                        <td className="cell-muted">
                          {item.batchNumber ? (
                            <div>
                              <div>Batch: {item.batchNumber}</div>
                              {item.expiryDate && <div>Exp: {new Date(item.expiryDate).toLocaleDateString()}</div>}
                            </div>
                          ) : '-'}
                        </td>
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
              <h3>Supplier Info</h3>
            </div>
            <div className="card-body">
              <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: 8 }}>{purchase.supplierName}</div>
              {purchase.supplierPhone && <div className="cell-muted" style={{ marginBottom: 4 }}>Phone: {purchase.supplierPhone}</div>}
              {purchase.supplierEmail && <div className="cell-muted" style={{ marginBottom: 4 }}>Email: {purchase.supplierEmail}</div>}
              {purchase.supplierAddress && <div className="cell-muted">Address: {purchase.supplierAddress}</div>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
            <div className="card-header">
              <h3>Delivery Details</h3>
            </div>
            <div className="card-body">
              <div className="flex items-center gap-sm" style={{ marginBottom: 12 }}>
                <Truck size={16} className="cell-muted" />
                <span className="cell-muted">Expected Date:</span>
                <span style={{ fontWeight: 500 }}>{purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : 'Not set'}</span>
              </div>
              <div className="flex items-center gap-sm">
                <Package size={16} className="cell-muted" />
                <span className="cell-muted">Branch / Warehouse:</span>
                <span style={{ fontWeight: 500 }}>Main Branch</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Order Summary</h3>
            </div>
            <div className="card-body">
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Subtotal</span>
                <span>AED {fmt(purchase.subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">VAT (5%)</span>
                <span>AED {fmt(purchase.vatAmount)}</span>
              </div>
              <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                <div className="flex justify-between">
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                    AED {fmt(purchase.totalAmount)}
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
