import React, { useState, useEffect } from 'react';
import { FileText, Tag, Hash, Send, CheckCircle2, AlertCircle, ExternalLink, Info, Copy, RefreshCw } from 'lucide-react';
import { BrowserProvider, parseUnits, Interface, id, toUtf8Bytes, getBytes, Contract, formatUnits } from 'ethers';
import { saveTransaction } from '../lib/TransactionHistory';
import { globalRpcProvider } from '../utils/arcChain';

const MEMO_CONTRACT_ADDRESS = '0x5294E9927c3306DcBaDb03fe70b92e01cCede505';
const USDC_ERC20_ADDRESS = '0x3600000000000000000000000000000000000000';

const ERC20_INTERFACE = new Interface([
  "function transfer(address to, uint256 value) returns (bool)"
]);

const MEMO_INTERFACE = new Interface([
  {
    "type": "function",
    "name": "memo",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "target", "type": "address" },
      { "name": "data", "type": "bytes" },
      { "name": "memoId", "type": "bytes32" },
      { "name": "memoData", "type": "bytes" }
    ],
    "outputs": []
  },
  {
    "type": "event",
    "name": "Memo",
    "anonymous": false,
    "inputs": [
      { "name": "sender", "type": "address", "indexed": true },
      { "name": "target", "type": "address", "indexed": true },
      { "name": "callDataHash", "type": "bytes32", "indexed": false },
      { "name": "memoId", "type": "bytes32", "indexed": true },
      { "name": "memo", "type": "bytes", "indexed": false },
      { "name": "memoIndex", "type": "uint256", "indexed": false }
    ]
  }
]);

type MemoType = 'payment' | 'payout' | 'deposit' | 'withdrawal' | 'invoice' | 'custom';

interface MemoField {
  key: string;
  value: string;
}

interface MemoTemplate {
  type: MemoType;
  label: string;
  icon: string;
  color: string;
  fields: { key: string; placeholder: string; fieldType?: 'text' | 'date' }[];
}

const MEMO_TEMPLATES: MemoTemplate[] = [
  {
    type: 'payment',
    label: 'Payment',
    icon: '💳',
    color: '#3b82f6',
    fields: [
      { key: 'ref', placeholder: 'Payment reference ID' },
      { key: 'description', placeholder: 'Payment description' },
      { key: 'orderId', placeholder: 'Order ID (optional)' },
    ],
  },
  {
    type: 'invoice',
    label: 'Invoice',
    icon: '📄',
    color: '#10b981',
    fields: [
      { key: 'invoiceId', placeholder: 'INV-2026-001' },
      { key: 'dueDate', placeholder: 'Select due date', fieldType: 'date' },
      { key: 'vendor', placeholder: 'Vendor name' },
    ],
  },
  {
    type: 'payout',
    label: 'Payout',
    icon: '💸',
    color: '#f59e0b',
    fields: [
      { key: 'payoutId', placeholder: 'Payout batch ID' },
      { key: 'recipient', placeholder: 'Recipient label' },
      { key: 'period', placeholder: 'e.g. 2026-Q2' },
    ],
  },
  {
    type: 'deposit',
    label: 'Deposit',
    icon: '📥',
    color: '#8b5cf6',
    fields: [
      { key: 'accountId', placeholder: 'Account ID' },
      { key: 'depositRef', placeholder: 'Deposit reference' },
    ],
  },
  {
    type: 'withdrawal',
    label: 'Withdrawal',
    icon: '📤',
    color: '#ef4444',
    fields: [
      { key: 'accountId', placeholder: 'Account ID' },
      { key: 'withdrawalRef', placeholder: 'Withdrawal reference' },
    ],
  },
  {
    type: 'custom',
    label: 'Custom',
    icon: '⚙️',
    color: '#6b7280',
    fields: [],
  },
];

interface EmittedMemoEvent {
  sender: string;
  destination: string;
  memo: Record<string, string>;
  txHash: string;
  timestamp: number;
  amount: string;
}

