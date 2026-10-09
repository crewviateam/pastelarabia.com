import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { UserCog, Plus, Search, X, Shield, Lock } from 'lucide-react';

export default function StaffPage() {
  const { success, error: showError } = useToast();
  const { hasPermission } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [form, setForm] = useState<{
    id?: string;
    name: string; email: string; phone: string; role: string;
    password?: string; salary: string | number; commissionRate: string | number; salesTarget: string | number;
    branchIds: string[]; permissions: Record<string, any>;
  }>({
    name: '', email: '', phone: '', role: 'sales_executive',
    password: 'password123', salary: '', commissionRate: '', salesTarget: '',
    branchIds: [], permissions: {},
  });

  useEffect(() => {
    api.get('/staff').then(setStaff).catch(console.error).finally(() => setLoading(false));
    api.get('/branches').then(setBranches).catch(() => {});
    api.get('/staff/permissions/template').then(setTemplate).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { showError('Name and email required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: form.salary ? parseFloat(String(form.salary)) : null,
        commissionRate: form.commissionRate ? parseFloat(String(form.commissionRate)) : null,
        salesTarget: form.salesTarget ? parseFloat(String(form.salesTarget)) : null,
      };
      
      if (form.id) {
        await api.put(`/staff/${form.id}`, payload);
        success('Staff member updated', `${form.name} has been updated.`);
      } else {
        await api.post('/staff', payload);
        success('Staff member created', `${form.name} has been added.`);
      }
      
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', role: 'sales_executive', password: 'password123', salary: '', commissionRate: '', salesTarget: '', branchIds: [], permissions: {} });
      api.get('/staff').then(setStaff);
    } catch (err: any) { showError('Failed', err.message); }
    finally { setSaving(false); }
  };

  const roleBadge = (r: string) => {
    const m: Record<string, string> = {
      owner: 'badge-primary', manager: 'badge-info', accountant: 'badge-success',
      storekeeper: 'badge-warning', sales_executive: 'badge-muted',
    };
    return m[r] || 'badge-muted';
  };

  const statusBadge = (s: string) => s === 'active' ? 'badge-success' : s === 'on_leave' ? 'badge-warning' : 'badge-muted';

  const updatePermission = (module: string, right: string, value: boolean) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...(prev.permissions[module] || {}),
          [right]: value
        }
      }
    }));
  };

  const updateSpecialPermission = (key: string, value: boolean) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value
      }
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Staff & Roles</h1><p>Manage team members and granular permissions</p></div>
        {hasPermission('staff', 'edit') && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add Staff</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-body flush">
          {loading ? (
            
            <div style={{ padding: 'var(--space-xl)' }}>
              {[1,2,3,4,5,6].map(j => <div key={j} className="skeleton skeleton-table-row"></div>)}
            </div>

          ) : staff.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><UserCog size={28} /></div>
              <h3>No staff members</h3>
              <p>Add your team members and assign roles and permissions.</p>
              {hasPermission('staff', 'edit') && (
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add Staff</button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Salary</th>
                    <th>Target</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div style={{
                            width: 34, height: 34, borderRadius: 'var(--radius-full)',
                            background: 'linear-gradient(135deg, var(--color-accent), var(--color-rose))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: 'var(--text-xs)', fontWeight: 700,
                          }}>{s.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div className="cell-muted">{s.joinedDate || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${roleBadge(s.role)}`}>{s.role?.replace('_', ' ')}</span></td>
                      <td className="cell-muted">{s.email}</td>
                      <td className="cell-muted">{s.phone || '-'}</td>
                      <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                      <td>{s.salary ? `AED ${parseFloat(s.salary).toLocaleString()}` : '-'}</td>
                      <td>{s.salesTarget ? `AED ${parseFloat(s.salesTarget).toLocaleString()}` : '-'}</td>
                      <td>
                        {hasPermission('staff', 'edit') && (
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setForm({
                              ...s,
                              branchIds: s.branchIds || [],
                              permissions: s.permissions || {}
                            });
                            setShowCreate(true);
                          }}>Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal modal-lg" style={{ width: 800, maxWidth: '95%' }}>
            <div className="modal-header">
              <h2>{form.id ? 'Edit Staff Member' : 'Add Staff Member & Permissions'}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>Basic Details</h3>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name <span className="required">*</span></label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email <span className="required">*</span></label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Role</label>
                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                      <option value="sales_executive">Sales Executive</option>
                      <option value="storekeeper">Storekeeper</option>
                      <option value="accountant">Accountant</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Initial Password</label>
                    <input className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned Branch</label>
                    <select 
                      className="form-select" 
                      value={form.branchIds[0] || ''} 
                      onChange={e => {
                        setForm({ ...form, branchIds: e.target.value ? [e.target.value] : [] });
                      }}
                    >
                      <option value="">Select a branch...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <hr style={{ margin: '24px 0', borderTop: '1px solid var(--color-border-light)' }} />

                <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>Feature Permissions</h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>Check the boxes to assign read, edit, or delete access to specific modules.</p>

                {template && (
                  <div style={{ background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid var(--color-border)' }}>Module</th>
                          {template.rights.map((r: any) => (
                            <th key={r.key} style={{ textAlign: 'center', padding: '12px 8px', borderBottom: '1px solid var(--color-border)' }}>{r.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {template.modules.map((m: any) => (
                          <tr key={m.key} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '12px 8px', fontWeight: 500 }}>{m.label}</td>
                            {template.rights.map((r: any) => (
                              <td key={r.key} style={{ textAlign: 'center', padding: '12px 8px' }}>
                                <input 
                                  type="checkbox" 
                                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                  checked={form.permissions[m.key]?.[r.key] || false}
                                  onChange={e => updatePermission(m.key, r.key, e.target.checked)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ marginTop: 24 }}>
                      <h4 style={{ fontSize: 'var(--text-base)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Lock size={16} /> Special Access
                      </h4>
                      <div className="flex gap-lg">
                        {template.specials.map((s: any) => (
                          <label key={s.key} className="flex items-center gap-sm" style={{ cursor: 'pointer', padding: '12px 16px', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <input 
                              type="checkbox" 
                              style={{ transform: 'scale(1.2)' }}
                              checked={form.permissions[s.key] || false}
                              onChange={e => updateSpecialPermission(s.key, e.target.checked)}
                            />
                            <span style={{ fontWeight: 500 }}>{s.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" /> : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
