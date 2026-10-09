import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function StoreProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    api.get(`/inventory/${id}`).then(setProduct).catch(console.error);
  }, [id]);

  if (!product) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', display: 'flex', gap: '60px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 500px' }}>
        <div style={{ paddingBottom: '100%', position: 'relative', background: '#f8f8f8' }}>
          {product.image && product.image.startsWith('http') && (
            <img src={product.image} alt={product.name} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      </div>
      
      <div style={{ flex: '1 1 400px', paddingTop: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 400, marginBottom: '16px' }}>{product.name}</h1>
        <div style={{ fontSize: '20px', marginBottom: '24px' }}>AED {product.wholesalePrice}</div>
        
        <div style={{ marginBottom: '32px' }}>
          <p style={{ color: '#666', lineHeight: 1.6 }}>{product.description || 'Premium quality cosmetic product formulated for professional use.'}</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', border: '1px solid #ddd' }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>-</button>
            <input type="text" value={quantity} readOnly style={{ width: '50px', textAlign: 'center', border: 'none', borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd' }} />
            <button onClick={() => setQuantity(quantity + 1)} style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>+</button>
          </div>
          <button 
            onClick={() => {
              // Simulating Add to Cart & Checkout
              sessionStorage.setItem('store_cart', JSON.stringify([{ ...product, quantity }]));
              navigate('/shop/checkout');
            }} 
            style={{ flex: 1, background: '#000', color: '#fff', border: 'none', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
          >
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}
