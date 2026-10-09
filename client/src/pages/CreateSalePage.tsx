import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, X } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface CartItem {
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string;
  shadeName?: string;
  shadeColor?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  availableStock: number;
}

export default function CreateSalePage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [productDetail, setProductDetail] = useState<any>(null);

  useEffect(() => {
    api.get('/customers?limit=100&contactType=customer').then(r => setCustomers(r.data || r || [])).catch(console.error);
    api.get('/inventory/products?limit=20').then(r => setProducts(r.data || r || [])).catch(console.error);
  }, []);

  const searchProducts = async (q: string) => {
    try {
      const res = await api.get(`/inventory/products?search=${q}&limit=20`);
      setProducts(res.data || []);
    } catch { }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const filteredCustomers = useMemo(() =>
    customerSearch
      ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch))
      : customers
  , [customers, customerSearch]);

  const loadProductDetail = async (productId: string) => {
    const detail = await api.get(`/inventory/products/${productId}`);
    setProductDetail(detail);
  };

  const addToCart = (product: any, variant?: any) => {
    const existingIdx = cart.findIndex(i =>
      i.productId === product.id && i.variantId === (variant?.id || null)
    );

    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
    } else {
      const price = variant?.wholesalePrice || product.wholesalePrice;
      const stock = variant?.totalStock ?? product.totalStock ?? 0;
      setCart([...cart, {
        productId: product.id || product.productId,
        variantId: variant?.id || null,
        productName: product.name || product.productName,
        sku: variant?.sku || product.sku,
        shadeName: variant ? (productDetail?.shades?.find((s: any) => s.id === variant.shadeId)?.name) : undefined,
        shadeColor: variant ? (productDetail?.shades?.find((s: any) => s.id === variant.shadeId)?.colorCode) : undefined,
        quantity: 1,
        unitPrice: parseFloat(price || '0'),
        discount: 0,
        vatRate: 5,
        availableStock: Number(stock),
      }]);
    }
    setShowProductPicker(false);
    setProductSearch('');
    setProductDetail(null);
  };

  const updateCartItem = (idx: number, field: string, value: any) => {
    const updated = [...cart];
    (updated[idx] as any)[field] = value;
    setCart(updated);
  };

  const removeCartItem = (idx: number) => setCart(cart.filter((_, i) => i !== idx));

  const subtotal = cart.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
    return sum + lineTotal;
  }, 0);
  const vatAmount = cart.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
    return sum + lineTotal * (item.vatRate / 100);
  }, 0);
  const totalAmount = subtotal + vatAmount;

  const handleSubmit = async (status: 'draft' | 'confirmed') => {
    if (!selectedCustomer) { showError('Please select a customer'); return; }
    if (cart.length === 0) { showError('Please add at least one product'); return; }

    // Validate stock
    for (const item of cart) {
      if (item.quantity > item.availableStock && status === 'confirmed') {
        showError(`Insufficient stock for ${item.productName}`,
          `Only ${item.availableStock} units available for ${item.sku}. You requested ${item.quantity}.`);
        return;
      }
      if (item.quantity <= 0) { showError(`Invalid quantity for ${item.productName}`); return; }
    }

    setSubmitting(true);
    try {
      const items = cart.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        vatRate: item.vatRate,
        totalPrice: item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100),
      }));

      const order = await api.post('/sales/orders', {
        customerId: selectedCustomer.id,
        status,
        subtotal,
        vatAmount,
        discountAmount: 0,
        totalAmount,
        notes,
        items,
      });

      // If confirmed, auto-convert to invoice
      if (status === 'confirmed') {
        try {
          await api.post(`/sales/orders/${order.id}/convert-invoice`);
          success('Sale created & invoiced', `Order ${order.orderNumber} confirmed. Invoice generated.`);
        } catch {
          success('Sale confirmed', `Order ${order.orderNumber} created. Invoice generation pending.`);
        }
      } else {
        success('Draft saved', `Order ${order.orderNumber} saved as draft.`);
      }

      navigate('/sales');
    } catch (err: any) {
      showError('Failed to create sale', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Create Sale</h1>
          <p>Create a new wholesale sales order</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/sales')}>Cancel</button>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr 340px', gap: 'var(--space-xl)' }}>
        {/* Left — Products */}
        <div style={{ gridColumn: 'span 2' }}>
          {/* Customer Selection */}
          <div className="card" style={{ marginBottom: 'var(--space-base)', overflow: 'visible' }}>
            <div className="card-body">
              <label className="form-label" style={{ marginBottom: 8 }}>
                <User size={14} style={{ display: 'inline', verticalAlign: -2 }} /> Customer <span className="required">*</span>
              </label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between" style={{
                  background: 'var(--color-primary-50)', padding: '12px 16px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-200)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{selectedCustomer.name}</div>
                    <div className="cell-muted">{selectedCustomer.phone} • Credit: AED {fmt(parseFloat(selectedCustomer.creditLimit || '0'))}</div>
                    <div className="cell-muted">Outstanding: AED {fmt(parseFloat(selectedCustomer.outstandingBalance || '0'))}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCustomer(null)}><X size={14} /></button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div className="search-input-wrapper" style={{ position: 'relative', zIndex: showCustomerPicker ? 12 : 1 }}>
                    <Search size={16} />
                    <input className="form-input" placeholder="Search customer by name or phone..."
                      value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerPicker(true); }}
                      onFocus={() => setShowCustomerPicker(true)} />
                  </div>
                  {showCustomerPicker && filteredCustomers.length > 0 && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowCustomerPicker(false)} />
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 13,
                        background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                        maxHeight: 240, overflowY: 'auto',
                      }}>
                        {filteredCustomers.slice(0, 10).map(c => (
                          <div key={c.id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                            onClick={() => { setSelectedCustomer(c); setShowCustomerPicker(false); setCustomerSearch(''); }}
                            onMouseOver={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                            <div style={{ fontWeight: 500 }}>{c.name}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                              {c.phone ? `${c.phone} • ` : ''}Outstanding: AED {fmt(parseFloat(c.outstandingBalance || '0'))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Product Search & Add */}
          <div className="card" style={{ marginBottom: 'var(--space-base)', overflow: 'visible' }}>
            <div className="card-header">
              <h3>Products</h3>
            </div>
            <div className="card-body">
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div className="search-input-wrapper" style={{ position: 'relative', zIndex: showProductPicker ? 12 : 1 }}>
                  <Search size={16} />
                  <input className="form-input" placeholder="Search product by name, SKU, shade..."
                    value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowProductPicker(true); }}
                    onFocus={() => setShowProductPicker(true)} />
                </div>
                {showProductPicker && products.length > 0 && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowProductPicker(false)} />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 13,
                      background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                      maxHeight: 300, overflowY: 'auto',
                    }}>
                      {products.map(p => (
                        <div key={p.id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                          onClick={async () => {
                            if (p.variantCount > 0) {
                              await loadProductDetail(p.id);
                              setShowProductPicker(false);
                            } else {
                              addToCart(p);
                            }
                          }}
                          onMouseOver={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                          <div className="flex items-center gap-sm">
                            <span style={{ fontSize: 20 }}>{p.image || '📦'}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                {p.sku} • {p.brand || ''} • Stock: {p.totalStock} • AED {p.wholesalePrice}
                              </div>
                            </div>
                            {p.variantCount > 0 && <span className="badge badge-muted">{p.variantCount} variants</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Variant Picker */}
              {productDetail && productDetail.variants?.length > 0 && (
                <div style={{
                  background: 'var(--color-bg-muted)', padding: 16, borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <h4 style={{ fontSize: 'var(--text-sm)' }}>Select Variant — {productDetail.name}</h4>
                    <button className="btn btn-ghost btn-sm" onClick={() => setProductDetail(null)}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {productDetail.variants.map((v: any) => {
                      const shade = productDetail.shades?.find((s: any) => s.id === v.shadeId);
                      return (
                        <div key={v.id} onClick={() => addToCart(productDetail, v)}
                          style={{
                            padding: '10px 12px', background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            cursor: 'pointer', transition: 'border-color 0.15s',
                          }}
                          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                          <div className="flex items-center gap-sm">
                            {shade?.colorCode && <span className="shade-swatch" style={{ background: shade.colorCode }} />}
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{shade?.name || v.sku}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                Stock: {v.totalStock} • AED {v.wholesalePrice || productDetail.wholesalePrice}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                  Search and add products above
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 90 }}>Qty</th>
                        <th style={{ width: 100 }}>Price</th>
                        <th style={{ width: 80 }}>Disc %</th>
                        <th style={{ width: 70 }}>VAT %</th>
                        <th style={{ width: 100 }}>Total</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => {
                        const lineTotal = item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100);
                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{item.productName}</div>
                              <div className="flex items-center gap-sm">
                                {item.shadeColor && <span className="shade-swatch" style={{ background: item.shadeColor, width: 12, height: 12 }} />}
                                <span className="cell-muted">{item.shadeName || item.sku}</span>
                              </div>
                              {item.quantity > item.availableStock && (
                                <div style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
                                  ⚠ Only {item.availableStock} available
                                </div>
                              )}
                            </td>
                            <td>
                              <input type="number" className="form-input" min={1} value={item.quantity}
                                onChange={e => updateCartItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                style={{ width: 70, padding: '4px 8px', textAlign: 'center' }} />
                            </td>
                            <td>
                              <input type="number" className="form-input" step="0.01" value={item.unitPrice}
                                onChange={e => updateCartItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                style={{ width: 90, padding: '4px 8px' }} />
                            </td>
                            <td>
                              <input type="number" className="form-input" min={0} max={100} value={item.discount}
                                onChange={e => updateCartItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                                style={{ width: 60, padding: '4px 8px', textAlign: 'center' }} />
                            </td>
                            <td>
                              <input type="number" className="form-input" value={item.vatRate}
                                onChange={e => updateCartItem(idx, 'vatRate', parseFloat(e.target.value) || 0)}
                                style={{ width: 60, padding: '4px 8px', textAlign: 'center' }} />
                            </td>
                            <td style={{ fontWeight: 600 }}>AED {fmt(lineTotal)}</td>
                            <td>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeCartItem(idx)}
                                style={{ color: 'var(--color-error)' }}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Order Notes</label>
                <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Any special instructions..." />
              </div>
            </div>
          </div>
        </div>

        {/* Right — Summary */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div className="card-header"><h3>Order Summary</h3></div>
            <div className="card-body">
              <div className="flex justify-between" style={{ marginBottom: 8 }}>
                <span className="cell-muted">Items</span>
                <span style={{ fontWeight: 500 }}>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 8 }}>
                <span className="cell-muted">Subtotal</span>
                <span>AED {fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ marginBottom: 8 }}>
                <span className="cell-muted">VAT</span>
                <span>AED {fmt(vatAmount)}</span>
              </div>
              <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
                <div className="flex justify-between">
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                    AED {fmt(totalAmount)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
                  onClick={() => handleSubmit('confirmed')} disabled={submitting || cart.length === 0}>
                  {submitting ? <span className="loading-spinner" /> : <><ShoppingCart size={16} /> Confirm & Invoice</>}
                </button>
                <button className="btn btn-secondary" style={{ width: '100%' }}
                  onClick={() => handleSubmit('draft')} disabled={submitting || cart.length === 0}>
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
