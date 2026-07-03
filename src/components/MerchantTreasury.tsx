import React, { useState, useEffect } from 'react';
import { Code, CheckCircle, Play, FileCode2, Copy, Activity, Settings, Send, User, Coins, RefreshCw, ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import { BrowserProvider, parseUnits, formatUnits, Contract, JsonRpcProvider } from 'ethers';
import MerchantTreasuryArtifact from '../config/MerchantTreasuryArtifact.json';
import { saveTransaction } from '../lib/TransactionHistory';

interface MerchantTreasuryProps {
  connectedAccount: string | null;
  walletProvider: any;
}

const TOKEN_CONFIGS = {
  USDC: { address: '0x3600000000000000000000000000000000000000', decimals: 6, icon: '🪙' },
  EURC: { address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6, icon: '💶' },
  cirBTC: { address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF', decimals: 8, icon: '₿' }
};

type TokenType = 'USDC' | 'EURC' | 'cirBTC';

export const MerchantTreasury: React.FC<MerchantTreasuryProps> = ({ connectedAccount, walletProvider }) => {
  const initialContract = import.meta.env.VITE_CIRCLE_DEPLOYED_CONTRACT || '0x5e04b177d2848d937b8dde57a0c2a60d51af3d5b';
  const initialTx = import.meta.env.VITE_CIRCLE_DEPLOY_TX_HASH || '0x639b0d0bb92940c05fa949b5d91bfdb4c876666ecdf5bf68903225e0a319c566';

  const [selectedToken, setSelectedToken] = useState<TokenType>('USDC');
  const [activeTab, setActiveTab] = useState<'deploy' | 'interact'>(initialContract ? 'interact' : 'deploy');
  const [loading, setLoading] = useState(false);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string>(initialContract);
  const [deploymentTxHash, setDeploymentTxHash] = useState<string>(initialTx);
  const [circleDeploymentId, setCircleDeploymentId] = useState<string>('');

  // Settings state (Circle Credentials)
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_CIRCLE_API_KEY || '');
  const [walletId, setWalletId] = useState(import.meta.env.VITE_CIRCLE_WALLET_ID || '');
  const [entitySecret, setEntitySecret] = useState(import.meta.env.VITE_CIRCLE_ENTITY_SECRET || '');

  // Constructor Inputs
  const [ownerAddress, setOwnerAddress] = useState(connectedAccount || '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e'); // Default to deployer
  const [usdcAddress, setUsdcAddress] = useState(TOKEN_CONFIGS.USDC.address);

  // Interaction Inputs & State
  const [depositAmount, setDepositAmount] = useState('10');
  const [vaultBalance, setVaultBalance] = useState<string>('0');
  const [vaultOwner, setVaultOwner] = useState<string>('');
  const [vaultUsdcAddress, setVaultUsdcAddress] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setUsdcAddress(TOKEN_CONFIGS[selectedToken].address);
    setVaultBalance('0');
    
    if (selectedToken === 'USDC') {
      const usdcContract = import.meta.env.VITE_CIRCLE_DEPLOYED_CONTRACT || '0x5e04b177d2848d937b8dde57a0c2a60d51af3d5b';
      const usdcTx = import.meta.env.VITE_CIRCLE_DEPLOY_TX_HASH || '0x639b0d0bb92940c05fa949b5d91bfdb4c876666ecdf5bf68903225e0a319c566';
      setDeployedContractAddress(usdcContract);
      setDeploymentTxHash(usdcTx);
      setIsSimulated(false);
    } else {
      setDeployedContractAddress('');
      setDeploymentTxHash('');
      setIsSimulated(false);
    }
  }, [selectedToken]);

  useEffect(() => {
    if (connectedAccount && (!ownerAddress || ownerAddress === '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e')) {
      setOwnerAddress(connectedAccount);
    }
  }, [connectedAccount]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // Switch tabs handler
  const handleTabChange = (tab: 'deploy' | 'interact') => {
    if (tab === 'interact' && !deployedContractAddress) {
      // Auto pre-populate a mock address and turn on simulation mode so user is never blocked
      const mockAddr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
      setDeployedContractAddress(mockAddr);
      setIsSimulated(true);
      addLog(`[SIMULATION] No contract deployed yet for ${selectedToken}. Loaded a simulated contract address to play.`);
    }
    setActiveTab(tab);
  };

  // 1. Deployment Handler
  const handleDeploy = async () => {
    if (!ownerAddress || !usdcAddress) {
      alert('Please fill in both Owner Address and Token Address!');
      return;
    }

    setLoading(true);
    setLogs([]);
    addLog(`Starting MerchantTreasury deployment for ${selectedToken}...`);

    // Check if we can do real deploy via Circle SCP
    if (apiKey && walletId && entitySecret) {
      addLog(`Circle API credentials found. Submitting deployment request...`);
      try {
        const uuid = Array.from({length: 36}, () => Math.floor(Math.random()*16).toString(16)).join('');
        const response = await fetch('https://api.circle.com/v1/w3s/smart-contracts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Request-Id': uuid
          },
          body: JSON.stringify({
            name: `MerchantTreasury_${selectedToken}`,
            description: `Custom ${selectedToken} treasury contract deployed via UI`,
            blockchain: "ARC-TESTNET",
            walletId: walletId,
            abiJson: JSON.stringify(MerchantTreasuryArtifact.abi),
            bytecode: MerchantTreasuryArtifact.bytecode,
            constructorParameters: [ownerAddress, usdcAddress],
            fee: {
              type: "level",
              config: {
                feeLevel: "MEDIUM"
              }
            }
          })
        });

        const data = await response.json();
        if (response.ok && data.data && data.data.contractId) {
          addLog(`Deployment request accepted by Circle.`);
          addLog(`Circle Contract ID: ${data.data.contractId}`);
          addLog(`Circle Deployment Transaction ID: ${data.data.transactionId}`);
          setCircleDeploymentId(data.data.contractId);
          setIsSimulated(false);

          // We wait and poll status
          addLog(`Polling deployment status from Circle...`);
          pollCircleDeploymentStatus(data.data.contractId);
        } else {
          const errMsg = data.message || JSON.stringify(data);
          addLog(`Circle API Error: ${errMsg}. Falling back to Simulation...`);
          runSimulation();
        }
      } catch (err: any) {
        addLog(`Circle API connection error: ${err.message || err}. Falling back to Simulation...`);
        runSimulation();
      }
    } else {
      addLog(`No Circle API credentials found. Falling back to Simulation...`);
      runSimulation();
    }
  };

  const pollCircleDeploymentStatus = async (contractId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 15) {
        clearInterval(interval);
        addLog(`Deployment timeout. Please manually click 'Check Circle Status'.`);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://api.circle.com/v1/w3s/smart-contracts/${contractId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        const data = await response.json();
        if (response.ok && data.data) {
          const status = data.data.status;
          addLog(`Current deploy status: ${status}`);
          if (data.data.contractAddress) {
            clearInterval(interval);
            addLog(`Contract deployed successfully! Address: ${data.data.contractAddress}`);
            setDeployedContractAddress(data.data.contractAddress);
            if (data.data.txHash) setDeploymentTxHash(data.data.txHash);
            setLoading(false);
            setActiveTab('interact');
          }
        }
      } catch (err: any) {
        console.error("Poll error:", err);
      }
    }, 4000);
  };

  const runSimulation = () => {
    setIsSimulated(true);
    setTimeout(() => {
      const mockAddr = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
      const mockTx = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      addLog(`[SIMULATION] Contract deployed successfully!`);
      addLog(`[SIMULATION] Address: ${mockAddr}`);
      addLog(`[SIMULATION] Tx Hash: ${mockTx}`);
      setDeployedContractAddress(mockAddr);
      setDeploymentTxHash(mockTx);
      setLoading(false);
      setActiveTab('interact');
    }, 2000);
  };

  // 2. Interaction Handlers
  const fetchOnChainHistory = async () => {
    if (!deployedContractAddress) return;
    if (isSimulated) {
      setTxHistory([
        {
          id: 'mock-1',
          type: 'deposit',
          action: 'Deposit to Vault',
          address: connectedAccount || '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e',
          amount: depositAmount || '10.0',
          txHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
          blockNumber: 1250321,
          timestamp: Date.now() - 3600 * 1000 * 2,
        },
        {
          id: 'mock-2',
          type: 'withdraw',
          action: 'Withdraw from Vault',
          address: ownerAddress,
          amount: '15.0',
          txHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
          blockNumber: 1250210,
          timestamp: Date.now() - 3600 * 1000 * 24,
        },
        {
          id: 'mock-3',
          type: 'swap',
          action: 'Swap: USDC → EURC',
          address: connectedAccount || '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e',
          amount: '50.0',
          tokenSymbol: 'USDC',
          txHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
          blockNumber: 1250150,
          timestamp: Date.now() - 3600 * 1000 * 48,
        }
      ]);
      return;
    }

    setHistoryLoading(true);
    try {
      let provider;
      if (walletProvider) {
        provider = new BrowserProvider(walletProvider);
      } else {
        provider = new JsonRpcProvider('https://rpc.testnet.arc.network');
      }

      const contract = new Contract(deployedContractAddress, MerchantTreasuryArtifact.abi, provider);

      // Query events
      const depositFilter = contract.filters.PaymentReceived();
      const withdrawFilter = contract.filters.FundsWithdrawn();

      const [depositEvents, withdrawEvents] = await Promise.all([
        contract.queryFilter(depositFilter, 0, 'latest'),
        contract.queryFilter(withdrawFilter, 0, 'latest')
      ]);

      let swapEvents: any[] = [];
      try {
        if (contract.filters.SwapRouted) {
          const swapFilter = contract.filters.SwapRouted();
          swapEvents = await contract.queryFilter(swapFilter, 0, 'latest');
        }
      } catch (e) {
        console.warn("SwapRouted filter query failed", e);
      }

      const formattedTxs: any[] = [];
      const decimals = TOKEN_CONFIGS[selectedToken].decimals;

      // Map deposit events
      for (const event of depositEvents) {
        if ('args' in event && event.args) {
          const sender = event.args[0];
          const amount = event.args[1];
          formattedTxs.push({
            id: `dep-${event.transactionHash}-${event.index}`,
            type: 'deposit',
            action: 'Deposit to Vault',
            address: sender,
            amount: formatUnits(amount, decimals),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: 0,
          });
        }
      }

      // Map withdraw events
      for (const event of withdrawEvents) {
        if ('args' in event && event.args) {
          const to = event.args[0];
          const amount = event.args[1];
          formattedTxs.push({
            id: `wit-${event.transactionHash}-${event.index}`,
            type: 'withdraw',
            action: 'Withdraw from Vault',
            address: to,
            amount: formatUnits(amount, decimals),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: 0,
          });
        }
      }

      // Map swap events
      for (const event of swapEvents) {
        if ('args' in event && event.args) {
          const user = event.args[0];
          const tokenInAddr = event.args[1];
          const tokenOutAddr = event.args[2];
          const amountInVal = event.args[3];

          let inSymbol = 'USDC';
          let inDecimals = 6;
          if (tokenInAddr.toLowerCase() === TOKEN_CONFIGS.EURC.address.toLowerCase()) {
            inSymbol = 'EURC';
            inDecimals = 6;
          } else if (tokenInAddr.toLowerCase() === TOKEN_CONFIGS.cirBTC.address.toLowerCase()) {
            inSymbol = 'cirBTC';
            inDecimals = 8;
          } else if (tokenInAddr === '0x0000000000000000000000000000000000000000') {
            inSymbol = 'USDC';
            inDecimals = 18;
          }

          let outSymbol = 'EURC';
          if (tokenOutAddr.toLowerCase() === TOKEN_CONFIGS.USDC.address.toLowerCase()) {
            outSymbol = 'USDC';
          } else if (tokenOutAddr.toLowerCase() === TOKEN_CONFIGS.cirBTC.address.toLowerCase()) {
            outSymbol = 'cirBTC';
          } else if (tokenOutAddr === '0x0000000000000000000000000000000000000000') {
            outSymbol = 'USDC';
          }

          formattedTxs.push({
            id: `swap-${event.transactionHash}-${event.index}`,
            type: 'swap',
            action: `Swap: ${inSymbol} → ${outSymbol}`,
            address: user,
            amount: formatUnits(amountInVal, inDecimals),
            tokenSymbol: inSymbol,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: 0,
          });
        }
      }

      // Sort by blockNumber descending, then fetch timestamps for the top 10
      formattedTxs.sort((a, b) => b.blockNumber - a.blockNumber);
      const topTxs = formattedTxs.slice(0, 10);

      // Fetch block timestamps in parallel
      await Promise.all(topTxs.map(async (tx) => {
        try {
          const block = await provider.getBlock(tx.blockNumber);
          if (block) {
            tx.timestamp = block.timestamp * 1000;
          }
        } catch (e) {
          console.warn(`Failed to fetch block ${tx.blockNumber}`, e);
        }
      }));

      setTxHistory(topTxs);
    } catch (e) {
      console.error("Error fetching event history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!deployedContractAddress) return;
    setIsRefreshing(true);
    addLog(`Updating contract state...`);

    if (isSimulated) {
      // Simulation values
      setTimeout(() => {
        setVaultOwner(ownerAddress);
        setVaultUsdcAddress(usdcAddress);
        setIsRefreshing(false);
        addLog(`[SIMULATION] Refreshed successfully.`);
        fetchOnChainHistory();
      }, 1000);
      return;
    }

    try {
      let provider;
      if (walletProvider) {
        provider = new BrowserProvider(walletProvider);
      } else {
        // Fallback to public JsonRpcProvider for read-only calls
        provider = new JsonRpcProvider('https://rpc.testnet.arc.network');
      }

      const contract = new Contract(deployedContractAddress, MerchantTreasuryArtifact.abi, provider);

      const ownerVal = await contract.owner();
      const usdcVal = await contract.usdc();
      const balanceVal = await contract.balance();

      setVaultOwner(ownerVal);
      setVaultUsdcAddress(usdcVal);
      
      const decimals = TOKEN_CONFIGS[selectedToken].decimals;
      setVaultBalance(formatUnits(balanceVal, decimals));

      addLog(`On-chain state updated successfully.`);
      addLog(`Treasury balance: ${formatUnits(balanceVal, decimals)} ${selectedToken}`);
      
      fetchOnChainHistory();
    } catch (err: any) {
      addLog(`Error querying on-chain state: ${err.message || err}`);
      if (!vaultOwner) {
        setVaultOwner(ownerAddress);
        setVaultUsdcAddress(usdcAddress);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Automatic refresh on address set
  useEffect(() => {
    if (deployedContractAddress) {
      handleRefresh();
    }
  }, [deployedContractAddress]);

  const handleDeposit = async () => {
    if (!deployedContractAddress || !depositAmount) return;
    setLoading(true);
    addLog(`Sending request to deposit ${depositAmount} ${selectedToken} into vault...`);

    if (isSimulated || !walletProvider) {
      setTimeout(() => {
        const mockTx = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        setVaultBalance(prev => (parseFloat(prev) + parseFloat(depositAmount)).toString());
        addLog(`[SIMULATION] Deposit successful! Tx Hash: ${mockTx}`);
        saveTransaction({
          id: `tx-dep-${Date.now()}`,
          action: `Deposit to Vault (Simulated)`,
          amount: depositAmount,
          from: connectedAccount || '0xUser',
          to: deployedContractAddress,
          txHash: mockTx,
          status: 'COMPLETE',
          timestamp: Date.now(),
          tokenSymbol: selectedToken
        });
        setLoading(false);
        handleRefresh();
      }, 1500);
      return;
    }

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      
      const usdcContract = new Contract(usdcAddress, [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
      ], signer);

      const treasuryContract = new Contract(deployedContractAddress, MerchantTreasuryArtifact.abi, signer);

      const decimals = TOKEN_CONFIGS[selectedToken].decimals;
      const amountUnits = parseUnits(depositAmount, decimals);

      // Check allowance
      addLog(`Step 1: Checking and requesting ${selectedToken} approval...`);
      const approveTx = await usdcContract.approve(deployedContractAddress, amountUnits);
      addLog(`Approve transaction submitted: ${approveTx.hash}. Waiting for confirmation...`);
      await approveTx.wait();
      addLog(`Approval successful!`);

      // Deposit
      addLog(`Step 2: Calling deposit() on vault contract...`);
      const depositTx = await treasuryContract.deposit(amountUnits);
      addLog(`Deposit transaction submitted: ${depositTx.hash}. Waiting for confirmation...`);
      const receipt = await depositTx.wait();
      
      addLog(`Deposit successful! Confirmed in block ${receipt.blockNumber}`);
      
      saveTransaction({
        id: `tx-dep-${Date.now()}`,
        action: `Deposit to ${selectedToken} Vault`,
        amount: depositAmount,
        from: connectedAccount || '',
        to: deployedContractAddress,
        txHash: depositTx.hash,
        status: 'COMPLETE',
        explorerUrl: `https://testnet.arcscan.app/tx/${depositTx.hash}`,
        timestamp: Date.now(),
        tokenSymbol: selectedToken
      });

      handleRefresh();
    } catch (err: any) {
      addLog(`Deposit transaction failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!deployedContractAddress) return;
    setLoading(true);
    addLog(`Sending withdrawal request...`);

    if (isSimulated || !walletProvider) {
      setTimeout(() => {
        const mockTx = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        setVaultBalance('0');
        addLog(`[SIMULATION] Withdrawal successful! Tx Hash: ${mockTx}`);
        saveTransaction({
          id: `tx-wit-${Date.now()}`,
          action: `Withdraw from Vault (Simulated)`,
          amount: vaultBalance,
          from: deployedContractAddress,
          to: connectedAccount || '0xUser',
          txHash: mockTx,
          status: 'COMPLETE',
          timestamp: Date.now(),
          tokenSymbol: selectedToken
        });
        setLoading(false);
        handleRefresh();
      }, 1500);
      return;
    }

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const treasuryContract = new Contract(deployedContractAddress, MerchantTreasuryArtifact.abi, signer);

      addLog(`Signing withdrawal transaction...`);
      const withdrawTx = await treasuryContract.withdraw();
      addLog(`Withdrawal transaction submitted: ${withdrawTx.hash}. Waiting for confirmation...`);
      const receipt = await withdrawTx.wait();
      
      addLog(`Successfully withdrew all funds to Owner! [Block: ${receipt.blockNumber}]`);

      saveTransaction({
        id: `tx-wit-${Date.now()}`,
        action: `Withdraw from ${selectedToken} Vault`,
        amount: vaultBalance,
        from: deployedContractAddress,
        to: connectedAccount || '',
        txHash: withdrawTx.hash,
        status: 'COMPLETE',
        explorerUrl: `https://testnet.arcscan.app/tx/${withdrawTx.hash}`,
        timestamp: Date.now(),
        tokenSymbol: selectedToken
      });

      handleRefresh();
    } catch (err: any) {
      addLog(`Withdrawal transaction failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCircleStatus = async () => {
    if (!circleDeploymentId) return;
    try {
      const response = await fetch(`https://api.circle.com/v1/w3s/smart-contracts/${circleDeploymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      const data = await response.json();
      if (response.ok && data.data) {
        alert(`Circle API Status:\n- Contract ID: ${circleDeploymentId}\n- Status: ${data.data.status}\n- Address: ${data.data.contractAddress || 'Pending'}`);
        if (data.data.contractAddress) {
          setDeployedContractAddress(data.data.contractAddress);
        }
      } else {
        alert(`API Error: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message || err}`);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Code size={24} color="#a78bfa" /> Custom Circle Smart Contract</h1>
          <p className="page-subtitle">Deploy and interact with your custom Solidity contract using Circle SCP</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        
        {/* Token selection dropdown bar */}
        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: 500 }}>Select Asset to Manage:</span>
          <select 
            value={selectedToken}
            onChange={(e) => {
              setSelectedToken(e.target.value as TokenType);
              // Clear current deployed contract to force redeploy or manual load for the new token
              setDeployedContractAddress('');
              setDeploymentTxHash('');
            }}
            className="form-select"
            style={{ width: 'auto', minWidth: '240px', margin: 0, padding: '0.4rem 2rem 0.4rem 0.8rem' }}
          >
            <option value="USDC">USDC (USD Coin)</option>
            <option value="EURC">EURC (Euro Coin)</option>
            <option value="cirBTC">cirBTC (Circle Wrapped BTC)</option>
          </select>
        </div>

        <div className="app-kit-tabs">
          <button 
            className={`app-kit-tab ${activeTab === 'deploy' ? 'active' : ''}`}
            onClick={() => handleTabChange('deploy')}
          >
            <FileCode2 size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
            1. Compile & Deploy
          </button>
          <button 
            className={`app-kit-tab ${activeTab === 'interact' ? 'active' : ''}`}
            onClick={() => handleTabChange('interact')}
            style={{ cursor: 'pointer', opacity: 1 }}
          >
            <Activity size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
            2. Manage & Interact
          </button>
        </div>

        <div className="app-kit-content" style={{ minHeight: '350px' }}>
          {activeTab === 'deploy' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Credentials & Settings collapsible drawer */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a1a1aa' }}>
                    <Settings size={18} /> Credentials & Settings (Circle Developer APIs)
                  </h3>
                  <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>{showSettings ? 'Hide' : 'Show'}</span>
                </div>
                
                {showSettings && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group">
                      <label className="input-label">Circle Developer API Key</label>
                      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="kit-input" placeholder="TEST_API_KEY:..." />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Developer Wallet ID</label>
                      <input type="text" value={walletId} onChange={(e) => setWalletId(e.target.value)} className="kit-input" placeholder="82a4d3..." />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Entity Secret Ciphertext</label>
                      <textarea 
                        rows={2} 
                        value={entitySecret} 
                        onChange={(e) => setEntitySecret(e.target.value)} 
                        className="kit-input"
                        placeholder="Paste your encrypted entity secret ciphertext here"
                        style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Deployment Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label"><User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} /> Owner Address (Admin Wallet Address)</label>
                  <input 
                    type="text" 
                    className="kit-input" 
                    placeholder="0x..."
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label"><Coins size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} /> {selectedToken} Token Address on Arc</label>
                  <input 
                    type="text" 
                    className="kit-input" 
                    placeholder="0x..."
                    value={usdcAddress}
                    onChange={(e) => setUsdcAddress(e.target.value)}
                    readOnly
                    style={{ opacity: 0.8, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Contract Preview Card */}
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: '#fff', margin: 0, fontSize: '0.9rem' }}>MerchantTreasury.sol (Compiled)</h4>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.3)' }}>Solidity v0.8.20</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div>
                    <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: '#a1a1aa', maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
{`contract MerchantTreasury {
    address public immutable owner;
    IERC20 public immutable token; // generic ERC-20 token

    constructor(address _owner, address _token) {
        owner = _owner;
        token = IERC20(_token);
    }

    function deposit(uint256 amount) external;
    function withdraw() external;
    function balance() external view returns (uint256);
}`}
                    </pre>
                  </div>
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>ABI Size: {MerchantTreasuryArtifact.abi.length} elements</div>
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Decimals: {TOKEN_CONFIGS[selectedToken].decimals} units</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Already deployed quick-load */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Or load a previously deployed contract address:</label>
                  <input 
                    type="text" 
                    placeholder="0x..." 
                    value={deployedContractAddress} 
                    onChange={(e) => {
                      setDeployedContractAddress(e.target.value);
                      setIsSimulated(false);
                    }} 
                    className="kit-input" 
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} 
                  />
                </div>
                {deployedContractAddress && (
                  <button 
                    onClick={() => setActiveTab('interact')} 
                    className="kit-action-btn" 
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', width: 'auto', marginTop: 0 }}
                  >
                    Manage
                  </button>
                )}
              </div>

              <button 
                className="kit-action-btn" 
                onClick={handleDeploy}
                disabled={loading || !ownerAddress || !usdcAddress}
                style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.9rem' }}
              >
                {loading ? (
                  <>Deploying Smart Contract...</>
                ) : (
                  <><Play size={18} /> Deploy Smart Contract</>
                )}
              </button>
            </div>
          )}

          {activeTab === 'interact' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Contract Status Banner */}
              <div style={{ padding: '1.2rem', background: isSimulated ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${isSimulated ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`, borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle color={isSimulated ? '#60a5fa' : '#34d399'} size={22} />
                    <h3 style={{ color: isSimulated ? '#60a5fa' : '#34d399', margin: 0, fontSize: '1.1rem' }}>
                      {isSimulated ? `Treasury Vault (Simulated Active)` : `Treasury Vault (On-Chain Active)`}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        setIsSimulated(!isSimulated);
                        addLog(`Switched mode to ${!isSimulated ? 'Simulated' : 'Live On-Chain'}`);
                      }}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: isSimulated ? '#60a5fa' : '#34d399', 
                        cursor: 'pointer', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      Mode: {isSimulated ? 'Simulated 🧪' : 'Live On-Chain 🌐'}
                    </button>
                    <button 
                      onClick={handleRefresh} 
                      disabled={isRefreshing}
                      style={{ background: 'transparent', border: 'none', color: '#c084fc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                    >
                      <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh Balance
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#a1a1aa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Contract Address:</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff', cursor: 'pointer' }} onClick={() => handleCopy(deployedContractAddress)}>
                      {deployedContractAddress} <Copy size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                    </span>
                  </div>
                  {deploymentTxHash && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Deploy Tx Hash:</span>
                      <span style={{ fontFamily: 'monospace', color: '#fff', cursor: 'pointer' }} onClick={() => handleCopy(deploymentTxHash)}>
                        {deploymentTxHash.slice(0, 10)}...{deploymentTxHash.slice(-8)} <Copy size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{selectedToken} Token Address:</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>{vaultUsdcAddress || usdcAddress}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Owner (Admin):</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>{vaultOwner || ownerAddress}</span>
                  </div>
                </div>
              </div>

              {/* Balance Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600 }}>{selectedToken} Balance in Vault</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
                  {vaultBalance} <span style={{ fontSize: '1.2rem', color: '#a78bfa' }}>{selectedToken}</span>
                </span>
              </div>

              {/* Action grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* Deposit Form */}
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Send size={16} color="#c084fc" /> Deposit {selectedToken}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <input 
                      type="number" 
                      value={depositAmount} 
                      onChange={(e) => setDepositAmount(e.target.value)} 
                      className="kit-input" 
                      placeholder={`${selectedToken} Amount`} 
                      style={{ flex: 1, minWidth: '150px' }}
                    />
                    <button 
                      onClick={handleDeposit} 
                      disabled={loading || !depositAmount}
                      className="kit-action-btn"
                      style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', width: 'auto', whiteSpace: 'nowrap', padding: '0.75rem 1.5rem', marginTop: 0 }}
                    >
                      Deposit
                    </button>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#71717a' }}>
                    * Requires MetaMask approval (Approve) and {selectedToken} transfer transaction.
                  </p>
                </div>

                {/* Withdraw Form (Owner Only) */}
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', height: '100%' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🔓 Withdraw Funds
                  </h4>
                  <button 
                    onClick={handleWithdraw} 
                    disabled={loading || parseFloat(vaultBalance) <= 0}
                    className="kit-action-btn"
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: 0 }}
                  >
                    Withdraw all funds to Owner
                  </button>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#71717a', textAlign: 'center' }}>
                    * Only the Admin/Owner wallet address has withdraw permission.
                  </p>
                </div>

              </div>

              {/* On-Chain Treasury Activity Card */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} color="#a78bfa" /> On-Chain Treasury Activity
                  </h4>
                  <button 
                    onClick={fetchOnChainHistory} 
                    disabled={historyLoading || isRefreshing}
                    style={{ background: 'transparent', border: 'none', color: '#c084fc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                  >
                    <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} /> Sync History
                  </button>
                </div>

                {historyLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
                    Querying on-chain logs...
                  </div>
                ) : txHistory.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a', fontSize: '0.9rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    No deposits or withdrawals recorded yet for this contract address.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {txHistory.map((tx) => {
                      const isDeposit = tx.type === 'deposit';
                      const isWithdraw = tx.type === 'withdraw';
                      const isSwap = tx.type === 'swap';

                      let bg = 'rgba(239, 68, 68, 0.03)';
                      let border = 'rgba(239, 68, 68, 0.1)';
                      let iconBg = 'rgba(239, 68, 68, 0.1)';
                      let iconColor = '#f87171';
                      let icon = <ArrowUpRight size={18} />;

                      if (isDeposit) {
                        bg = 'rgba(16, 185, 129, 0.03)';
                        border = 'rgba(16, 185, 129, 0.1)';
                        iconBg = 'rgba(16, 185, 129, 0.1)';
                        iconColor = '#34d399';
                        icon = <ArrowDownLeft size={18} />;
                      } else if (isSwap) {
                        bg = 'rgba(167, 139, 250, 0.03)';
                        border = 'rgba(167, 139, 250, 0.1)';
                        iconBg = 'rgba(167, 139, 250, 0.1)';
                        iconColor = '#a78bfa';
                        icon = <Coins size={18} />;
                      }

                      return (
                        <div 
                          key={tx.id} 
                          style={{ 
                            background: bg, 
                            border: `1px solid ${border}`, 
                            borderRadius: '10px', 
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                              width: '36px', 
                              height: '36px', 
                              borderRadius: '8px', 
                              background: iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: iconColor
                            }}>
                              {icon}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                                {isDeposit ? 'Deposit Received' : isWithdraw ? 'Funds Withdrawn' : tx.action}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#a1a1aa', fontFamily: 'monospace' }}>
                                {isDeposit ? 'From: ' : isWithdraw ? 'To: ' : 'User: '}{tx.address.slice(0, 6)}...{tx.address.slice(-4)}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            <div style={{ fontWeight: 700, color: isDeposit ? '#34d399' : isWithdraw ? '#f87171' : '#a78bfa', fontSize: '1rem' }}>
                              {isDeposit ? '+' : isWithdraw ? '-' : '⇄ '}{parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {tx.tokenSymbol || selectedToken}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : `Block #${tx.blockNumber}`}</span>
                              {!isSimulated && tx.txHash && (
                                <a 
                                  href={`https://testnet.arcscan.app/tx/${tx.txHash}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ color: '#c084fc', display: 'inline-flex', alignItems: 'center' }}
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Circle API status checking for real deploy */}
              {!isSimulated && circleDeploymentId && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={handleCheckCircleStatus} 
                    className="kit-action-btn"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Check Deploy Status on Circle Console
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Logs Terminal */}
          {logs.length > 0 && (
            <div style={{ marginTop: '1.5rem', background: '#0b0c10', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Console Log Terminal</span>
                <button onClick={() => setLogs([])} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.75rem' }}>Clear logs</button>
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: '#34d399', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
