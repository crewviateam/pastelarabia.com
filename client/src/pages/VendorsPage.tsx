import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Search, Phone, Mail, Building2, X, Lock } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function VendorsPage() {
  const { success, error: showError } = useToast();
  const { canSeePricing, canSeeContactDetails } = useAuth();
  const showPricing = canSeePricing('vendor');
  const showContacts = canSeeContactDetails('vendor');
  const [contacts, setContacts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '', contactPerson: '', contactType: 'vendor' as string,
    email: '', phone: '', whatsapp: '', address: '', city: '', country: 'UAE',
    trn: '', creditLimit: '', paymentTerms: '30', priceLevel: 'wholesale', notes: '',
  });

  const loadContacts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('contactType', 'vendor');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);

    api.get(`/suppliers?${params}`)
      .then(res => setContacts(res.data || res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/suppliers/stats').then(setStats).catch(() => {});
    loadContacts();
  }, []);

  useEffect(() => { loadContacts(); }, [search, typeFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { showError('Name is required'); return; }
    setCreating(true);
    try {
      await api.post('/suppliers', {
        ...form,
        creditLimit: parseFloat(form.creditLimit) || 0,
        paymentTerms: parseInt(form.paymentTerms) || 30,
      });
      success('Contact created', `${form.name} has been added successfully.`);
      setShowCreate(false);
      setForm({ name: '', contactPerson: '', contactType: 'vendor', email: '', phone: '', whatsapp: '', address: '', city: '', country: 'UAE', trn: '', creditLimit: '', paymentTerms: '30', priceLevel: 'wholesale', notes: '' });
      loadContacts();
      api.get('/suppliers/stats').then(setStats).catch(() => {});
    } catch (err: any) {
      showError('Failed to create contact', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive ${name}? Their historical data will be preserved.`)) return;
    try {
      await api.delete(`/suppliers/${id}`);
      success('Contact archived', `${name} has been archived.`);
      loadContacts();
    } catch (err: any) {
      showError('Failed to archive', err.message);
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case 'distributor': return 'badge-primary';
      case 'salon': return 'badge-info';
      case 'retailer': return 'badge-success';
      default: return 'badge-muted';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vendors</h1>
          <p>Manage your suppliers and vendors</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon primary"><Users size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Total Vendors</div>
              <div className="stat-card-value">{stats.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon blue"><Building2 size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Active Vendors</div>
              <div className="stat-card-value">{stats.distributors}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><Users size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Inactive</div>
              <div className="stat-card-value">{stats.salons}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon amber"><span style={{ fontWeight: 700 }}>AED</span></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Outstanding</div>
              <div className="stat-card-value">{showPricing ? `AED ${fmt(parseFloat(stats.totalOutstanding || '0'))}` : <span className="flex items-center gap-xs"><Lock size={16}/> Hidden</span>}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-base)' }}>
        <div style={{ padding: 'var(--space-base) var(--space-xl)' }}>
          <div className="filter-bar">
            <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} />
              <input className="form-input" placeholder="Search vendors..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 160 }} value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="distributor">Distributors</option>
              <option value="salon">Salons</option>
              <option value="retailer">Retailers</option>
            </select>
            <select className="form-select" style={{ width: 130 }} value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body flush">
          {loading ? (
            
            <div style={{ padding: 'var(--space-xl)' }}>
              {[1,2,3,4,5,6].map(j => <div key={j} className="skeleton skeleton-table-row"></div>)}
            </div>

          ) : contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={28} /></div>
              <h3>No vendors yet</h3>
              <p>Create your first vendor to start managing wholesale relationships.</p>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Add Vendor
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>City</th>
                    <th>Outstanding</th>
                    <th>Credit Limit</th>
                    <th>Last Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/vendors/${c.id}`} style={{ color: 'inherit' }}>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {showContacts && c.contactPerson && <div className="cell-muted">{c.contactPerson}</div>}
                        </Link>
                      </td>

                      <td>
                        {showContacts ? (
                          <div className="flex flex-col gap-sm">
                            {c.phone && <span className="flex items-center gap-sm cell-muted"><Phone size={12} />{c.phone}</span>}
                            {c.email && <span className="flex items-center gap-sm cell-muted"><Mail size={12} />{c.email}</span>}
                          </div>
                        ) : (
                          <span className="cell-muted flex items-center gap-xs"><Lock size={12}/> Hidden</span>
                        )}
                      </td>
                      <td>{c.city || c.country || '-'}</td>
                      <td style={{ fontWeight: 600, color: parseFloat(c.outstandingBalance) > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                        {showPricing ? `AED ${fmt(parseFloat(c.outstandingBalance || '0'))}` : <span className="cell-muted flex items-center gap-xs"><Lock size={12}/> Hidden</span>}
                      </td>
                      <td>{showPricing ? `AED ${fmt(parseFloat(c.creditLimit || '0'))}` : <span className="cell-muted flex items-center gap-xs"><Lock size={12}/> Hidden</span>}</td>
                      <td className="cell-muted">{c.lastPurchaseDate || 'Never'}</td>
                      <td className="actions">
                        <Link to={`/vendors/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}
                          onClick={() => handleArchive(c.id, c.name)}>Archive</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>Add New Vendor</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Business Name <span className="required">*</span></label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input className="form-input" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+971 XX XXX XXXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp</label>
                    <input className="form-input" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+971 XX XXX XXXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Address</label>
                    <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Dubai" />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">TRN</label>
                    <input className="form-input" value={form.trn} onChange={e => setForm({ ...form, trn: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (AED)</label>
                    <input className="form-input" type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms (days)</label>
                    <input className="form-input" type="number" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="loading-spinner" /> : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
