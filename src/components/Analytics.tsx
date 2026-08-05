import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

const ARC_API = 'https://testnet.arcscan.app/api/v2';

const shortenAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

const formatTs = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const TOKEN_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#38bdf8'];

interface AnalyticsProps {
  address: string | null;
}

interface WalletTx {
  hash: string;
  timestamp: string;
  from: { hash: string };
  to: { hash: string } | null;
  value: string;
  status: string;
  method: string | null;
  fee: { value: string };
  gas_used: string;
}

interface TokenBalance {
  token: {
    symbol: string;
    name: string;
    decimals: string;
    icon_url: string | null;
  };
  value: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ address }) => {
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [nativeBalance, setNativeBalance] = useState<string>('0');
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [totalGasSpent, setTotalGasSpent] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const fetchWalletData = async () => {
    if (!address) return;
    setWalletLoading(true);
    setWalletError('');
    try {
      const [addrRes, txRes, tokRes] = await Promise.all([
        fetch(`${ARC_API}/addresses/${address}`),
        fetch(`${ARC_API}/addresses/${address}/transactions`),
        fetch(`${ARC_API}/addresses/${address}/tokens`)
      ]);

      if (addrRes.ok) {
        const d = await addrRes.json();
        setNativeBalance(d.coin_balance || '0');
      }

      if (txRes.ok) {
        const d = await txRes.json();
        const items: WalletTx[] = d.items || [];
        
        let merged: any[] = [...items];
        try {
          const { getTransactionHistory } = await import('../lib/TransactionHistory');
          const history = getTransactionHistory();
          const localUserTxs = history.filter(tx => 
            tx.from?.toLowerCase() === address.toLowerCase() || 
            tx.to?.toLowerCase() === address.toLowerCase()
          );

          const formattedLocal: WalletTx[] = localUserTxs.map(tx => ({
            hash: tx.txHash || tx.id,
            timestamp: new Date(tx.timestamp).toISOString(),
            from: { hash: tx.from },
            to: tx.to ? { hash: tx.to } : null,
            value: tx.amount && !isNaN(parseFloat(tx.amount)) ? (parseFloat(tx.amount) * 1e18).toString() : '0',
            status: tx.status === 'COMPLETE' ? 'ok' : 'error',
            method: tx.action,
            fee: { value: '10000000000000' },
            gas_used: '21000'
          }));

          for (const lTx of formattedLocal) {
            if (!merged.find(m => m.hash && lTx.hash && m.hash.toLowerCase() === lTx.hash.toLowerCase())) {
              merged.push(lTx);
            }
          }
        } catch (e) {
          console.warn('Failed to load local tx history', e);
        }

        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setWalletTxs(merged);

        let gas = 0, ok = 0, fail = 0;
        for (const tx of merged) {
          gas += parseFloat(tx.fee?.value || '0') / 1e18;
          if (tx.status === 'ok') ok++;
          else fail++;
        }
        setTotalGasSpent(gas);
        setSuccessCount(ok);
        setFailCount(fail);
      }

      if (tokRes.ok) {
        const d = await tokRes.json();
        setTokenBalances(d.items || []);
      }
    } catch {
      setWalletError('Failed to fetch wallet data. Please check your connection.');
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => { fetchWalletData(); }, [address]);

  // Volume chart — aggregate value sent per day
  const volumeChartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of walletTxs) {
      const d = new Date(tx.timestamp);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      const val = parseFloat(tx.value || '0') / 1e18;
      map[key] = (map[key] || 0) + val;
    }
    return Object.entries(map)
      .map(([date, value]) => ({ date, value: parseFloat(value.toFixed(4)) }))
      .reverse();
  }, [walletTxs]);

  // Pie chart — top tokens with meaningful balance only
  const pieData = useMemo(() => {
    const result: { name: string; value: number }[] = [];
    const native = parseFloat(nativeBalance) / 1e18;
    if (native >= 0.0001) result.push({ name: 'USDC (Native)', value: parseFloat(native.toFixed(4)) });
    for (const t of tokenBalances) {
      const decimals = parseInt(t.token.decimals || '18');
      const val = parseFloat(t.value || '0') / Math.pow(10, decimals);
      if (val >= 0.0001) result.push({ name: t.token.symbol, value: parseFloat(val.toFixed(6)) });
    }
    return result.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [nativeBalance, tokenBalances]);

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '100%', paddingBottom: '4rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
            <Wallet size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>Wallet Analytics</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#a1a1aa' }}>
              {address ? shortenAddress(address) : 'Connect your wallet to see live data'}
            </p>
          </div>
        </div>
        {address && (
          <button
            onClick={fetchWalletData}
            disabled={walletLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '8px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#60a5fa', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            <RefreshCw size={14} style={{ animation: walletLoading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        )}
      </div>

      {!address ? (
        <div style={{ padding: '3rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center', color: '#71717a' }}>
          <Wallet size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '1rem' }}>Connect your wallet to view personalized transaction analytics</p>
        </div>
      ) : walletError ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#fca5a5' }}>
          <AlertCircle size={16} />
          <span>{walletError}</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <WalletStatCard label="USDC Balance (Native)" value={`${(parseFloat(nativeBalance) / 1e18).toFixed(4)} USDC`} loading={walletLoading} color="#60a5fa" />
            <WalletStatCard label="Total Transactions" value={walletTxs.length.toString() + (walletTxs.length === 50 ? '+' : '')} loading={walletLoading} color="#a78bfa" />
            <WalletStatCard label="Success / Failed" value={`${successCount} / ${failCount}`} loading={walletLoading} color="#34d399" />
            <WalletStatCard label="Gas Spent (recent 50)" value={`${totalGasSpent.toFixed(6)} USDC`} loading={walletLoading} color="#f59e0b" />
            <WalletStatCard label="Token Holdings" value={tokenBalances.length.toString()} loading={walletLoading} color="#38bdf8" />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>

            {/* Volume Chart */}
            <div style={{ background: 'var(--stat-card-bg)', border: '1px solid var(--stat-card-border)', borderRadius: '14px', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
              <h4 style={{ margin: '0 0 1rem', color: '#0ea5e9', fontSize: '1rem', fontWeight: 700 }}>Transaction Volume (USDC sent)</h4>
              {walletLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : volumeChartData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No transactions found</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={volumeChartData}>
                    <defs>
                      <linearGradient id="walletVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={20} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={60} tickFormatter={v => v.toFixed(2)} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} itemStyle={{ color: '#0ea5e9' }} formatter={(v: any) => [`${v} USDC`, 'Volume']} />
                    <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#walletVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Token Pie */}
            <div style={{ background: 'var(--stat-card-bg)', border: '1px solid var(--stat-card-border)', borderRadius: '14px', padding: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
              <h4 style={{ margin: '0 0 1rem', color: '#8b5cf6', fontSize: '1rem', fontWeight: 700 }}>Token Portfolio Distribution</h4>
              {walletLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : pieData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No token holdings</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: 220 }}>
                  <ResponsiveContainer width="55%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={TOKEN_COLORS[i % TOKEN_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v: any, n: any) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto', maxHeight: 220 }}>
                    {pieData.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', minWidth: 0 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: TOKEN_COLORS[i % TOKEN_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, fontWeight: 500 }}>{item.name}</span>
                        <span style={{ color: 'var(--text-secondary)', flexShrink: 0, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Table */}
          <div style={{ background: 'var(--stat-card-bg)', border: '1px solid var(--stat-card-border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Recent Transactions</h4>
              <a
                href={`https://testnet.arcscan.app/address/${address}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0ea5e9', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}
              >
                View all on ArcScan <ExternalLink size={12} />
              </a>
            </div>
            {walletLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</div>
            ) : walletTxs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      {['Type', 'Hash', 'From', 'To', 'Value (USDC)', 'Gas Fee', 'Time', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {walletTxs.slice(0, 20).map((tx, i) => {
                      const isOut = tx.from?.hash?.toLowerCase() === address?.toLowerCase();
                      const val = (parseFloat(tx.value || '0') / 1e18).toFixed(4);
                      const fee = (parseFloat(tx.fee?.value || '0') / 1e18).toFixed(6);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isOut ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                              {isOut ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                              {tx.method ? tx.method : (isOut ? 'OUT' : 'IN')}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 600 }}>
                              {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                            </a>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{shortenAddress(tx.from?.hash || '')}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{tx.to ? shortenAddress(tx.to.hash) : '(contract)'}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{val}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{fee}</td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatTs(tx.timestamp)}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              background: tx.status === 'ok' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              color: tx.status === 'ok' ? '#059669' : '#dc2626'
                            }}>
                              {tx.status === 'ok' ? 'Success' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Sub-component
// ─────────────────────────────────────────────
const WalletStatCard = ({ label, value, loading, color }: { label: string; value: string; loading: boolean; color: string }) => (
  <div style={{ background: 'var(--stat-card-bg)', border: '1px solid var(--stat-card-border)', borderRadius: '12px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'all 0.2s', boxShadow: 'var(--shadow-card)' }}>
    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: loading ? 'var(--text-muted)' : 'var(--text-primary)', fontFamily: 'monospace' }}>
      {loading ? '...' : value}
    </span>
    <div style={{ height: '3px', borderRadius: '2px', background: `${color}20`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: loading ? '40%' : '100%', background: color, transition: 'width 0.5s ease', borderRadius: '2px' }} />
    </div>
  </div>
);
