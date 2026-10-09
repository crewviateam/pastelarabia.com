import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Package, ArrowLeft, Edit2, AlertTriangle, Trash2 } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get(`/inventory/products/${id}`)
        .then(setProduct)
        .catch(err => {
          showError('Failed to load product', err.message);
          navigate('/inventory');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate, showError]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/inventory/products/${id}`);
      success('Product deleted');
      navigate('/inventory');
    } catch (err: any) {
      showError('Failed to delete', err.message);
    }
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

  if (!product) return null;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/inventory')}>
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-md">
            <span style={{ fontSize: 32 }}>{product.image || '📦'}</span>
            <div>
              <h1 style={{ marginBottom: 4 }}>{product.name}</h1>
              <div className="flex items-center gap-sm">
                <code style={{ fontSize: 'var(--text-xs)', background: 'var(--color-bg-muted)', padding: '2px 6px', borderRadius: 4 }}>
                  {product.sku}
                </code>
                {product.brand && <span className="badge badge-primary">{product.brand}</span>}
                {product.category && <span className="badge badge-info">{product.category}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" style={{ color: 'var(--color-error)' }} onClick={handleDelete}>
            <Trash2 size={16} /> Delete
          </button>
          <button className="btn btn-secondary">
            <Edit2 size={16} /> Edit Product
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ gap: 'var(--space-xl)' }}>
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          <div className="card">
            <div className="card-header">
              <h3>Pricing & Details</h3>
            </div>
            <div className="card-body">
              <div className="grid-3" style={{ gap: 'var(--space-base)', marginBottom: 24 }}>
                <div>
                  <div className="cell-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>Cost Price</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>AED {fmt(product.costPrice)}</div>
                </div>
                <div>
                  <div className="cell-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>Wholesale Price</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>AED {fmt(product.wholesalePrice)}</div>
                </div>
                <div>
                  <div className="cell-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>Retail Price</div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>AED {fmt(product.retailPrice)}</div>
                </div>
              </div>

              {product.description && (
                <div>
                  <div className="cell-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 8 }}>Description</div>
                  <p style={{ lineHeight: 1.6 }}>{product.description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Variants & Stock</h3>
            </div>
            <div className="card-body flush">
              {product.variants && product.variants.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Shade / Variant</th>
                        <th>SKU</th>
                        <th>Wholesale Price</th>
                        <th>Stock Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v: any) => {
                        const shade = product.shades?.find((s: any) => s.id === v.shadeId);
                        return (
                          <tr key={v.id}>
                            <td>
                              <div className="flex items-center gap-sm">
                                {shade?.colorCode && <span className="shade-swatch" style={{ background: shade.colorCode }} />}
                                <span style={{ fontWeight: 500 }}>{shade?.name || '-'}</span>
                              </div>
                            </td>
                            <td><code style={{ fontSize: 'var(--text-xs)' }}>{v.sku}</code></td>
                            <td>{v.wholesalePrice ? `AED ${fmt(v.wholesalePrice)}` : 'Default'}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: v.totalStock <= product.reorderLevel ? 'var(--color-error)' : 'inherit' }}>
                                {v.totalStock || 0}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  This product has no variants.
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <h3>Stock Overview</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary-100)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Package size={24} />
                </div>
                <div>
                  <div className="cell-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 2 }}>Total Stock</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-2xl)' }}>{product.totalStock || 0}</div>
                </div>
              </div>

              {(product.totalStock || 0) <= product.reorderLevel && (
                <div style={{
                  background: 'var(--color-warning-100)', color: '#9a6a00', padding: 12,
                  borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24
                }}>
                  <AlertTriangle size={18} />
                  <span style={{ fontSize: 'var(--text-sm)' }}>Low stock! Reorder level is {product.reorderLevel}</span>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 16 }}>
                <div className="flex justify-between" style={{ marginBottom: 12 }}>
                  <span className="cell-muted">Barcode</span>
                  <span>{product.barcode || '-'}</span>
                </div>
                <div className="flex justify-between" style={{ marginBottom: 12 }}>
                  <span className="cell-muted">Created</span>
                  <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