interface TransactionMemosProps {
  walletProvider: any;
  address: string;
}

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const TransactionMemos: React.FC<TransactionMemosProps> = ({ walletProvider, address }) => {
  const [selectedType, setSelectedType] = useState<MemoType>('payment');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memoFields, setMemoFields] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<MemoField[]>([{ key: '', value: '' }]);
  const [isSending, setIsSending] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string; txHash?: string } | null>(null);
  const [emittedEvents, setEmittedEvents] = useState<EmittedMemoEvent[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  const fetchUsdcBalance = async () => {
    if (!address) return;
    setIsFetchingBalance(true);
    try {
      const provider = globalRpcProvider;
      const usdcContract = new Contract(
        USDC_ERC20_ADDRESS,
        ["function balanceOf(address account) view returns (uint256)"],
        provider
      );
      const balance = await usdcContract.balanceOf(address);
      setUsdcBalance(formatUnits(balance, 6));
    } catch (e) {
      console.error("Error fetching USDC balance:", e);
    } finally {
      setIsFetchingBalance(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchUsdcBalance();
    } else {
      setUsdcBalance(null);
    }
  }, [address]);

  const template = MEMO_TEMPLATES.find(t => t.type === selectedType)!;

  const buildMemoObject = (overrides?: Record<string, string>): Record<string, string> => {
    const base: Record<string, string> = {
      type: selectedType,
      ts: new Date().toISOString(),
    };
    const fields = overrides ?? memoFields;
    if (selectedType === 'custom') {
      customFields.forEach(f => { if (f.key && f.value) base[f.key] = f.value; });
    } else {
      template.fields.forEach(f => {
        const val = fields[f.key] ?? (f.fieldType === 'date' ? getTodayString() : '');
        if (val) base[f.key] = val;
      });
    }
    return base;
  };

  const getMemoPreview = () => {
    const obj = buildMemoObject();
    const hasUserInput = selectedType === 'custom'
      ? customFields.some(f => f.key && f.value)
      : template.fields.some(f => memoFields[f.key] || f.fieldType === 'date');
    if (!hasUserInput) return JSON.stringify({ type: selectedType, ts: '(auto)', '...': 'fill fields above' }, null, 2);
    return JSON.stringify(obj, null, 2);
  };

  const handleFieldChange = (key: string, value: string) => {
    setMemoFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectType = (t: MemoType) => {
    setSelectedType(t);
    setMemoFields({});
    setCustomFields([{ key: '', value: '' }]);
    setTxStatus(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletProvider || !address) {
      setTxStatus({ type: 'error', msg: 'Wallet not connected. Please Connect Wallet first.' });
      return;
    }
    if (!recipient.trim()) {
      setTxStatus({ type: 'error', msg: 'Please enter a recipient address.' });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setTxStatus({ type: 'error', msg: 'Please enter a valid USDC amount.' });
      return;
    }

    const memoObj = buildMemoObject();
    const memoKeys = Object.keys(memoObj).filter(k => k !== 'type' && k !== 'ts');
    if (selectedType !== 'custom' && memoKeys.length === 0) {
      setTxStatus({ type: 'error', msg: 'Please fill in at least one memo field.' });
      return;
    }

    try {
      setIsSending(true);
      setTxStatus({ type: 'info', msg: 'Checking current USDC balance...' });

      let currentBalance = usdcBalance;
      try {
        const provider = globalRpcProvider;
        const usdcContract = new Contract(
          USDC_ERC20_ADDRESS,
          ["function balanceOf(address account) view returns (uint256)"],
          provider
        );
        const balance = await usdcContract.balanceOf(address);
        currentBalance = formatUnits(balance, 6);
        setUsdcBalance(currentBalance);
      } catch (e) {
        console.warn("Real-time balance check failed, falling back to cached balance:", e);
      }

      if (currentBalance !== null && parseFloat(amount) > parseFloat(currentBalance)) {
        setTxStatus({
          type: 'error',
          msg: `Insufficient USDC balance. Your current balance is ${parseFloat(currentBalance).toFixed(6)} USDC, but you are trying to send ${amount} USDC.`
        });
        setIsSending(false);
        return;
      }

      setTxStatus({ type: 'info', msg: 'Switching to Arc Testnet...' });

      // Switch to Arc Testnet first (same pattern as ArcAppKit)
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
              chainName: 'Arc Testnet',
              nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
              rpcUrls: ['https://rpc.testnet.arc.network'],
              blockExplorerUrls: ['https://testnet.arcscan.app'],
            }],
          });
        } else if (switchErr.code !== 4001) {
          // 4001 = user rejected, other errors bubble up
          throw switchErr;
        }
      }

      setTxStatus({ type: 'info', msg: 'Preparing transaction...' });

      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      
      // USDC ERC-20 contract uses 6 decimals
      const usdcDecimals = 6;
      const valueInUnits = parseUnits(amount, usdcDecimals);

      // Encode the ERC-20 transfer calldata: transfer(recipient, amount)
      const transferData = ERC20_INTERFACE.encodeFunctionData('transfer', [
        recipient.trim(),
        valueInUnits
      ]);

      // Prepare memo payload
      const memoBytes = toUtf8Bytes(JSON.stringify(memoObj));
      const memoId = id(JSON.stringify(memoObj));

      // Encode the Memo precompile call: memo(target, data, memoId, memoData)
      const memoTxData = MEMO_INTERFACE.encodeFunctionData('memo', [
        USDC_ERC20_ADDRESS,
        transferData,
        memoId,
        memoBytes
      ]);

      setTxStatus({ type: 'info', msg: 'Please confirm the transaction in your wallet...' });

      // Call the Memo contract at MEMO_CONTRACT_ADDRESS with the encoded calldata
      const tx = await signer.sendTransaction({
        to: MEMO_CONTRACT_ADDRESS,
        data: memoTxData,
      });

      setTxStatus({ type: 'info', msg: 'Waiting for confirmation...' });
      const receipt = await tx.wait();

      if (receipt) {
        // Try decoding on-chain Memo event if present
        let finalMemoObj = memoObj;
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === MEMO_CONTRACT_ADDRESS.toLowerCase()) {
            try {
              const parsedLog = MEMO_INTERFACE.parseLog({
                topics: log.topics as string[],
                data: log.data
              });
              if (parsedLog && parsedLog.name === 'Memo') {
                console.log("Successfully parsed onchain Memo event args:", parsedLog.args);
                const memoStr = new TextDecoder().decode(getBytes(parsedLog.args.memo));
                finalMemoObj = JSON.parse(memoStr);
              }
            } catch (e) {
              console.warn("Failed to parse log as Memo event:", e);
            }
          }
        }

        const event: EmittedMemoEvent = {
          sender: address,
          destination: recipient.trim(),
          memo: finalMemoObj,
          txHash: receipt.hash,
          timestamp: Date.now(),
          amount,
        };
        setEmittedEvents(prev => [event, ...prev]);

        saveTransaction({
          id: `memo-${Date.now()}`,
          action: `Memo Transfer (${selectedType})`,
          amount,
          from: address,
          to: recipient.trim(),
          txHash: receipt.hash,
          status: 'COMPLETE',
          explorerUrl: `https://testnet.arcscan.app/tx/${receipt.hash}`,
          timestamp: Date.now(),
          tokenSymbol: 'USDC',
        });

        setTxStatus({ type: 'success', msg: `Transaction successful! Memo has been attached.`, txHash: receipt.hash });
        setRecipient('');
        setAmount('');
        setMemoFields({});
        
        // Refresh balance after successful transaction
        fetchUsdcBalance();
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Transaction failed.';
      if (err.data && (err.data.includes('0xed1966a2') || err.data.includes('MemoFailed'))) {
        errMsg = 'Transaction reverted from Memo precompile: Your wallet may have insufficient USDC balance or Gas to complete the transfer.';
      } else if (err.message && (err.message.includes('0xed1966a2') || err.message.includes('MemoFailed'))) {
        errMsg = 'Transaction reverted from Memo precompile: Your wallet may have insufficient USDC balance or Gas to complete the transfer.';
      }
      setTxStatus({ type: 'error', msg: errMsg });
    } finally {
      setIsSending(false);
    }
  };

  const copyText = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    fontWeight: 500,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={20} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.325rem', color: 'var(--text-primary)' }}>On-Chain Invoicing & Receipts</h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Attach structured invoice codes, payment references, and compliance audit notes to USDC transactions on Arc
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(v => !v)}
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.925rem', flexShrink: 0 }}
          >
            <Info size={13} /> How it works
          </button>
        </div>

        {showInfo && (
          <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.18)', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
            <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '0.5rem' }}>📋 How do Transaction Memos work?</strong>
            <p style={{ margin: '0 0 0.5rem' }}>
              The memo is encoded as UTF-8 hex and attached to the <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '0 4px', borderRadius: '3px' }}>data</code> field of the native USDC transaction.
              No smart contract changes are required — the data exists permanently on the blockchain.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>Used for invoice matching, payout tracking, and transaction labelling</li>
              <li>Fully EVM-compatible, does not impact existing USDC flows</li>
            </ul>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { href: 'https://docs.arc.io/arc/concepts/transaction-memos', label: 'Concepts' },
                { href: 'https://docs.arc.io/arc/tutorials/send-usdc-with-transaction-memo', label: 'Tutorial' },
                { href: 'https://community.arc.io/home/blogs/arc-transaction-memos-structured-transaction-context-for-financial-workflows-on-arc-2026-06-18', label: 'Blog' },
              ].map(l => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                  <ExternalLink size={11} /> {l.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Memo Type Pills */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.65rem' }}>Memo Type</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {MEMO_TEMPLATES.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => handleSelectType(t.type)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '20px',
                border: selectedType === t.type ? `2px solid ${t.color}` : '1px solid rgba(255,255,255,0.1)',
                background: selectedType === t.type ? `${t.color}22` : 'rgba(255,255,255,0.04)',
                color: selectedType === t.type ? t.color : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: selectedType === t.type ? 600 : 400,
                fontSize: '0.95rem',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form + Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem', alignItems: 'start' }}>

        {/* Left: Send Form */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.075rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Send size={16} color={template.color} /> Send with Memo
          </h3>

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

            {/* Recipient */}
            <div>
              <label style={labelStyle}>Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* Amount */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Amount (USDC)</label>
                {address && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Balance: {usdcBalance !== null ? `${parseFloat(usdcBalance).toFixed(4)} USDC` : '...'}
                    <button
                      type="button"
                      onClick={fetchUsdcBalance}
                      disabled={isFetchingBalance}
                      style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      title="Refresh balance"
                    >
                      <RefreshCw size={11} className={isFetchingBalance ? "animate-spin" : ""} style={{ animation: isFetchingBalance ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }} />
                    </button>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  required
                />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3b82f6', flexShrink: 0 }}>USDC</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.85rem' }}>
              <label style={{ ...labelStyle, marginBottom: '0.6rem' }}>
                <Tag size={12} /> Memo Fields
                <span style={{ color: template.color }}>({template.icon} {template.label})</span>
              </label>

              {selectedType === 'custom' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {customFields.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="Key"
                        value={f.key}
                        onChange={e => setCustomFields(prev => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                        style={{ ...inputStyle, flex: '0 0 38%' }}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={f.value}
                        onChange={e => setCustomFields(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomFields(prev => [...prev, { key: '', value: '' }])}
                    style={{ padding: '0.4rem 0.75rem', border: '1px dashed rgba(255,255,255,0.18)', borderRadius: '7px', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}
                  >
                    + Add field
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {template.fields.map(f => (
                    <div key={f.key}>
                      <label style={labelStyle}>
                        {f.fieldType === 'date' && <span>📅</span>}
                        {f.key}
                      </label>
                      {f.fieldType === 'date' ? (
                        <input
                          type="date"
                          value={memoFields[f.key] || getTodayString()}
                          min="2020-01-01"
                          max="2099-12-31"
                          onChange={e => handleFieldChange(f.key, e.target.value)}
                          style={{ ...inputStyle, colorScheme: 'dark', cursor: 'pointer' }}
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          value={memoFields[f.key] || ''}
                          onChange={e => handleFieldChange(f.key, e.target.value)}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Message */}
            {txStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: txStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : txStatus.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                border: `1px solid ${txStatus.type === 'success' ? 'rgba(16,185,129,0.3)' : txStatus.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`,
                color: txStatus.type === 'success' ? '#6ee7b7' : txStatus.type === 'error' ? '#fca5a5' : '#93c5fd',
                fontSize: '0.925rem',
                lineHeight: '1.4',
              }}>
                {txStatus.type === 'success' ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : txStatus.type === 'error' ? <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <RefreshCw size={14} style={{ flexShrink: 0, marginTop: 1, animation: 'spin 1s linear infinite' }} />}
                <span style={{ flex: 1 }}>{txStatus.msg}</span>
                {txStatus.txHash && (
                  <a href={`https://testnet.arcscan.app/tx/${txStatus.txHash}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', flexShrink: 0 }}>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            {/* Submit */}
            {!walletProvider && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.85rem', borderRadius: '8px', background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d', fontSize: '0.9rem' }}>
                ⚠️ Please connect your wallet to send transactions
              </div>
            )}

            <button
              type="submit"
              disabled={isSending}
              style={{
                padding: '0.7rem',
                borderRadius: '10px',
                background: isSending
                  ? 'rgba(255,255,255,0.08)'
                  : !walletProvider
                  ? 'rgba(255,255,255,0.07)'
                  : `linear-gradient(135deg, ${template.color}, #8b5cf6)`,
                border: 'none',
                color: (!walletProvider || isSending) ? 'var(--text-secondary)' : 'white',
                fontWeight: 600,
                fontSize: '1.025rem',
                cursor: isSending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              {isSending
                ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                : !walletProvider
                ? <>🔒 Connect wallet to send</>
                : <><Send size={15} /> Send {amount || '0'} USDC with Memo</>
              }
            </button>
          </form>
        </div>

        {/* Right: Preview + Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Memo JSON Preview */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)' }}>
              <Hash size={14} /> Memo Preview (JSON)
            </h4>
            <pre style={{
              background: 'var(--code-bg)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              fontSize: '0.885rem',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              color: 'var(--code-text)',
              overflowX: 'auto',
              margin: 0,
              minHeight: '110px',
              border: '1px solid var(--code-border)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: '1.5',
              boxShadow: 'var(--shadow-card)'
            }}>
              {getMemoPreview()}
            </pre>
            <div style={{ marginTop: '0.5rem', fontSize: '0.855rem', color: 'var(--text-secondary)' }}>
              Encoded as <code style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-primary)' }}>UTF-8 hex</code> in transaction <code style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-primary)' }}>data</code> field
            </div>
          </div>

          {/* Emitted Events */}
          {emittedEvents.length > 0 ? (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} color="#10b981" /> Memo Events ({emittedEvents.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '340px', overflowY: 'auto' }}>
                {emittedEvents.map((ev, i) => (
                  <div key={i} style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '8px', padding: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.925rem' }}>
                        {MEMO_TEMPLATES.find(t => t.type === ev.memo.type)?.icon} {ev.memo.type?.toUpperCase()} · {ev.amount} USDC
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => copyText(JSON.stringify(ev.memo, null, 2))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }} title="Copy memo">
                          <Copy size={12} />
                        </button>
                        <a href={`https://testnet.arcscan.app/tx/${ev.txHash}`} target="_blank" rel="noreferrer" style={{ color: '#6ee7b7' }}>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.855rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {Object.entries(ev.memo).filter(([k]) => k !== 'ts').map(([k, v]) => (
                        <div key={k}><span style={{ color: '#94a3b8' }}>{k}:</span> {v}</div>
                      ))}
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.825rem', color: '#475569' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()} · To: {ev.destination.slice(0, 8)}...{ev.destination.slice(-4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.1rem 1.25rem', borderRadius: '12px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: '#a78bfa', display: 'block', marginBottom: '0.5rem' }}>✨ Memo Use Cases</strong>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: '1.75' }}>
                <li>Reconcile invoices with invoice IDs</li>
                <li>Label payout batches using batch IDs</li>
                <li>Track deposits by account reference</li>
                <li>Link on-chain actions with off-chain systems</li>
                <li>Enable downstream indexing &amp; analytics</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
