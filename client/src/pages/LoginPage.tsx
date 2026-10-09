import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: string) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#ffffff',
    }}>
      {/* Left — Beautiful Cosmetics Imagery */}
      <div className="login-left" style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '60px',
        background: 'url("https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80") center/cover no-repeat',
      }}>
        {/* Dark gradient overlay for text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)',
        }}></div>

        <div style={{ position: 'relative', zIndex: 1, color: '#ffffff', maxWidth: '500px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 300, marginBottom: '16px', letterSpacing: '-0.5px' }}>
            Beauty,<br/><span style={{ fontWeight: 600 }}>Redefined.</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', marginBottom: '40px', lineHeight: 1.6 }}>
            Manage your entire cosmetic inventory, process wholesale orders, and connect with distributors instantly through the Pastel Arabia business portal.
          </p>
          
          <div style={{
            display: 'flex', gap: '32px',
            textAlign: 'left', opacity: 0.9,
          }}>
            {[
              { num: '5K+', label: 'Premium SKUs' },
              { num: '500+', label: 'Active Retailers' },
              { num: '24/7', label: 'B2B Support' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>{s.num}</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="login-right" style={{
        width: '480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 64px',
        background: '#ffffff',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.03)',
        zIndex: 10,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img 
            src="https://pastelcosmeticsuk.com/cdn/shop/files/pastel-cosmetics-uk-logo-dark_5f8eb610-3cb9-49d3-9c5f-dc4d303eecc2_1200x1200.png?v=1629311553" 
            alt="Pastel Logo" 
            style={{ width: '180px', height: 'auto', display: 'block', margin: '0 auto 24px' }} 
          />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#666666' }}>
            Sign in to the Pastel Business Portal
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#991b1b',
            padding: '12px 16px', borderRadius: '8px',
            fontSize: '0.9rem', marginBottom: '24px',
            borderLeft: '4px solid #ef4444'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: 500, color: '#333' }}>Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@pastelarabia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '12px 16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" style={{ fontWeight: 500, color: '#333' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ padding: '12px 40px 12px 16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9ca3af', padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', padding: '14px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, backgroundColor: '#000000', color: '#ffffff', border: 'none' }} disabled={loading}>
            {loading ? <span className="loading-spinner" style={{ borderColor: '#ffffff', borderRightColor: 'transparent' }} /> : 'Sign In'}
          </button>
        </form>

        <div style={{
          margin: '40px 0 24px',
          display: 'flex',
          alignItems: 'center',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
          <span style={{ padding: '0 12px' }}>Quick Demo Access</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {[
            { role: 'owner', label: 'Owner', color: '#000000' },
            { role: 'manager', label: 'Manager', color: '#4b5563' },
            { role: 'accountant', label: 'Accountant', color: '#10b981' },
            { role: 'sales_executive', label: 'Sales Exec', color: '#3b82f6' },
          ].map(r => (
            <button
              key={r.role}
              className="btn btn-secondary btn-sm"
              onClick={() => handleDemoLogin(r.role)}
              disabled={loading}
              style={{ 
                justifyContent: 'center', 
                backgroundColor: '#ffffff', 
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px',
                color: '#4b5563',
                fontWeight: 500
              }}
            >
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: r.color, marginRight: '8px', display: 'inline-block'
              }} />
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
