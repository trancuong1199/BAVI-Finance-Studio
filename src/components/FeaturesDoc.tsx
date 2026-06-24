import { Activity, Layers, Wallet, Droplets, FileCode2, BarChart3, Receipt, ExternalLink, FileText, Shield, GitFork } from 'lucide-react';
import React from 'react';

export const FeaturesDoc: React.FC = () => {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)', lineHeight: '1.6' }}>
      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2rem', marginBottom: '1rem', color: 'var(--brand-primary)' }}>
          <Activity size={36} />
          ARC Finance Studio Features
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Welcome to ARC Finance Studio! This documentation provides an overview of all the features available in our platform, including the latest ARC protocol capabilities.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Swap Feature */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Layers size={28} color="#3b82f6" />
            <h3 style={{ margin: 0 }}>Swap & Exchange</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Seamlessly exchange tokens across different networks.
            <ul>
              <li><strong>Native Arc:</strong> Fast and low-cost swaps directly on the Arc network.</li>
              <li><strong>Universal (LI.FI):</strong> Cross-chain bridging and swapping powered by LI.FI for ultimate liquidity.</li>
            </ul>
          </p>
        </div>

        {/* Transaction Memos - NEW */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid #3b82f6', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>NEW</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <FileText size={28} color="#3b82f6" />
            <h3 style={{ margin: 0 }}>Transaction Memos</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Attach structured JSON metadata to USDC transfers via Arc's Memo contract — no smart contract changes required.
            <ul>
              <li><strong>Invoice reconciliation</strong> with structured IDs</li>
              <li><strong>Payout attribution</strong> for batch operations</li>
              <li><strong>Deposit tracking</strong> with account references</li>
              <li>Events only emit on success — reliable indexing</li>
            </ul>
          </p>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a href="https://docs.arc.io/arc/concepts/transaction-memos" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              <ExternalLink size={12} /> Concepts
            </a>
            <a href="https://docs.arc.io/arc/tutorials/send-usdc-with-transaction-memo" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              <ExternalLink size={12} /> Tutorial
            </a>
            <a href="https://community.arc.io/home/blogs/arc-transaction-memos-structured-transaction-context-for-financial-workflows-on-arc-2026-06-18" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              <ExternalLink size={12} /> Community Blog
            </a>
          </div>
        </div>

        {/* Unified Balance Kit with Safeguards - NEW */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid #8b5cf6', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.3)' }}>UPDATED</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Shield size={28} color="#8b5cf6" />
            <h3 style={{ margin: 0 }}>Unified Balance Kit (UBK)</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Production-grade cross-chain USDC balance management with safeguards:
            <ul>
              <li><strong>estimateSpend() preflight</strong> — validate routes before committing</li>
              <li><strong>Balance states</strong> — Confirmed / Pending / In-Motion</li>
              <li><strong>Partial liquidity routing</strong> with auto/explicit modes</li>
              <li><strong>Fallback patterns</strong> when routes fail</li>
              <li><strong>Mint-side recovery</strong> with expirationBlock retries</li>
            </ul>
          </p>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a href="https://www.arc.io/blog/unified-balance-kit-partial-liquidity-routing-and-fallback-patterns" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              <ExternalLink size={12} /> Partial Liquidity & Fallbacks
            </a>
            <a href="https://www.arc.io/blog/unified-balance-kit-production-safeguards-and-recovery-patterns-for-spend" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              <ExternalLink size={12} /> Production Safeguards
            </a>
          </div>
        </div>

        {/* Payments Feature */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Receipt size={28} color="#10b981" />
            <h3 style={{ margin: 0 }}>Payments</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Send and receive stablecoin payments securely. We integrate with <strong>Circle</strong> to provide enterprise-grade USDC transfers, making cross-border payments instant and extremely cheap.
          </p>
        </div>

        {/* Analytics Feature */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <BarChart3 size={28} color="#f59e0b" />
            <h3 style={{ margin: 0 }}>Analytics</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Track the pulse of the market. View real-time charts, network statistics, trading volumes, and token price histories all in one comprehensive dashboard.
          </p>
        </div>

        {/* API Logs Feature */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Activity size={28} color="#8b5cf6" />
            <h3 style={{ margin: 0 }}>API Logs</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            For developers and power users. Monitor your on-chain interactions, RPC requests, and transaction statuses in real-time to debug and trace your Web3 activities.
          </p>
        </div>

        {/* Faucet Feature */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Droplets size={28} color="#06b6d4" />
            <h3 style={{ margin: 0 }}>Testnet Faucet</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Get started on the Arc Testnet without spending real money. Request free test tokens directly to your wallet to try out swaps, payments, and smart contracts risk-free.
          </p>
        </div>

        {/* Contracts Feature */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <FileCode2 size={28} color="#ef4444" />
            <h3 style={{ margin: 0 }}>Smart Contracts</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Interact directly with deployed smart contracts. This includes managing Circle CCTP (Cross-Chain Transfer Protocol) contracts and verifying your token allowances and permissions.
          </p>
        </div>
      </div>

      {/* ARC Network Key Concepts */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GitFork size={24} color="#3b82f6" /> ARC Network Key Concepts
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { title: 'Transaction Memos', desc: 'Structured metadata on contract calls', color: '#3b82f6', url: 'https://docs.arc.io/arc/concepts/transaction-memos' },
            { title: 'Deterministic Finality', desc: 'Sub-second settlement guarantees', color: '#10b981', url: 'https://docs.arc.io/arc/concepts/deterministic-finality' },
            { title: 'Stablecoin Native Model', desc: 'USDC as native gas token', color: '#f59e0b', url: 'https://docs.arc.io/arc/concepts/stablecoin-native-model' },
            { title: 'Batched Transactions', desc: 'Bundle multiple ops in one tx', color: '#8b5cf6', url: 'https://docs.arc.io/arc/concepts/batched-transactions' },
            { title: 'Opt-in Privacy', desc: 'Confidential financial workflows', color: '#06b6d4', url: 'https://docs.arc.io/arc/concepts/opt-in-privacy' },
            { title: 'Post-Quantum Security', desc: 'Future-proof cryptography', color: '#ef4444', url: 'https://docs.arc.io/arc/concepts/post-quantum-security' },
          ].map(item => (
            <a key={item.title} href={item.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', padding: '0.85rem 1rem', borderRadius: '10px', background: `${item.color}10`, border: `1px solid ${item.color}30`, display: 'block', transition: 'all 0.2s ease' }}>
              <div style={{ fontWeight: 600, color: item.color, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Wallet size={48} color="#3b82f6" style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>Multi-Wallet Support</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              ARC Finance Studio seamlessly connects with your favorite Web3 wallets. We support the latest EIP-6963 standard, which automatically detects all installed wallets (like MetaMask, OKX, Phantom, etc.) so you can choose exactly which one to connect with.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <ExternalLink size={48} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>Official ARC Resources</h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
              Learn more about the ARC ecosystem and how to integrate with our protocols:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a href="https://docs.arc.io/" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Official ARC Documentation
              </a>
              <a href="https://docs.arc.io/arc/concepts/transaction-memos" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Transaction Memos Concept
              </a>
              <a href="https://docs.arc.io/arc/tutorials/send-usdc-with-transaction-memo" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Send USDC with Memo Tutorial
              </a>
              <a href="https://community.arc.io/home/blogs/arc-transaction-memos-structured-transaction-context-for-financial-workflows-on-arc-2026-06-18" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> ARC Transaction Memos Blog Post
              </a>
              <a href="https://www.arc.io/blog/unified-balance-kit-partial-liquidity-routing-and-fallback-patterns" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Unified Balance Kit: Partial Liquidity & Fallback Patterns
              </a>
              <a href="https://www.arc.io/blog/unified-balance-kit-production-safeguards-and-recovery-patterns-for-spend" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Unified Balance Kit: Production Safeguards & Recovery Patterns
              </a>
              <a href="https://docs.arc.io/arc-chain" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> ARC Chain Details
              </a>
              <a href="https://docs.arc.io/integrate" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Integration Guide
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
