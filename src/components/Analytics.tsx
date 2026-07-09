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
        setWalletTxs(items);

        let gas = 0, ok = 0, fail = 0;
        for (const tx of items) {
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
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '14px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', color: '#60a5fa', fontSize: '1rem' }}>Transaction Volume (USDC sent)</h4>
              {walletLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>Loading...</div>
              ) : volumeChartData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>No transactions found</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={volumeChartData}>
                    <defs>
                      <linearGradient id="walletVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} minTickGap={20} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} width={60} tickFormatter={v => v.toFixed(2)} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} labelStyle={{ color: '#a1a1aa' }} itemStyle={{ color: '#60a5fa' }} formatter={(v: any) => [`${v} USDC`, 'Volume']} />
                    <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} fillOpacity={1} fill="url(#walletVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Token Pie */}
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '14px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', color: '#a78bfa', fontSize: '1rem' }}>Token Portfolio Distribution</h4>
              {walletLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>Loading...</div>
              ) : pieData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>No token holdings</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: 220 }}>
                  <ResponsiveContainer width="55%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={TOKEN_COLORS[i % TOKEN_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} formatter={(v: any, n: any) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto', maxHeight: 220 }}>
                    {pieData.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', minWidth: 0 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: TOKEN_COLORS[i % TOKEN_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.name}</span>
                        <span style={{ color: '#a1a1aa', flexShrink: 0, fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Table */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#e4e4e7' }}>Recent Transactions</h4>
              <a
                href={`https://testnet.arcscan.app/address/${address}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#60a5fa', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                View all on ArcScan <ExternalLink size={12} />
              </a>
            </div>
            {walletLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>Loading transactions...</div>
            ) : walletTxs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>No transactions found</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Type', 'Hash', 'From', 'To', 'Value (USDC)', 'Gas Fee', 'Time', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: '#71717a', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #27272a' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {walletTxs.slice(0, 20).map((tx, i) => {
                      const isOut = tx.from?.hash?.toLowerCase() === address?.toLowerCase();
                      const val = (parseFloat(tx.value || '0') / 1e18).toFixed(4);
                      const fee = (parseFloat(tx.fee?.value || '0') / 1e18).toFixed(6);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }} className="hover:bg-white/5">
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isOut ? '#f87171' : '#34d399' }}>
                              {isOut ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                              {isOut ? 'OUT' : 'IN'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'monospace' }}>
                              {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                            </a>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: '#a1a1aa', fontFamily: 'monospace' }}>{shortenAddress(tx.from?.hash || '')}</td>
                          <td style={{ padding: '0.65rem 1rem', color: '#a1a1aa', fontFamily: 'monospace' }}>{tx.to ? shortenAddress(tx.to.hash) : '(contract)'}</td>
                          <td style={{ padding: '0.65rem 1rem', color: '#e4e4e7', fontWeight: 600 }}>{val}</td>
                          <td style={{ padding: '0.65rem 1rem', color: '#71717a' }}>{fee}</td>
                          <td style={{ padding: '0.65rem 1rem', color: '#71717a', whiteSpace: 'nowrap' }}>{formatTs(tx.timestamp)}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              background: tx.status === 'ok' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                              color: tx.status === 'ok' ? '#34d399' : '#f87171'
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
  <div style={{ background: '#18181b', border: `1px solid ${color}30`, borderRadius: '12px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'all 0.2s' }}>
    <span style={{ fontSize: '0.78rem', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: loading ? '#71717a' : '#e4e4e7', fontFamily: 'monospace' }}>
      {loading ? '...' : value}
    </span>
    <div style={{ height: '3px', borderRadius: '2px', background: `${color}20`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: loading ? '40%' : '100%', background: color, transition: 'width 0.5s ease', borderRadius: '2px' }} />
    </div>
  </div>
);
