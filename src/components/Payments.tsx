import React, { useState } from 'react';
import { Send, Zap, Fuel, ExternalLink, CheckCircle2, AlertCircle, QrCode, X } from 'lucide-react';
import { BrowserProvider, parseUnits, Contract } from 'ethers';
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

export const Payments: React.FC<PaymentsProps> = ({ walletProvider, address }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('USDC');
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleQRScan = (text: string) => {
    if (text) {
      // Remove ethereum: prefix if present
      const address = text.replace(/^ethereum:/i, '');
      setRecipient(address);
      setShowQRScanner(false);
    }
  };

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletProvider || !address) {
      setError('Please connect your wallet first.');
      return;
    }
    
    if (!recipient || !amount) {
      setError('Please enter a recipient address and amount.');
      return;
    }

    try {
      setIsSending(true);
      setError('');
      setTxHash('');

      // Ensure user is on Arc Testnet (same pattern as TransactionMemos)
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

      // We use BrowserProvider to wrap the EIP-1193 provider
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      const tokenConfig = TOKEN_CONFIGS[selectedToken];
      const valueInDecimals = parseUnits(amount, tokenConfig.decimals);

      let tx;
      if (tokenConfig.isNative) {
        // We are transferring native USDC gas on Arc testnet
        // Hardcode gasLimit for simple value transfers to bypass estimateGas issues on custom gas networks
        tx = await signer.sendTransaction({
          to: recipient,
          value: valueInDecimals,
          gasLimit: 21000
        });
      } else {
        // We are transferring an ERC-20 token (EURC or cirBTC)
        const erc20Contract = new Contract(
          tokenConfig.address,
          ["function transfer(address to, uint256 value) returns (bool)"],
          signer
        );
        tx = await erc20Contract.transfer(recipient, valueInDecimals);
      }

      // Wait for confirmation to demonstrate sub-second finality
      const receipt = await tx.wait();
      
      if (receipt) {
        setTxHash(receipt.hash);
        
        saveTransaction({
          id: `tx-${Date.now()}`,
          action: 'P2P Payment',
          amount: amount,
          from: address,
          to: recipient,
          txHash: receipt.hash,
          status: 'COMPLETE',
          explorerUrl: `https://testnet.arcscan.app/tx/${receipt.hash}`,
          timestamp: Date.now(),
          tokenSymbol: selectedToken
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err, selectedToken));
      
      saveTransaction({
        id: `tx-${Date.now()}`,
        action: 'P2P Payment',
        amount: amount,
        from: address,
        to: recipient,
        txHash: '',
        status: 'FAILED',
        timestamp: Date.now(),
        tokenSymbol: selectedToken
      });
    } finally {
      setIsSending(false);
    }
  };

  const stepValue = selectedToken === 'cirBTC' ? '0.00000001' : '0.000001';
  const placeholderValue = selectedToken === 'cirBTC' ? '0.00000000' : '0.00';

  return (
    <div className="payments-container">
      <div className="payments-card glass-panel">
        <div className="payments-header">
          <div className="icon-wrapper">
            <Send className="w-6 h-6 text-blue-400" />
          </div>
          <div className="payments-title-group">
            <h2 className="payments-title">P2P Payments</h2>
            <p className="payments-subtitle">Send USDC, EURC, or cirBTC instantly on Arc Network</p>
          </div>
        </div>

        {txHash ? (
          <div className="payment-receipt">
            <div className="receipt-success-icon">
              <CheckCircle2 className="w-16 h-16 text-green-400" />
            </div>
            <h3 className="receipt-title">Payment Successful!</h3>
            <div className="receipt-details">
              <div className="receipt-row">
                <span>Amount</span>
                <span className="font-semibold">{amount} {selectedToken}</span>
              </div>
              <div className="receipt-row">
                <span>To</span>
                <span className="truncate max-w-[150px] font-mono">{recipient}</span>
              </div>
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
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as TokenSymbol)}
                  className="currency-select-dropdown"
                >
                  <option value="USDC">USDC</option>
                  <option value="EURC">EURC</option>
                  <option value="cirBTC">cirBTC</option>
                </select>
              </div>
            </div>

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
            >
              {isSending ? (
                <>
                  <div className="spinner-border animate-spin inline-block w-4 h-4 border-2 rounded-full mr-2"></div>
                  Processing...
                </>
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

