import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import heroVideo from '../../assets/hero.mp4';

export default function StoreHomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch products from existing inventory API
    api.get('/inventory/storefront').then(res => {
      const items = res.data?.data || res.data || [];
      // If we only want 8 items, we can slice it
      setProducts(items.slice(0, 8));
    }).catch(console.error);
  }, []);

  const addToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((total, item) => total + (parseFloat(item.product.wholesalePrice || 0) * item.quantity), 0);
  const cartItemCount = cart.reduce((a,c) => a + c.quantity, 0);

  return (
    <div style={{ fontFamily: '"Inter", "Helvetica Neue", sans-serif', overflowX: 'hidden' }}>
      {/* Hero Section */}
      <div style={{ 
        height: '80vh', 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '100%',
            minHeight: '100%',
            objectFit: 'cover',
            zIndex: 0
          }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1 }} />
        
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: '#fff', padding: '0 20px' }}>
          <h1 className="hero-title" style={{ fontWeight: 300, letterSpacing: '4px', marginBottom: '24px', textTransform: 'uppercase' }}>Show Me Your Magic</h1>
          <p className="hero-subtitle" style={{ marginBottom: '40px', letterSpacing: '2px', fontWeight: 300 }}>DISCOVER THE NEW COLLECTION</p>
          <button 
            onClick={() => {
              document.getElementById('best-sellers')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ 
              background: '#fff', 
              color: '#000', 
              padding: '18px 48px', 
              fontSize: '15px', 
              letterSpacing: '2px', 
              border: 'none', 
              cursor: 'pointer', 
              textTransform: 'uppercase',
              transition: 'all 0.3s ease',
              fontWeight: 500
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
          >
            Shop Now
          </button>
        </div>
      </div>

      {/* Featured Products */}
      <div id="best-sellers" style={{ maxWidth: '1400px', margin: '100px auto', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 300, letterSpacing: '3px', marginBottom: '60px', textTransform: 'uppercase' }}>Best Sellers</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '40px' }}>
          {products.map(product => (
            <div key={product.id} className="product-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
              <div 
                onClick={(e) => addToCart(product, e)}
                style={{ position: 'relative', paddingBottom: '125%', overflow: 'hidden', background: '#f4f4f4', marginBottom: '24px' }}
              >
                {product.image && product.image.startsWith('http') ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, width: '100%', height: '100%', 
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease'
                    }} 
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px', letterSpacing: '1px' }}>NO IMAGE</div>
                )}
                
                {/* Quick Add Button Overlay */}
                <div 
                  className="quick-add"
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '85%',
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  }}
                >
                  <button 
                    onClick={(e) => addToCart(product, e)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#000',
                      border: 'none',
                      padding: '12px 0',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'; e.currentTarget.style.color = '#000'; }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 400, marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>{product.name}</h3>
              <div style={{ fontSize: '15px', color: '#000', fontWeight: 300 }}>AED {product.wholesalePrice}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        style={{
          position: 'fixed', bottom: '30px', right: '30px', zIndex: 900,
          background: '#000', color: '#fff', width: '60px', height: '60px',
          borderRadius: '50%', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.3s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '24px' }}>🛒</span>
        {cartItemCount > 0 && (
          <div style={{
            position: 'absolute', top: '-5px', right: '-5px', background: 'red',
            color: 'white', width: '24px', height: '24px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 'bold'
          }}>
            {cartItemCount}
          </div>
        )}
      </button>

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          onClick={() => setIsCartOpen(false)}
        />
      )}
      
      {/* Cart Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '100vw',
        background: '#fff', zIndex: 1000,
        transform: isCartOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 400, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>Your Cart ({cartItemCount})</h2>
          <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>✕</button>
        </div>
        
        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>Your cart is empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {cart.map(item => (
                <div key={item.product.id} style={{ display: 'flex', gap: '16px' }}>
                  <img src={item.product.image?.startsWith('http') ? item.product.image : ''} style={{ width: '80px', height: '100px', objectFit: 'cover', background: '#f4f4f4' }} alt="" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px', textTransform: 'uppercase', paddingRight: '12px' }}>{item.product.name}</h4>
                      <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '12px', textDecoration: 'underline' }}>Remove</button>
                    </div>
                    <p style={{ fontSize: '14px', margin: '0 0 8px', color: '#666' }}>AED {item.product.wholesalePrice}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <button onClick={() => updateQuantity(item.product.id, -1)} style={{ background: 'none', border: 'none', padding: '4px 12px', cursor: 'pointer', fontSize: '16px', color: '#666' }}>-</button>
                        <span style={{ fontSize: '13px', color: '#000', width: '20px', textAlign: 'center', fontWeight: 500 }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} style={{ background: 'none', border: 'none', padding: '4px 12px', cursor: 'pointer', fontSize: '16px', color: '#666' }}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: '24px', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '18px', fontWeight: 500 }}>
              <span>TOTAL</span>
              <span>AED {cartTotal.toFixed(2)}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => {
                  const checkoutCart = cart.map(c => ({ ...c.product, quantity: c.quantity }));
                  sessionStorage.setItem('store_cart', JSON.stringify(checkoutCart));
                  navigate('/shop/checkout', { state: { cart: checkoutCart } });
                }}
                style={{
                  width: '100%', padding: '16px 0', background: '#000', color: '#fff',
                  border: 'none', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 0.3s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#333'}
                onMouseOut={(e) => e.currentTarget.style.background = '#000'}
              >
                Checkout Now
              </button>
              
              <button 
                onClick={() => setIsCartOpen(false)}
                style={{
                  width: '100%', padding: '16px 0', background: '#f4f4f4', color: '#000',
                  border: '1px solid #ddd', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 0.3s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e0e0e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f4f4f4'}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS injection for the hover effects */}
      <style>{`
        .product-card .quick-add {
          opacity: 0;
          visibility: hidden;
        }
        .product-card:hover .quick-add {
          opacity: 1 !important;
          visibility: visible;
        }
      `}</style>
    </div>
  );
}
