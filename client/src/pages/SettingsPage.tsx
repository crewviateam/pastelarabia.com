import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Smartphone, CheckCircle, RefreshCcw, Database, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function SettingsPage() {
  const { error: showError, success } = useToast();
  const [waStatus, setWaStatus] = useState<any>({ ready: false, hasQr: false, info: null });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [tallySettings, setTallySettings] = useState({ tallyEnabled: false, tallyServerUrl: 'http://localhost:9000', tallyCompanyName: '' });
  const [savingTally, setSavingTally] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(res);
      if (!res.ready && res.hasQr && !qrCode) {
        fetchQr();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQr = async () => {
    try {
      const res = await api.get('/whatsapp/qr');
      setQrCode(res.qrCode);
    } catch (err: any) {
      if (err.message !== 'WhatsApp is already connected') {
        setTimeout(fetchQr, 2000);
      }
    }
  };

  const fetchTallySettings = async () => {
    try {
      const res = await api.get('/settings');
      setTallySettings({
        tallyEnabled: res.tallyEnabled,
        tallyServerUrl: res.tallyServerUrl || 'http://localhost:9000',
        tallyCompanyName: res.tallyCompanyName || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const saveTallySettings = async () => {
    setSavingTally(true);
    try {
      await api.put('/settings', tallySettings);
      success('Tally ERP 9 Integration settings saved!');
    } catch (err: any) {
      showError('Failed to save Tally settings', err.message);
    } finally {
      setSavingTally(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post('/whatsapp/logout');
      success('WhatsApp disconnected successfully');
      setWaStatus({ ready: false, hasQr: false, info: null });
      setQrCode(null);
    } catch (err: any) {
      showError('Failed to logout WhatsApp', err.message);
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTallySettings();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure system settings and integrations</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-xl)' }}>
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <Smartphone size={20} className="text-primary" />
              <h3 className="card-title" style={{ margin: 0 }}>WhatsApp Integration</h3>
            </div>
            {waStatus.ready && (
              <button className="btn btn-secondary btn-sm" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Disconnecting...' : 'Disconnect'}
              </button>
            )}
          </div>
          <div className="card-body">
            <p className="cell-muted" style={{ marginBottom: 16 }}>
              Connect your WhatsApp account to automatically send invoices and notifications in the background.
            </p>

            {loading ? (
              <div className="flex items-center justify-center" style={{ height: 150 }}>
                <div className="loading-spinner" />
              </div>
            ) : waStatus.error ? (
              <div className="flex flex-col gap-sm" style={{ padding: '24px', background: 'var(--color-error-50)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)' }}>
                <div style={{ fontWeight: 600 }}>WhatsApp Engine Error</div>
                <div style={{ fontSize: 'var(--text-sm)' }}>{waStatus.error}</div>
                <div style={{ fontSize: 'var(--text-sm)', marginTop: 8 }}>
                  If you see "browser already running", please completely stop your backend server and start it again (`npm run dev`) to clear the old session lock.
                </div>
              </div>
            ) : waStatus.ready ? (
              <div className="flex flex-col gap-md" style={{ padding: '24px', background: 'var(--color-success-50)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)' }}>
                <div className="flex items-center gap-sm">
                  <CheckCircle size={24} />
                  <div style={{ fontWeight: 600 }}>WhatsApp is successfully connected!</div>
                </div>
                {waStatus.info && (
                  <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', border: '1px solid var(--color-success)' }}>
                    <div className="cell-muted" style={{ fontSize: 'var(--text-xs)' }}>Connected Account</div>
                    <div style={{ fontWeight: 600 }}>{waStatus.info.pushname || 'WhatsApp User'}</div>
                    <div style={{ fontSize: 'var(--text-sm)' }}>+{waStatus.info.wid}</div>
                  </div>
                )}
              </div>
            ) : qrCode ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 12, fontWeight: 500 }}>Scan QR Code with WhatsApp:</div>
                <img src={qrCode} alt="WhatsApp QR Code" style={{ width: 250, height: 250, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                <div className="cell-muted" style={{ marginTop: 8, fontSize: 'var(--text-xs)' }}>Open WhatsApp on your phone &gt; Linked Devices &gt; Link a Device</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center" style={{ padding: '32px', background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <RefreshCcw size={24} className="cell-muted" style={{ marginBottom: 12, animation: 'spin 2s linear infinite' }} />
                <div style={{ fontWeight: 500 }}>Generating QR Code...</div>
                <div className="cell-muted" style={{ fontSize: 'var(--text-xs)' }}>Please wait a moment</div>
              </div>
            )}
          </div>
        </div>

        {/* TALLY INTEGRATION */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <Database size={20} className="text-primary" />
              <h3 className="card-title" style={{ margin: 0 }}>Tally ERP 9 Integration</h3>
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveTallySettings} disabled={savingTally}>
              <Save size={16} /> {savingTally ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          <div className="card-body">
            <p className="cell-muted" style={{ marginBottom: 24 }}>
              Automatically sync passed invoices and payments directly to your Tally Server.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <input 
                type="checkbox" 
                id="tallyEnabled" 
                checked={tallySettings.tallyEnabled}
                onChange={(e) => setTallySettings({ ...tallySettings, tallyEnabled: e.target.checked })}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
              <label htmlFor="tallyEnabled" style={{ fontWeight: 600, margin: 0, cursor: 'pointer' }}>Enable Auto-Sync to Tally</label>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Tally Server URL (e.g. http://localhost:9000)</label>
              <input 
                type="text" 
                className="form-input" 
                value={tallySettings.tallyServerUrl}
                onChange={(e) => setTallySettings({ ...tallySettings, tallyServerUrl: e.target.value })}
                disabled={!tallySettings.tallyEnabled}
                placeholder="http://localhost:9000"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Tally Company Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={tallySettings.tallyCompanyName}
                onChange={(e) => setTallySettings({ ...tallySettings, tallyCompanyName: e.target.value })}
                disabled={!tallySettings.tallyEnabled}
                placeholder="Exact company name in Tally"
              />
            </div>
            
            <div className="cell-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 8 }}>
              Note: The backend must have network access to the Tally XML port. If you are running Tally locally, ensure the network port is forwarded or accessible.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
