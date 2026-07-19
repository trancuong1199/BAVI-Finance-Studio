import React, { useState } from 'react';
import { Droplet, ExternalLink, Copy, Check } from 'lucide-react';

interface FaucetProps {
  connectedAccount: string | null;
}

export const Faucet: React.FC<FaucetProps> = ({ connectedAccount }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAndRedirect = () => {
    if (connectedAccount) {
      navigator.clipboard.writeText(connectedAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    // Circle Faucet has frame-ancestors 'none' so it must be opened in a new tab
    window.open('https://faucet.circle.com/', '_blank');
  };

  return (
    <div className="main-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <Droplet size={40} color="#3b82f6" />
          </div>
        </div>
        
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff' }}>Testnet Faucet</h1>
        <p style={{ color: '#A0A2A4', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Get testnet USDC and EURC to test the BAVI Finance Studio platform.<br/>
          Tokens are provided directly from the official Circle Faucet.
        </p>

        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#A0A2A4', fontSize: '0.9rem' }}>Your Connected Address</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              readOnly 
              value={connectedAccount || 'Connect your wallet first'} 
              style={{ 
                flex: 1, 
                padding: '0.75rem 1rem', 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '8px',
                color: connectedAccount ? '#fff' : '#666',
                fontFamily: 'monospace',
                fontSize: '1rem'
              }} 
            />
            {connectedAccount && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(connectedAccount);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: 'none',
                  color: '#3b82f6',
                  padding: '0 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            )}
          </div>
        </div>

        <button 
          onClick={handleCopyAndRedirect}
          style={{
            background: 'var(--accent-gradient)',
            border: 'none',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Go to Circle Faucet <ExternalLink size={20} />
        </button>

        <p style={{ color: '#666', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          Note: Circle's security policy prevents direct embedding. <br/>
          Clicking the button will copy your address and open the official faucet.
        </p>
      </div>
    </div>
  );
};
