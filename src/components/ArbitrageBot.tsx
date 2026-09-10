import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Pause, 
  RefreshCw, 
  ArrowRight, 
  Activity, 
  DollarSign, 
  Globe, 
  CheckCircle2,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { globalRpcProvider } from '../utils/arcChain';
import { PriceMonitor, type ArbitrageOpportunity, type RealChainStatus } from '../lib/priceMonitor';

interface ArbitrageBotProps {
  connectedAccount?: string | null;
  getProvider?: () => any;
}

export const ArbitrageBot: React.FC<ArbitrageBotProps> = ({ connectedAccount }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [minProfit, setMinProfit] = useState(0.5); // Minimum profit in USDC
  const [maxSlippage, setMaxSlippage] = useState(0.5); // 0.5%
  const [activeTab, setActiveTab] = useState<'dex' | 'crosschain' | 'logs' | 'config'>('dex');

  // Real RPC Stats
  const [chainStatus, setChainStatus] = useState<RealChainStatus | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [totalExecuted] = useState(0);
  const [totalProfitUSDC] = useState(0);
  const [gasCostTotal] = useState(0);

  // Live opportunities state
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);

  // Logs stream
  const [logs, setLogs] = useState<Array<{ id: string; text: string; type: 'info' | 'success' | 'warn' | 'cctp'; time: string }>>([
    { id: '1', text: 'Connecting to Arc Testnet RPC…', type: 'info', time: new Date().toLocaleTimeString() },
    { id: '2', text: 'Arbitrage execution is unavailable until an atomic route is configured.', type: 'info', time: new Date().toLocaleTimeString() },
    { id: '3', text: '📡 Initializing PriceMonitor engine with Arc Testnet RPC provider...', type: 'info', time: new Date().toLocaleTimeString() }
  ]);

  // CCTP State
  const [cctpStatus, setCctpStatus] = useState<'idle' | 'burning' | 'attesting' | 'minting' | 'complete'>('idle');
  const [cctpSimulationComplete, setCctpSimulationComplete] = useState(false);

  // 1. Initial RPC Handshake & Block fetch
  useEffect(() => {
    const monitor = new PriceMonitor(globalRpcProvider);
    
    const fetchStatus = async () => {
      try {
        const status = await monitor.fetchRealChainStatus();
        setChainStatus(status);
        setLogs(prev => [
          {
            id: `log-init-${Date.now()}`,
            text: `✅ Arc Testnet RPC Live | Block #${status.blockNumber} | Latency: ${status.latencyMs}ms | Gas: ${status.gasPriceGwei} Gwei`,
            type: 'info',
            time: status.timestamp
          },
          ...prev.slice(0, 49)
        ]);
      } catch (err: any) {
        console.error('RPC Error:', err);
      }
    };

    fetchStatus();
  }, []);

  // 2. Live Scanner Pulse connected to real RPC
  useEffect(() => {
    if (!isRunning) return;

    const monitor = new PriceMonitor(globalRpcProvider);

    const scanPoolsOnChain = async () => {
      try {
        const status = await monitor.fetchRealChainStatus();
        setChainStatus(status);
        setTotalScanned(prev => prev + 1);

        const poolAddressA = import.meta.env.PUBLIC_ARBITRAGE_POOL_A;
        const poolAddressB = import.meta.env.PUBLIC_ARBITRAGE_POOL_B;
        if (!poolAddressA || !poolAddressB) {
          setOpportunities([]);
          return;
        }
        // Only configured V2-compatible pairs can be read with getReserves().
        const poolA = await monitor.getPoolReserves(poolAddressA, 'Pool A');
        const poolB = await monitor.getPoolReserves(poolAddressB, 'Pool B');

        // Calculate real arbitrage opportunity
        const opp = PriceMonitor.calculateArbitrageOpportunity(poolA, poolB, 'USDC / EURC');

        if (opp) {
          setOpportunities(prev => {
            const exists = prev.find(o => o.pair === 'USDC / EURC');
            if (exists) {
              return prev.map(o => o.pair === 'USDC / EURC' ? { ...opp, status: o.status === 'executing' ? 'executing' : 'active' } : o);
            }
            return [opp, ...prev];
          });
        }

        // Push real RPC sync log
        setLogs(prev => [
          {
            id: `rpc-${Date.now()}`,
            text: `🔍 [RPC Block #${status.blockNumber}] Sync (${status.latencyMs}ms). Scanned Pools: UnitFlow V3 vs ArcSwap V2. Spread: ${opp ? `${opp.spread}%` : 'unavailable'}`,
            type: 'info',
            time: status.timestamp
          },
          ...prev.slice(0, 49)
        ]);

      } catch (err: any) {
        console.error('Scan Error:', err);
      }
    };

    // Initial scan immediately
    scanPoolsOnChain();

    // Poll every 3.5 seconds
    const interval = setInterval(scanPoolsOnChain, 3500);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleExecuteArbitrage = (opp: ArbitrageOpportunity) => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      text: `Execution unavailable for ${opp.pair}: a verified atomic two-pool route is required. No transaction was sent.`,
      type: 'warn', time: new Date().toLocaleTimeString(),
    }, ...prev]);
  };

  const handleSimulateCCTP = () => {
    setCctpStatus('burning');
    setCctpSimulationComplete(false);
    const t0 = new Date().toLocaleTimeString();
    setLogs(prev => [
      { id: Date.now().toString(), text: '[SIMULATION] 🌐 [Circle CCTP] Executing depositForBurn(100 USDC) on Ethereum Sepolia...', type: 'cctp', time: t0 },
      ...prev
    ]);

    setTimeout(() => {
      setCctpStatus('attesting');
      const t1 = new Date().toLocaleTimeString();
      setLogs(prev => [
        { id: Date.now().toString(), text: '[SIMULATION] ⏳ [Circle Iris API] Polling Circle Attestation API for Message Hash signature...', type: 'cctp', time: t1 },
        ...prev
      ]);

      setTimeout(() => {
        setCctpStatus('minting');
        const t2 = new Date().toLocaleTimeString();
        setLogs(prev => [
          { id: Date.now().toString(), text: '[SIMULATION] ✍️ [Circle Attestation Signed] Submitting receiveMessage() to Arc Network...', type: 'cctp', time: t2 },
          ...prev
        ]);

        setTimeout(() => {
          setCctpStatus('complete');
          setCctpSimulationComplete(true);
          const t3 = new Date().toLocaleTimeString();
          setLogs(prev => [
            { id: Date.now().toString(), text: '[SIMULATION] ✅ [CCTP Mint Complete] 100 USDC Native minted on Arc Network with zero slippage!', type: 'success', time: t3 },
            ...prev
          ]);
        }, 2000);
      }, 2500);
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <p role="status">Arbitrage monitoring only. Live execution requires a verified atomic two-pool route; no trades or profits are recorded here. Configure compatible pool addresses to scan.</p>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)',
        borderRadius: '24px',
        padding: '2rem',
        color: '#fff',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(20, 184, 166, 0.15)', filter: 'blur(40px)' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ background: '#0d9488', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} className="animate-pulse" /> ARC L1 ON-CHAIN LIVE
              </span>
              <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                SOON
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#5eead4' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRunning ? '#10b981' : '#f59e0b', boxShadow: isRunning ? '0 0 10px #10b981' : 'none' }}></span>
                {isRunning ? `Scanner Active (Block #${chainStatus?.blockNumber || '---'})` : 'Scanner Standby'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Arc DEX & Circle CCTP Arbitrage Engine
            </h2>
            <p style={{ color: '#94a3b8', margin: '6px 0 0 0', fontSize: '0.95rem', maxWidth: '640px' }}>
              Live high-frequency arbitrage scanner connected directly to <strong>Arc Testnet RPC</strong> (Chain ID 5042002) with $0.002 fixed USDC gas fee and 1:1 cross-chain CCTP rebalancing.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsRunning(!isRunning)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '14px',
                border: 'none',
                background: isRunning ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: isRunning ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(13, 148, 136, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              {isRunning ? 'Pause Scanner' : 'Start Live Arbitrage Scanner'}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Live Arc RPC Block</span>
            <Activity size={18} color="#0d9488" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            #{chainStatus?.blockNumber || 'Syncing...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
            ⚡ Latency: {chainStatus?.latencyMs || '--'}ms | Scanned: {totalScanned}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>On-Chain Trades</span>
            <Zap size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
            {totalExecuted}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
            {connectedAccount ? '🟢 Wallet Connected' : '🟡 Standby Mode'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Net Arbitrage Profit</span>
            <DollarSign size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>
            +${totalProfitUSDC} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>USDC</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0d9488', marginTop: '4px', fontWeight: 600 }}>
            Gas Spent: ${gasCostTotal} USDC
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Circle CCTP Protocol</span>
            <Globe size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '12px' }}>
            Native 1:1 USDC
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '4px', fontWeight: 600 }}>
            Zero-Slippage Cross-Chain
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        {[
          { id: 'dex', label: '🔥 Live On-Chain Opportunities' },
          { id: 'crosschain', label: '🌉 Circle CCTP Rebalance' },
          { id: 'logs', label: '📋 Real-Time RPC Logs' },
          { id: 'config', label: '⚙️ Bot Configuration' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === tab.id ? '#0d9488' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: DEX Opportunities */}
      {activeTab === 'dex' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {opportunities.map(opp => (
            <div
              key={opp.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{opp.pair}</span>
                  <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Spread: +{opp.spread}%
                  </span>
                  <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} /> Pool data observed
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Buy on <strong>{opp.dexA}</strong> (${opp.priceA})</span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <span>Sell on <strong>{opp.dexB}</strong> (${opp.priceB})</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Optimal Trade Size</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{opp.optimalAmountIn} USDC</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Expected Net Profit</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>+${opp.expectedProfit} USDC</span>
                </div>

                <button
                  disabled={opp.status === 'executing' || opp.status === 'completed'}
                  onClick={() => handleExecuteArbitrage(opp)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: opp.status === 'completed' ? '#10b981' : opp.status === 'executing' ? '#f59e0b' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: opp.status === 'completed' ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)'
                  }}
                >
                  {opp.status === 'executing' ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Executing On-Chain...
                    </>
                  ) : opp.status === 'completed' ? (
                    <>
                      <CheckCircle2 size={16} /> Profit Claimed
                    </>
                  ) : (
                    <>
                      <Zap size={16} /> Execute Trade
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Circle CCTP Rebalance */}
      {activeTab === 'crosschain' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Circle CCTP Cross-Chain Rebalancer</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Circle Cross-Chain Transfer Protocol allows moving 100% native USDC between Arc, Ethereum, and Arbitrum with 0% slippage.
            </p>
          </div>

          {/* Stepper */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cctpStatus !== 'idle' ? '#0d9488' : 'var(--text-muted)' }}>STEP 1</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Burn on Source</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>depositForBurn()</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cctpStatus === 'attesting' || cctpStatus === 'minting' || cctpStatus === 'complete' ? '#0d9488' : 'var(--text-muted)' }}>STEP 2</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Circle Iris Attestation</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fetch Signature</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cctpStatus === 'minting' || cctpStatus === 'complete' ? '#0d9488' : 'var(--text-muted)' }}>STEP 3</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Mint on Arc</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>receiveMessage()</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cctpStatus === 'complete' ? '#10b981' : 'var(--text-muted)' }}>STEP 4</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Complete</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>100 USDC Native</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {cctpSimulationComplete ? (
                <span>Simulation complete. No tokens moved and no transaction was submitted.</span>
              ) : (
                <span>Simulate bridging 100 USDC from Arbitrum Sepolia to Arc Testnet via Circle Iris API</span>
              )}
            </div>

            <button
              disabled={cctpStatus !== 'idle' && cctpStatus !== 'complete'}
              onClick={handleSimulateCCTP}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)'
              }}
            >
              Run CCTP Bridge Simulation
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Real-Time Logs */}
      {activeTab === 'logs' && (
        <div style={{ background: 'var(--code-bg)', border: '1px solid var(--code-border)', borderRadius: '20px', padding: '1.5rem', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ color: '#5eead4', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} color="#34d399" className="animate-pulse" /> Live Arc RPC Node Stream (rpc.testnet.arc.network)
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chain ID: 5042002</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
            {logs.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>
                <span style={{
                  color: log.type === 'success' ? '#34d399' : log.type === 'warn' ? '#fbbf24' : log.type === 'cctp' ? '#60a5fa' : 'var(--text-secondary)'
                }}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Configuration */}
      {activeTab === 'config' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Bot Settings & Parameters</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Minimum Profit Threshold ($ USDC)</label>
              <input
                type="number"
                step="0.1"
                value={minProfit}
                onChange={e => setMinProfit(Number(e.target.value))}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Max Allowable Slippage (%)</label>
              <input
                type="number"
                step="0.1"
                value={maxSlippage}
                onChange={e => setMaxSlippage(Number(e.target.value))}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Auto-Execute Trades</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unavailable: a verified atomic two-pool route is required.</span>
            </div>
            <input
              type="checkbox"
              disabled
              checked={autoExecute}
              onChange={e => setAutoExecute(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
