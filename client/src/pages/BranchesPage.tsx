import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Building2, Plus, MapPin, Phone, Mail, X, Edit2 } from 'lucide-react';

export default function BranchesPage() {
  const { success, error: showError } = useToast();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', country: 'UAE',
    phone: '', email: '', invoicePrefix: '', isDefault: false,
  });

  const load = () => {
    setLoading(true);
    api.get('/branches/all').then(setBranches).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditBranch(null);
    setForm({ name: '', code: '', address: '', city: '', country: 'UAE', phone: '', email: '', invoicePrefix: '', isDefault: false });
    setShowCreate(true);
  };

  const openEdit = (b: any) => {
    setEditBranch(b);
    setForm({ name: b.name, code: b.code, address: b.address || '', city: b.city || '', country: b.country || 'UAE', phone: b.phone || '', email: b.email || '', invoicePrefix: b.invoicePrefix || '', isDefault: b.isDefault });
    setShowCreate(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { showError('Name and code required'); return; }
    setSaving(true);
    try {
      if (editBranch) {
        await api.put(`/branches/${editBranch.id}`, form);
        success('Branch updated');
      } else {
        await api.post('/branches', form);
        success('Branch created', `${form.name} has been added.`);
      }
      setShowCreate(false);
      load();
    } catch (err: any) { showError('Failed', err.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (b: any) => {
    const newStatus = b.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/branches/${b.id}/status`, { status: newStatus });
      success(`Branch ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      load();
    } catch (err: any) { showError('Failed', err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Branches</h1><p>Manage your business locations and warehouses</p></div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Branch</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-xl)' }}>
              {[1,2,3,4].map(j => <div key={j} className="skeleton skeleton-card" style={{ marginBottom: '16px' }}></div>)}
            </div>
      ) : branches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Building2 size={28} /></div>
            <h3>No branches yet</h3>
            <p>Create your first business location to enable multi-branch operations.</p>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Branch</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-base)' }}>
          {branches.map(b => (
            <div key={b.id} className="card" style={{ opacity: b.status === 'inactive' ? 0.6 : 1 }}>
              <div className="card-body">
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div className="flex items-center gap-md">
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)',
                      background: b.isDefault ? 'linear-gradient(135deg, var(--color-accent), var(--color-rose))' : 'var(--color-bg-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: b.isDefault ? 'white' : 'var(--color-text-muted)', fontWeight: 700, fontSize: 'var(--text-sm)',
                    }}>{b.code?.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{b.name}</div>
                      <div className="flex items-center gap-sm">
                        <code style={{ fontSize: 'var(--text-xs)', background: 'var(--color-bg-muted)', padding: '1px 6px', borderRadius: 4 }}>{b.code}</code>
                        {b.isDefault && <span className="badge badge-primary">Default</span>}
                        <span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{b.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)}><Edit2 size={14} /></button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {b.address && <div className="flex items-center gap-sm cell-muted"><MapPin size={13} />{b.address}{b.city ? `, ${b.city}` : ''}</div>}
                  {b.phone && <div className="flex items-center gap-sm cell-muted"><Phone size={13} />{b.phone}</div>}
                  {b.email && <div className="flex items-center gap-sm cell-muted"><Mail size={13} />{b.email}</div>}
                  {b.invoicePrefix && <div className="cell-muted">Invoice Prefix: <strong>{b.invoicePrefix}</strong></div>}
                </div>

                <div className="flex gap-sm">
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => toggleStatus(b)}>
                    {b.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editBranch ? 'Edit Branch' : 'Add Branch'}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Branch Name <span className="required">*</span></label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Dubai Main" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code <span className="required">*</span></label>
                    <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="DXB" maxLength={10} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Dubai" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Invoice Prefix</label>
                    <input className="form-input" value={form.invoicePrefix} onChange={e => setForm({ ...form, invoicePrefix: e.target.value })} placeholder="INV-DXB" />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label className="flex items-center gap-sm" style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
                      <span className="form-label" style={{ margin: 0 }}>Default Branch</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" /> : (editBranch ? 'Update Branch' : 'Create Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
