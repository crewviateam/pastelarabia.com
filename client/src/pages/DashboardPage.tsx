import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
  Package, Users, ArrowUpRight, ArrowDownRight, FileText,
  CreditCard, Clock, Lock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, PieChart, Pie, Cell, LineChart, Line, Label
} from 'recharts';

interface DashboardStats {
  todaySales: number;
  todaySalesCount: number;
  todayPurchases: number;
  paymentsReceived: number;
  outstandingPayments: number;
  stockValue: number;
  lowStockItems: number;
}

const fmt = (n: number) => new Intl.NumberFormat('en-AE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(n);

export default function DashboardPage() {
  const { canSeePricing } = useAuth();
  const showPricing = canSeePricing(); // Dashboard is global, so only check global pricing
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/sales-chart?period=daily'),
      api.get('/dashboard/recent-invoices'),
      api.get('/dashboard/low-stock'),
      api.get('/dashboard/best-sellers'),
      api.get('/dashboard/outstanding-payments'),
    ]).then(([s, chart, inv, ls, bs, os]) => {
      setStats(s);
      setSalesChart(chart.sales || []);
      setRecentInvoices(inv);
      setLowStock(ls);
      setBestSellers(bs);
      setOutstanding(os);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="skeleton skeleton-text title" style={{ width: '200px' }}></div>
            <div className="skeleton skeleton-text short" style={{ width: '300px' }}></div>
          </div>
          <div className="skeleton skeleton-box" style={{ width: '120px', height: '36px' }}></div>
        </div>
        
        <div className="stats-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton skeleton-icon"></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text short"></div>
                <div className="skeleton skeleton-text" style={{ height: '24px', width: '70%', marginTop: '8px' }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header"><div className="skeleton skeleton-text short" style={{ width: '150px', marginBottom: 0 }}></div></div>
          <div className="card-body">
            <div className="skeleton skeleton-chart"></div>
          </div>
        </div>

        <div className="grid-2">
          {[1,2].map(i => (
            <div key={i} className="card">
              <div className="card-header"><div className="skeleton skeleton-text short" style={{ width: '150px', marginBottom: 0 }}></div></div>
              <div className="card-body flush">
                <div style={{ padding: 'var(--space-base)' }}>
                  {[1,2,3,4].map(j => <div key={j} className="skeleton skeleton-table-row"></div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'unpaid': return 'badge-warning';
      case 'overdue': return 'badge-error';
      case 'partially_paid': return 'badge-info';
      default: return 'badge-muted';
    }
  };

  const PriceDisplay = ({ val }: { val: number }) => (
    showPricing ? <>AED {fmt(val)}</> : <span className="cell-muted flex items-center gap-xs" style={{fontSize:'var(--text-base)'}}><Lock size={16}/> Hidden</span>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your business overview.</p>
        </div>
        <div className="page-actions">
          <Link to="/sales/new" className="btn btn-primary">
            <ShoppingCart size={16} /> New Sale
          </Link>
        </div>
      </div>

      
      {/* KPI Cards */}
      <div className="dashboard-grid-top">
        {/* Total Balance / Revenue */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14}/> Total Revenue</div>
                <div className="stat-card-value"><PriceDisplay val={stats?.todaySales || 0}/></div>
                <div className="badge-trend up" style={{ marginTop: 8 }}>
                  <TrendingUp size={12}/> +12% <span className="trend-text">last year</span>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 24, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChart}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontWeight: 700 }} />
                  <Bar dataKey="revenue" fill="#151515" radius={[4,4,4,4]} barSize={24} background={{ fill: '#f5f5f5', radius: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Subscriptions / Target */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Package size={14}/> Stock Value</div>
                <div className="stat-card-value"><PriceDisplay val={stats?.stockValue || 0}/></div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 12, minHeight: 180, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{name: 'Achieved', value: 75}, {name: 'Remaining', value: 25}]} cx="50%" cy="50%" innerRadius={70} outerRadius={90} stroke="none" dataKey="value">
                    <Cell fill="#151515" />
                    <Cell fill="#f5f5f5" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>+17%</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>vs last month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category / Goal */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={14}/> Outstanding
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 12, minHeight: 180, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={[{name: 'Paid', value: 65}, {name: 'Due', value: 35}]} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={70} outerRadius={90} stroke="none" dataKey="value">
                    <Cell fill="#151515" />
                    <Cell fill="#e9e9e9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: -30 }}><PriceDisplay val={stats?.outstandingPayments || 0}/></div>
              <div style={{ width: '100%', marginTop: 24 }}>
                <div className="flex" style={{ justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>
                  <span>Receivables</span>
                  <span>AED 5,400</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#f5f5f5', borderRadius: 4 }}>
                  <div style={{ width: '65%', height: '100%', background: '#151515', borderRadius: 4 }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-bottom">
        {/* Income Breakdown */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>Income Breakdown</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>37% <span style={{ fontSize: 14, color: '#888', fontWeight: 500 }}>Spent</span></div>
              </div>
              <div className="badge-trend up" style={{ height: 'fit-content' }}>+12%</div>
            </div>
            <div style={{ display: 'flex', gap: 4, height: 24, marginBottom: 32 }}>
              <div style={{ flex: 45, background: '#151515', borderRadius: '4px 0 0 4px' }}></div>
              <div style={{ flex: 20, background: '#555555' }}></div>
              <div style={{ flex: 10, background: '#e9e9e9', borderRadius: '0 4px 4px 0' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="flex" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, background: '#151515', borderRadius: 2 }}></div> Cosmetics</div>
                <div>45%</div>
              </div>
              <div className="flex" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, background: '#555555', borderRadius: 2 }}></div> Skincare</div>
                <div>20%</div>
              </div>
              <div className="flex" style={{ justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, background: '#e9e9e9', borderRadius: 2 }}></div> Accessories</div>
                <div>10%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Income Statistics */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>Income Statistics</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 16 }}>
                  AED {fmt(stats?.todaySales ?? 0)}
                  <div className="badge-trend up" style={{ padding: '4px 8px' }}>+12% <span className="trend-text">last year</span></div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 24, minHeight: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChart}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#151515" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#151515" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#888888', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontWeight: 700 }} cursor={{ stroke: '#e9e9e9', strokeWidth: 1 }} />
                  <ReferenceLine y={200} stroke="#151515" strokeDasharray="3 3">
                  </ReferenceLine>
                  <Area type="linear" dataKey="revenue" stroke="#151515" strokeWidth={3} fill="url(#colorIncome)" name="Income" activeDot={{ r: 6, fill: '#151515', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

<div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Invoices</h3>
            <Link to="/invoices" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="card-body flush">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length === 0 ? (
                    <tr><td colSpan={4} className="text-center" style={{ padding: 32, color: 'var(--color-text-muted)' }}>No invoices yet</td></tr>
                  ) : recentInvoices.slice(0, 6).map((inv: any) => (
                    <tr key={inv.id}>
                      <td><Link to={`/invoices/${inv.id}`} style={{ fontWeight: 600 }}>{inv.invoiceNumber}</Link></td>
                      <td>{inv.customerName}</td>
                      <td style={{ fontWeight: 500 }}>AED {fmt(parseFloat(inv.totalAmount))}</td>
                      <td><span className={`badge ${statusColor(inv.status)}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Outstanding Payments */}
        <div className="card">
          <div className="card-header">
            <h3>Outstanding Payments</h3>
            <Link to="/payments" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="card-body flush">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Outstanding</th>
                    <th>Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.length === 0 ? (
                    <tr><td colSpan={4} className="text-center" style={{ padding: 32, color: 'var(--color-text-muted)' }}>No outstanding payments</td></tr>
                  ) : outstanding.slice(0, 6).map((o: any) => (
                    <tr key={o.customerId}>
                      <td style={{ fontWeight: 500 }}>{o.customerName}</td>
                      <td><span className="badge badge-muted">{o.customerType}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--color-error)' }}>AED {fmt(parseFloat(o.totalOutstanding))}</td>
                      <td>{o.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Low Stock Alert */}
        <div className="card">
          <div className="card-header">
            <h3>⚠️ Low Stock Alerts</h3>
            <Link to="/inventory" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="card-body flush">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.length === 0 ? (
                    <tr><td colSpan={4} className="text-center" style={{ padding: 32, color: 'var(--color-text-muted)' }}>All stock levels healthy</td></tr>
                  ) : lowStock.slice(0, 6).map((p: any) => (
                    <tr key={p.productId}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <span style={{ fontSize: 18 }}>{p.image || '📦'}</span>
                          <div>
                            <div style={{ fontWeight: 500 }}>{p.productName}</div>
                            <div className="cell-muted">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.category || '-'}</td>
                      <td>
                        <span className={`badge ${Number(p.totalStock) === 0 ? 'badge-error' : 'badge-warning'}`}>
                          {p.totalStock} units
                        </span>
                      </td>
                      <td>{p.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Best Sellers */}
        <div className="card">
          <div className="card-header">
            <h3>🏆 Best Sellers</h3>
          </div>
          <div className="card-body flush">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.length === 0 ? (
                    <tr><td colSpan={3} className="text-center" style={{ padding: 32, color: 'var(--color-text-muted)' }}>No sales data yet</td></tr>
                  ) : bestSellers.map((p: any) => (
                    <tr key={p.productId}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <span style={{ fontSize: 18 }}>{p.image || '📦'}</span>
                          <div>
                            <div style={{ fontWeight: 500 }}>{p.productName}</div>
                            <div className="cell-muted">{p.category || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.unitsSold}</td>
                      <td style={{ fontWeight: 600 }}>AED {fmt(parseFloat(p.revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
