import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface BranchOption {
  id: string;
  name: string;
}

export default function Header() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  useEffect(() => {
    api.get('/branches').then(setBranches).catch(() => {});
  }, []);

  const branchLabel = selectedBranch === 'all'
    ? 'All Branches'
    : branches.find(b => b.id === selectedBranch)?.name || 'All Branches';

  return (
    <header className="app-header">
      <div className="flex items-center gap-md">
        <div className="search-input-wrapper" style={{ width: 320 }}>
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search products, orders, contacts..."
          />
        </div>
      </div>

      <div className="flex items-center gap-md">
        {/* Branch Selector */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            style={{ minWidth: 160 }}
          >
            <span>🏢 {branchLabel}</span>
            <ChevronDown size={14} />
          </button>
          {showBranchDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setShowBranchDropdown(false)}
              />
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                minWidth: 200, zIndex: 100, overflow: 'hidden'
              }}>
                <button
                  className="sidebar-link"
                  style={{ color: selectedBranch === 'all' ? 'var(--color-primary)' : 'var(--color-text)', padding: '10px 16px' }}
                  onClick={() => { setSelectedBranch('all'); setShowBranchDropdown(false); }}
                >
                  All Branches
                </button>
                {branches.map(b => (
                  <button
                    key={b.id}
                    className="sidebar-link"
                    style={{ color: selectedBranch === b.id ? 'var(--color-primary)' : 'var(--color-text)', padding: '10px 16px' }}
                    onClick={() => { setSelectedBranch(b.id); setShowBranchDropdown(false); }}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute', top: 4, right: 4, width: 8, height: 8,
            background: 'var(--color-error)', borderRadius: '50%',
            border: '2px solid var(--color-bg-card)'
          }} />
        </button>
      </div>
    </header>
  );
}
