import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { AgenticJobs } from './AgenticJobs';
import { CircleIntegration } from './CircleIntegration';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { saveTransaction } from '../lib/TransactionHistory';
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
        // --- SWAP LOGIC ---
        setStatusMsg('📤 Please confirm the Swap transaction in your wallet...');

        const finalRecipient = recipient.trim() || from;
        let txHash;

        if (isReversed) {
          // EURC is an ERC-20 token on Arc Testnet with 6 decimals
          const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
          let data = '0x';
          
          if (swapAmount && !isNaN(Number(swapAmount))) {
            const amountWei = BigInt(Math.floor(Number(swapAmount) * 1e6));
            // Manual ABI encoding for transfer(address,uint256) (selector: 0xa9059cbb)
            const toAddress = finalRecipient.toLowerCase().replace('0x', '').padStart(64, '0');
            const valuePadded = amountWei.toString(16).padStart(64, '0');
            data = '0xa9059cbb' + toAddress + valuePadded;
          }

          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: EURC_ADDRESS,
              value: '0x0',
              data,
            }],
          });
        } else {
          // Native USDC is the gas token on Arc Testnet with 18 decimals
          let valueHex = '0x0';
          if (swapAmount && !isNaN(Number(swapAmount))) {
            const amountWei = BigInt(Math.floor(Number(swapAmount) * 1e18));
            valueHex = '0x' + amountWei.toString(16);
          }

          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [{
              from,
              to: finalRecipient,
              value: valueHex,
              data: '0x',
            }],
          });
        }

        setStatusMsg('✅ Swap Transaction submitted!');
        const swapResult = {
          status: 'SUCCESS',
          action: 'Swap (Arc Testnet)',
          transactionHash: txHash,
          from,
          to: finalRecipient,
          value: `${swapAmount} ${isReversed ? 'EURC' : 'USDC'}`,
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
          tokenSymbol: isReversed ? 'EURC' : 'USDC'
        });

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
            <div className="wallet-status-bar">
              {connectedAccount ? (
                <span className="wallet-connected">
                  🟢 {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
                </span>
              ) : (
                <span style={{ color: '#f87171', fontSize: '0.8rem' }}>
                  ⚠️ Wallet not connected — use the button in the top-right corner
                </span>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">
                Amount ({activeTab === 'swap' ? (isReversed ? 'EURC' : 'USDC') : 'USDC'})
              </label>
              <input
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                className="kit-input"
              />
            </div>

            {activeTab === 'swap' && (
              <button 
                onClick={() => setIsReversed(!isReversed)}
                className="swap-switch-btn"
                title="Switch direction"
              >
                <ArrowUpDown size={20} />
              </button>
            )}

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>
                  {activeTab === 'swap' ? 'To Token' : 'To Chain'}
                </label>
              </div>
              <div className="kit-display">
                {activeTab === 'swap' ? (isReversed ? 'USDC' : 'EURC') : 'Ethereum Sepolia'}
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label className="input-label">Recipient Address (Optional)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x... (Leave empty to send to yourself)"
                className="kit-input"
              />
            </div>

            {statusMsg && (
              <div className="status-message">{statusMsg}</div>
            )}

            <button
              onClick={handleAction}
              disabled={isProcessing || !connectedAccount}
              className="kit-action-btn"
            >
              {isProcessing
                ? 'Processing...'
                : connectedAccount
                  ? (activeTab === 'swap' ? 'Execute Swap' : 'Execute Bridge')
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
