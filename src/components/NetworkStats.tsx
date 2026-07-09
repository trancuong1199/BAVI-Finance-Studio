import { useState, useEffect } from 'react';
import { Activity, BarChart2, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

interface NetworkStatsProps {
  connectedAccount: string | null;
}

export const NetworkStats: React.FC<NetworkStatsProps> = ({ connectedAccount }) => {
  const [stats] = useState({
    volume24h: '$1,245,600',
    totalSwaps: '8,432',
    tvl: '$4,500,000'
  });

  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalSwapsCount, setTotalSwapsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!connectedAccount) {
      setTransactions([]);
      setTotalSwapsCount(null);
      return;
    }

    const fetchTxs = async () => {
      setLoading(true);
      try {
        const { getTransactionHistory } = await import('../lib/TransactionHistory');
        const history = getTransactionHistory();
        const localUserTxs = history.filter(tx => tx.from.toLowerCase() === connectedAccount.toLowerCase() || tx.to.toLowerCase() === connectedAccount.toLowerCase());

        // Dynamic Total Swaps Calculation
        let totalCount = localUserTxs.length;
        try {
          const res = await fetch(`https://testnet.arcscan.app/api?module=account&action=txlist&address=${connectedAccount}`);
          const data = await res.json();
          if (data && data.result && Array.isArray(data.result)) {
            const localHashes = new Set(localUserTxs.map(tx => tx.txHash?.toLowerCase()).filter(Boolean));
            let uniqueArcscanCount = 0;
            for (const tx of data.result) {
              if (tx.hash && !localHashes.has(tx.hash.toLowerCase())) {
                uniqueArcscanCount++;
              }
            }
            totalCount += uniqueArcscanCount;
          }
        } catch (e) {
          console.warn('Arcscan count fetch failed', e);
        }
        setTotalSwapsCount(totalCount);

        let arcscanTxs: any[] = [];
        try {
          const res = await fetch(`https://testnet.arcscan.app/api?module=account&action=txlist&address=${connectedAccount}&sort=desc&page=${page}&offset=${ITEMS_PER_PAGE}`);
          const data = await res.json();
          if (data && data.result && Array.isArray(data.result)) {
            arcscanTxs = data.result.map((tx: any) => ({
              id: tx.hash,
              action: tx.functionName ? tx.functionName.split('(')[0] : (tx.value === '0' ? 'Contract Call' : 'Transfer'),
              amount: (Number(tx.value) / 1e18).toFixed(4).replace(/\.?0+$/, ''),
              from: tx.from,
              to: tx.to,
              txHash: tx.hash,
              status: tx.isError === "1" ? "FAILED" : "COMPLETE",
              explorerUrl: `https://testnet.arcscan.app/tx/${tx.hash}`,
              timestamp: parseInt(tx.timeStamp) * 1000
            }));
          }
        } catch (e) {
          console.warn('Arcscan fetch failed', e);
        }

        const merged = [...localUserTxs];
        for (const tx of arcscanTxs) {
          if (!merged.find(m => m.txHash && m.txHash.toLowerCase() === tx.txHash.toLowerCase())) {
            merged.push(tx);
          }
        }
        
        merged.sort((a, b) => b.timestamp - a.timestamp);
        
        const displayTxs = page === 1 ? merged.slice(0, ITEMS_PER_PAGE) : arcscanTxs;
        setTransactions(displayTxs);
      } catch (err) {
        console.error("Error loading txs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTxs();
    
    // Listen for manual swap trigger and history updates
    const handleTxUpdated = () => {
      fetchTxs();
    };
    window.addEventListener('swap_executed', handleTxUpdated);
    window.addEventListener('transaction_history_updated', handleTxUpdated);
    
    return () => {
      window.removeEventListener('swap_executed', handleTxUpdated);
      window.removeEventListener('transaction_history_updated', handleTxUpdated);
    };
  }, [connectedAccount, page]);

  // Fallback mock data if not connected
  const mockRecentSwaps = [
    { id: 1, route: 'USDC (Eth) → ARC', amount: '500 ARC', time: '2 mins ago' },
    { id: 2, route: 'USDT (Poly) → ARC', amount: '1,200 ARC', time: '5 mins ago' },
    { id: 3, route: 'ETH → USDC (Arc)', amount: '3,450 USDC', time: '12 mins ago' },
    { id: 4, route: 'ARC → MATIC', amount: '850 MATIC', time: '18 mins ago' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="stats-container">
        <div className="stat-card glass-panel">
          <div className="stat-title"><BarChart2 size={16} /> 24H Volume</div>
          <div className="stat-value">{stats.volume24h}</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-title"><Activity size={16} /> Total Swaps</div>
          <div className="stat-value">
            {connectedAccount 
              ? (totalSwapsCount !== null ? totalSwapsCount.toLocaleString() : 'Loading...') 
              : stats.totalSwaps}
          </div>
        </div>
      </div>

      <div className="recent-swaps glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="recent-swaps-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <Zap size={20} color="#8b5cf6" /> Recent Transactions
          </div>
          {connectedAccount && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                style={{ background: 'transparent', border: 'none', color: page === 1 ? '#555' : '#8b5cf6', cursor: page === 1 ? 'not-allowed' : 'pointer', padding: '0.25rem' }}
              >
                <ChevronLeft size={24} />
              </button>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#E2E8F0', margin: '0 0.5rem' }}>Page {page}</span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={transactions.length < ITEMS_PER_PAGE || loading}
                style={{ background: 'transparent', border: 'none', color: transactions.length < ITEMS_PER_PAGE ? '#555' : '#8b5cf6', cursor: transactions.length < ITEMS_PER_PAGE ? 'not-allowed' : 'pointer', padding: '0.25rem' }}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          {!connectedAccount ? (
            mockRecentSwaps.map(swap => (
              <div key={swap.id} className="swap-item">
                <div className="swap-info">
                  <div className="swap-route">{swap.route}</div>
                  <div className="swap-time">{swap.time}</div>
                </div>
                <div className="swap-amount">+{swap.amount}</div>
              </div>
            ))
          ) : loading && transactions.length === 0 ? (
            <div style={{ padding: '2rem 1rem', color: '#A0A2A4', textAlign: 'center' }}>Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '2rem 1rem', color: '#A0A2A4', textAlign: 'center' }}>No transactions found on this page.</div>
          ) : (
            transactions.map((tx: any) => {
              const isError = tx.status === "FAILED";
              const isPending = tx.status === "PENDING";
              const timeStr = new Date(tx.timestamp).toLocaleString();
              return (
                <div 
                  key={tx.id} 
                  className="swap-item" 
                  style={{ opacity: isError ? 0.6 : 1 }}
                  onClick={() => tx.explorerUrl && window.open(tx.explorerUrl, '_blank')}
                >
                  <div className="swap-info" style={{ overflow: 'hidden', minWidth: 0, width: '100%' }}>
                    <div className="swap-route" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.amount === '0' 
                        ? tx.action 
                        : `${tx.action}: ${tx.amount} ${tx.tokenSymbol || 'USDC'}`}
                    </div>
                    <div className="swap-time" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>{timeStr}</span>
                      {tx.explorerUrl && <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontStyle: 'italic', opacity: 0.8 }}>(Click for details)</span>}
                    </div>
                  </div>
                  <div className="swap-amount" style={{ color: isError ? '#ef4444' : isPending ? '#eab308' : '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                    {isError ? 'Failed' : isPending ? 'Pending...' : 'Success'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
