import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { FileText, ArrowLeft, Printer, Download, MessageCircle, DollarSign } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/invoices/${id}`)
        .then(setInvoice)
        .catch(err => {
          showError('Failed to load invoice', err.message);
          navigate('/invoices');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate, showError]);

  const handleSendWhatsApp = async () => {
    setSending(true);
    try {
      await api.post(`/invoices/${id}/send-whatsapp`, {
        whatsappNumber: invoice.customerWhatsapp || invoice.customerPhone
      });
      success('Invoice sent via WhatsApp successfully');
    } catch (err: any) {
      showError('Failed to send invoice', err.message);
    } finally {
      setSending(false);
    }
  };

  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash' });
  const [recording, setRecording] = useState(false);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }
    setRecording(true);
    try {
      await api.post('/payments', {
        type: 'incoming',
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
      });
      success('Payment recorded successfully');
      setShowPayment(false);
      
      // Refresh invoice
      const updated = await api.get(`/invoices/${id}`);
      setInvoice(updated);
    } catch (err: any) {
      showError('Failed to record payment', err.message);
    } finally {
      setRecording(false);
    }
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      paid: 'badge-success', unpaid: 'badge-warning', overdue: 'badge-error',
      partially_paid: 'badge-info', draft: 'badge-muted', cancelled: 'badge-muted',
    };
    return m[s] || 'badge-muted';
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

  if (!invoice) return null;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Invoice: {invoice.invoiceNumber}</h1>
            <div className="flex items-center gap-sm" style={{ marginTop: 4 }}>
              <span className={`badge ${statusColor(invoice.status)}`}>{invoice.status.replace('_', ' ')}</span>
              <span className="cell-muted">{new Date(invoice.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">
            <Printer size={16} /> Print
          </button>
          <button className="btn btn-secondary" onClick={async () => {
            try {
              const res = await fetch(`http://localhost:3000/api/invoices/${id}/pdf`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
              });
              if (!res.ok) throw new Error('Failed to download PDF');
              
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Invoice_${invoice.invoiceNumber}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } catch (err: any) {
              showError('Download failed', err.message);
            }
          }}>
            <Download size={16} /> PDF
          </button>
          <button className="btn btn-success" onClick={handleSendWhatsApp} disabled={sending}>
            {sending ? <span className="loading-spinner" /> : <><MessageCircle size={16} /> WhatsApp</>}
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ gap: 'var(--space-xl)' }}>
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <div className="flex justify-between" style={{ marginBottom: 32 }}>
              <div>
                <h2 style={{ color: 'var(--color-primary)', fontSize: 'var(--text-2xl)', marginBottom: 8 }}>INVOICE</h2>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>Glow Wholesale</div>
                <div className="cell-muted">Dubai, UAE</div>
                <div className="cell-muted">TRN: 100234567890</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: 4 }}><strong>Invoice No:</strong> {invoice.invoiceNumber}</div>
                <div style={{ marginBottom: 4 }}><strong>Date:</strong> {new Date(invoice.createdAt).toLocaleDateString()}</div>
                <div><strong>Due Date:</strong> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}</div>
              </div>
            </div>

            <div style={{ marginBottom: 32, padding: 16, background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ marginBottom: 8, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>BILLED TO:</h4>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>{invoice.customerName}</div>
              {invoice.customerAddress && <div>{invoice.customerAddress}</div>}
              {invoice.customerPhone && <div>Phone: {invoice.customerPhone}</div>}
              {invoice.customerTrn && <div>TRN: {invoice.customerTrn}</div>}
            </div>

            <table className="table" style={{ marginBottom: 32 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{item.productName}</div>
                      <div className="cell-muted" style={{ fontSize: 'var(--text-xs)' }}>{item.shadeName || item.sku}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>AED {fmt(item.unitPrice)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>AED {fmt(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div style={{ width: 300 }}>
                <div className="flex justify-between" style={{ padding: '8px 16px' }}>
                  <span className="cell-muted">Subtotal</span>
                  <span>AED {fmt(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between" style={{ padding: '8px 16px' }}>
                  <span className="cell-muted">VAT (5%)</span>
                  <span>AED {fmt(invoice.vatAmount)}</span>
                </div>
                {parseFloat(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between" style={{ padding: '8px 16px', color: 'var(--color-success)' }}>
                    <span>Discount</span>
                    <span>- AED {fmt(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={{ padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', marginTop: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                    AED {fmt(invoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
            <div className="card-header">
              <h3>Payment Summary</h3>
            </div>
            <div className="card-body">
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Invoice Total</span>
                <span style={{ fontWeight: 500 }}>AED {fmt(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 12 }}>
                <span className="cell-muted">Paid Amount</span>
                <span style={{ color: 'var(--color-success)' }}>AED {fmt(invoice.paidAmount)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                <div className="flex justify-between">
                  {parseFloat(invoice.balanceDue) > 0 ? (
                    <>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Balance Due</span>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-error)' }}>
                        AED {fmt(invoice.balanceDue)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Status</span>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-success)' }}>
                        Fully Paid
                      </span>
                    </>
                  )}
                </div>
              </div>

              {parseFloat(invoice.balanceDue) > 0 && (
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={() => {
                  setPaymentForm({ amount: invoice.balanceDue, method: 'cash' });
                  setShowPayment(true);
                }}>
                  <DollarSign size={16} /> Record Payment
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Payment History</h3>
            </div>
            <div className="card-body flush">
              {invoice.payments && invoice.payments.length > 0 ? (
                <table className="table" style={{ fontSize: 'var(--text-sm)' }}>
                  <tbody>
                    {invoice.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td>
                          <div>{new Date(p.date).toLocaleDateString()}</div>
                          <div className="cell-muted" style={{ fontSize: 'var(--text-xs)' }}>{p.method}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                          + AED {fmt(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No payments recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayment(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowPayment(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Payment Amount (AED)</label>
                  <input className="form-input" type="number" step="0.01" max={invoice.balanceDue} required
                    value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={recording}>
                  {recording ? <span className="loading-spinner" /> : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
