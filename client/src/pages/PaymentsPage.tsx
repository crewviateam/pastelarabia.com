import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Plus, Search, X, Lock } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function PaymentsPage() {
  const { success, error: showError } = useToast();
  const { canSeePricing } = useAuth();
  const showPricing = canSeePricing('payments');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form, setForm] = useState({
    type: 'incoming', customerId: '', invoiceId: '', amount: '',
    method: 'cash', date: new Date().toISOString().split('T')[0], notes: '',
  });

  useEffect(() => {
    api.get('/payments').then(setPayments).catch(console.error).finally(() => setLoading(false));
    api.get('/customers?limit=100').then(r => setCustomers(r.data || r || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.customerId) {
      api.get(`/invoices?customerId=${form.customerId}&status=unpaid`).then(r => setInvoices(r.data || [])).catch(() => {});
    }
  }, [form.customerId]);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { showError('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await api.post('/payments', {
        ...form,
        amount: parseFloat(form.amount),
      });
      success('Payment recorded');
      setShowRecord(false);
      setForm({ type: 'incoming', customerId: '', invoiceId: '', amount: '', method: 'cash', date: new Date().toISOString().split('T')[0], notes: '' });
      const updated = await api.get('/payments');
      setPayments(updated);
    } catch (err: any) { showError('Failed', err.message); }
    finally { setSaving(false); }
  };

  const methodIcon = (m: string) => {
    switch (m) { case 'cash': return '💵'; case 'bank_transfer': return '🏦'; case 'cheque': return '📝'; case 'card': return '💳'; default: return '💰'; }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Payments</h1><p>Record and track all financial transactions</p></div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowRecord(true)}><Plus size={16} /> Record Payment</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body flush">
          {loading ? (
            
            <div style={{ padding: 'var(--space-xl)' }}>
              {[1,2,3,4,5,6].map(j => <div key={j} className="skeleton skeleton-table-row"></div>)}
            </div>

          ) : payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CreditCard size={28} /></div>
              <h3>No payments recorded</h3>
              <p>Start recording incoming and outgoing payments.</p>
              <button className="btn btn-primary" onClick={() => setShowRecord(true)}><Plus size={16} /> Record Payment</button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.referenceNumber}</td>
                      <td><span className={`badge ${p.type === 'incoming' ? 'badge-success' : 'badge-warning'}`}>{p.type}</span></td>
                      <td>{p.customerName || '-'}</td>
                      <td style={{ fontWeight: 600, color: p.type === 'incoming' ? 'var(--color-success)' : 'var(--color-text)' }}>
                        {showPricing ? (
                          <>{p.type === 'incoming' ? '+' : '-'} AED {fmt(parseFloat(p.amount))}</>
                        ) : (
                          <span className="cell-muted flex items-center gap-xs"><Lock size={12}/> Hidden</span>
                        )}
                      </td>
                      <td>{methodIcon(p.method)} {p.method?.replace('_', ' ')}</td>
                      <td className="cell-muted">{p.date ? new Date(p.date).toLocaleDateString() : '-'}</td>
                      <td className="cell-muted truncate" style={{ maxWidth: 200 }}>{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showRecord && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRecord(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowRecord(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleRecord}>
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="incoming">Incoming (Received)</option>
                      <option value="outgoing">Outgoing (Paid)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Method</label>
                    <select className="form-select" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Customer / Contact</label>
                  <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, invoiceId: '' })}>
                    <option value="">Select contact...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} (Outstanding: AED {c.outstandingBalance})</option>)}
                  </select>
                </div>
                {form.customerId && invoices.length > 0 && (
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Against Invoice (optional)</label>
                    <select className="form-select" value={form.invoiceId} onChange={e => setForm({ ...form, invoiceId: e.target.value })}>
                      <option value="">General payment</option>
                      {invoices.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — Balance: AED {inv.balanceDue}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Amount (AED) <span className="required">*</span></label>
                    <input className="form-input" type="number" step="0.01" value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecord(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" /> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
