import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, formatUnits, Interface } from 'ethers';
import { getTransactionHistory, saveTransaction } from '../lib/TransactionHistory';
import type { Transaction } from '../lib/TransactionHistory';
import { ArrowUpDown, ChevronDown, RefreshCw, Send, ArrowDown, Code2, FileText } from 'lucide-react';
import { switchOrAddArcNetwork, globalRpcProvider } from '../utils/arcChain';

interface RightSidebarProps {
  connectedAccount: string | null;
  getProvider: () => any;
  navigateTo: (view: any) => void;
}

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

const DECIMALS = {
  USDC: 18,
  EURC: 6,
  cirBTC: 8
};
const ADDRESSES = {
  USDC: '0x911b4000D3422F482F4062a913885f7b035382Df', // WUSDC
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  cirBTC: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF'
};
const TOKEN_PRICES: Record<string, number> = {
  USDC: 1.0,
  EURC: 1.08,
  cirBTC: 60000.0
};

const ARC_CHAIN_ID = '0x4CEF52';

export const RightSidebar: React.FC<RightSidebarProps> = ({ connectedAccount, getProvider, navigateTo }) => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [swapAmount, setSwapAmount] = useState('100');
  const [tokenIn, setTokenIn] = useState<'USDC' | 'EURC' | 'cirBTC'>('USDC');
  const [tokenOut, setTokenOut] = useState<'USDC' | 'EURC' | 'cirBTC'>('EURC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isDropdownInOpen, setIsDropdownInOpen] = useState(false);
  const [isDropdownOutOpen, setIsDropdownOutOpen] = useState(false);
  const [balances, setBalances] = useState({ usdc: '0.00', eurc: '0.00', cirbtc: '0.0000' });

  const fetchTxs = useCallback(() => {
    const history = getTransactionHistory();
    setTxs(history.slice(0, 5));
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!connectedAccount) return;
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
      } catch (e) {}

      // USDC Native Gas Balance
      const nativeBalance = await provider.getBalance(connectedAccount);
      const usdcVal = parseFloat(formatUnits(nativeBalance, 18)).toFixed(2);

      // EURC Balance
      const eurcContract = new Contract(EURC_ADDRESS, ERC20_INTERFACE, provider);
      const eurcBalance = await eurcContract.balanceOf(connectedAccount);
      const eurcVal = parseFloat(formatUnits(eurcBalance, 6)).toFixed(2);

      // cirBTC Balance
      const cirbtcContract = new Contract(ADDRESSES.cirBTC, ERC20_INTERFACE, provider);
      const cirbtcBalance = await cirbtcContract.balanceOf(connectedAccount);
      const cirbtcVal = parseFloat(formatUnits(cirbtcBalance, 8)).toFixed(4);

      setBalances({ usdc: usdcVal, eurc: eurcVal, cirbtc: cirbtcVal });
    } catch (e) {
      console.warn("Failed to fetch balances for RightSidebar", e);
    }
  }, [connectedAccount, getProvider]);

  useEffect(() => {
    fetchTxs();
    fetchBalances();
    window.addEventListener('transaction_history_updated', fetchTxs);
    window.addEventListener('swap_executed', fetchBalances);
    return () => {
      window.removeEventListener('transaction_history_updated', fetchTxs);
      window.removeEventListener('swap_executed', fetchBalances);
    };
  }, [connectedAccount, fetchTxs, fetchBalances]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.token-dropdown-container')) {
        setIsDropdownInOpen(false);
        setIsDropdownOutOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const displayInBalance = tokenIn === 'USDC' ? balances.usdc : tokenIn === 'EURC' ? balances.eurc : balances.cirbtc;
  const displayOutBalance = tokenOut === 'USDC' ? balances.usdc : tokenOut === 'EURC' ? balances.eurc : balances.cirbtc;
  const exchangeRate = TOKEN_PRICES[tokenIn] / TOKEN_PRICES[tokenOut];

  const receiveAmount = swapAmount && !isNaN(Number(swapAmount))
    ? (Number(swapAmount) * exchangeRate).toFixed(tokenOut === 'cirBTC' ? 8 : 4)
    : '0.00';

  const handleSwap = async () => {
    setStatusMsg('');
    const eth = getProvider();
    if (!eth || !connectedAccount) {
      setStatusMsg('⚠️ Please connect wallet first');
      return;
    }

    setIsProcessing(true);
    try {
      const from = connectedAccount;

      // 1. Switch Network
      setStatusMsg('Switching to Build on Arc...');
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CHAIN_ID }],
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await switchOrAddArcNetwork(eth);
        } else {
          throw switchErr;
        }
      }

      const provider = new BrowserProvider(eth);
      const valueIn = parseFloat(swapAmount);
      const decimalsIn = DECIMALS[tokenIn];
      const amountWei = BigInt(Math.floor(valueIn * Math.pow(10, decimalsIn)));

      let txHash;
      if (tokenIn === 'USDC') {
        // Wrap native USDC to WUSDC
        setStatusMsg('Step 1/3: Wrapping USDC...');
        const wrapTxHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: WUSDC_ADDRESS,
            value: '0x' + amountWei.toString(16),
            data: WUSDC_INTERFACE.encodeFunctionData('deposit', [])
          }],
        });
        
        let receipt = null;
        while (!receipt) {
          await new Promise(r => setTimeout(r, 2000));
          receipt = await provider.getTransactionReceipt(wrapTxHash);
        }

        // Approve router for WUSDC
        setStatusMsg('Step 2/3: Approving Router...');
        const wusdcContract = new Contract(WUSDC_ADDRESS, ERC20_INTERFACE, provider);
        const allowance = await wusdcContract.allowance(from, ROUTER_ADDRESS);

        if (BigInt(allowance) < amountWei) {
          const approveTxHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: WUSDC_ADDRESS,
              value: '0x0',
              data: ERC20_INTERFACE.encodeFunctionData('approve', [ROUTER_ADDRESS, BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')])
            }]
          });

          let approveReceipt = null;
          while (!approveReceipt) {
            await new Promise(r => setTimeout(r, 2000));
            approveReceipt = await provider.getTransactionReceipt(approveTxHash);
          }
        }
      } else {
        // Approve router for ERC20 tokenIn (EURC or cirBTC)
        const tokenInAddress = ADDRESSES[tokenIn];
        setStatusMsg(`Step 1/2: Approving ${tokenIn}...`);
        const tokenInContract = new Contract(tokenInAddress, ERC20_INTERFACE, provider);
        const allowance = await tokenInContract.allowance(from, ROUTER_ADDRESS);

        if (BigInt(allowance) < amountWei) {
          const approveTxHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: tokenInAddress,
              value: '0x0',
              data: ERC20_INTERFACE.encodeFunctionData('approve', [ROUTER_ADDRESS, BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')])
            }]
          });

          let approveReceipt = null;
          while (!approveReceipt) {
            await new Promise(r => setTimeout(r, 2000));
            approveReceipt = await provider.getTransactionReceipt(approveTxHash);
          }
        }
      }

      // Execute Swap exactInputSingle
      const inTokenAddress = tokenIn === 'USDC' ? WUSDC_ADDRESS : ADDRESSES[tokenIn];
      const outTokenAddress = tokenOut === 'USDC' ? WUSDC_ADDRESS : ADDRESSES[tokenOut];
      
      setStatusMsg(`Executing Swap ${tokenIn} ➔ ${tokenOut}...`);
      const params = {
        tokenIn: inTokenAddress,
        tokenOut: outTokenAddress,
        fee: 100,
        recipient: from,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        amountIn: amountWei,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n
      };

      txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: ROUTER_ADDRESS,
          value: '0x0',
          data: ROUTER_INTERFACE.encodeFunctionData('exactInputSingle', [params])
        }]
      });

      if (tokenOut === 'USDC') {
        let receipt = null;
        while (!receipt) {
          await new Promise(r => setTimeout(r, 2000));
          receipt = await provider.getTransactionReceipt(txHash);
        }

        // Unwrap WUSDC to native USDC
        setStatusMsg('Unwrapping WUSDC...');
        const wusdcContract = new Contract(WUSDC_ADDRESS, ERC20_INTERFACE, provider);
        const wusdcBal = await wusdcContract.balanceOf(from);
        
        if (BigInt(wusdcBal) > 0n) {
          const unwrapTxHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: WUSDC_ADDRESS,
              value: '0x0',
              data: WUSDC_INTERFACE.encodeFunctionData('withdraw', [wusdcBal])
            }]
          });
          txHash = unwrapTxHash;
        }
      }

      setStatusMsg('✅ Swap Complete!');

      // Save transaction
      saveTransaction({
        id: `swap-${Date.now()}`,
        action: 'Swap (UnitFlow V3)',
        amount: swapAmount,
        from,
        to: from,
        txHash,
        status: 'COMPLETE',
        explorerUrl: `https://testnet.arcscan.app/tx/${txHash}`,
        timestamp: Date.now(),
        tokenSymbol: tokenIn
      });

      // Dispatch event
      window.dispatchEvent(new Event('swap_executed'));
      fetchBalances();

    } catch (e: any) {
      console.error(e);
      setStatusMsg(`❌ Swap Failed: ${e.message || e.toString()}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <aside className="right-sidebar" style={{ width: '310px', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0, height: 'fit-content', position: 'sticky', top: 0 }}>
      
      {/* Swap Card Widget */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Swap</h3>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
          
          {/* Pay Input */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '16px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>You Pay</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="number"
                value={swapAmount}
                onChange={e => setSwapAmount(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', width: '50%' }}
                disabled={isProcessing}
              />
              <div className="token-dropdown-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => {
                      setIsDropdownInOpen(!isDropdownInOpen);
                      setIsDropdownOutOpen(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}
                  >
                    <span>{tokenIn === 'USDC' ? '🪙' : tokenIn === 'EURC' ? '💶' : '₿'}</span>
                    <span>{tokenIn}</span>
                    <ChevronDown size={12} />
                  </div>
                  {isDropdownInOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-card)',
                      zIndex: 100,
                      minWidth: '105px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {(['USDC', 'EURC', 'cirBTC'] as const).map((token) => (
                        <div
                          key={token}
                          onClick={() => {
                            setTokenIn(token);
                            setIsDropdownInOpen(false);
                            if (token === tokenOut) {
                              setTokenOut(token === 'USDC' ? 'EURC' : 'USDC');
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: token === tokenIn ? 'var(--bg-tertiary)' : 'transparent',
                          }}
                          className="token-dropdown-item"
                        >
                          <span>{token === 'USDC' ? '🪙' : token === 'EURC' ? '💶' : '₿'}</span>
                          <span>{token}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Balance: {displayInBalance}</span>
              </div>
            </div>
          </div>

          {/* Switch arrows */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 5 }}>
            <button
              onClick={() => {
                const temp = tokenIn;
                setTokenIn(tokenOut);
                setTokenOut(temp);
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <ArrowUpDown size={14} color="var(--color-primary)" />
            </button>
          </div>

          {/* Receive Input */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '16px', padding: '0.75rem 1rem', marginTop: '0.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>You Receive (Estimated)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input
                type="text"
                value={receiveAmount}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', width: '50%' }}
                readOnly
              />
              <div className="token-dropdown-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => {
                      setIsDropdownOutOpen(!isDropdownOutOpen);
                      setIsDropdownInOpen(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}
                  >
                    <span>{tokenOut === 'USDC' ? '🪙' : tokenOut === 'EURC' ? '💶' : '₿'}</span>
                    <span>{tokenOut}</span>
                    <ChevronDown size={12} />
                  </div>
                  {isDropdownOutOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-card)',
                      zIndex: 100,
                      minWidth: '105px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {(['USDC', 'EURC', 'cirBTC'] as const).map((token) => (
                        <div
                          key={token}
                          onClick={() => {
                            setTokenOut(token);
                            setIsDropdownOutOpen(false);
                            if (token === tokenIn) {
                              setTokenIn(token === 'USDC' ? 'EURC' : 'USDC');
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: token === tokenOut ? 'var(--bg-tertiary)' : 'transparent',
                          }}
                          className="token-dropdown-item"
                        >
                          <span>{token === 'USDC' ? '🪙' : token === 'EURC' ? '💶' : '₿'}</span>
                          <span>{token}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Balance: {displayOutBalance}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Rate</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>1 {tokenIn} = {exchangeRate.toFixed(tokenOut === 'cirBTC' ? 8 : 4)} {tokenOut}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Network Fee</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>~$0.08</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Slippage Tolerance</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>0.50% ✏️</span>
          </div>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div style={{ fontSize: '0.8rem', padding: '6px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', marginTop: '8px', textAlign: 'center', fontWeight: 500 }}>
            {statusMsg}
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isProcessing || !connectedAccount}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
            border: 'none',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.975rem',
            padding: '0.75rem',
            borderRadius: '12px',
            cursor: (!connectedAccount || isProcessing) ? 'not-allowed' : 'pointer',
            marginTop: '1rem',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)'
          }}
        >
          {isProcessing ? 'Swapping...' : connectedAccount ? 'Swap Now' : 'Connect Wallet First'}
        </button>

      </div>

      {/* Recent Activity List Widget */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Activity</h3>
          <button onClick={() => navigateTo('analytics')} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}>
            View all
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '320px', overflowY: 'auto' }}>
          {txs.length === 0 ? (
            // Mock Fallback matching mockup
            [
              { type: 'Swap', detail: '100 USDC → 99.2 EURC', time: '2m ago', icon: <RefreshCw size={15} /> },
              { type: 'Payment Sent', detail: '50 USDC to 0x3600...0000', time: '12m ago', icon: <Send size={15} /> },
              { type: 'Deposit', detail: '200 USDC from 0x0000...0000', time: '1h ago', icon: <ArrowDown size={15} /> },
              { type: 'Contract Call', detail: 'Call to 0x7f35...a2b1', time: '2h ago', icon: <Code2 size={15} /> },
              { type: 'Tx Memo Created', detail: 'Payment for invoice #INV-2305', time: '3h ago', icon: <FileText size={15} /> }
            ].map((mock, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)' }}>
                  {mock.icon}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{mock.type}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{mock.time}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mock.detail}</span>
                  <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>Success</span>
                </div>
              </div>
            ))
          ) : (
            txs.map((tx) => (
              <div key={tx.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)' }}>
                  {tx.action.includes('Swap') ? <RefreshCw size={15} /> : tx.action.includes('Memo') ? <FileText size={15} /> : tx.action.includes('Call') ? <Code2 size={15} /> : <Send size={15} />}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.action}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.amount} {tx.tokenSymbol || 'USDC'}</span>
                  <span style={{
                    color: tx.status === 'COMPLETE' ? '#10b981' : tx.status === 'PENDING' ? '#ca8a04' : '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginTop: '2px'
                  }}>{tx.status === 'COMPLETE' ? 'Success' : tx.status === 'PENDING' ? 'Pending...' : 'Failed'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Outline Button */}
        <button
          onClick={() => navigateTo('analytics')}
          style={{
            width: '100%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.885rem',
            padding: '0.6rem',
            borderRadius: '12px',
            cursor: 'pointer',
            marginTop: '0.75rem',
            transition: 'all 0.2s'
          }}
        >
          View All Activity
        </button>

      </div>

    </aside>
  );
};
