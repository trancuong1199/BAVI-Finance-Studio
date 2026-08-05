import React, { useState } from 'react';
import { Send, Zap, Fuel, ExternalLink, CheckCircle2, AlertCircle, QrCode, X, Plus, Trash2, Users, User } from 'lucide-react';
import { BrowserProvider, parseUnits, Contract, isAddress, getAddress } from 'ethers';
import { Scanner } from '@yudiel/react-qr-scanner';
import { saveTransaction } from '../lib/TransactionHistory';

interface PaymentsProps {
  walletProvider: any;
  address: string;
}

const TOKEN_CONFIGS = {
  USDC: {
    symbol: 'USDC',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    isNative: true,
  },
  EURC: {
    symbol: 'EURC',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    decimals: 6,
    isNative: false,
  },
  cirBTC: {
    symbol: 'cirBTC',
    address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF',
    decimals: 8,
    isNative: false,
  }
};

const getFriendlyErrorMessage = (err: any, token: string): string => {
  const errMsg = err.message || '';
  
  if (errMsg.includes('4001') || errMsg.toLowerCase().includes('user rejected') || errMsg.toLowerCase().includes('user denied')) {
    return 'Transaction cancelled. You rejected the transaction in MetaMask.';
  }

  if (errMsg.includes('getEnsAddress') || errMsg.includes('ENS') || errMsg.includes('UNSUPPORTED_OPERATION')) {
    return 'Invalid wallet address. Please check your recipient address format (must start with 0x and be 42 characters long).';
  }
  
  if (errMsg.toLowerCase().includes('transfer amount exceeds balance') || errMsg.toLowerCase().includes('exceeds balance')) {
    return `Insufficient ${token} balance. You do not have enough ${token} in your wallet to complete this transfer.`;
  }
  
  if (errMsg.toLowerCase().includes('insufficient funds') || errMsg.toLowerCase().includes('insufficient_funds')) {
    return `Insufficient USDC gas. Ensure you have enough native USDC in your wallet to cover the transaction value and network fees.`;
  }
  
  if (err.reason) {
    return `Transaction reverted: ${err.reason}`;
  }
  
  return errMsg || `Payment failed. Please ensure you have enough ${token} and native USDC gas, and the recipient address is valid.`;
};

type TokenSymbol = 'USDC' | 'EURC' | 'cirBTC';

interface BatchRecipient {
  id: string;
  address: string;
  amount: string;
}

