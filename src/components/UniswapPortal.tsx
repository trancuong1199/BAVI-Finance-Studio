import React, { useState, useEffect } from 'react';
import { ArrowDownUp, RefreshCw, Settings, Info, Plus, Layers } from 'lucide-react';
import { saveTransaction, getTransactionHistory } from '../lib/TransactionHistory';
import { executeArcSwap, ARC_ROUTER } from '../lib/arcSwap';

interface UniswapPortalProps {
  connectedAccount: string | null;
  getProvider: () => any;
}

interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  icon: string;
}

interface Pool {
  id: string;
  token0: Token;
  token1: Token;
  feeTier: number; // in basis points, e.g. 100 for 1%, 10000 for 1%... wait, v3 tiers: 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1.0%)
  feeLabel: string;
  tvl: number;
  volume24h: number;
  fees24h: number;
  apr: number;
  currentPrice: number; // token1 per token0
}

interface LPPosition {
  id: string;
  pool: Pool;
  minPrice: number;
  maxPrice: number;
  liquidity0: number; // amount of token0
  liquidity1: number; // amount of token1
  unclaimedFees0: number;
  unclaimedFees1: number;
  inRange: boolean;
  timestamp: number;
}

const TOKENS: { [symbol: string]: Token } = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Native Gas)',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    icon: '🪙',
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    icon: '💶',
  },
  wJPY: {
    symbol: 'wJPY',
    name: 'Wrapped Japanese Yen',
    decimals: 6,
    address: '0x6A911FE492EdeC68e7E70a83626dD196B9bBCE08',
    icon: '💴',
  },
  wGOLD: {
    symbol: 'wGOLD',
    name: 'Wrapped PAX Gold (RWA)',
    decimals: 18,
    address: '0xeC72535F30A3BE2F677cD6303Cec089B5F319D72',
    icon: '👑',
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap Governance Token',
    decimals: 18,
    address: '0xfa233bfc8efe970bd5f092e3a5115dcfa18828b8',
    icon: '🦄',
  },
  cirBTC: {
    symbol: 'cirBTC',
    name: 'Circle Wrapped Bitcoin',
    decimals: 8,
    address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF',
    icon: '₿',
  },
};

const POOLS_DATA: Pool[] = [
  {
    id: 'pool-usdc-eurc',
    token0: TOKENS.USDC,
    token1: TOKENS.EURC,
    feeTier: 100, // 0.01%
    feeLabel: '0.01%',
    tvl: 4500000,
    volume24h: 380000,
    fees24h: 38,
    apr: 3.1,
    currentPrice: 0.92, // 1 USDC = 0.92 EURC
  },
  {
    id: 'pool-usdc-wjpy',
    token0: TOKENS.USDC,
    token1: TOKENS.wJPY,
    feeTier: 500, // 0.05%
    feeLabel: '0.05%',
    tvl: 2100000,
    volume24h: 155000,
    fees24h: 77.5,
    apr: 6.7,
    currentPrice: 155.45, // 1 USDC = 155.45 wJPY
  },
  {
    id: 'pool-usdc-wgold',
    token0: TOKENS.USDC,
    token1: TOKENS.wGOLD,
    feeTier: 3000, // 0.30%
    feeLabel: '0.30%',
    tvl: 1250000,
    volume24h: 89000,
    fees24h: 267,
    apr: 15.6,
    currentPrice: 0.000425, // 1 USDC = 0.000425 wGOLD (1 wGOLD = 2352 USDC)
  },
  {
    id: 'pool-usdc-uni',
    token0: TOKENS.USDC,
    token1: TOKENS.UNI,
    feeTier: 3000, // 0.30%
    feeLabel: '0.30%',
    tvl: 850000,
    volume24h: 42000,
    fees24h: 126,
    apr: 10.8,
    currentPrice: 0.125, // 1 USDC = 0.125 UNI (1 UNI = 8 USDC)
  },
  {
    id: 'pool-usdc-cirbtc',
    token0: TOKENS.USDC,
    token1: TOKENS.cirBTC,
    feeTier: 3000, // 0.30%
    feeLabel: '0.30%',
    tvl: 8500000,
    volume24h: 1200000,
    fees24h: 3600,
    apr: 18.5,
    currentPrice: 0.0000166, // 1 USDC = 0.0000166 cirBTC (1 cirBTC = 60240 USDC)
  },
];

