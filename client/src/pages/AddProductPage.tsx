import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Package, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function AddProductPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', barcode: '',
    categoryId: '', brandId: '',
    costPrice: '', wholesalePrice: '', retailPrice: '',
    reorderLevel: '10', image: '', isCombo: false,
    variants: [] as any[],
  });

  useEffect(() => {
    api.get('/inventory/categories').then(setCategories).catch(() => {});
    api.get('/inventory/brands').then(setBrands).catch(() => {});
  }, []);

  const handleAddVariant = () => {
    setForm({
      ...form,
      variants: [...form.variants, { sku: '', shadeName: '', colorCode: '#000000', costPrice: '', wholesalePrice: '', retailPrice: '' }]
    });
  };

  const handleRemoveVariant = (idx: number) => {
    const v = [...form.variants];
    v.splice(idx, 1);
    setForm({ ...form, variants: v });
  };

  const updateVariant = (idx: number, field: string, value: string) => {
    const v = [...form.variants];
    v[idx][field] = value;
    setForm({ ...form, variants: v });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName) return;
    try {
      const res = await api.post('/inventory/categories', { name: newCategoryName });
      setCategories([...categories, res]);
      setForm({ ...form, categoryId: res.id });
      setNewCategoryName('');
      setIsCreatingCategory(false);
      success('Category created');
    } catch (err: any) {
      showError('Failed to create category', err.message);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName) return;
    try {
      const res = await api.post('/inventory/brands', { name: newBrandName });
      setBrands([...brands, res]);
      setForm({ ...form, brandId: res.id });
      setNewBrandName('');
      setIsCreatingBrand(false);
      success('Brand created');
    } catch (err: any) {
      showError('Failed to create brand', err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku) {
      showError('Name and SKU are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
        wholesalePrice: form.wholesalePrice ? parseFloat(form.wholesalePrice) : 0,
        retailPrice: form.retailPrice ? parseFloat(form.retailPrice) : 0,
        reorderLevel: parseInt(form.reorderLevel) || 10,
        variants: form.variants.map(v => ({
          ...v,
          costPrice: v.costPrice ? parseFloat(v.costPrice) : undefined,
          wholesalePrice: v.wholesalePrice ? parseFloat(v.wholesalePrice) : undefined,
          retailPrice: v.retailPrice ? parseFloat(v.retailPrice) : undefined,
        }))
      };

      await api.post('/inventory/products', payload);
      success('Product added successfully');
      navigate('/inventory');
    } catch (err: any) {
      showError('Failed to add product', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-md">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/inventory')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Add New Product</h1>
            <p>Create a new product or variant in your catalog</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body">
          <h3 style={{ marginBottom: 16 }}>Basic Information</h3>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Product Name <span className="required">*</span></label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">SKU <span className="required">*</span></label>
              <input className="form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Product Image</label>
              <div className="flex items-center gap-sm">
                {form.image && form.image.startsWith('http') && (
                  <img src={form.image} alt="preview" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: '4px' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  className="form-input" 
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      // Use the new API post method which handles FormData correctly
                      const res = await api.post('/inventory/upload', formData);
                      setForm(prev => ({ ...prev, image: res.url }));
                      success('Image uploaded successfully');
                    } catch (err: any) {
                      showError('Failed to upload image', err.message);
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              {isCreatingCategory ? (
                <div className="flex gap-sm">
                  <input className="form-input" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New category name" autoFocus />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateCategory}>Add</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsCreatingCategory(false)}>Cancel</button>
                </div>
              ) : (
                <div className="flex gap-sm">
                  <select className="form-select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} style={{ flex: 1 }}>
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="btn btn-secondary btn-icon" onClick={() => setIsCreatingCategory(true)} title="Add new category">
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Brand</label>
              {isCreatingBrand ? (
                <div className="flex gap-sm">
                  <input className="form-input" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="New brand name" autoFocus />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateBrand}>Add</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsCreatingBrand(false)}>Cancel</button>
                </div>
              ) : (
                <div className="flex gap-sm">
                  <select className="form-select" value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value })} style={{ flex: 1 }}>
                    <option value="">Select brand...</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <button type="button" className="btn btn-secondary btn-icon" onClick={() => setIsCreatingBrand(true)} title="Add new brand">
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Barcode</label>
              <input className="form-input" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>

          <h3 style={{ marginBottom: 16 }}>Pricing & Stock</h3>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Cost Price (AED)</label>
              <input className="form-input" type="number" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Wholesale Price (AED)</label>
              <input className="form-input" type="number" step="0.01" value={form.wholesalePrice} onChange={e => setForm({ ...form, wholesalePrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Retail Price (AED)</label>
              <input className="form-input" type="number" step="0.01" value={form.retailPrice} onChange={e => setForm({ ...form, retailPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Level</label>
              <input className="form-input" type="number" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
          </div>

          <div style={{ marginTop: 32, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Variants / Shades</h3>
              <p className="cell-muted" style={{ fontSize: 'var(--text-sm)' }}>Add if this product comes in different colors or sizes</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddVariant}>
              <Plus size={16} /> Add Variant
            </button>
          </div>

          {form.variants.length > 0 && (
            <div style={{ background: 'var(--color-bg-muted)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
              {form.variants.map((v, idx) => (
                <div key={idx} className="form-row" style={{ marginBottom: 12, alignItems: 'end' }}>
                  <div className="form-group" style={{ maxWidth: 150 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Variant SKU</label>
                    <input className="form-input" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Shade / Name</label>
                    <input className="form-input" value={v.shadeName} onChange={e => updateVariant(idx, 'shadeName', e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ maxWidth: 80 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Color</label>
                    <input type="color" value={v.colorCode} onChange={e => updateVariant(idx, 'colorCode', e.target.value)} style={{ width: '100%', height: 38, padding: 2, cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} />
                  </div>
                  <div className="form-group" style={{ maxWidth: 120 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Wholesale (AED)</label>
                    <input className="form-input" type="number" step="0.01" value={v.wholesalePrice} onChange={e => updateVariant(idx, 'wholesalePrice', e.target.value)} placeholder="Default" />
                  </div>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => handleRemoveVariant(idx)} style={{ color: 'var(--color-error)', marginBottom: 2 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/inventory')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading-spinner" /> : <><Package size={16} /> Save Product</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
