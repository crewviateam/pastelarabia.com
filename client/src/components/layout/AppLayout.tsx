import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function AppLayout() {
  const { user } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isLocal = window.location.hostname === 'localhost';
    const wsUrl = isLocal ? `${protocol}//localhost:3000/ws/chat` : 'wss://pastel.crewvia.in/ws/chat';
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'auth', userId: user.id }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_store_order') {
          const { invoiceId, invoiceNumber, customerName, amount } = data.data;
          
          // Play a slight notification sound (optional, but good UX)
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}

          success(
            `🛒 New Purchase from ${customerName}!`,
            `Invoice: ${invoiceNumber} | Total: AED ${amount}`,
            () => navigate(`/invoices/${invoiceId}`),
            'View Invoice Details'
          );
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user, success, navigate]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90
          }}
        />
      )}
      
      <div className={`app-sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`} style={{ display: 'contents' }}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="app-main">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
