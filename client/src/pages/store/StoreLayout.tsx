import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag, Search, Menu, User } from 'lucide-react';

export default function StoreLayout() {
  return (
    <div className="store-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Banner */}
      <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: 500, letterSpacing: '1px' }}>
        FREE SHIPPING ON ALL ORDERS OVER AED 1000
      </div>

      {/* Header */}
      <header style={{ padding: '20px 40px', borderBottom: '1px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Menu size={24} style={{ cursor: 'pointer' }} />
          <Search size={20} style={{ cursor: 'pointer' }} />
        </div>
        
        <Link to="/shop" style={{ textDecoration: 'none' }}>
          <img 
            src="http://pastelarabia.com/cdn/shop/files/logo-web-2_8f4ec679-b112-4844-8251-c731f207ff07.png" 
            alt="Pastel Arabia" 
            style={{ height: '36px' }}
          />
        </Link>
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <User size={20} style={{ cursor: 'pointer' }} />
          <Link to="/shop/checkout" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <ShoppingBag size={20} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>(1)</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ background: '#f8f8f8', padding: '60px 40px', borderTop: '1px solid #eaeaea', marginTop: '60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          <div>
            <h4 style={{ marginBottom: '20px', fontSize: '14px', letterSpacing: '1px' }}>ABOUT US</h4>
            <div style={{ color: '#666', fontSize: '14px', lineHeight: 1.6, maxWidth: '300px' }}>
              Pastel Arabia Wholesale offers premium cosmetics and beauty products directly to businesses in the MENA region.
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '20px', fontSize: '14px', letterSpacing: '1px' }}>QUICK LINKS</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#666', fontSize: '14px' }}>
              <span>Shop All</span>
              <span>Bestsellers</span>
              <span>New Arrivals</span>
              <span>Contact Us</span>
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '20px', fontSize: '14px', letterSpacing: '1px' }}>NEWSLETTER</h4>
            <div className="newsletter-form" style={{ display: 'flex', gap: '8px' }}>
              <input type="email" placeholder="Email address" className="newsletter-input" style={{ padding: '12px', border: '1px solid #ddd', width: '250px' }} />
              <button style={{ background: '#000', color: '#fff', padding: '12px 24px', border: 'none', cursor: 'pointer' }}>SUBSCRIBE</button>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '60px', color: '#999', fontSize: '12px' }}>
          © 2024 Pastel Arabia Wholesale. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
