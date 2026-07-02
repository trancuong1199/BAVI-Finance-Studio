import React, { useState, useEffect } from 'react';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { AgenticJobs } from './AgenticJobs';
import { CircleIntegration } from './CircleIntegration';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { saveTransaction } from '../lib/TransactionHistory';
import { JsonRpcProvider, Contract, formatUnits, Interface } from 'ethers';

const ROUTER_ADDRESS = '0x509cF58CdA08C7aee83a2BdBb4A1Eac907343D01';
const WUSDC_ADDRESS = '0x911b4000D3422F482F4062a913885f7b035382Df';
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

const ERC20_INTERFACE = new Interface([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
]);

const WUSDC_INTERFACE = new Interface([
  "function deposit() payable",
  "function withdraw(uint256 amount)"
]);

const ROUTER_INTERFACE = new Interface([
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "address", "name": "recipient", "type": "address" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
]);

const ARC_CHAIN_ID = '0x4CEF52'; // 5042002 in hex
const ARC_CHAIN_PARAMS = {
  chainId: ARC_CHAIN_ID,
  chainName: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
};

interface ArcAppKitProps {
  connectedAccount: string | null;
  getProvider: () => any;
}

export const ArcAppKit: React.FC<ArcAppKitProps> = ({ connectedAccount, getProvider }) => {
  const [activeTab, setActiveTab] = useState<'swap' | 'bridge' | 'jobs' | 'circle'>('swap');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [swapAmount, setSwapAmount] = useState('1.00');
  const [recipient, setRecipient] = useState('');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isReversed, setIsReversed] = useState(false);

  // USDC <➔ EURC Exchange and Balance states
  const [balances, setBalances] = useState<{ usdc: string; eurc: string }>({ usdc: '0.0000', eurc: '0.0000' });
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [realExchangeRate, setRealExchangeRate] = useState<number>(0.6727); // 1 USDC ≈ 0.6727 EURC on-chain V3 pool

  const fetchExchangeRate = async () => {
    try {
      const provider = new JsonRpcProvider('https://rpc.testnet.arc.network');
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
    try {
      const provider = new JsonRpcProvider('https://rpc.testnet.arc.network');
      
      // Native USDC (18 decimals)
      const nativeBalance = await provider.getBalance(connectedAccount);
      const usdcVal = parseFloat(formatUnits(nativeBalance, 18)).toFixed(4);

      // ERC20 EURC (6 decimals)
      const eurcContract = new Contract(
        '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
        ["function balanceOf(address account) view returns (uint256)"],
        provider
      );
      const eurcBalance = await eurcContract.balanceOf(connectedAccount);
      const eurcVal = parseFloat(formatUnits(eurcBalance, 6)).toFixed(4);

      setBalances({ usdc: usdcVal, eurc: eurcVal });
    } catch (e) {
      console.warn("Failed to fetch stablecoin balances:", e);
    } finally {
      setIsFetchingBalances(false);
    }
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
      setStatusMsg('🔄 Switching to Arc Testnet...');
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CHAIN_ID }],
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          setStatusMsg('➕ Adding Arc Testnet to MetaMask...');
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
        const finalRecipient = recipient.trim() || from;

        // --- LIVE WALLET SWAP LOGIC ---
        const provider = new JsonRpcProvider('https://rpc.testnet.arc.network');
        const valueIn = parseFloat(swapAmount);
        
        // Balance check
        const balanceLimit = isReversed ? parseFloat(displayEurc) : parseFloat(displayUsdc);
        if (valueIn > balanceLimit) {
          throw new Error(`Insufficient balance. You need at least ${swapAmount} ${tokenInLabel} but have ${balanceLimit} ${tokenInLabel}`);
        }

        let txHash;

        if (!isReversed) {
          // USDC (native gas, 18 decimals) -> EURC (ERC20, 6 decimals)
          // 1. Wrap USDC to WUSDC
          setStatusMsg('🔌 Step 1/3: Wrapping USDC to WUSDC in your wallet...');
          const amountWei = BigInt(Math.floor(valueIn * 1e18));
          
          const depositData = WUSDC_INTERFACE.encodeFunctionData('deposit', []);
          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: WUSDC_ADDRESS,
              value: '0x' + amountWei.toString(16),
              data: depositData,
            }],
          });

          setStatusMsg('⏳ Confirming wrap transaction on Arc scan...');
          let receipt = null;
          while (!receipt) {
            await new Promise(r => setTimeout(r, 2000));
            receipt = await provider.getTransactionReceipt(txHash);
          }

          // 2. Check WUSDC Router Allowance
          setStatusMsg('🔌 Step 2/3: Checking/Approving UnitFlow V3 Router...');
          const wusdcContract = new Contract(WUSDC_ADDRESS, ["function allowance(address owner, address spender) view returns (uint256)"], provider);
          const allowance = await wusdcContract.allowance(from, ROUTER_ADDRESS);
          
          if (BigInt(allowance) < amountWei) {
            const approveData = ERC20_INTERFACE.encodeFunctionData('approve', [ROUTER_ADDRESS, BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')]);
            const approveTx = await eth.request({
              method: 'eth_sendTransaction',
              params: [{
                from,
                to: WUSDC_ADDRESS,
                value: '0x0',
                data: approveData,
              }],
            });

            setStatusMsg('⏳ Confirming approve transaction on Arc scan...');
            let approveReceipt = null;
            while (!approveReceipt) {
              await new Promise(r => setTimeout(r, 2000));
              approveReceipt = await provider.getTransactionReceipt(approveTx);
            }
          }

          // 3. Swap WUSDC -> EURC on UnitFlow V3 Router
          setStatusMsg('🔌 Step 3/3: Executing Swap WUSDC ➔ EURC on UnitFlow V3 Router...');
          const params = {
            tokenIn: WUSDC_ADDRESS,
            tokenOut: EURC_ADDRESS,
            fee: 100, // 0.01%
            recipient: finalRecipient,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
            amountIn: amountWei,
            amountOutMinimum: 0n,
            sqrtPriceLimitX96: 0n
          };

          const swapData = ROUTER_INTERFACE.encodeFunctionData('exactInputSingle', [params]);
          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: ROUTER_ADDRESS,
              value: '0x0',
              data: swapData,
            }],
          });

          setStatusMsg('✅ Swap transaction submitted on Arc Testnet!');

        } else {
          // EURC (ERC-20, 6 decimals) -> USDC (native gas, 18 decimals)
          // 1. Approve EURC to Router
          setStatusMsg('🔌 Step 1/3: Checking/Approving EURC to UnitFlow V3 Router...');
          const amountWei = BigInt(Math.floor(valueIn * 1e6));
          const eurcContract = new Contract(EURC_ADDRESS, ["function allowance(address owner, address spender) view returns (uint256)"], provider);
          const allowance = await eurcContract.allowance(from, ROUTER_ADDRESS);

          if (BigInt(allowance) < amountWei) {
            const approveData = ERC20_INTERFACE.encodeFunctionData('approve', [ROUTER_ADDRESS, BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')]);
            const approveTx = await eth.request({
              method: 'eth_sendTransaction',
              params: [{
                from,
                to: EURC_ADDRESS,
                value: '0x0',
                data: approveData,
              }],
            });

            setStatusMsg('⏳ Confirming approve transaction on Arc scan...');
            let approveReceipt = null;
            while (!approveReceipt) {
              await new Promise(r => setTimeout(r, 2000));
              approveReceipt = await provider.getTransactionReceipt(approveTx);
            }
          }

          // 2. Swap EURC -> WUSDC to user address
          setStatusMsg('🔌 Step 2/3: Executing Swap EURC ➔ WUSDC on UnitFlow V3 Router...');
          const params = {
            tokenIn: EURC_ADDRESS,
            tokenOut: WUSDC_ADDRESS,
            fee: 100, // 0.01%
            recipient: from, // must be the user to unwrap WUSDC next
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
            amountIn: amountWei,
            amountOutMinimum: 0n,
            sqrtPriceLimitX96: 0n
          };

          const swapData = ROUTER_INTERFACE.encodeFunctionData('exactInputSingle', [params]);
          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: ROUTER_ADDRESS,
              value: '0x0',
              data: swapData,
            }],
          });

          setStatusMsg('⏳ Confirming Swap transaction on Arc scan...');
          let receipt = null;
          while (!receipt) {
            await new Promise(r => setTimeout(r, 2000));
            receipt = await provider.getTransactionReceipt(txHash);
          }

          // 3. Unwrap WUSDC to native USDC
          setStatusMsg('🔌 Step 3/3: Unwrapping WUSDC to native USDC...');
          const wusdcContract = new Contract(WUSDC_ADDRESS, ["function balanceOf(address account) view returns (uint256)"], provider);
          const wusdcBalance = await wusdcContract.balanceOf(from);
          
          if (BigInt(wusdcBalance) > 0n) {
            const withdrawData = WUSDC_INTERFACE.encodeFunctionData('withdraw', [wusdcBalance]);
            const withdrawTx = await eth.request({
              method: 'eth_sendTransaction',
              params: [{
                from,
                to: WUSDC_ADDRESS,
                value: '0x0',
                data: withdrawData,
              }],
            });

            setStatusMsg('✅ Unwrap transaction submitted on Arc Testnet!');
            txHash = withdrawTx;
          } else {
            setStatusMsg('✅ Swap complete! (No WUSDC balance to unwrap)');
          }
        }

        const swapResult = {
          status: 'SUCCESS',
          action: 'Swap (UnitFlow V3)',
          transactionHash: txHash,
          from,
          to: finalRecipient,
          value: `${swapAmount} ${tokenInLabel} ➔ ${receiveAmount} ${tokenOutLabel}`,
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

      } else if (activeTab === 'bridge') {
        // --- CCTP BRIDGE LOGIC ---
        setStatusMsg('🔄 Initializing Bridge Kit...');
        const kit = new BridgeKit();

        // Ensure viem adapter connects to user's injected provider (EIP-1193)
        const adapter = await createViemAdapterFromProvider({ provider: eth });

        const finalRecipient = recipient.trim() || from;

        setStatusMsg('📤 Estimating & Preparing Bridge Transaction...');
        // Bridge Kit expects amount in decimal format (e.g. "1.50")
        const amountString = Number(swapAmount).toFixed(2);

        // Execute bridge transfer with automatic forwarding
        // Note: from chain is Arc_Testnet, to chain is Ethereum_Sepolia (default destination in this UI)
        try {
          const resultObj = await kit.bridge({
            from: {
              adapter,
              chain: 'Arc_Testnet'
            },
            to: {
              adapter,
              chain: 'Ethereum_Sepolia',
              recipientAddress: finalRecipient,
              useForwarder: true // Enable Circle Forwarding Service for automatic attestation and minting
            },
            amount: amountString,
            config: {
              transferSpeed: 'FAST'
            }
          });

          setStatusMsg('✅ Bridge Transaction executed successfully!');

          let txHash = '';
          if (resultObj.steps && Array.isArray(resultObj.steps)) {
            const burnStep = resultObj.steps.find((s: any) => s.name === 'burn');
            if (burnStep?.txHash) {
              txHash = burnStep.txHash;
            }
          }

          const bridgeResult = {
            status: resultObj.state === 'success' ? 'COMPLETE' : 'PENDING',
            action: 'Bridge (CCTP)',
            transactionHash: txHash,
            from,
            to: finalRecipient,
            value: `${swapAmount} USDC`,
            explorerUrl: `https://testnet.arcscan.app/tx/${txHash}`,
            bridgeDetails: resultObj
          };

          setResult(JSON.stringify(bridgeResult, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

          // Save to history
          saveTransaction({
            id: `tx-${Date.now()}`,
            action: 'Bridge (CCTP)',
            amount: swapAmount,
            from,
            to: finalRecipient,
            txHash,
            status: resultObj.state === 'success' ? 'COMPLETE' : 'PENDING',
            explorerUrl: bridgeResult.explorerUrl,
            timestamp: Date.now(),
            tokenSymbol: 'USDC'
          });

        } catch (bridgeErr: any) {
          console.error("Bridge Kit error:", bridgeErr);

          let errorReason = bridgeErr.message;
          if (bridgeErr.code === 9002 || bridgeErr.type === 'BALANCE') {
            errorReason = "Insufficient native gas token (USDC) on Arc Testnet.";
          }

          throw new Error(errorReason);
        }
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
      <div className="app-kit-tabs">
        <button
          className={`app-kit-tab ${activeTab === 'swap' ? 'active' : ''}`}
          onClick={() => setActiveTab('swap')}
        >
          Swap natively
        </button>
        <button
          className={`app-kit-tab ${activeTab === 'bridge' ? 'active' : ''}`}
          onClick={() => setActiveTab('bridge')}
        >
          Bridge (CCTP)
        </button>
        <button
          className={`app-kit-tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Agentic Jobs
        </button>
        <button
          className={`app-kit-tab ${activeTab === 'circle' ? 'active' : ''}`}
          onClick={() => setActiveTab('circle')}
        >
          Circle AppKit
        </button>
      </div>

      <div className="app-kit-content">
        {activeTab === 'jobs' ? (
          <AgenticJobs connectedAccount={connectedAccount} getProvider={getProvider} />
        ) : activeTab === 'circle' ? (
          <CircleIntegration connectedAccount={connectedAccount} getProvider={getProvider} />
        ) : (
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
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.55)',
                marginBottom: '0.75rem',
                padding: '0 0.2rem'
              }}>
                <span>USDC Balance: <strong style={{ color: '#fff' }}>{displayUsdc} USDC</strong></span>
                <span>EURC Balance: <strong style={{ color: '#fff' }}>{displayEurc} EURC</strong></span>
              </div>
            )}

            {/* Input Amount / Token In */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Amount (Pay {activeTab === 'swap' ? tokenInLabel : 'USDC'})</span>
                {activeTab === 'swap' && connectedAccount && (
                  <button
                    type="button"
                    onClick={() => setSwapAmount(isReversed ? displayEurc : displayUsdc)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      userSelect: 'none'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.color = '#60a5fa';
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
                  style={{ paddingRight: '4.5rem' }}
                  disabled={isProcessing}
                />
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  fontSize: '0.9rem'
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
                    background: '#1e293b',
                    border: '2px solid #3b82f6',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#60a5fa',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.2s',
                    zIndex: 10,
                    padding: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = '#60a5fa';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.color = '#60a5fa';
                    e.currentTarget.style.borderColor = '#3b82f6';
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
                    style={{ paddingRight: '4.5rem', background: 'rgba(0,0,0,0.15)', cursor: 'not-allowed' }}
                    readOnly
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 600,
                    color: 'var(--color-secondary)',
                    fontSize: '0.9rem'
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
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.45)',
                marginTop: '0.5rem',
                marginBottom: '1rem',
                padding: '0 0.2rem'
              }}>
                <span>Exchange Rate:</span>
                <span>1 {tokenInLabel} ≈ {exchangeRate.toFixed(4)} {tokenOutLabel}</span>
              </div>
            )}

            {/* Recipient Address (only for Bridge) */}
            {activeTab === 'bridge' && (
              <div className="input-group" style={{ marginTop: '0.5rem' }}>
                <label className="input-label">Recipient Address (Optional)</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x... (Leave empty to send to yourself)"
                  className="kit-input"
                />
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
                  ? (activeTab === 'swap'
                      ? 'Execute Swap on Arc'
                      : 'Execute Bridge')
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
        )}
      </div>
    </div>
  );
};
