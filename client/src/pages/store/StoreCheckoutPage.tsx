import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';

export default function StoreCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState<any[]>(location.state?.cart || []);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+971501234567',
    address: 'Jane Beauty Salon, Street 4, Dubai'
  });
  const [orderComplete, setOrderComplete] = useState(false);

  useEffect(() => {
    if (cart.length === 0) {
      const saved = sessionStorage.getItem('store_cart');
      if (saved) setCart(JSON.parse(saved));
    }
  }, [cart.length]);

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.wholesalePrice) * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create order in backend via dedicated store endpoint
      await api.post('/store/checkout', {
        customer: formData,
        items: cart
      });
      setOrderComplete(true);
      sessionStorage.removeItem('store_cart');
    } catch (err) {
      console.error(err);
      alert('Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>✨</div>
        <h1 style={{ fontSize: '28px', fontWeight: 400, marginBottom: '16px' }}>Thank you for your order!</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>Your invoice has been generated and sent to our wholesale team.</p>
        <button onClick={() => navigate('/shop')} style={{ background: '#000', color: '#fff', padding: '12px 32px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>CONTINUE SHOPPING</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', display: 'flex', gap: '60px', flexWrap: 'wrap-reverse' }}>
      
      {/* Checkout Form */}
      <div style={{ flex: '1 1 500px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px' }}>Contact Information</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <input required type="text" placeholder="Full Name" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input required type="email" placeholder="Email" style={inputStyle} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input required type="tel" placeholder="WhatsApp Number" style={inputStyle} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 400, marginBottom: '24px' }}>Shipping Address</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <textarea required placeholder="Full Address (e.g. Salon Name, Street, City)" style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>

          <button type="submit" disabled={loading || cart.length === 0} style={{ width: '100%', background: '#000', color: '#fff', padding: '16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px' }}>
            {loading ? 'Processing...' : 'Place Order & Get Invoice'}
          </button>
        </form>
      </div>

      {/* Order Summary */}
      <div style={{ flex: '1 1 350px', background: '#f8f8f8', padding: '32px', borderRadius: '4px', alignSelf: 'flex-start' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 400, marginBottom: '24px' }}>Order Summary</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid #ddd', paddingBottom: '24px', marginBottom: '24px' }}>
          {cart.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', background: '#eee', position: 'relative' }}>
                {item.image && item.image.startsWith('http') && <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#666', color: '#fff', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{item.quantity}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>AED {item.wholesalePrice}</div>
              </div>
              <div style={{ fontWeight: 500 }}>AED {(parseFloat(item.wholesalePrice) * item.quantity).toFixed(2)}</div>
            </div>
          ))}
          {cart.length === 0 && <div style={{ color: '#999' }}>Your cart is empty.</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 500 }}>
          <span>Total</span>
          <span>AED {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '14px 16px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  fontFamily: 'inherit'
};
