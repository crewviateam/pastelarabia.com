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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #FAF6F3 0%, #F0E8E2 50%, #E8DDD5 100%)',
    }}>
      {/* Left — Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        background: 'linear-gradient(135deg, #1E1B18 0%, #2A2622 100%)',
        color: 'white',
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #C8956C, #C17B7B)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 24px',
          }}>✦</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, marginBottom: 8 }}>
            Glow Wholesale
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', color: 'rgba(255,255,255,0.6)', marginBottom: 40 }}>
            Premium Cosmetics Business Management
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
            textAlign: 'center', opacity: 0.7,
          }}>
            {[
              { num: '5,000+', label: 'SKUs Managed' },
              { num: '500+', label: 'Distributors' },
              { num: '₹50M+', label: 'Revenue Tracked' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#C8956C' }}>{s.num}</div>
                <div style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div style={{
        width: 520,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
      }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 4 }}>
          Welcome back
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 32 }}>
          Sign in to your business portal
        </p>

        {error && (
          <div style={{
            background: 'var(--color-error-light)', color: 'var(--color-error-dark)',
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="owner@glow.ae"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? <span className="loading-spinner" /> : 'Sign In'}
          </button>
        </form>

        <div style={{
          margin: '32px 0 16px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          Quick Demo Access
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { role: 'owner', label: 'Owner', color: '#8B6F5C' },
            { role: 'manager', label: 'Manager', color: '#C8956C' },
            { role: 'accountant', label: 'Accountant', color: '#4CAF50' },
            { role: 'sales_executive', label: 'Sales Exec', color: '#3B82F6' },
          ].map(r => (
            <button
              key={r.role}
              className="btn btn-secondary btn-sm"
              onClick={() => handleDemoLogin(r.role)}
              disabled={loading}
              style={{ justifyContent: 'flex-start' }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: r.color, flexShrink: 0,
              }} />
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
