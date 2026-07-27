import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Send, FileText, Code, BarChart3, LayoutGrid, Presentation } from 'lucide-react';
import { getTransactionHistory } from '../lib/TransactionHistory';
import type { Transaction } from '../lib/TransactionHistory';

interface DashboardProps {
  connectedAccount: string | null;
  navigateTo: (view: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ connectedAccount, navigateTo }) => {
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTxs = () => {
      const history = getTransactionHistory();
      const filtered = connectedAccount 
        ? history.filter(tx => tx.from.toLowerCase() === connectedAccount.toLowerCase() || tx.to.toLowerCase() === connectedAccount.toLowerCase())
        : history;
      setTxs(filtered.slice(0, 5));
    };
    fetchTxs();
    window.addEventListener('transaction_history_updated', fetchTxs);
    window.addEventListener('swap_executed', fetchTxs);
    return () => {
      window.removeEventListener('transaction_history_updated', fetchTxs);
      window.removeEventListener('swap_executed', fetchTxs);
    };
  }, [connectedAccount]);

  // Pie chart data
  const pieData = [
    { name: 'USDC', value: 65.2, amount: '$9,472.21', color: '#0d9488' },
    { name: 'EURC', value: 18.7, amount: '$2,718.33', color: '#0ea5e9' },
    { name: 'cirBTC', value: 16.1, amount: '$2,339.79', color: '#a855f7' }
  ];

  return (
    <div className="dashboard-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '1200px' }}>
      
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Welcome back, Bavi! 👋
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>
          Here's what's happening with your assets today.
        </p>
      </div>

      {/* 4 Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Card 1: Total Balance */}
        <div className="glass-panel stat-card-light" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              💼 Total Balance
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>$14,520.45</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
            <span>↑ 12.45% <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs yesterday</span></span>
            {/* Sparkline SVG */}
            <svg width="60" height="20" viewBox="0 0 60 20">
              <path d="M0,15 Q10,5 20,12 T40,6 T60,2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: 24H Volume */}
        <div className="glass-panel stat-card-light" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📊 24H Volume
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>$1,245,600</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
            <span>↑ 8.23% <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs yesterday</span></span>
            {/* Sparkbars SVG */}
            <svg width="60" height="20" viewBox="0 0 60 20">
              <rect x="0" y="8" width="4" height="12" fill="#10b981" rx="1" />
              <rect x="8" y="4" width="4" height="16" fill="#10b981" rx="1" />
              <rect x="16" y="10" width="4" height="10" fill="#10b981" rx="1" />
              <rect x="24" y="6" width="4" height="14" fill="#10b981" rx="1" />
              <rect x="32" y="2" width="4" height="18" fill="#10b981" rx="1" />
              <rect x="40" y="8" width="4" height="12" fill="#10b981" rx="1" />
              <rect x="48" y="3" width="4" height="17" fill="#10b981" rx="1" />
            </svg>
          </div>
        </div>

        {/* Card 3: Total Swaps */}
        <div className="glass-panel stat-card-light" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔄 Total Swaps
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>980</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
            <span>↑ 5.17% <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs yesterday</span></span>
            {/* Sparkline SVG */}
            <svg width="60" height="20" viewBox="0 0 60 20">
              <path d="M0,18 Q15,10 30,14 T60,4" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="glass-panel stat-card-light" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🎯 Success Rate
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>98.6%</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
            <span>↑ 2.11% <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs yesterday</span></span>
            {/* Sparkline SVG */}
            <svg width="60" height="20" viewBox="0 0 60 20">
              <path d="M0,14 Q20,10 40,8 T60,2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Dashboard', icon: <LayoutGrid size={15} />, view: 'dashboard', active: true },
            { label: 'Presentation Deck', icon: <Presentation size={15} />, view: 'presentation' },
            { label: 'Swap', icon: <RefreshCw size={15} />, view: 'swap' },
            { label: 'Send / Pay', icon: <Send size={15} />, view: 'payments' },
            { label: 'Tx Memos', icon: <FileText size={15} />, view: 'memos' },
            { label: 'Custom Contract', icon: <Code size={15} />, view: 'merchant-treasury' },
            { label: 'Analytics', icon: <BarChart3 size={15} />, view: 'analytics' }
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => navigateTo(action.view)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                border: action.active ? 'none' : '1px solid #e2e8f0',
                background: action.active ? 'linear-gradient(135deg, #0d9488, #0ea5e9)' : '#fff',
                color: action.active ? '#white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.885rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: action.active ? '0 4px 12px rgba(13, 148, 136, 0.2)' : 'none'
              }}
              className="quick-action-btn"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: '1.5rem' }}>
        
        {/* Portfolio Overview */}
        <div className="glass-panel" style={{ padding: '1.25rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Portfolio Overview</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Absolute label in center of doughnut */}
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>$14,520</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Assets</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {pieData.map((entry, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{entry.value}%</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{entry.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Activity Chart</h3>
            <select style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}>
              <option>7D</option>
              <option>30D</option>
              <option>1Y</option>
            </select>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: '14 May', txs: 4800 },
                { name: '15 May', txs: 9200 },
                { name: '16 May', txs: 6400 },
                { name: '17 May', txs: 11000 },
                { name: '18 May', txs: 14500 },
                { name: '19 May', txs: 26000 },
                { name: '20 May', txs: 21000 }
              ]}>
                <defs>
                  <linearGradient id="activity-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="txs" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#activity-gradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Recent Transactions List */}
      <div className="glass-panel" style={{ padding: '1.25rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Transactions</h3>
          <button onClick={() => navigateTo('analytics')} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', fontSize: '0.885rem', fontWeight: 600, cursor: 'pointer' }}>
            View all
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</th>
                <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From</th>
                <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To</th>
                <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Value</th>
                <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Time</th>
                <th style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                // Fallback mock transactions matching mockup
                [
                  { type: 'Swap', from: '0xb59b...d224', to: '0x5E04...3d5b', amount: '100 USDC', value: '99.2 EURC', time: '2m ago' },
                  { type: 'Payment', from: '0x911b...82Df', to: '0x3600...0000', amount: '50 USDC', value: '50 USDC', time: '12m ago' },
                  { type: 'Deposit', from: '0x0000...0000', to: '0xb59b...d224', amount: '200 USDC', value: '200 USDC', time: '1h ago' },
                  { type: 'Contract Call', from: '0xb59b...d224', to: '0x7f35...a2b1', amount: '—', value: '—', time: '2h ago' },
                  { type: 'Tx Memo Created', from: '0xb59b...d224', to: '—', amount: '—', value: '—', time: '3h ago' }
                ].map((mock, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', fontSize: '0.885rem' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {mock.type === 'Swap' ? '🔄' : mock.type === 'Payment' ? '💸' : mock.type === 'Deposit' ? '📥' : mock.type === 'Contract Call' ? '💻' : '📋'}
                        {mock.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{mock.from}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{mock.to}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{mock.amount}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{mock.value}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{mock.time}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: '#e6fdf5', color: '#10b981', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>Success</span>
                    </td>
                  </tr>
                ))
              ) : (
                txs.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc', fontSize: '0.885rem' }} onClick={() => tx.explorerUrl && window.open(tx.explorerUrl, '_blank')}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {tx.action.includes('Swap') ? '🔄' : tx.action.includes('Memo') ? '📋' : '💸'}
                        {tx.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{tx.amount} {tx.tokenSymbol || 'USDC'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{tx.amount} USDC</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: tx.status === 'COMPLETE' ? '#e6fdf5' : tx.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                        color: tx.status === 'COMPLETE' ? '#10b981' : tx.status === 'PENDING' ? '#ca8a04' : '#ef4444',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {tx.status === 'COMPLETE' ? 'Success' : tx.status === 'PENDING' ? 'Pending' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
