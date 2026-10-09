import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, Users, ShoppingCart, FileText, 
  CreditCard, BarChart3, MessageSquare, Bot, Settings,
  Building2, Truck, ClipboardList, Receipt, UserCog,
  Bell, LogOut, Globe, Warehouse
} from 'lucide-react';

const navItems = [
  { section: 'Main' },
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/branches', icon: Building2, label: 'Branches' },
  
  { section: 'Business' },
  { path: '/inventory', icon: Package, label: 'Inventory', module: 'inventory' },
  { path: '/customers', icon: Users, label: 'Customers', module: 'customer' },
  { path: '/sales', icon: ShoppingCart, label: 'Sales', module: 'sales' },
  { path: '/vendors', icon: Truck, label: 'Vendors', module: 'vendor' },
  { path: '/purchases', icon: Package, label: 'Purchases', module: 'purchase' },
  { path: '/invoices', icon: FileText, label: 'Invoices', module: 'sales' },
  { path: '/payments', icon: CreditCard, label: 'Payments', module: 'payments' },
  { path: '/accounts', icon: BarChart3, label: 'Accounts & Cashflow', module: 'accounts' },
  
  { section: 'Operations' },
  { path: '/staff', icon: UserCog, label: 'Staff & Roles', module: 'staff' },
  { path: '/chat', icon: MessageSquare, label: 'Chat', badge: true, module: 'chat' },
  { path: '/ai', icon: Bot, label: 'AI Assistant', module: 'ai' },
  
  { section: 'Insights' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', module: 'analytics' },
  { path: '/reports', icon: ClipboardList, label: 'Reports', module: 'analytics' },
  
  { section: 'Other' },
  { path: '/website', icon: Globe, label: 'Website' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();

  const initials = user?.name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand" style={{ padding: '24px 20px', borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
        <img 
          src="http://pastelarabia.com/cdn/shop/files/logo-web-2_8f4ec679-b112-4844-8251-c731f207ff07.png" 
          alt="Pastel Arabia Wholesale" 
          style={{ width: '100%', maxWidth: '180px', objectFit: 'contain' }}
        />
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if ('section' in item && !('path' in item)) {
            return (
              <div key={i} className="sidebar-section-title">
                {item.section}
              </div>
            );
          }

          if ('path' in item) {
            // Check permissions
            if ('module' in item && item.module) {
              if (!hasPermission(item.module)) return null;
            }

            const Icon = item.icon!;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path!);

            return (
              <NavLink
                key={item.path}
                to={item.path!}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon />
                <span>{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="sidebar-badge">3</span>
                )}
              </NavLink>
            );
          }

          return null;
        })}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={logout} title="Logout"
          style={{ color: 'var(--color-text-muted)' }}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
