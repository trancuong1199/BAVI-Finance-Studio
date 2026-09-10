import { executeArcSwap } from '../lib/arcSwap';
import React, { useState, useEffect } from 'react';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { saveTransaction } from '../lib/TransactionHistory';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { switchOrAddArcNetwork, globalRpcProvider } from '../utils/arcChain';

const ARC_CHAIN_ID = '0x4CEF52'; // 5042002 in hex
const ARC_CHAIN_PARAMS = {
  chainId: ARC_CHAIN_ID,
  chainName: 'Build on Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
};

interface ArcAppKitProps {
  connectedAccount: string | null;
  getProvider: () => any;
}

export const ArcAppKit: React.FC<ArcAppKitProps> = ({ connectedAccount, getProvider }) => {
  const activeTab = 'swap';
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [swapAmount, setSwapAmount] = useState('1.00');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isReversed, setIsReversed] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      const eth = getProvider();
      if (eth) {
        try {
          const chainId = await eth.request({ method: 'eth_chainId' });
          if (chainId && chainId.toLowerCase() === ARC_CHAIN_ID.toLowerCase()) {
            setIsWrongNetwork(false);
          } else {
            setIsWrongNetwork(true);
          }
        } catch (e) {
          setIsWrongNetwork(false);
        }
      } else {
        setIsWrongNetwork(false);
      }
    };
    checkNetwork();

    const eth = getProvider();
    if (eth && eth.on) {
      const handleChainChanged = (chainId: string) => {
        setIsWrongNetwork(chainId.toLowerCase() !== ARC_CHAIN_ID.toLowerCase());
        fetchBalances();
      };
      eth.on('chainChanged', handleChainChanged);
      return () => {
        if (eth.removeListener) {
          eth.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [connectedAccount, getProvider]);

  // USDC <➔ EURC Exchange and Balance states
  const [balances, setBalances] = useState<{ usdc: string; eurc: string }>({ usdc: '0.0000', eurc: '0.0000' });
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [realExchangeRate, setRealExchangeRate] = useState<number>(0.6727); // 1 USDC ≈ 0.6727 EURC on-chain V3 pool

  const fetchExchangeRate = async () => {
    try {
      const eth = getProvider();
      let provider = globalRpcProvider;
      try {
        if (eth) {
          const chainId = await eth.request({ method: 'eth_chainId' });
          if (chainId && chainId.toLowerCase() === ARC_CHAIN_ID.toLowerCase()) {
            provider = new BrowserProvider(eth) as any;
          }
        }
      } catch (e) { }

      const pool = new Contract(
        '0xe8f7fA2A412e98C537554643F83DA34DfdD50c23',
        ["function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)"],
        provider
      );
      const slot0 = await pool.slot0();
      const sqrtPriceX96 = BigInt(slot0[0]);
      const Q96 = BigInt(2) ** BigInt(96);
      const priceX96 = sqrtPriceX96 * sqrtPriceX96;
      
      const priceOfEURCInUSDC = Number(priceX96) / (Number(Q96 * Q96) * 1e12);
      if (priceOfEURCInUSDC > 0) {
        const priceOfUSDCInEURC = 1 / priceOfEURCInUSDC;
        setRealExchangeRate(priceOfUSDCInEURC);
      }
    } catch (e) {
      console.warn("Failed to fetch pool price:", e);
    }
  };

  const fetchBalances = async () => {
    if (!connectedAccount) return;
    setIsFetchingBalances(true);

    let usdcVal = balances.usdc;
    let eurcVal = balances.eurc;
    
    const eth = getProvider();
    let provider = globalRpcProvider;
    
    try {
      if (eth) {
        const chainId = await eth.request({ method: 'eth_chainId' });
        if (chainId && chainId.toLowerCase() === ARC_CHAIN_ID.toLowerCase()) {
          provider = new BrowserProvider(eth) as any;
        }
      }
    } catch (e) { }

    // Fetch USDC balance independently
    try {
      const nativeBalance = await provider.getBalance(connectedAccount);
      usdcVal = parseFloat(formatUnits(nativeBalance, 18)).toFixed(4);
    } catch (e) {
      console.warn("Failed to fetch native USDC balance:", e);
      // Fallback
      try {
        const nativeBalance = await globalRpcProvider.getBalance(connectedAccount);
        usdcVal = parseFloat(formatUnits(nativeBalance, 18)).toFixed(4);
      } catch (err) {
        console.warn("USDC fallback query failed:", err);
      }
    }

    // Fetch EURC balance independently
    try {
      const eurcContract = new Contract(
        '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
        ["function balanceOf(address account) view returns (uint256)"],
        provider
      );
      const eurcBalance = await eurcContract.balanceOf(connectedAccount);
      eurcVal = parseFloat(formatUnits(eurcBalance, 6)).toFixed(4);
    } catch (e) {
      console.warn("Failed to fetch EURC balance:", e);
      // Fallback
      try {
        const eurcContract = new Contract(
          '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
          ["function balanceOf(address account) view returns (uint256)"],
          globalRpcProvider
        );
        const eurcBalance = await eurcContract.balanceOf(connectedAccount);
        eurcVal = parseFloat(formatUnits(eurcBalance, 6)).toFixed(4);
      } catch (err) {
        console.warn("EURC fallback query failed:", err);
      }
    }

    setBalances({ usdc: usdcVal, eurc: eurcVal });
    setIsFetchingBalances(false);
  };

  useEffect(() => {
    if (connectedAccount) {
      fetchBalances();
      fetchExchangeRate();
    }
  }, [connectedAccount, activeTab]);

  const displayUsdc = parseFloat(balances.usdc).toFixed(4);
  const displayEurc = parseFloat(balances.eurc).toFixed(4);

  const tokenInLabel = isReversed ? 'EURC' : 'USDC';
  const tokenOutLabel = isReversed ? 'USDC' : 'EURC';
  const exchangeRate = isReversed ? (1 / realExchangeRate) : realExchangeRate;
  const receiveAmount = swapAmount && !isNaN(Number(swapAmount))
    ? (Number(swapAmount) * exchangeRate).toFixed(4)
    : '0.0000';

  const handleAction = async () => {
    setResult(null);
    setStatusMsg('');

    const eth = getProvider();
    if (!eth) {
      setStatusMsg('❌ MetaMask not detected. Please install MetaMask.');
      return;
    }

    if (!connectedAccount) {
      setStatusMsg('⚠️ Please connect your wallet using the button in the top-right corner first.');
      return;
    }

    setIsProcessing(true);
    try {
      const from = connectedAccount;

      // Step 1: Switch to Arc Testnet
      setStatusMsg('🔄 Switching to Build on Arc...');
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CHAIN_ID }],
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          setStatusMsg('➕ Adding Build on Arc to MetaMask...');
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [ARC_CHAIN_PARAMS],
          });
        } else {
          throw new Error(`Chain switch failed: ${switchErr.message}`);
        }
      }

      // Check if this is a Swap or a Bridge action
      if (activeTab === 'swap') {
        const finalRecipient = from;
        const swap = await executeArcSwap(eth, swapAmount, isReversed ? 'EURC' : 'USDC', 50, setStatusMsg);
        const txHash = swap.txHash;
        setStatusMsg(swap.unwrapWarning || 'Swap confirmed on Arc Testnet.');

        const swapResult = {
          status: 'SUCCESS',
          action: 'Swap (UnitFlow V3)',
          transactionHash: txHash,
          from,
          to: finalRecipient,
          value: `${swapAmount} ${tokenInLabel} swapped; see confirmed receipt for output`,
          explorerUrl: `https://testnet.arcscan.app/tx/${txHash}`,
        };

        setResult(JSON.stringify(swapResult, null, 2));

        // Save to history
        saveTransaction({
          id: `tx-${Date.now()}`,
          action: 'Swap',
          amount: swapAmount,
          from,
          to: finalRecipient,
          txHash,
          status: 'COMPLETE',
          explorerUrl: swapResult.explorerUrl,
          timestamp: Date.now(),
          tokenSymbol: tokenInLabel
        });

        // Refresh balances
        fetchBalances();
      }

      // Notify other components
      window.dispatchEvent(new Event('swap_executed'));
    } catch (err: any) {
      console.error('Transaction error:', err);
      setStatusMsg(`❌ ${err.message}`);
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel app-kit-panel">
      {isWrongNetwork && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          margin: '0.5rem 1rem 1rem',
          color: '#f87171',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          gap: '1rem'
        }}>
          <span>⚠️ Wallet is connected to a different network. Switch to Build on Arc to view balances.</span>
          <button
            onClick={async () => {
              const eth = getProvider();
              if (eth) {
                await switchOrAddArcNetwork(eth);
                const chainId = await eth.request({ method: 'eth_chainId' });
                setIsWrongNetwork(chainId && chainId.toLowerCase() !== ARC_CHAIN_ID.toLowerCase());
                fetchBalances();
              }
            }}
            style={{
              background: '#ef4444',
              border: 'none',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Switch Network
          </button>
        </div>
      )}
      <div className="app-kit-content">
        <>
            {/* Wallet indicator — read-only, controlled from header */}
            <div className="wallet-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {connectedAccount ? (
                <span className="wallet-connected">
                  🟢 {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
                </span>
              ) : (
                <span style={{ color: '#f87171', fontSize: '0.8rem' }}>
                  ⚠️ Wallet not connected — use the button in the top-right corner
                </span>
              )}

              {activeTab === 'swap' && connectedAccount && (
                <button
                  onClick={fetchBalances}
                  disabled={isFetchingBalances}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Refresh Balance"
                >
                  <RefreshCw size={12} className={isFetchingBalances ? "spin-rotation" : ""} />
                  {isFetchingBalances ? 'Refreshing...' : 'Refresh Balance'}
                </button>
              )}
            </div>



            {/* Token Balances Display */}
            {activeTab === 'swap' && connectedAccount && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.75rem',
                padding: '0 0.2rem',
                fontWeight: 500
              }}>
                <span>USDC Balance: <strong style={{ color: 'var(--text-primary)' }}>{displayUsdc} USDC</strong></span>
                <span>EURC Balance: <strong style={{ color: 'var(--text-primary)' }}>{displayEurc} EURC</strong></span>
              </div>
            )}

            {/* Input Amount / Token In */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Amount (Pay {activeTab === 'swap' ? tokenInLabel : 'USDC'})</span>
                {activeTab === 'swap' && connectedAccount && (
                  <button
                    type="button"
                    onClick={() => setSwapAmount(isReversed ? displayEurc : displayUsdc)}
                    style={{
                      background: 'rgba(14, 165, 233, 0.1)',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      borderRadius: '6px',
                      color: '#0ea5e9',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#0ea5e9';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)';
                      e.currentTarget.style.color = '#0ea5e9';
                    }}
                  >
                    Max: {isReversed ? displayEurc : displayUsdc}
                  </button>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  className="kit-input"
                  style={{ paddingRight: '5.5rem' }}
                  disabled={isProcessing}
                />
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  color: '#0ea5e9',
                  backgroundColor: 'rgba(14, 165, 233, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>{activeTab === 'swap' ? tokenInLabel : 'USDC'}</span>
              </div>
            </div>

            {/* Switch button */}
            {activeTab === 'swap' && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <button 
                  onClick={() => setIsReversed(!isReversed)}
                  className="swap-switch-btn"
                  title="Switch direction"
                  type="button"
                  style={{
                    background: 'var(--bg-card)',
                    border: '2px solid var(--border-color)',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#0ea5e9',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 10,
                    padding: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'rotate(180deg) scale(1.1)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = '#0ea5e9';
                    e.currentTarget.style.borderColor = '#0ea5e9';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                    e.currentTarget.style.color = '#0ea5e9';
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <ArrowUpDown size={18} />
                </button>
              </div>
            )}

            {/* To Token / Output Display */}
            {activeTab === 'swap' ? (
              <div className="input-group">
                <label className="input-label">You Receive (Estimated)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={receiveAmount}
                    className="kit-input"
                    style={{ paddingRight: '5.5rem', cursor: 'not-allowed' }}
                    readOnly
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: '#0d9488',
                    backgroundColor: 'rgba(13, 148, 136, 0.1)',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}>{tokenOutLabel}</span>
                </div>
              </div>
            ) : (
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>
                    To Chain
                  </label>
                </div>
                <div className="kit-display">
                  Ethereum Sepolia
                </div>
              </div>
            )}

            {/* Exchange Rate Info */}
            {activeTab === 'swap' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
                marginTop: '0.5rem',
                marginBottom: '1rem',
                padding: '0 0.2rem',
                fontWeight: 500
              }}>
                <span>Exchange Rate:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>1 {tokenInLabel} ≈ {exchangeRate.toFixed(4)} {tokenOutLabel}</span>
              </div>
            )}



            {statusMsg && (
              <div className="status-message" style={{ whiteSpace: 'pre-line' }}>{statusMsg}</div>
            )}

            <button
              onClick={handleAction}
              disabled={isProcessing || !connectedAccount}
              className="kit-action-btn"
            >
              {isProcessing
                ? 'Processing...'
                : connectedAccount
                  ? 'Execute Swap on Arc'
                  : 'Connect Wallet First'}
            </button>

            {result && (
              <div className="kit-result">
                <pre>{result}</pre>
                {(() => {
                  try {
                    const parsed = JSON.parse(result);
                    if (parsed.explorerUrl) {
                      return (
                        <a
                          href={parsed.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="explorer-link"
                        >
                          🔍 View on ArcScan
                        </a>
                      );
                    }
                  } catch { }
                  return null;
                })()}
              </div>
            )}
          </>
      </div>
    </div>
  );
};