export const Payments: React.FC<PaymentsProps> = ({ walletProvider, address }) => {
  const [paymentMode, setPaymentMode] = useState<'single' | 'batch'>('single');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('USDC');
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Batch transfer state
  const [batchRecipients, setBatchRecipients] = useState<BatchRecipient[]>([
    { id: '1', address: '', amount: '' },
    { id: '2', address: '', amount: '' }
  ]);
  const [batchSuccessCount, setBatchSuccessCount] = useState(0);

  const handleQRScan = (text: string) => {
    if (text) {
      const address = text.replace(/^ethereum:/i, '');
      setRecipient(address);
      setShowQRScanner(false);
    }
  };

  const addBatchRecipient = () => {
    setBatchRecipients(prev => [
      ...prev,
      { id: Date.now().toString(), address: '', amount: '' }
    ]);
  };

  const removeBatchRecipient = (id: string) => {
    if (batchRecipients.length <= 1) return;
    setBatchRecipients(prev => prev.filter(r => r.id !== id));
  };

  const updateBatchRecipient = (id: string, field: 'address' | 'amount', value: string) => {
    setBatchRecipients(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalBatchAmount = batchRecipients.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletProvider || !address) {
      setError('Please connect your wallet first.');
      return;
    }

    if (paymentMode === 'single') {
      const cleanAddr = recipient.trim();
      if (!cleanAddr || !amount) {
        setError('Please enter a recipient address and amount.');
        return;
      }
      if (!isAddress(cleanAddr)) {
        setError(`Invalid recipient address: "${cleanAddr}". Wallet addresses must start with 0x and be exactly 42 characters long.`);
        return;
      }
    } else {
      const emptyOrInvalid = batchRecipients.find(r => !r.address.trim() || !r.amount || Number(r.amount) <= 0);
      if (emptyOrInvalid) {
        setError('Please fill in valid recipient addresses and amounts for all batch entries.');
        return;
      }
      const invalidAddrRow = batchRecipients.find(r => !isAddress(r.address.trim()));
      if (invalidAddrRow) {
        setError(`Invalid recipient address at #${batchRecipients.indexOf(invalidAddrRow) + 1}: "${invalidAddrRow.address}". EVM wallet addresses must start with 0x and be 42 characters long.`);
        return;
      }
    }

    try {
      setIsSending(true);
      setError('');
      setTxHash('');
      setBatchSuccessCount(0);

      // Ensure user is on Arc Testnet
      const ARC_CHAIN_ID = '0x4CEF52';
      try {
        await walletProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CHAIN_ID }],
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ARC_CHAIN_ID,
              chainName: 'Build on Arc',
              nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
              rpcUrls: ['https://rpc.testnet.arc.network'],
              blockExplorerUrls: ['https://testnet.arcscan.app'],
            }],
          });
        } else if (switchErr.code !== 4001) {
          throw switchErr;
        }
      }

      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const tokenConfig = TOKEN_CONFIGS[selectedToken];

      if (paymentMode === 'single') {
        const formattedAddr = getAddress(recipient.trim());
        const valueInDecimals = parseUnits(amount, tokenConfig.decimals);
        let tx;
        if (tokenConfig.isNative) {
          tx = await signer.sendTransaction({
            to: formattedAddr,
            value: valueInDecimals,
            gasLimit: 21000
          });
        } else {
          const erc20Contract = new Contract(
            tokenConfig.address,
            ["function transfer(address to, uint256 value) returns (bool)"],
            signer
          );
          tx = await erc20Contract.transfer(formattedAddr, valueInDecimals);
        }

        const receipt = await tx.wait();
        if (receipt) {
          setTxHash(receipt.hash);
          saveTransaction({
            id: `tx-${Date.now()}`,
            action: 'P2P Payment',
            amount: amount,
            from: address,
            to: formattedAddr,
            txHash: receipt.hash,
            status: 'COMPLETE',
            explorerUrl: `https://testnet.arcscan.app/tx/${receipt.hash}`,
            timestamp: Date.now(),
            tokenSymbol: selectedToken
          });
        }
      } else {
        // BATCH MODE: Execute transfers sequentially with sub-second finality
        let lastTxHash = '';
        let completed = 0;

        for (let i = 0; i < batchRecipients.length; i++) {
          const item = batchRecipients[i];
          const formattedAddr = getAddress(item.address.trim());
          const valueInDecimals = parseUnits(item.amount, tokenConfig.decimals);

          let tx;
          if (tokenConfig.isNative) {
            tx = await signer.sendTransaction({
              to: formattedAddr,
              value: valueInDecimals,
              gasLimit: 21000
            });
          } else {
            const erc20Contract = new Contract(
              tokenConfig.address,
              ["function transfer(address to, uint256 value) returns (bool)"],
              signer
            );
            tx = await erc20Contract.transfer(formattedAddr, valueInDecimals);
          }

          const receipt = await tx.wait();
          if (receipt) {
            lastTxHash = receipt.hash;
            completed++;
            setBatchSuccessCount(completed);

            saveTransaction({
              id: `tx-batch-${Date.now()}-${i}`,
              action: `Batch Payment (${i + 1}/${batchRecipients.length})`,
              amount: item.amount,
              from: address,
              to: formattedAddr,
              txHash: receipt.hash,
              status: 'COMPLETE',
              explorerUrl: `https://testnet.arcscan.app/tx/${receipt.hash}`,
              timestamp: Date.now(),
              tokenSymbol: selectedToken
            });
          }
        }
        setTxHash(lastTxHash);
      }
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err, selectedToken));
    } finally {
      setIsSending(false);
    }
  };

  const stepValue = selectedToken === 'cirBTC' ? '0.00000001' : '0.000001';
  const placeholderValue = selectedToken === 'cirBTC' ? '0.00000000' : '0.00';

  return (
    <div className="payments-container">
      <div className="payments-card glass-panel">
        {/* Header with Mode Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="payments-header" style={{ marginBottom: 0 }}>
            <div className="icon-wrapper">
              <Send className="w-6 h-6 text-blue-400" />
            </div>
            <div className="payments-title-group">
              <h2 className="payments-title">P2P & Batch Payments</h2>
              <p className="payments-subtitle">Send tokens to single or multiple recipients on Arc</p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setPaymentMode('single')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: paymentMode === 'single' ? 'var(--bg-card)' : 'transparent',
                color: paymentMode === 'single' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: paymentMode === 'single' ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <User size={15} /> Single Send
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('batch')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: paymentMode === 'batch' ? 'linear-gradient(135deg, #0d9488, #0ea5e9)' : 'transparent',
                color: paymentMode === 'batch' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: paymentMode === 'batch' ? '0 2px 8px rgba(13,148,136,0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Users size={15} /> Batch Multi-Send
            </button>
          </div>
        </div>

        {txHash ? (
          <div className="payment-receipt">
            <div className="receipt-success-icon">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
            </div>
            <h3 className="receipt-title">
              {paymentMode === 'single' ? 'Payment Successful!' : `Batch Transfer Completed! (${batchSuccessCount} Recipient${batchSuccessCount > 1 ? 's' : ''})`}
            </h3>
            <div className="receipt-details">
              <div className="receipt-row">
                <span>Total Amount</span>
                <span className="font-semibold">{paymentMode === 'single' ? amount : totalBatchAmount.toFixed(4)} {selectedToken}</span>
              </div>
              {paymentMode === 'single' && (
                <div className="receipt-row">
                  <span>To</span>
                  <span className="truncate max-w-[150px] font-mono">{recipient}</span>
                </div>
              )}
              <div className="receipt-row">
                <span>Network Fee</span>
                <span className="text-green-400">~0.0001 USDC</span>
              </div>
              <div className="receipt-row">
                <span>Finality Time</span>
                <span className="text-green-400 flex items-center gap-1">
                  <Zap size={14} /> &lt; 1 Second
                </span>
              </div>
            </div>
            
            <div className="receipt-actions">
              <a 
                href={`https://testnet.arcscan.app/tx/${txHash}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn-explorer"
              >
                View on ArcScan <ExternalLink size={14} />
              </a>
              <button onClick={() => setTxHash('')} className="btn-new-payment">
                Send Another Payment
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendPayment} className="payments-form">
            {/* Token Selector (Common for both modes) */}
            <div className="input-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Select Currency Token</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Arc Testnet Native Gas</span>
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value as TokenSymbol)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-input)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="USDC">🪙 USDC (Native Gas)</option>
                <option value="EURC">💶 EURC (Circle Euro)</option>
                <option value="cirBTC">₿ cirBTC (Bitcoin Wrapped)</option>
              </select>
            </div>

            {/* SINGLE MODE */}
            {paymentMode === 'single' ? (
              <>
                <div className="input-group">
                  <label>Recipient Address</label>
                  <div className="address-input-wrapper">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="arc-input pr-12"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowQRScanner(true)}
                      className="qr-scan-btn"
                      title="Scan QR Code"
                    >
                      <QrCode size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="input-group">
                  <label>Amount ({selectedToken})</label>
                  <div className="amount-input-wrapper">
                    <input
                      type="number"
                      step={stepValue}
                      min="0"
                      placeholder={placeholderValue}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="amount-input"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* BATCH MULTI-SEND MODE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Batch Recipients ({batchRecipients.length})
                  </label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                    Total: {totalBatchAmount.toFixed(4)} {selectedToken}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {batchRecipients.map((entry, idx) => (
                    <div key={entry.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: '24px' }}>
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Recipient address (0x...)"
                        value={entry.address}
                        onChange={(e) => updateBatchRecipient(entry.id, 'address', e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-input)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                      <input
                        type="number"
                        step={stepValue}
                        min="0"
                        placeholder="Amount"
                        value={entry.amount}
                        onChange={(e) => updateBatchRecipient(entry.id, 'amount', e.target.value)}
                        style={{
                          width: '140px',
                          flexShrink: 0,
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-input)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                      {batchRecipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBatchRecipient(entry.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Remove recipient"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addBatchRecipient}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: '#0ea5e9',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Plus size={16} /> Add Recipient Row
                </button>
              </div>
            )}

            {error && (
              <div className="payment-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="arc-features-showcase">
              <div className="feature-item">
                <Zap className="text-yellow-400" size={16} />
                <div className="feature-text">
                  <span className="feature-label">Finality</span>
                  <span className="feature-value">Sub-second</span>
                </div>
              </div>
              <div className="feature-item">
                <Fuel className="text-blue-400" size={16} />
                <div className="feature-text">
                  <span className="feature-label">Est. Gas</span>
                  <span className="feature-value text-green-400">Near-zero</span>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-send-payment"
              disabled={isSending || !walletProvider}
              style={{
                background: paymentMode === 'batch' ? 'linear-gradient(135deg, #0d9488, #0ea5e9)' : undefined
              }}
            >
              {isSending ? (
                <>
                  <div className="spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full mr-2"></div>
                  {paymentMode === 'batch' ? `Processing Batch (${batchSuccessCount}/${batchRecipients.length})...` : 'Processing...'}
                </>
              ) : paymentMode === 'batch' ? (
                `Execute Batch Transfer (${batchRecipients.length} Recipients)`
              ) : (
                'Send Payment'
              )}
            </button>
          </form>
        )}
      </div>

      {showQRScanner && (
        <div className="qr-modal-overlay">
          <div className="qr-modal glass-panel">
            <div className="qr-modal-header">
              <h3>Scan Wallet Address</h3>
              <button onClick={() => setShowQRScanner(false)} className="close-qr-btn">
                <X size={24} />
              </button>
            </div>
            <div className="qr-scanner-container">
              <Scanner 
                onScan={(result) => handleQRScan(result[0].rawValue)} 
                onError={(err) => console.log('QR Scan Error:', err)}
              />
              <div className="qr-scanner-overlay-target"></div>
            </div>
            <p className="qr-help-text">Point your camera at a Web3 wallet QR code</p>
          </div>
        </div>
      )}
    </div>
  );
};

