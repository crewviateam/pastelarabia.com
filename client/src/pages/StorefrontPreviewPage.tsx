import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { ShoppingCart, LogIn, Search, CheckCircle } from 'lucide-react';

interface Variant {
  id: string;
  sku: string;
  shadeName: string;
  colorCode: string;
  sizeName: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  wholesalePrice: string | number;
  totalStock: number;
  variants: Variant[];
}

interface CartItem {
  id: string; // Unique cart item ID (product.id + variant.id)
  product: Product;
  variant: Variant | null;
  quantity: number;
}

export default function StorefrontPreviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({}); // productId -> variantId
  const { success: successToast, error: errorToast } = useToast();

  const customerData = {
    first_name: "Jane",
    last_name: "Doe",
    email: "jane.doe@example.com",
    phone: "+971501234567"
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/storefront');
      const loadedProducts = res.data;
      setProducts(loadedProducts);
      
      // Auto-select first in-stock variant for each product
      const initialSelections: Record<string, string> = {};
      loadedProducts.forEach((p: Product) => {
        if (p.variants && p.variants.length > 0) {
          const firstInStock = p.variants.find(v => v.stock > 0) || p.variants[0];
          initialSelections[p.id] = firstInStock.id;
        }
      });
      setSelectedVariants(initialSelections);
      
    } catch (error) {
      console.error(error);
      errorToast('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, variant: Variant | null, quantity: number) => {
    if (quantity <= 0) return;
    
    const cartItemId = variant ? `${product.id}-${variant.id}` : product.id;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { id: cartItemId, product, variant, quantity }];
    });
    
    const itemName = variant ? `${product.name} (${variant.shadeName})` : product.name;
    successToast(`${quantity}x ${itemName} added to cart`);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.product.wholesalePrice.toString() || '0') * item.quantity), 0);

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      errorToast('Please log in to checkout');
      return;
    }
    
    if (cart.length === 0) {
      errorToast('Cart is empty');
      return;
    }

    try {
      const payload = {
        id: Date.now(),
        email: customerData.email,
        created_at: new Date().toISOString(),
        total_price: cartTotal.toFixed(2),
        currency: "AED",
        line_items: cart.map(item => ({
          id: Date.now() + Math.floor(Math.random() * 1000),
          product_id: item.product.id,
          variant_id: item.variant ? item.variant.id : null,
          sku: item.variant ? item.variant.sku : item.product.sku,
          title: item.variant ? `${item.product.name} - ${item.variant.shadeName}` : item.product.name,
          quantity: item.quantity,
          price: item.product.wholesalePrice
        })),
        customer: {
          id: Date.now() + Math.floor(Math.random() * 1000),
          email: customerData.email,
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          phone: customerData.phone
        }
      };

      await api.post('/integrations/shopify/webhook/orders-create', payload);
      
      successToast('Checkout successful! Mock Shopify webhook sent.');
      setCart([]);
      fetchProducts(); // Refresh stock
    } catch (error) {
      console.error(error);
      errorToast('Checkout failed');
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb', padding: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>GLOW STOREFRONT</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setIsLoggedIn(!isLoggedIn)}>
            {isLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 'bold' }}>JD</div>
                <span>Jane Doe</span>
              </div>
            ) : (
              <button className="btn btn-outline">
                <LogIn size={16} style={{ marginRight: 8 }} /> Mock Log In
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <ShoppingCart size={24} color="var(--color-text)" />
            {cart.length > 0 && (
              <span style={{ position: 'absolute', top: -8, right: -8, background: 'var(--color-danger)', color: 'white', fontSize: 10, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {cart.length}
              </span>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <h2 style={{ marginBottom: 24 }}>Shop Cosmetics</h2>
          
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--color-border)' }}>
                  <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-md)', marginBottom: 16 }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '80%', height: 18, marginBottom: 8 }}></div>
                  <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 16 }}></div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                     <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }}></div>
                     <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }}></div>
                     <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                     <div className="skeleton skeleton-text" style={{ width: '30%', height: 24, marginBottom: 0 }}></div>
                     <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 3 }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {products.map(product => {
                const hasVariants = product.variants && product.variants.length > 0;
                
                // Determine active variant
                const activeVariantId = selectedVariants[product.id];
                const activeVariant = hasVariants ? product.variants.find(v => v.id === activeVariantId) : null;
                
                // Determine stock based on variant or parent
                const stock = hasVariants && activeVariant ? activeVariant.stock : (product.totalStock || 0);
                const isOutOfStock = stock <= 0;

                return (
                  <div key={product.id} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ height: 160, background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                      <Search size={40} opacity={0.2} />
                    </div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{product.name}</h3>
                    <p style={{ margin: '0 0 16px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      SKU: {activeVariant ? activeVariant.sku : product.sku}
                    </p>
                    
                    {/* Variant Swatches */}
                    {hasVariants && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                          Select Shade: {activeVariant?.shadeName}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {product.variants.map(v => (
                            <div 
                              key={v.id}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [product.id]: v.id }))}
                              style={{ 
                                width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                                background: v.colorCode || '#ddd',
                                border: activeVariantId === v.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                                outline: activeVariantId === v.id ? '2px solid white' : 'none',
                                outlineOffset: -4,
                                opacity: v.stock <= 0 ? 0.3 : 1
                              }}
                              title={`${v.shadeName} (${v.stock} in stock)`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 'auto' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>AED {product.wholesalePrice}</span>
                      <span style={{ fontSize: '0.85rem', color: isOutOfStock ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                        {isOutOfStock ? 'Out of Stock' : `${stock} Available`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="number" 
                        id={`qty-${product.id}`}
                        defaultValue={1}
                        min={1}
                        max={stock > 0 ? stock : 1}
                        className="form-input"
                        style={{ width: 80 }}
                        disabled={isOutOfStock}
                      />
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1 }}
                        disabled={isOutOfStock}
                        onClick={() => {
                          const qty = parseInt((document.getElementById(`qty-${product.id}`) as HTMLInputElement).value);
                          if (qty > stock) {
                            errorToast(`Only ${stock} items available`);
                            return;
                          }
                          addToCart(product, activeVariant || null, qty);
                        }}
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Drawer */}
        <div style={{ width: 400, background: 'white', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 24, borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShoppingCart /> Your Cart
            </h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 40 }}>
                Your cart is empty.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h5 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>{item.product.name}</h5>
                      {item.variant && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.variant.colorCode || '#ddd' }} />
                          {item.variant.shadeName}
                        </div>
                      )}
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        {item.quantity} x AED {item.product.wholesalePrice}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      AED {(parseFloat(item.product.wholesalePrice.toString()) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: 24, borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-alt)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: '1.25rem', fontWeight: 800 }}>
              <span>Total</span>
              <span>AED {cartTotal.toFixed(2)}</span>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px 0', fontSize: '1.1rem' }}
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              Complete Purchase
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 12 }}>
              *Clicking this simulates a real Shopify webhook hitting the backend.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
