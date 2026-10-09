import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCcw, ArrowUpRight, ArrowDownRight, FileText, Lock } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(n);

export default function AccountsPage() {
  const { canSeePricing } = useAuth();
  const showPricing = canSeePricing('accounts');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalIncome: 0,
    totalExpenses: 0,
    netCashflow: 0,
    outstandingReceivables: 0,
    outstandingPayables: 0,
    recentTransactions: []
  });

  useEffect(() => {
    api.get('/payments/stats')
      .then(res => {
        setStats(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const PriceDisplay = ({ val }: { val: number }) => (
    showPricing ? <>{fmt(val)}</> : <span className="cell-muted flex items-center gap-xs" style={{fontSize:'var(--text-base)'}}><Lock size={16}/> Hidden</span>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Accounts & Cashflow</h1>
          <p>Complete overview of business financials, sales, purchases, and payments.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary">
            <FileText size={16} /> Generate Statement
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon green"><TrendingUp size={20} /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Income</div>
            <div className="stat-card-value"><PriceDisplay val={stats.totalIncome} /></div>
            <div className="stat-card-trend positive">From all sales & payments</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><TrendingDown size={20} /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Expenses</div>
            <div className="stat-card-value"><PriceDisplay val={stats.totalExpenses} /></div>
            <div className="stat-card-trend negative">From all purchases</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon primary"><Wallet size={20} /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Net Cashflow</div>
            <div className="stat-card-value"><PriceDisplay val={stats.netCashflow} /></div>
            <div className="stat-card-trend positive">Overall business health</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon amber"><RefreshCcw size={20} /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Pending Receivables</div>
            <div className="stat-card-value"><PriceDisplay val={stats.outstandingReceivables} /></div>
            <div className="stat-card-trend warning">To be collected</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Transactions</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTransactions?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center cell-muted" style={{ padding: '32px 0' }}>No recent transactions</td>
                </tr>
              ) : (
                stats.recentTransactions?.map((t: any) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString()}</td>
                    <td>{t.description}</td>
                    <td>
                      <span className={`badge ${t.type === 'incoming' ? 'badge-success' : 'badge-danger'}`}>
                        {t.type === 'incoming' ? <ArrowUpRight size={12} style={{marginRight: 4}}/> : <ArrowDownRight size={12} style={{marginRight: 4}}/>}
                        {t.type === 'incoming' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="text-right fw-600" style={{color: t.type === 'incoming' ? 'var(--color-success)' : 'var(--color-danger)'}}>
                      {showPricing ? `${t.type === 'incoming' ? '+' : '-'} ${fmt(parseFloat(t.amount))}` : <span className="cell-muted"><Lock size={12}/></span>}
                    </td>
                    <td><span className="badge badge-success">{t.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
