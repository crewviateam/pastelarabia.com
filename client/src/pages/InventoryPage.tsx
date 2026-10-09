import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Package, Plus, Search, Filter, AlertTriangle, CheckCircle, XCircle, Lock } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function InventoryPage() {
  const { hasPermission, canSeePricing } = useAuth();
  const canEdit = hasPermission('inventory', 'edit');
  const showPricing = canSeePricing('inventory');

  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({});

  const loadProducts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (brandFilter) params.set('brand', brandFilter);
    if (stockFilter) params.set('stockStatus', stockFilter);
    params.set('page', String(page));
    params.set('limit', '20');

    api.get(`/inventory/products?${params}`)
      .then(res => {
        setProducts(res.data || []);
        setPagination(res.pagination || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get('/inventory/products/stats'),
      api.get('/inventory/categories'),
      api.get('/inventory/brands'),
    ]).then(([s, c, b]) => {
      setStats(s);
      setCategories(c);
      setBrands(b);
    }).catch(console.error);
  }, []);

  useEffect(() => { loadProducts(); }, [search, categoryFilter, brandFilter, stockFilter, page]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'In Stock': return 'badge-success';
      case 'Low Stock': return 'badge-warning';
      case 'Out of Stock': return 'badge-error';
      default: return 'badge-muted';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>Manage your cosmetics catalog and stock levels</p>
        </div>
        <div className="page-actions">
          {canEdit && (
            <Link to="/inventory/new" className="btn btn-primary">
              <Plus size={16} /> Add Product
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-icon primary"><Package size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Total Products</div>
              <div className="stat-card-value">{stats.totalProducts}</div>
              <div className="cell-muted">{stats.totalVariants} variants</div>
            </div>
          </div>
          {showPricing && (
            <div className="stat-card">
              <div className="stat-card-icon green"><CheckCircle size={20} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Stock Value</div>
                <div className="stat-card-value">AED {fmt(stats.totalStockValue)}</div>
              </div>
            </div>
          )}
          <div className="stat-card">
            <div className="stat-card-icon amber"><AlertTriangle size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Low Stock</div>
              <div className="stat-card-value">{stats.lowStock}</div>
              <div className="cell-muted">{stats.expiringSoon} expiring soon</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon red"><XCircle size={20} /></div>
            <div className="stat-card-content">
              <div className="stat-card-label">Out of Stock</div>
              <div className="stat-card-value">{stats.outOfStock}</div>
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
              <input
                className="form-input"
                placeholder="Search products, SKU, barcode..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="form-select" style={{ width: 160 }}
              value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 160 }}
              value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }}>
              <option value="">All Brands</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 140 }}
              value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="card-body flush">
          {loading ? (
            
            <div style={{ padding: 'var(--space-xl)' }}>
              {[1,2,3,4,5,6].map(j => <div key={j} className="skeleton skeleton-table-row"></div>)}
            </div>

          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Package size={28} /></div>
              <h3>No products found</h3>
              <p>Add your first cosmetics product to start managing inventory.</p>
              {canEdit && (
                <Link to="/inventory/new" className="btn btn-primary">
                  <Plus size={16} /> Add Product
                </Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th>Variants</th>
                    <th>Stock</th>
                    <th>Price (AED)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/inventory/${p.id}`} className="flex items-center gap-sm" style={{ color: 'inherit' }}>
                          <span style={{ fontSize: 22 }}>{p.image || '📦'}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            {p.isCombo && <span className="badge badge-info" style={{ marginTop: 2 }}>Combo</span>}
                          </div>
                        </Link>
                      </td>
                      <td><code style={{ fontSize: 'var(--text-xs)', background: 'var(--color-bg-muted)', padding: '2px 6px', borderRadius: 4 }}>{p.sku}</code></td>
                      <td>{p.brand || '-'}</td>
                      <td>{p.category || '-'}</td>
                      <td>{p.variantCount || 0}</td>
                      <td style={{ fontWeight: 600 }}>{p.totalStock}</td>
                      <td>
                        {showPricing ? (
                          <>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                              Cost: {p.costPrice}
                            </div>
                            <div style={{ fontWeight: 500 }}>W: {p.wholesalePrice}</div>
                          </>
                        ) : (
                          <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={12} /> Hidden
                          </div>
                        )}
                      </td>
                      <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                      <td>
                        <Link to={`/inventory/${p.id}`} className="btn btn-ghost btn-sm">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {((page - 1) * (pagination.limit || 20)) + 1}–{Math.min(page * (pagination.limit || 20), pagination.total)} of {pagination.total}
            </span>
            <div className="pagination-buttons">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1}
                onClick={() => setPage(page - 1)}>Previous</button>
              <button className="btn btn-secondary btn-sm" disabled={page >= (pagination.pages || 1)}
                onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
