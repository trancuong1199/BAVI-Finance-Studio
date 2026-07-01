import React, { useState } from 'react';
import { Code, CheckCircle, Clock, Play, FileCode2, Copy, ExternalLink, Activity, Settings } from 'lucide-react';

export const CircleSmartContracts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deploy' | 'manage'>('deploy');
  const [template, setTemplate] = useState('ERC20');
  const [contractName, setContractName] = useState('');
  const [contractSymbol, setContractSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [deployedContract, setDeployedContract] = useState<string | null>(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_CIRCLE_API_KEY || '');
  const [walletId, setWalletId] = useState(import.meta.env.VITE_CIRCLE_WALLET_ID || '');
  const [entitySecret, setEntitySecret] = useState(import.meta.env.VITE_CIRCLE_ENTITY_SECRET || '');
  const [templateId, setTemplateId] = useState(import.meta.env.VITE_CIRCLE_TEMPLATE_ID || ''); // User provides the Circle Template UUID

  const runSimulation = () => {
    setTimeout(() => {
      setDeployedContract('0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''));
      setLoading(false);
      setActiveTab('manage');
    }, 2500);
  };

  const handleDeploy = async () => {
    if (!contractName || !contractSymbol) return;
    
    setLoading(true);
    
    // Check if we have credentials for a real deployment
    if (apiKey && walletId && entitySecret && templateId) {
      try {
        const uuid = Array.from({length:36}, () => Math.floor(Math.random()*16).toString(16)).join('');
        const response = await fetch('https://api-sandbox.circle.com/v1/w3s/smart-contracts/templates/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Request-Id': uuid
          },
          body: JSON.stringify({
            templateId: templateId,
            walletId: walletId,
            blockchain: 'ETH-SEPOLIA',
            feeLevel: 'MEDIUM',
            entitySecretCiphertext: entitySecret,
            templateParameters: {
              name: contractName,
              symbol: contractSymbol,
              defaultAdmin: '0xb59b2C4efDAe4a9d9eb497E435cF25b65001D224', // Default to user address
              primarySaleRecipient: '0xb59b2C4efDAe4a9d9eb497E435cF25b65001D224'
            }
          })
        });

        const data = await response.json();
        if (response.ok && data.data && data.data.id) {
          // Success: Store the deployment ID in state
          setDeployedContract(data.data.id);
          setLoading(false);
          setActiveTab('manage');
          alert(`Smart Contract deployment initiated!\nDeployment ID: ${data.data.id}\n\nPlease click "Check API Status" in the next tab to monitor deployment progress.`);
        } else {
          const errMsg = data.message || JSON.stringify(data);
          alert(`Circle API error: ${errMsg}\n\nFalling back to simulated deployment...`);
          runSimulation();
        }
      } catch (err: any) {
        console.error("Circle deploy error:", err);
        alert(`Failed to call Circle API (CORS/Network error): ${err.message || err}\n\nFalling back to simulated deployment...`);
        runSimulation();
      }
    } else {
      // Missing credentials, run simulation
      runSimulation();
    }
  };

  const handleCheckStatus = async () => {
    if (!deployedContract) return;

    // If it looks like a deployment ID (not starting with 0x) and we have apiKey
    if (!deployedContract.startsWith('0x') && apiKey) {
      try {
        const response = await fetch(`https://api-sandbox.circle.com/v1/w3s/smart-contracts/deployments/${deployedContract}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        const data = await response.json();
        if (response.ok && data.data) {
          const status = data.data.status;
          const contractAddress = data.data.contractAddress || 'Not deployed yet';
          alert(`Deployment ID: ${deployedContract}\nStatus: ${status}\nContract Address: ${contractAddress}`);
          if (data.data.contractAddress) {
            setDeployedContract(data.data.contractAddress); // Update state to contract address once complete!
          }
        } else {
          alert(`Error checking status: ${data.message || JSON.stringify(data)}`);
        }
      } catch (err: any) {
        alert(`Network error checking status: ${err.message || err}`);
      }
    } else {
      // Fake mock alert
      alert(`Checking status on Circle SCP...\n\nContract Address: ${deployedContract}\nStatus: ACTIVE\nNetwork: Ethereum Sepolia`);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Code size={24} color="#3b82f6" /> Circle Smart Contracts</h1>
          <p className="page-subtitle">Deploy and manage contracts using Circle's Smart Contract Platform</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="app-kit-tabs">
          <button 
            className={`app-kit-tab ${activeTab === 'deploy' ? 'active' : ''}`}
            onClick={() => setActiveTab('deploy')}
          >
            <FileCode2 size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
            Deploy Template
          </button>
          <button 
            className={`app-kit-tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            <Clock size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
            My Contracts
          </button>
        </div>

        <div className="app-kit-content" style={{ minHeight: '300px' }}>
          {activeTab === 'deploy' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Settings Section */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a1a1aa' }}>
                    <Settings size={18} /> Credentials & Settings
                  </h3>
                  <span style={{ color: '#a1a1aa' }}>{showSettings ? 'Hide' : 'Show'}</span>
                </div>
                
                {showSettings && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group">
                      <label className="input-label">Circle API Key</label>
                      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="kit-input" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Developer Wallet ID</label>
                      <input type="text" placeholder="e.g. 82a4d3..." value={walletId} onChange={(e) => setWalletId(e.target.value)} className="kit-input" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Template ID (UUID)</label>
                      <input type="text" placeholder="e.g. 6c9... (UUID from Circle Console)" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="kit-input" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Entity Secret Ciphertext</label>
                      <textarea 
                        rows={2} 
                        placeholder="Paste your encrypted entity secret ciphertext here" 
                        value={entitySecret} 
                        onChange={(e) => setEntitySecret(e.target.value)} 
                        className="kit-input"
                        style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Deploy Section */}
              <div className="input-group">
                <label className="input-label">Select Template Type</label>
                <select 
                  className="kit-input" 
                  value={template} 
                  onChange={(e) => setTemplate(e.target.value)}
                  style={{ cursor: 'pointer', appearance: 'none' }}
                >
                  <option value="ERC20">ERC-20 Token (Standard)</option>
                  <option value="ERC721">ERC-721 NFT Collection</option>
                  <option value="MultiSig">Multi-Signature Wallet</option>
                </select>
              </div>

              <div style={{ background: 'rgba(167, 139, 250, 0.05)', border: '1px dashed rgba(167, 139, 250, 0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: '#c084fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>💡 Bạn muốn deploy một <strong>Smart Contract Solidity tùy chỉnh</strong>?</span>
                <a href="/merchant-treasury" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/merchant-treasury'); window.dispatchEvent(new PopStateEvent('popstate')); }} style={{ textDecoration: 'underline', fontWeight: 600, color: '#a78bfa' }}>
                  Thử Custom Contract
                </a>
              </div>

              <div className="input-group">
                <label className="input-label">Contract Name</label>
                <input 
                  type="text" 
                  className="kit-input" 
                  placeholder="e.g. Arc Governance Token"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Symbol</label>
                <input 
                  type="text" 
                  className="kit-input" 
                  placeholder="e.g. ARC"
                  value={contractSymbol}
                  onChange={(e) => setContractSymbol(e.target.value)}
                />
              </div>

              <button 
                className="kit-action-btn" 
                onClick={handleDeploy}
                disabled={loading || !contractName || !contractSymbol}
                style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
              >
                {loading ? (
                  <>Deploying via Circle SCP (Mock)...</>
                ) : (
                  <><Play size={18} /> Deploy Contract</>
                )}
              </button>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deployedContract ? (
                <div style={{ padding: '1.5rem', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <CheckCircle color="#4ade80" size={24} />
                    <h3 style={{ color: '#4ade80', margin: 0 }}>Deployment Initiated!</h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="input-group">
                      <label className="input-label">Contract / Transaction ID</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" readOnly value={deployedContract} className="kit-input" style={{ flex: 1, fontFamily: 'monospace', fontSize: '1rem' }} />
                        <button className="action-btn" title="Copy"><Copy size={18} /></button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div className="input-group">
                        <label className="input-label">Name</label>
                        <div className="kit-display" style={{ fontSize: '1rem' }}>{contractName}</div>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Symbol</label>
                        <div className="kit-display" style={{ fontSize: '1rem' }}>{contractSymbol}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                      <a 
                        href={`https://sepolia.etherscan.io/address/${deployedContract}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="kit-action-btn"
                        style={{ textDecoration: 'none', textAlign: 'center', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                      >
                        <ExternalLink size={18} /> View on Explorer
                      </a>
                      <button 
                        className="kit-action-btn"
                        style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                        onClick={handleCheckStatus}
                      >
                        <Activity size={18} /> Check API Status
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  <Code size={48} opacity={0.5} style={{ margin: '0 auto 1rem' }} />
                  <h3>No Contracts Deployed</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Deploy a template from the deploy tab to see it here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
