import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, AlertTriangle, Layers, Percent, Activity, Ghost, Target } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const COLORS = ['#151515', '#555555', '#999999', '#cccccc', '#333333', '#777777', '#dddddd'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [advancedData, setAdvancedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/advanced'),
    ]).then(([s, adv]) => {
      setStats(s);
      setAdvancedData(adv);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="skeleton skeleton-text title" style={{ width: '250px' }}></div>
            <div className="skeleton skeleton-text short" style={{ width: '180px' }}></div>
          </div>
        </div>
        <div className="dashboard-grid-top">
          {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: 280 }}></div>)}
        </div>
        <div className="dashboard-grid-bottom" style={{ marginTop: 'var(--space-xl)' }}>
          {[1,2].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: 350 }}></div>)}
        </div>
      </div>
    );
  }

  const { 
    variantVelocity = [], 
    expiryExposure = {}, 
    marginsTrend = [], 
    channelSplit = [],
    stockoutRisk = [],
    deadStock = [],
    categoryMomentum = []
  } = advancedData || {};

  // Parse expiry risk
  const exp3m = parseFloat(expiryExposure.expires_3m || '0');
  const exp6m = parseFloat(expiryExposure.expires_6m || '0');
  const safe = parseFloat(expiryExposure.safe || '0');
  const totalStockVal = exp3m + exp6m + safe;
  
  const exp3mPct = totalStockVal > 0 ? (exp3m / totalStockVal) * 100 : 0;
  const exp6mPct = totalStockVal > 0 ? (exp6m / totalStockVal) * 100 : 0;
  const safePct = totalStockVal > 0 ? (safe / totalStockVal) * 100 : 0;

  // Total Revenue
  const totalRevenue = marginsTrend.reduce((sum: number, day: any) => sum + parseFloat(day.revenue), 0);
  const totalGrossMargin = marginsTrend.reduce((sum: number, day: any) => sum + parseFloat(day.gross_margin), 0);
  const marginPct = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Cosmetics Intelligence</h1>
          <p>Deep operational insights, predictive restocking, and variant analysis.</p>
        </div>
      </div>

      <div className="dashboard-grid-top" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Gross Margin Trend */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Percent size={14}/> Gross Margin</div>
                <div className="stat-card-value">{marginPct.toFixed(1)}%</div>
                <div className="badge-trend up" style={{ marginTop: 8 }}>
                  Profitability Health
                </div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 24, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marginsTrend}>
                  <defs>
                    <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#151515" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#151515" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip cursor={{ stroke: '#e9e9e9', strokeWidth: 1 }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontWeight: 700 }} />
                  <Area type="monotone" dataKey="gross_margin" stroke="#151515" strokeWidth={3} fill="url(#colorMargin)" name="Gross Margin" activeDot={{ r: 6, fill: '#151515', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Predictive Restock (Stockout Risk) */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14}/> Restock Urgency</div>
                <div className="stat-card-value" style={{ color: 'var(--color-error)' }}>
                  {stockoutRisk.length} SKUs
                </div>
                <div className="badge-trend down" style={{ marginTop: 8 }}>
                  At High Risk of Stockout
                </div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 24 }}>
              {stockoutRisk.length === 0 ? (
                <div className="flex items-center" style={{ justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>Healthy Stock Levels</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {stockoutRisk.slice(0, 4).map((item: any, i: number) => {
                    const healthPct = Math.min((item.stock_left / item.reorder_level) * 100, 100);
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="flex" style={{ justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{item.product_name}</span>
                          <span style={{ color: healthPct < 50 ? '#DC2626' : '#F59E0B' }}>{item.stock_left} left</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: '#f5f5f5', borderRadius: 4 }}>
                          <div style={{ width: healthPct + '%', height: '100%', background: healthPct < 50 ? '#DC2626' : '#F59E0B', borderRadius: 4, transition: 'width 1s' }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Momentum (Radar) */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14}/> Category Momentum</div>
                <div className="stat-card-value" style={{ fontSize: 20 }}>Revenue Penetration</div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 12, minHeight: 180, position: 'relative' }}>
              {categoryMomentum.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryMomentum}>
                      <PolarGrid stroke="#e9e9e9" />
                      <PolarAngleAxis dataKey="category_name" tick={{ fill: '#151515', fontSize: 10, fontWeight: 600 }} />
                      <Radar name="Revenue" dataKey="revenue" stroke="#151515" strokeWidth={2} fill="#151515" fillOpacity={0.2} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontWeight: 700 }} />
                    </RadarChart>
                  </ResponsiveContainer>
              ) : (
                 <div className="flex items-center" style={{ justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>No category data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-top" style={{ marginBottom: 'var(--space-xl)' }}>
         {/* Expiry Risk Exposure */}
         <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14}/> Expiry Exposure</div>
                <div className="stat-card-value" style={{ color: exp3m > 0 ? 'var(--color-error)' : 'inherit' }}>
                  AED {fmt(exp3m)}
                </div>
                <div className="badge-trend down" style={{ marginTop: 8 }}>
                  Expiring in {'<'} 3 months
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 32 }}>
              <div style={{ display: 'flex', gap: 4, height: 32, marginBottom: 24 }}>
                <div style={{ width: exp3mPct + '%', background: '#DC2626', borderRadius: '4px 0 0 4px', transition: 'width 1s' }}></div>
                <div style={{ width: exp6mPct + '%', background: '#F59E0B', transition: 'width 1s' }}></div>
                <div style={{ width: safePct + '%', background: '#151515', borderRadius: '0 4px 4px 0', transition: 'width 1s' }}></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <div style={{ flex: 1, background: '#fafafa', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 8 }}><div style={{ width: 10, height: 10, background: '#DC2626', borderRadius: 2 }}></div> Critical {'<'} 3 Months</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#DC2626' }}>AED {fmt(exp3m)}</div>
                </div>
                <div style={{ flex: 1, background: '#fafafa', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 8 }}><div style={{ width: 10, height: 10, background: '#F59E0B', borderRadius: 2 }}></div> Warning 3-6 Months</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>AED {fmt(exp6m)}</div>
                </div>
                <div style={{ flex: 1, background: '#fafafa', padding: 16, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 8 }}><div style={{ width: 10, height: 10, background: '#151515', borderRadius: 2 }}></div> Safe {'>'} 6 Months</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>AED {fmt(safe)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dead Stock Radar */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Ghost size={14}/> Dead Stock Radar</div>
                <div className="stat-card-value" style={{ fontSize: 20 }}>0 Sales in 30 Days</div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 24 }}>
              {deadStock.length === 0 ? (
                <div className="flex items-center" style={{ justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>No dead stock detected</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {deadStock.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <span style={{ fontSize: 13, fontWeight: 600, color: '#151515' }}>{item.product_name}</span>
                         <span style={{ fontSize: 11, color: '#888' }}>{item.quantity} units sitting</span>
                       </div>
                       <div style={{ fontWeight: 800, color: '#DC2626' }}>AED {fmt(parseFloat(item.capital_locked))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-bottom">
        {/* Specific Shade Velocity */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>Variant Velocity</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>Top Moving Shades</div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 250 }}>
              {variantVelocity.length === 0 ? (
                <div className="flex items-center" style={{ justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>No variant data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={variantVelocity.slice(0, 6)} layout="vertical" margin={{ left: 120, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="shade_name" tick={{ fontSize: 12, fill: '#151515', fontWeight: 600 }} axisLine={false} tickLine={false} width={120} tickFormatter={(value) => value ? value : 'Default'} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontWeight: 700 }} />
                    <Bar dataKey="total_sold" fill="#151515" radius={[0, 4, 4, 0]} barSize={16} background={{ fill: '#f5f5f5', radius: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Profitability Trend */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>Profitability Deep Dive</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 16 }}>
                  Revenue vs COGS
                </div>
              </div>
            </div>
            <div style={{ flex: 1, marginTop: 24, minHeight: 250 }}>
              {marginsTrend.length === 0 ? (
                <div className="flex items-center" style={{ justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={marginsTrend}>
                    <defs>
                      <linearGradient id="colorRevAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#151515" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#151515" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCogsAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dddddd" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#dddddd" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#888888', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontWeight: 700 }} cursor={{ stroke: '#e9e9e9', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#151515" strokeWidth={3} fill="url(#colorRevAnalytics)" name="Revenue" activeDot={{ r: 6, fill: '#151515', stroke: '#fff', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="cogs" stroke="#999999" strokeWidth={2} fill="url(#colorCogsAnalytics)" name="COGS" activeDot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