export const UniswapPortal: React.FC<UniswapPortalProps> = ({ connectedAccount, getProvider }) => {
  const [activeTab, setActiveTab] = useState<'swap' | 'pools' | 'positions' | 'analytics'>('swap');
  
  // Simulation Explorer Modal State
  const [mockExplorerTx, setMockExplorerTx] = useState<string | null>(null);
  const [mockExplorerData, setMockExplorerData] = useState<any>(null);

  const handleOpenMockExplorer = (txHash: string) => {
    const history = getTransactionHistory();
    const tx = history.find(t => t.txHash === txHash);
    
    const mockDetails = {
      hash: txHash,
      status: 'Success',
      blockNumber: Math.floor(Math.random() * 50000) + 1200000,
      timestamp: tx ? new Date(tx.timestamp).toLocaleString() : new Date().toLocaleString(),
      action: tx ? tx.action : 'Uniswap Swapping',
      from: tx ? tx.from : '0xSimulatedUserAddress',
      to: tx ? tx.to : 'Uniswap v4 Router',
      amount: tx ? `${tx.amount} ${tx.tokenSymbol || 'USDC'}` : '100 USDC',
      gasUsed: '98,420',
      network: 'Build on Arc (Simulated)',
    };
    
    setMockExplorerData(mockDetails);
    setMockExplorerTx(txHash);
  };
  
  // Simulation vs Real State
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  
  // Swap State
  const [tokenIn, setTokenIn] = useState<Token>(TOKENS.USDC);
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS.wGOLD);
  const [amountIn, setAmountIn] = useState<string>('100.00');
  const [amountOut, setAmountOut] = useState<string>('');
  const [slippage, setSlippage] = useState<string>('0.5');
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [swapLoading, setSwapLoading] = useState<boolean>(false);
  const [swapStatus, setSwapStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string; txHash?: string } | null>(null);
  
  // Pools State
  const [pools] = useState<Pool[]>(POOLS_DATA);
  const [selectedPoolForLP, setSelectedPoolForLP] = useState<Pool | null>(null);
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [depositAmount0, setDepositAmount0] = useState<string>('100');
  const [depositAmount1, setDepositAmount1] = useState<string>('');
  const [lpLoading, setLpLoading] = useState<boolean>(false);
  const [lpStatus, setLpStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Positions State
  const [positions, setPositions] = useState<LPPosition[]>([]);

  // Analytics State
  const [chartMetric, setChartMetric] = useState<'tvl' | 'volume'>('tvl');

  // Initialize Demo Positions
  useEffect(() => {
    const savedPositions = localStorage.getItem('arc_uniswap_positions');
    if (savedPositions) {
      setPositions(JSON.parse(savedPositions));
    } else {
      const demoPositions: LPPosition[] = [
        {
          id: 'pos-1',
          pool: POOLS_DATA[0], // USDC/EURC
          minPrice: 0.90,
          maxPrice: 0.94,
          liquidity0: 1250,
          liquidity1: 1150,
          unclaimedFees0: 14.82,
          unclaimedFees1: 13.63,
          inRange: true,
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        },
        {
          id: 'pos-2',
          pool: POOLS_DATA[2], // USDC/wGOLD
          minPrice: 0.00038,
          maxPrice: 0.00041,
          liquidity0: 800,
          liquidity1: 0.32,
          unclaimedFees0: 42.15,
          unclaimedFees1: 0.018,
          inRange: false, // current is 0.000425, so out of range
          timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
        }
      ];
      setPositions(demoPositions);
      localStorage.setItem('arc_uniswap_positions', JSON.stringify(demoPositions));
    }
  }, []);

  // Save positions helper
  const savePositionsToStorage = (updated: LPPosition[]) => {
    setPositions(updated);
    localStorage.setItem('arc_uniswap_positions', JSON.stringify(updated));
  };

  // Real-time ticking fee accumulator for in-range positions
  useEffect(() => {
    const timer = setInterval(() => {
      let changed = false;
      const updated = positions.map(pos => {
        if (pos.inRange) {
          changed = true;
          // Accrue a tiny fraction of fee
          const feeFactor0 = pos.pool.feeTier === 100 ? 0.0002 : 0.0012;
          const feeFactor1 = pos.pool.feeTier === 100 ? 0.00018 : 0.00095;
          return {
            ...pos,
            unclaimedFees0: parseFloat((pos.unclaimedFees0 + Math.random() * feeFactor0).toFixed(6)),
            unclaimedFees1: parseFloat((pos.unclaimedFees1 + Math.random() * feeFactor1).toFixed(6)),
          };
        }
        return pos;
      });
      if (changed) {
        setPositions(updated);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [positions]);

  // Token Price / Rate calculation
  const getRate = (from: Token, to: Token): number => {
    if (from.symbol === to.symbol) return 1;
    
    // Find pool direct or compute crossing rate
    const directPool = POOLS_DATA.find(p => 
      (p.token0.symbol === from.symbol && p.token1.symbol === to.symbol) ||
      (p.token0.symbol === to.symbol && p.token1.symbol === from.symbol)
    );

    if (directPool) {
      if (directPool.token0.symbol === from.symbol) {
        return directPool.currentPrice;
      } else {
        return 1 / directPool.currentPrice;
      }
    }

    // Crossing rate (USDC as bridge)
    const rateFromUSDC = getRate(TOKENS.USDC, from);
    const rateToUSDC = getRate(TOKENS.USDC, to);
    return rateToUSDC / rateFromUSDC;
  };

  // Recalculate amountOut when amountIn or token pairing changes
  useEffect(() => {
    if (!amountIn || isNaN(parseFloat(amountIn))) {
      setAmountOut('');
      return;
    }

    const rate = getRate(tokenIn, tokenOut);
    const estOut = parseFloat(amountIn) * rate;
    setAmountOut(estOut.toFixed(tokenOut.decimals === 18 ? 6 : 4));
  }, [amountIn, tokenIn, tokenOut]);

  // Handle Token Switch
  const handleSwitchTokens = () => {
    const prevIn = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(prevIn);
    setAmountIn(amountOut);
  };

  // Calculate Routing Info
  const getRoutePath = () => {
    if (tokenIn.symbol === 'USDC' || tokenOut.symbol === 'USDC') {
      // Direct pool route
      const feeTier = POOLS_DATA.find(p => 
        (p.token0.symbol === tokenIn.symbol && p.token1.symbol === tokenOut.symbol) ||
        (p.token0.symbol === tokenOut.symbol && p.token1.symbol === tokenIn.symbol)
      )?.feeLabel || '0.30%';

      return [
        { symbol: tokenIn.symbol, icon: tokenIn.icon },
        { type: 'pool', label: `v4 Pool (${feeTier})` },
        { symbol: tokenOut.symbol, icon: tokenOut.icon }
      ];
    } else {
      // Routed through USDC bridge
      const feeIn = POOLS_DATA.find(p => p.token1.symbol === tokenIn.symbol)?.feeLabel || '0.30%';
      const feeOut = POOLS_DATA.find(p => p.token1.symbol === tokenOut.symbol)?.feeLabel || '0.30%';

      return [
        { symbol: tokenIn.symbol, icon: tokenIn.icon },
        { type: 'pool', label: `v4 Pool (${feeIn})` },
        { symbol: 'USDC', icon: '🪙' },
        { type: 'pool', label: `v4 Pool (${feeOut})` },
        { symbol: tokenOut.symbol, icon: tokenOut.icon }
      ];
    }
  };

  // Execute Swap transaction (real or simulated)
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountIn || isNaN(parseFloat(amountIn))) return;

    setSwapLoading(true);
    setSwapStatus({ type: 'info', msg: 'Preparing swap routing on Uniswap v4...' });

    if (isSimulationMode) {
      setTimeout(() => {
        const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const record = {
          id: `tx-${Date.now()}`,
          action: 'Uniswap Swap',
          amount: amountIn,
          from: connectedAccount || '0xSimulatedUserAddress',
          to: 'Uniswap v4 Router',
          txHash,
          status: 'COMPLETE' as const,
          explorerUrl: undefined,
          timestamp: Date.now(),
          tokenSymbol: tokenIn.symbol,
        };

        saveTransaction(record);
        setSwapStatus({
          type: 'success',
          msg: `[SIMULATION] ${amountIn} ${tokenIn.symbol} → ${amountOut} ${tokenOut.symbol}. No transaction was sent.`,
          txHash,
        });
        setSwapLoading(false);
        setAmountIn('');
        
        // Dispatch event to refresh balance
        window.dispatchEvent(new Event('swap_executed'));
        window.dispatchEvent(new Event('transaction_executed'));
      }, 2000);
    } else {
      // Real Wallet Transaction
      const eth = getProvider();
      if (!eth || !connectedAccount) {
        setSwapStatus({ type: 'error', msg: 'Please connect your Web3 wallet first.' });
        setSwapLoading(false);
        return;
      }

      try {
        if (!['USDC', 'EURC'].includes(tokenIn.symbol) || !['USDC', 'EURC'].includes(tokenOut.symbol) || tokenIn.symbol === tokenOut.symbol) {
          throw new Error('Live swaps support USDC ↔ EURC only.');
        }
        const swap = await executeArcSwap(eth, amountIn, tokenIn.symbol as 'USDC' | 'EURC', Math.round(Number(activeSlippage) * 100), msg => setSwapStatus({ type: 'info', msg }));
        const txHash = swap.txHash;

        const record = {
          id: `tx-${Date.now()}`,
          action: `Swap via Contract (Onchain)`,
          amount: amountIn,
          from: connectedAccount,
          to: ARC_ROUTER,
          txHash,
          status: 'COMPLETE' as const,
          explorerUrl: `https://testnet.arcscan.app/tx/${txHash}`,
          timestamp: Date.now(),
          tokenSymbol: tokenIn.symbol,
        };

        saveTransaction(record);
        setSwapStatus({
          type: 'success',
          msg: swap.unwrapWarning || 'Swap confirmed. See the receipt for the amount received.',
          txHash,
        });
        setAmountIn('');
        window.dispatchEvent(new Event('swap_executed'));
        window.dispatchEvent(new Event('transaction_executed'));
      } catch (err: any) {
        console.error(err);
        setSwapStatus({ type: 'error', msg: err.message || 'MetaMask transaction rejected.' });
      } finally {
        setSwapLoading(false);
      }
    }
  };

  // Open LP Liquidity selector
  const handleOpenAddLP = (pool: Pool) => {
    setSelectedPoolForLP(pool);
    // Set default ranges around current price
    const current = pool.currentPrice;
    setMinPriceInput((current * 0.95).toFixed(6));
    setMaxPriceInput((current * 1.05).toFixed(6));
    setDepositAmount0('100.00');
    setDepositAmount1((100 * current).toFixed(pool.token1.decimals === 18 ? 6 : 4));
    setLpStatus(null);
  };

  // Recalculate deposit token quantities based on ratio
  const handleDepositAmount0Change = (val: string) => {
    setDepositAmount0(val);
    if (!val || isNaN(parseFloat(val)) || !selectedPoolForLP) {
      setDepositAmount1('');
      return;
    }
    const ratio = selectedPoolForLP.currentPrice;
    setDepositAmount1((parseFloat(val) * ratio).toFixed(selectedPoolForLP.token1.decimals === 18 ? 6 : 4));
  };

  // Quick range buttons
  const setQuickRange = (percent: number) => {
    if (!selectedPoolForLP) return;
    const current = selectedPoolForLP.currentPrice;
    if (percent === 100) {
      // Full Range
      setMinPriceInput('0.000000');
      setMaxPriceInput('∞');
    } else {
      setMinPriceInput((current * (1 - percent / 100)).toFixed(6));
      setMaxPriceInput((current * (1 + percent / 100)).toFixed(6));
    }
  };

  // Add Concentrated Liquidity Position
  const handleAddLiquidity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolForLP || !depositAmount0 || !depositAmount1) return;

    setLpLoading(true);
    setLpStatus({ type: 'info', msg: 'Minting concentrated liquidity position NFT...' });

    setTimeout(() => {
      const minP = parseFloat(minPriceInput) || 0;
      const maxP = maxPriceInput === '∞' ? 999999999 : parseFloat(maxPriceInput) || 999999999;
      
      const newPos: LPPosition = {
        id: `pos-${Date.now()}`,
        pool: selectedPoolForLP,
        minPrice: minP,
        maxPrice: maxP,
        liquidity0: parseFloat(depositAmount0),
        liquidity1: parseFloat(depositAmount1),
        unclaimedFees0: 0.00,
        unclaimedFees1: 0.00,
        inRange: selectedPoolForLP.currentPrice >= minP && selectedPoolForLP.currentPrice <= maxP,
        timestamp: Date.now(),
      };

      const updated = [newPos, ...positions];
      savePositionsToStorage(updated);

      // Save a transaction item for CCTP or general action
      const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      saveTransaction({
        id: `tx-${Date.now()}`,
        action: 'Uniswap Add LP',
        amount: depositAmount0,
        from: connectedAccount || '0xSimulatedUserAddress',
        to: 'Uniswap v4 NFT Manager',
        txHash: mockTx,
        status: 'COMPLETE',
        explorerUrl: undefined,
        timestamp: Date.now(),
        tokenSymbol: selectedPoolForLP.token0.symbol,
      });

      setLpStatus({ type: 'success', msg: 'Concentrated Liquidity NFT position minted successfully! Dynamic fee accumulation is now active.' });
      setLpLoading(false);
      setSelectedPoolForLP(null);
      window.dispatchEvent(new Event('swap_executed')); // triggers balance update
    }, 2000);
  };

  // Collect fees from LP Position
  const handleCollectFees = (posId: string) => {
    const target = positions.find(p => p.id === posId);
    if (!target) return;

    const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Save transaction
    saveTransaction({
      id: `tx-${Date.now()}`,
      action: 'Uniswap Collect Fees',
      amount: target.unclaimedFees0.toString(),
      from: 'Uniswap v4 NFT Manager',
      to: connectedAccount || '0xSimulatedUserAddress',
      txHash: mockTx,
      status: 'COMPLETE',
      explorerUrl: undefined,
      timestamp: Date.now(),
      tokenSymbol: target.pool.token0.symbol,
    });

    const updated = positions.map(pos => {
      if (pos.id === posId) {
        return {
          ...pos,
          unclaimedFees0: 0,
          unclaimedFees1: 0,
        };
      }
      return pos;
    });

    savePositionsToStorage(updated);
    alert(`Successfully collected accumulated fees of ${target.unclaimedFees0} ${target.pool.token0.symbol} & ${target.unclaimedFees1} ${target.pool.token1.symbol}!`);
    window.dispatchEvent(new Event('swap_executed'));
  };

  // Remove LP Liquidity Position
  const handleRemoveLiquidity = (posId: string) => {
    const target = positions.find(p => p.id === posId);
    if (!target) return;

    if (!confirm(`Are you sure you want to close this Uniswap position and withdraw all liquidity (${target.liquidity0} ${target.pool.token0.symbol} & ${target.liquidity1} ${target.pool.token1.symbol})?`)) {
      return;
    }

    const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    saveTransaction({
      id: `tx-${Date.now()}`,
      action: 'Uniswap Remove LP',
      amount: target.liquidity0.toString(),
      from: 'Uniswap v4 NFT Manager',
      to: connectedAccount || '0xSimulatedUserAddress',
      txHash: mockTx,
      status: 'COMPLETE',
      explorerUrl: undefined,
      timestamp: Date.now(),
      tokenSymbol: target.pool.token0.symbol,
    });

    const updated = positions.filter(p => p.id !== posId);
    savePositionsToStorage(updated);
    
    alert('Liquidity successfully withdrawn and returned to your balance.');
    window.dispatchEvent(new Event('swap_executed'));
  };

  // Get active slippage value
  const activeSlippage = customSlippage ? customSlippage : slippage;

  return (
    <div className="glass-panel app-kit-panel" style={{ maxWidth: '900px', width: '100%', borderRadius: '24px' }}>
      {/* Top Banner Accent */}
      <div style={{
        height: '6px',
        background: 'linear-gradient(90deg, #ff007a 0%, #fc00d6 50%, #3b82f6 100%)',
        borderTopLeftRadius: '23px',
        borderTopRightRadius: '23px'
      }}></div>

      <div className="app-kit-tabs" style={{ background: 'rgba(0,0,0,0.1)' }}>
        <button
          className={`app-kit-tab ${activeTab === 'swap' ? 'active' : ''}`}
          onClick={() => setActiveTab('swap')}
          style={{ position: 'relative' }}
        >
          🦄 Swap
        </button>
        <button
          className={`app-kit-tab ${activeTab === 'pools' ? 'active' : ''}`}
          onClick={() => setActiveTab('pools')}
        >
          💦 Liquidity Pools
        </button>
        <button
          className={`app-kit-tab ${activeTab === 'positions' ? 'active' : ''}`}
          onClick={() => setActiveTab('positions')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          💼 My Positions
          {positions.length > 0 && (
            <span style={{
              background: '#ff007a',
              color: 'white',
              fontSize: '0.75rem',
              borderRadius: '10px',
              padding: '2px 6px',
              fontWeight: 700
            }}>
              {positions.length}
            </span>
          )}
        </button>
        <button
          className={`app-kit-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>

      <div className="app-kit-content" style={{ padding: '2rem' }}>
        {/* Toggle Simulation Mode */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '0.75rem 1.25rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚙️</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Uniswap Arc Swapper Engine</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isSimulationMode ? 'Simulation mode is active. Execute test trades instantly!' : 'Real MetaMask transactions will deploy on Build on Arc.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsSimulationMode(!isSimulationMode)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: isSimulationMode ? 'linear-gradient(135deg, #ff007a, #8b5cf6)' : 'rgba(255,255,255,0.05)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isSimulationMode ? '⚡ Simulation Active' : '⛓️ Live Wallet Mode'}
          </button>
        </div>

        {/* ================== SWAP VIEW ================== */}
        {activeTab === 'swap' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            {/* Swapping Widget */}
            <form onSubmit={handleSwap} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Uniswap Swapper</h3>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Settings size={20} className={showSettings ? 'spin-rotation' : ''} />
                </button>
              </div>

              {/* Slippage Settings Drawer */}
              {showSettings && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Slippage Tolerance</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['0.1', '0.5', '1.0'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => { setSlippage(val); setCustomSlippage(''); }}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: slippage === val && !customSlippage ? '#ff007a' : 'rgba(255,255,255,0.05)',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {val}%
                      </button>
                    ))}
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Custom"
                      value={customSlippage}
                      onChange={(e) => setCustomSlippage(e.target.value)}
                      style={{
                        width: '80px',
                        padding: '6px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Input Card */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1rem 1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span>You Sell</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="any"
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    placeholder="0.0"
                    disabled={swapLoading}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      color: 'white',
                      width: '60%',
                      outline: 'none'
                    }}
                  />
                  <select
                    value={tokenIn.symbol}
                    onChange={(e) => {
                      const t = TOKENS[e.target.value];
                      setTokenIn(t);
                      if (tokenOut.symbol === t.symbol) {
                        setTokenOut(t.symbol === 'USDC' ? TOKENS.wGOLD : TOKENS.USDC);
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    {Object.values(TOKENS).map(t => (
                      <option key={t.symbol} value={t.symbol} style={{ background: '#1e293b', color: 'white' }}>{t.icon} {t.symbol}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Switch Arrow */}
              <button
                type="button"
                onClick={handleSwitchTokens}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-color)',
                  color: '#ff007a',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '-0.75rem auto',
                  zIndex: 2,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <ArrowDownUp size={18} />
              </button>

              {/* Output Card */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1rem 1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <span>You Receive (Estimated)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={amountOut}
                    placeholder="0.0"
                    readOnly
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.7)',
                      width: '60%',
                      outline: 'none'
                    }}
                  />
                  <select
                    value={tokenOut.symbol}
                    onChange={(e) => {
                      const t = TOKENS[e.target.value];
                      setTokenOut(t);
                      if (tokenIn.symbol === t.symbol) {
                        setTokenIn(t.symbol === 'USDC' ? TOKENS.wGOLD : TOKENS.USDC);
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    {Object.values(TOKENS).map(t => (
                      <option key={t.symbol} value={t.symbol} style={{ background: '#1e293b', color: 'white' }}>{t.icon} {t.symbol}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rate Breakdown */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                padding: '0 0.5rem'
              }}>
                <span>Exchange Price:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>
                  1 {tokenIn.symbol} ≈ {getRate(tokenIn, tokenOut).toFixed(tokenOut.decimals === 18 ? 6 : 4)} {tokenOut.symbol}
                </span>
              </div>

              {/* Live Wallet Warning Notice */}
              {!isSimulationMode && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.07)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: '0.8rem',
                  color: '#f59e0b',
                  lineHeight: '1.4',
                  marginTop: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  ⚠️ <strong>Build on Arc Notice:</strong> Public DEX stablecoin liquidity pools are not active on the network. Live wallet mode will submit a MetaMask transaction, but no actual tokens will be exchanged on-chain. For a working swap demonstration, please enable <strong>Simulation Active</strong> mode above.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={swapLoading || !amountIn || (!isSimulationMode && !connectedAccount)}
                style={{
                  background: (swapLoading || !amountIn || (!isSimulationMode && !connectedAccount))
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg, #ff007a, #fc00d6)',
                  color: (swapLoading || !amountIn || (!isSimulationMode && !connectedAccount)) ? 'var(--text-secondary)' : 'white',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  padding: '1rem',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: (swapLoading || !amountIn || (!isSimulationMode && !connectedAccount)) ? 'none' : '0 4px 15px rgba(255,0,122,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {swapLoading ? (
                  <>
                    <RefreshCw className="spin-rotation" size={20} />
                    Routing Swap...
                  </>
                ) : !isSimulationMode && !connectedAccount ? (
                  <>
                    🔌 Connect Wallet to Swap
                  </>
                ) : (
                  <>
                    🦄 Swapping {tokenIn.symbol} for {tokenOut.symbol}
                  </>
                )}
              </button>

              {/* Status Output */}
              {swapStatus && (
                <div className={`status-box ${swapStatus.type}`} style={{ borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700 }}>
                    {swapStatus.type === 'success' && '✓ Swap Executed Successfully!'}
                    {swapStatus.type === 'info' && 'ℹ Swap Processing'}
                    {swapStatus.type === 'error' && '⚠ Swapping Failed'}
                  </div>
                  <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-line', marginTop: '0.25rem' }}>{swapStatus.msg}</div>
                  {swapStatus.txHash && (
                    isSimulationMode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.8rem", opacity: 0.8, color: '#ff007a' }}>
                          Mock Tx Hash: <span 
                            onClick={() => handleOpenMockExplorer(swapStatus.txHash!)} 
                            style={{ fontFamily: "monospace", textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                          >
                            {swapStatus.txHash.substring(0, 16)}...
                          </span> (Simulated - Click to Inspect 🔍)
                        </div>
                        <a
                          href={`https://testnet.arcscan.app/tx/${swapStatus.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="explorer-link"
                          style={{ fontSize: '0.78rem', color: '#ff007a', opacity: 0.85, textDecoration: 'underline' }}
                        >
                          🔍 Search on ArcScan Explorer ↗
                        </a>
                      </div>
                    ) : (
                      <a
                        href={`https://testnet.arcscan.app/tx/${swapStatus.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        🔍 Verify on ArcScan Explorer ↗
                      </a>
                    )
                  )}
                </div>
              )}
            </form>

            {/* Swap Router visual path diagram */}
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={16} color="#ff007a" />
                  Uniswap v4 Smart Router Path
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Arc swap engine routes your transaction dynamically to guarantee minimum price impact.
                </p>
              </div>

              {/* Visual Flow diagram */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                background: 'rgba(0,0,0,0.25)',
                padding: '1.5rem 1rem',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
                {getRoutePath().map((step, idx) => {
                  if (step.type === 'pool') {
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {/* Down Arrow */}
                        <div style={{ width: '2px', height: '20px', background: 'linear-gradient(180deg, #ff007a, #fc00d6)' }}></div>
                        <div style={{
                          fontSize: '0.7rem',
                          background: 'rgba(255,0,122,0.1)',
                          border: '1px solid rgba(255,0,122,0.3)',
                          color: '#ff007a',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontWeight: 600
                        }}>
                          {step.label}
                        </div>
                        <div style={{ width: '2px', height: '20px', background: 'linear-gradient(180deg, #fc00d6, #3b82f6)' }}></div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        width: '120px',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{step.symbol}</span>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Transaction Specs Info list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Minimum Received:</span>
                  <span style={{ fontWeight: 600 }}>
                    {(parseFloat(amountOut || '0') * (1 - parseFloat(activeSlippage) / 100)).toFixed(tokenOut.decimals === 18 ? 6 : 4)} {tokenOut.symbol}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Price Impact:</span>
                  <span style={{ color: '#4ade80', fontWeight: 600 }}>&lt; 0.03% (Optimal)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Slippage Tolerance:</span>
                  <span style={{ fontWeight: 600, color: '#ff007a' }}>{activeSlippage}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Uniswap Protocol Fee:</span>
                  <span style={{ fontWeight: 600 }}>0.00 USDC (Waived)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================== POOLS & MINTING VIEW ================== */}
        {activeTab === 'pools' && (
          <div className="animate-fade-in">
            {!selectedPoolForLP ? (
              // List pools
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem' }}>Arc Uniswap Liquidity Pools</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Select a pair below to provide concentrated liquidity and earn real-time protocol fee shares.
                    </p>
                  </div>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pool Pair</th>
                        <th>Fee Tier</th>
                        <th>TVL (Arc)</th>
                        <th>24h Volume</th>
                        <th>Est. APR</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pools.map(pool => (
                        <tr key={pool.id}>
                          <td>
                            <div className="pool-pair">
                              <span style={{ fontSize: '1.2rem' }}>{pool.token0.icon} {pool.token1.icon}</span>
                              {pool.token0.symbol} / {pool.token1.symbol}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              background: 'rgba(255,0,122,0.1)',
                              color: '#ff007a',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              {pool.feeLabel}
                            </span>
                          </td>
                          <td>${pool.tvl.toLocaleString()}</td>
                          <td>${pool.volume24h.toLocaleString()}</td>
                          <td style={{ color: '#4ade80', fontWeight: 600 }}>{pool.apr}%</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenAddLP(pool)}
                              style={{
                                background: 'linear-gradient(135deg, #ff007a, #8b5cf6)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '10px',
                                padding: '6px 14px',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Plus size={14} /> Add LP
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Add Liquidity form
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                <form onSubmit={handleAddLiquidity} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPoolForLP(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                      }}
                    >
                      ←
                    </button>
                    <h3 style={{ fontSize: '1.25rem' }}>
                      Add Liquidity: {selectedPoolForLP.token0.symbol} / {selectedPoolForLP.token1.symbol}
                    </h3>
                  </div>

                  {/* Range selector widgets */}
                  <div style={{
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1.25rem'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                      1. Concentrated Price Range (Min / Max)
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {['5', '10', '20'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuickRange(parseFloat(val))}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ±{val}%
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setQuickRange(100)}
                        style={{
                          flex: 1.2,
                          padding: '6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Full Range
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Min Price</span>
                        <input
                          type="text"
                          value={minPriceInput}
                          onChange={(e) => setMinPriceInput(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'white',
                            textAlign: 'center',
                            width: '100%',
                            outline: 'none',
                            marginTop: '4px'
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {selectedPoolForLP.token1.symbol} per {selectedPoolForLP.token0.symbol}
                        </span>
                      </div>

                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Max Price</span>
                        <input
                          type="text"
                          value={maxPriceInput}
                          onChange={(e) => setMaxPriceInput(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'white',
                            textAlign: 'center',
                            width: '100%',
                            outline: 'none',
                            marginTop: '4px'
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {selectedPoolForLP.token1.symbol} per {selectedPoolForLP.token0.symbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deposit Amount settings */}
                  <div style={{
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1.25rem'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                      2. Choose Deposit Capital
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <input
                          type="number"
                          value={depositAmount0}
                          onChange={(e) => handleDepositAmount0Change(e.target.value)}
                          placeholder="0.0"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'white',
                            outline: 'none',
                            width: '60%'
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                          {selectedPoolForLP.token0.icon} {selectedPoolForLP.token0.symbol}
                        </span>
                      </div>

                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <input
                          type="number"
                          value={depositAmount1}
                          onChange={(e) => setDepositAmount1(e.target.value)}
                          placeholder="0.0"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: 'white',
                            outline: 'none',
                            width: '60%'
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                          {selectedPoolForLP.token1.icon} {selectedPoolForLP.token1.symbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPoolForLP(null)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        fontWeight: 600,
                        padding: '12px',
                        borderRadius: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={lpLoading || !depositAmount0 || !depositAmount1}
                      style={{
                        flex: 2,
                        background: 'linear-gradient(135deg, #ff007a, #8b5cf6)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 700,
                        padding: '12px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(255,0,122,0.2)'
                      }}
                    >
                      {lpLoading ? 'Minting LP...' : '🦄 Add Liquidity'}
                    </button>
                  </div>

                  {lpStatus && (
                    <div className={`status-box ${lpStatus.type}`} style={{ borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ fontWeight: 700 }}>
                        {lpStatus.type === 'success' && '✓ LP Position Created!'}
                        {lpStatus.type === 'info' && 'ℹ Minting LP Position NFT'}
                        {lpStatus.type === 'error' && '⚠ Failed to Add LP'}
                      </div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{lpStatus.msg}</div>
                    </div>
                  )}
                </form>

                {/* Price info card */}
                <div style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <h4 style={{ fontSize: '1.1rem' }}>Pool Information</h4>
                  
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Price</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff007a', margin: '4px 0' }}>
                      {selectedPoolForLP.currentPrice}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {selectedPoolForLP.token1.symbol} per {selectedPoolForLP.token0.symbol}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Selected Fee Tier:</span>
                      <span style={{ fontWeight: 600, color: '#ff007a' }}>{selectedPoolForLP.feeLabel}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Estimated APR:</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>{selectedPoolForLP.apr}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Current Pool TVL:</span>
                      <span style={{ fontWeight: 600 }}>${selectedPoolForLP.tvl.toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '1rem',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.3'
                  }}>
                    💡 Concentrated liquidity allows you to focus your tokens in a custom range. You will earn fee revenue only when the current pool rate remains <strong>within</strong> your min/max limits.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================== MY POSITIONS VIEW ================== */}
        {activeTab === 'positions' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>My Uniswap v4 Concentrated Liquidity Positions</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Monitor your active price bounds, earn trade commissions, and claim accumulated pool yields.
              </p>
            </div>

            {positions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                border: '2px dashed var(--border-color)',
                borderRadius: '16px',
                color: 'var(--text-secondary)'
              }}>
                <Layers size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#ff007a' }} />
                <h4>No positions found on Build on Arc</h4>
                <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 1rem' }}>Get started by providing liquidity into stablecoin, FX, or RWA pairs.</p>
                <button
                  onClick={() => setActiveTab('pools')}
                  style={{
                    background: 'linear-gradient(135deg, #ff007a, #8b5cf6)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Create LP Position
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {positions.map(pos => (
                  <div
                    key={pos.id}
                    className="glass-panel"
                    style={{
                      background: 'rgba(18, 19, 28, 0.45)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Header: Token pair, fee, status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{pos.pool.token0.icon} {pos.pool.token1.icon}</span>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                            {pos.pool.token0.symbol} / {pos.pool.token1.symbol}
                          </span>
                          <span style={{
                            marginLeft: '8px',
                            background: 'rgba(255,0,122,0.1)',
                            color: '#ff007a',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {pos.pool.feeLabel}
                          </span>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: pos.inRange ? 'rgba(74, 222, 128, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        border: `1px solid ${pos.inRange ? 'rgba(74, 222, 128, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`,
                        color: pos.inRange ? '#4ade80' : '#eab308',
                        padding: '4px 12px',
                        borderRadius: '100px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        <span className={pos.inRange ? 'pulse-dot' : ''} style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: pos.inRange ? '#4ade80' : '#eab308'
                        }}></span>
                        {pos.inRange ? 'In Range (Earning)' : 'Out of Range'}
                      </div>
                    </div>

                    {/* Details: Deposit amount, range, unclaimed fees */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                      {/* Deposit detail */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Deposited Liquidity</span>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {pos.liquidity0} {pos.pool.token0.symbol}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {pos.liquidity1} {pos.pool.token1.symbol}
                        </span>
                      </div>

                      {/* Range Detail */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Active Price Limits</span>
                        <span style={{ fontSize: '0.9rem' }}>
                          Min: <strong style={{ color: 'white' }}>{pos.minPrice}</strong>
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>
                          Max: <strong style={{ color: 'white' }}>{pos.maxPrice === 999999999 ? '∞' : pos.maxPrice}</strong>
                        </span>
                      </div>

                      {/* Unclaimed Yield Detail */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Unclaimed Fees
                          {pos.inRange && <span style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 600 }}>(Ticking...)</span>}
                        </span>
                        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          💵 {pos.unclaimedFees0} {pos.pool.token0.symbol}
                        </span>
                        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          💵 {pos.unclaimedFees1} {pos.pool.token1.symbol}
                        </span>
                      </div>
                    </div>

                    {/* Actions: collect, remove */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.75rem',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      <button
                        onClick={() => handleCollectFees(pos.id)}
                        disabled={pos.unclaimedFees0 === 0 && pos.unclaimedFees1 === 0}
                        style={{
                          background: 'rgba(74, 222, 128, 0.1)',
                          border: '1px solid rgba(74, 222, 128, 0.2)',
                          color: '#4ade80',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: pos.unclaimedFees0 === 0 && pos.unclaimedFees1 === 0 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Collect Fees
                      </button>
                      <button
                        onClick={() => handleRemoveLiquidity(pos.id)}
                        style={{
                          background: 'rgba(248, 113, 113, 0.1)',
                          border: '1px solid rgba(248, 113, 113, 0.2)',
                          color: '#f87171',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Close Position
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================== ANALYTICS VIEW ================== */}
        {activeTab === 'analytics' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Arc Uniswap Analytics Portal</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Real-time tracking of Liquidity Pools on Arc (Mainnet & Testnet simulations).
              </p>
            </div>

            {/* TVL / Vol selector */}
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.1)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
              <button
                onClick={() => setChartMetric('tvl')}
                style={{
                  background: chartMetric === 'tvl' ? 'linear-gradient(135deg, #ff007a, #8b5cf6)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Total Value Locked (TVL)
              </button>
              <button
                onClick={() => setChartMetric('volume')}
                style={{
                  background: chartMetric === 'volume' ? 'linear-gradient(135deg, #ff007a, #8b5cf6)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Trading Volume (24h)
              </button>
            </div>

            {/* Custom SVG Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {chartMetric === 'tvl' ? 'Uniswap TVL Trend (Arc Chain)' : '24h Trading Volume Trend'}
                </span>
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.1rem' }}>
                  {chartMetric === 'tvl' ? '$8,700,000.00 (+14%)' : '$666,000.00 (+22%)'}
                </span>
              </div>

              {/* Chart Plot */}
              <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                <svg viewBox="0 0 800 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="0" y1="50" x2="800" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="5,5" />
                  <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="5,5" />
                  <line x1="0" y1="150" x2="800" y2="150" stroke="rgba(255,255,255,0.05)" strokeDasharray="5,5" />
                  
                  {/* Chart Path */}
                  {chartMetric === 'tvl' ? (
                    // TVL Path
                    <path
                      d="M 0 170 Q 130 160 260 120 T 520 80 T 800 40 L 800 200 L 0 200 Z"
                      fill="url(#chart-grad)"
                      stroke="#ff007a"
                      strokeWidth="3"
                    />
                  ) : (
                    // Vol Path (bar charts or wave)
                    <path
                      d="M 0 160 Q 130 180 260 140 T 520 100 T 800 50 L 800 200 L 0 200 Z"
                      fill="url(#chart-grad)"
                      stroke="#8b5cf6"
                      strokeWidth="3"
                    />
                  )}

                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartMetric === 'tvl' ? '#ff007a' : '#8b5cf6'} stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ff007a" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Day Labels */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Jun 10</span>
                  <span>Jun 11</span>
                  <span>Jun 12</span>
                  <span>Jun 13</span>
                  <span>Jun 14</span>
                  <span>Jun 15</span>
                  <span>Jun 16 (Today)</span>
                </div>
              </div>
            </div>

            {/* List of general liquidity stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>USDC Pool Reserves</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>4.82M USDC</span>
                <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>⚡ Gas token dominance 55.4%</span>
              </div>
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Pool Fees Shared</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>$14,500 USDC</span>
                <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>⚡ Yield distributed continuously</span>
              </div>
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Uniswap Routing Efficiency</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>99.97%</span>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>⚡ Multi-hop slippage average 0.01%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Explorer Modal */}
      {mockExplorerTx && mockExplorerData && (
        <div className="modal-overlay" onClick={() => setMockExplorerTx(null)} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.2s ease', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, background: 'linear-gradient(135deg, #ff007a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🔍 Arc Simulation Explorer
              </h3>
              <button 
                onClick={() => setMockExplorerTx(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', padding: '4px' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px', color: '#4ade80' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Simulation Transaction Succeeded</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Confirmed locally on client Swapper simulator</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>Tx Hash:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'white', wordBreak: 'break-all', fontSize: '0.8rem', textAlign: 'right' }}>
                    {mockExplorerData.hash}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <span style={{ color: '#4ade80', fontWeight: 600 }}>Success (Local)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Block Number:</span>
                  <span style={{ fontWeight: 600, color: 'white' }}>{mockExplorerData.blockNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
                  <span style={{ fontWeight: 600, color: 'white' }}>{mockExplorerData.timestamp}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Action:</span>
                  <span style={{ fontWeight: 600, color: '#ff007a' }}>{mockExplorerData.action}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '80px' }}>Sender (From):</span>
                  <span style={{ fontFamily: 'monospace', color: 'white', wordBreak: 'break-all', fontSize: '0.8rem', textAlign: 'right' }}>{mockExplorerData.from}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '80px' }}>Contract (To):</span>
                  <span style={{ fontFamily: 'monospace', color: 'white', wordBreak: 'break-all', fontSize: '0.8rem', textAlign: 'right' }}>{mockExplorerData.to}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Value:</span>
                  <span style={{ fontWeight: 600, color: 'white' }}>{mockExplorerData.amount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gas Used:</span>
                  <span style={{ fontWeight: 600, color: 'white' }}>{mockExplorerData.gasUsed} USDC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Network:</span>
                  <span style={{ fontWeight: 600, color: '#3b82f6' }}>{mockExplorerData.network}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>External Scan:</span>
                  <a
                    href={`https://testnet.arcscan.app/tx/${mockExplorerData.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#ff007a', fontWeight: 600, textDecoration: 'underline', fontSize: '0.82rem' }}
                  >
                    View on ArcScan ↗
                  </a>
                </div>
              </div>
            </div>
            <button
              onClick={() => setMockExplorerTx(null)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ff007a, #3b82f6)',
                color: 'white',
                fontWeight: 700,
                padding: '0.75rem',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              Close Simulator Explorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
