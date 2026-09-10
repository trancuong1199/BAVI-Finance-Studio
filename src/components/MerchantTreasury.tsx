import { confirmTransaction } from '../lib/swapSafety';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Play, FileCode2, Copy, Activity, Send, User, Coins, RefreshCw, ArrowDownLeft, ArrowUpRight, ExternalLink, Landmark } from 'lucide-react';
import { BrowserProvider, parseUnits, formatUnits, Contract, ContractFactory, isAddress } from 'ethers';
import MerchantTreasuryArtifact from '../config/MerchantTreasuryArtifact.json';
import { saveTransaction } from '../lib/TransactionHistory';
import { switchOrAddArcNetwork, globalRpcProvider } from '../utils/arcChain';

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

interface DeployedContracts {
  USDC: { address: string; txHash: string; isSimulated: boolean };
  EURC: { address: string; txHash: string; isSimulated: boolean };
  cirBTC: { address: string; txHash: string; isSimulated: boolean };
}

export const MerchantTreasury: React.FC<MerchantTreasuryProps> = ({ connectedAccount, walletProvider }) => {
  const initialContract = import.meta.env.VITE_CIRCLE_DEPLOYED_CONTRACT || '0x5e04b177d2848d937b8dde57a0c2a60d51af3d5b';
  const initialTx = import.meta.env.VITE_CIRCLE_DEPLOY_TX_HASH || '0x639b0d0bb92940c05fa949b5d91bfdb4c876666ecdf5bf68903225e0a319c566';

  const [contracts, setContracts] = useState<DeployedContracts>(() => {
    const saved = localStorage.getItem('arc_merchant_treasuries');
    const defaultEURC = '0x28805311caef7d48484b36cda5266449caeb493e';
    const defaultCirBTC = '0x06f9ca202abc362ff528b8c8c9617495db597d92';
    const defaultUSDC = initialContract;

    let loaded = {
      USDC: { address: defaultUSDC, txHash: initialTx, isSimulated: false },
      EURC: { address: defaultEURC, txHash: '0x16671fc68657ab32519753751ca3190023564cc9f83a01dd39f9c209df8c999b', isSimulated: false },
      cirBTC: { address: defaultCirBTC, txHash: '0x90ed667ae98888a8bd40aa7b8d44429710342584e8e97df05ba557acf316e640', isSimulated: false }
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.USDC && parsed.EURC && parsed.cirBTC) {
          loaded = parsed;

        }
      } catch (e) {
        console.error("Failed to parse saved contracts:", e);
      }
    }
    return loaded;
  });

  const [selectedToken, setSelectedToken] = useState<TokenType>('USDC');

  // Derived state from persisted contracts map
  const currentContract = contracts[selectedToken];
  const deployedContractAddress = currentContract.address;
  const deploymentTxHash = currentContract.txHash;
  const isSimulated = currentContract.isSimulated;

  const [activeTab, setActiveTab] = useState<'deploy' | 'interact'>(initialContract ? 'interact' : 'deploy');
  const [loading, setLoading] = useState(false);

  const updateContractState = (address: string, txHash: string, simulated: boolean) => {
    setContracts(prev => {
      const updated = {
        ...prev,
        [selectedToken]: { address, txHash, isSimulated: simulated }
      };
      localStorage.setItem('arc_merchant_treasuries', JSON.stringify(updated));
      return updated;
    });
  };

  const setDeployedContractAddress = (addr: string) => {
    setContracts(prev => {
      const updated = {
        ...prev,
        [selectedToken]: { ...prev[selectedToken], address: addr }
      };
      localStorage.setItem('arc_merchant_treasuries', JSON.stringify(updated));
      return updated;
    });
  };


  const setIsSimulated = (sim: boolean) => {
    setContracts(prev => {
      const updated = {
        ...prev,
        [selectedToken]: { ...prev[selectedToken], isSimulated: sim }
      };
      localStorage.setItem('arc_merchant_treasuries', JSON.stringify(updated));
      return updated;
    });
  };

  // Constructor Inputs
  const [ownerAddress, setOwnerAddress] = useState('');
  const [usdcAddress, setUsdcAddress] = useState(TOKEN_CONFIGS.USDC.address);

  // Interaction Inputs & State
  const [depositAmount, setDepositAmount] = useState('10');
  const [vaultBalance, setVaultBalance] = useState<string>('0');
  const [vaultOwner, setVaultOwner] = useState<string>('');
  const [vaultUsdcAddress, setVaultUsdcAddress] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [simulatedTransactions, setSimulatedTransactions] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const activeTabRef = React.useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    // Clear query states to avoid displaying stale data from other tokens
    setVaultBalance('0');
    setVaultOwner('');
    setVaultUsdcAddress('');
    setTxHistory([]);
    setUsdcAddress(TOKEN_CONFIGS[selectedToken].address);

    const existing = contracts[selectedToken];
    if (selectedToken === 'USDC' && !existing.address) {
      const usdcContract = import.meta.env.VITE_CIRCLE_DEPLOYED_CONTRACT || '0x5e04b177d2848d937b8dde57a0c2a60d51af3d5b';
      const usdcTx = import.meta.env.VITE_CIRCLE_DEPLOY_TX_HASH || '0x639b0d0bb92940c05fa949b5d91bfdb4c876666ecdf5bf68903225e0a319c566';
      updateContractState(usdcContract, usdcTx, false);
    } else if (selectedToken !== 'USDC' && !existing.address && activeTabRef.current === 'interact') {
      const mockAddr = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      updateContractState(mockAddr, '', true);
      addLog(`[SIMULATION] No contract deployed yet for ${selectedToken}. Loaded a simulated contract address to play.`);
    }
  }, [selectedToken]);

  useEffect(() => {
    if (connectedAccount && (!ownerAddress || ownerAddress === '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e')) {
      setOwnerAddress(connectedAccount);
    }
  }, [connectedAccount]);

  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (walletProvider) {
        try {
          const chainId = await walletProvider.request({ method: 'eth_chainId' });
          if (chainId && chainId.toLowerCase() === '0x4cef52') {
            setIsWrongNetwork(false);
          } else {
            setIsWrongNetwork(true);
          }
        } catch (e) {
          setIsWrongNetwork(false);
        }
      } else {
        setIsWrongNetwork(false);
      }
    };
    checkNetwork();

    if (walletProvider && walletProvider.on) {
      const handleChainChanged = (chainId: string) => {
        setIsWrongNetwork(chainId.toLowerCase() !== '0x4cef52');
        handleRefresh();
      };
      walletProvider.on('chainChanged', handleChainChanged);
      return () => {
        if (walletProvider.removeListener) {
          walletProvider.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [walletProvider, connectedAccount]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast('Copied to clipboard!');
  };

  // Switch tabs handler
  const handleTabChange = (tab: 'deploy' | 'interact') => {
    if (tab === 'interact' && !deployedContractAddress) {
      // Auto pre-populate a mock address and turn on simulation mode so user is never blocked
      const mockAddr = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setDeployedContractAddress(mockAddr);
      setIsSimulated(true);
      addLog(`[SIMULATION] No contract deployed yet for ${selectedToken}. Loaded a simulated contract address to play.`);
    }
    setActiveTab(tab);
  };

  // Deployment is signed by the connected wallet. No server credentials enter the browser.
  const handleDeploy = async () => {
    if (!walletProvider || !connectedAccount) {
      alert('Connect your wallet before deploying.');
      return;
    }
    const deploymentOwner = ownerAddress || connectedAccount;
    if (!isAddress(deploymentOwner) || !isAddress(usdcAddress)) {
      alert('Enter valid owner and token addresses.');
      return;
    }
    setLoading(true);
    setLogs([]);
    try {
      if (!await switchOrAddArcNetwork(walletProvider)) throw new Error('Switch to Arc Testnet first.');
      const provider = new BrowserProvider(walletProvider);
      if ((await provider.getNetwork()).chainId !== 5042002n) throw new Error('Arc Testnet is required.');
      const signer = await provider.getSigner();
      if ((await signer.getAddress()).toLowerCase() !== connectedAccount.toLowerCase()) throw new Error('Wallet account changed. Reconnect before deploying.');
      const factory = new ContractFactory(MerchantTreasuryArtifact.abi, MerchantTreasuryArtifact.bytecode, signer);
      addLog('Confirm treasury deployment in your wallet.');
      const contract = await factory.deploy(deploymentOwner, usdcAddress);
      const tx = contract.deploymentTransaction();
      if (!tx) throw new Error('Deployment transaction is unavailable.');
      const receipt = await confirmTransaction(tx);
      const address = await contract.getAddress();
      updateContractState(address, receipt.hash, false);
      addLog(`Deployment confirmed: ${address}`);
      setActiveTab('interact');
    } catch (err) {
      addLog(`Deployment failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Interaction Handlers
  const fetchOnChainHistory = async () => {
    if (!deployedContractAddress) return;
    if (isSimulated) {
      const defaultMocks = [
        {
          id: 'mock-1',
          type: 'deposit',
          action: 'Deposit to Vault',
          address: connectedAccount || '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e',
          amount: depositAmount || '10.0',
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          blockNumber: 1250321,
          timestamp: Date.now() - 3600 * 1000 * 2,
          isSimulated: true
        },
        {
          id: 'mock-2',
          type: 'withdraw',
          action: 'Withdraw from Vault',
          address: ownerAddress,
          amount: '15.0',
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          blockNumber: 1250210,
          timestamp: Date.now() - 3600 * 1000 * 24,
          isSimulated: true
        },
        {
          id: 'mock-3',
          type: 'swap',
          action: 'Swap: USDC → EURC',
          address: connectedAccount || '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e',
          amount: '50.0',
          tokenSymbol: 'USDC',
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          blockNumber: 1250150,
          timestamp: Date.now() - 3600 * 1000 * 48,
          isSimulated: true
        }
      ];
      const currentTokenSims = simulatedTransactions.filter(tx => tx.tokenSymbol === selectedToken);
      setTxHistory([...currentTokenSims, ...defaultMocks]);
      return;
    }

    setHistoryLoading(true);
    try {
      let provider = globalRpcProvider;
      try {
        if (walletProvider) {
          const chainId = await walletProvider.request({ method: 'eth_chainId' });
          if (chainId && chainId.toLowerCase() === '0x4cef52') {
            provider = new BrowserProvider(walletProvider) as any;
          }
        }
      } catch (e) { }

      const contract = new Contract(deployedContractAddress, MerchantTreasuryArtifact.abi, provider);

      // Query events in chunks of 10,000 blocks to comply with Arc RPC limit (maximum 10,000 range)
      const depositFilter = contract.filters.PaymentReceived();
      const withdrawFilter = contract.filters.FundsWithdrawn();

      const currentBlock = await provider.getBlockNumber();
      const deployBlock = 49591041; // Contract deployment block height on Arc Testnet
      const chunkSize = 10000;

      let depositEvents: any[] = [];
      let withdrawEvents: any[] = [];
      let swapEvents: any[] = [];

      let toBlock = currentBlock;
      let fromBlock = Math.max(deployBlock, toBlock - chunkSize + 1);

      while (toBlock >= deployBlock && (depositEvents.length + withdrawEvents.length + swapEvents.length) < 20) {
        const [depChunk, witChunk] = await Promise.all([
          contract.queryFilter(depositFilter, fromBlock, toBlock),
          contract.queryFilter(withdrawFilter, fromBlock, toBlock)
        ]);

        depositEvents = [...depositEvents, ...depChunk];
        withdrawEvents = [...withdrawEvents, ...witChunk];

        try {
          if (contract.filters.SwapRouted) {
            const swapFilter = contract.filters.SwapRouted();
            const swapChunk = await contract.queryFilter(swapFilter, fromBlock, toBlock);
            swapEvents = [...swapEvents, ...swapChunk];
          }
        } catch (e) {
          console.warn("SwapRouted filter query failed", e);
        }

        if (fromBlock === deployBlock) {
          break; // reached deployment block
        }

        toBlock = fromBlock - 1;
        fromBlock = Math.max(deployBlock, toBlock - chunkSize + 1);
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
            isSimulated: false
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
            isSimulated: false
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
            isSimulated: false
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
      let provider = globalRpcProvider;
      try {
        if (walletProvider) {
          const chainId = await walletProvider.request({ method: 'eth_chainId' });
          if (chainId && chainId.toLowerCase() === '0x4cef52') {
            provider = new BrowserProvider(walletProvider) as any;
          }
        }
      } catch (e) { }

      const contract = new Contract(deployedContractAddress, MerchantTreasuryArtifact.abi, provider);

      // Query balance first (highest priority)
      const balancePromise = contract.balance().then(val => {
        const decimals = TOKEN_CONFIGS[selectedToken].decimals;
        setVaultBalance(formatUnits(val, decimals));
        addLog(`Treasury balance: ${formatUnits(val, decimals)} ${selectedToken}`);
        return val;
      }).catch(err => {
        console.warn("Failed to query vault balance:", err);
        return null;
      });

      // Query owner and token address only if they are not already set for this contract
      const needsMetadata = !vaultOwner || !vaultUsdcAddress || vaultOwner === ownerAddress || vaultUsdcAddress === usdcAddress;

      if (needsMetadata) {
        const ownerPromise = contract.owner().then(val => {
          setVaultOwner(val);
          return val;
        }).catch(err => {
          console.warn("Failed to query owner:", err);
          return null;
        });

        const usdcPromise = contract.usdc().then(val => {
          setVaultUsdcAddress(val);
          return val;
        }).catch(err => {
          console.warn("Failed to query token address:", err);
          return null;
        });

        await Promise.all([balancePromise, ownerPromise, usdcPromise]);
      } else {
        await balancePromise;
      }

      addLog(`On-chain state updated successfully.`);
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

  // Automatic refresh on address set, tab switch to interact, or token switch
  useEffect(() => {
    if (deployedContractAddress && activeTab === 'interact') {
      handleRefresh();
    }
  }, [deployedContractAddress, activeTab, selectedToken, connectedAccount, walletProvider]);

  const handleDeposit = async () => {
    addLog(`[DEBUG] handleDeposit clicked. Token: ${selectedToken}, Contract: ${deployedContractAddress || 'None'}, Amount: ${depositAmount || 'None'}, isSimulated: ${isSimulated}, walletProvider: ${walletProvider ? 'Present' : 'Absent'}`);
    if (!deployedContractAddress || !depositAmount) {
      addLog(`[ERROR] Cannot deposit: contract address or amount is empty.`);
      return;
    }
    setLoading(true);
    addLog(`Sending request to deposit ${depositAmount} ${selectedToken} into vault...`);

    if (isSimulated || !walletProvider) {
      setTimeout(() => {
        const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setVaultBalance(prev => (parseFloat(prev) + parseFloat(depositAmount)).toString());
        addLog(`[SIMULATION] Deposit successful! Tx Hash: ${mockTx}`);

        const newSimTx = {
          id: `tx-dep-${Date.now()}`,
          type: 'deposit',
          action: `Deposit to Vault (Simulated)`,
          amount: depositAmount,
          address: connectedAccount || '0xUser',
          txHash: mockTx,
          blockNumber: 1250322,
          timestamp: Date.now(),
          tokenSymbol: selectedToken,
          isSimulated: true
        };
        setSimulatedTransactions(prev => [newSimTx, ...prev]);

        saveTransaction({
          id: newSimTx.id,
          action: newSimTx.action,
          amount: newSimTx.amount,
          from: newSimTx.address,
          to: deployedContractAddress,
          txHash: mockTx,
          status: 'COMPLETE',
          timestamp: newSimTx.timestamp,
          tokenSymbol: selectedToken
        });
        setLoading(false);
        handleRefresh();
      }, 1500);
      return;
    }

    try {
      if (walletProvider) {
        await switchOrAddArcNetwork(walletProvider);
      }
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();

      const treasuryContract = new Contract(deployedContractAddress, MerchantTreasuryArtifact.abi, signer);
      
      // Use local config address instead of query to avoid redundant network round-trips
      const tokenAddress = TOKEN_CONFIGS[selectedToken].address;

      const tokenContract = new Contract(tokenAddress, [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
      ], signer);

      const decimals = TOKEN_CONFIGS[selectedToken].decimals;
      const amountUnits = parseUnits(depositAmount, decimals);

      // Check allowance
      const signerAddress = await signer.getAddress();
      addLog(`Checking allowance...`);
      const currentAllowance = await tokenContract.allowance(signerAddress, deployedContractAddress);

      if (currentAllowance < amountUnits) {
        addLog(`Step 1: Requesting ${selectedToken} approval (Current allowance: ${formatUnits(currentAllowance, decimals)})...`);
        const approveTx = await tokenContract.approve(deployedContractAddress, amountUnits);
        addLog(`Approve transaction submitted: ${approveTx.hash}. Waiting for confirmation...`);
        await approveTx.wait();
        addLog(`Approval successful!`);
      } else {
        addLog(`Step 1: Already approved (Allowance: ${formatUnits(currentAllowance, decimals)}). Skipping approval transaction.`);
      }

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
      const errMsg = err.message || err.toString();
      addLog(`Deposit transaction failed: ${errMsg}`);
      alert(`Deposit failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    addLog(`[DEBUG] handleWithdraw clicked. Token: ${selectedToken}, Contract: ${deployedContractAddress || 'None'}, isSimulated: ${isSimulated}, walletProvider: ${walletProvider ? 'Present' : 'Absent'}`);
    if (!deployedContractAddress) {
      addLog(`[ERROR] Cannot withdraw: contract address is empty.`);
      return;
    }
    setLoading(true);
    addLog(`Sending withdrawal request...`);

    if (isSimulated || !walletProvider) {
      setTimeout(() => {
        const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setVaultBalance('0');
        addLog(`[SIMULATION] Withdrawal successful! Tx Hash: ${mockTx}`);

        const newSimTx = {
          id: `tx-wit-${Date.now()}`,
          type: 'withdraw',
          action: `Withdraw from Vault (Simulated)`,
          amount: vaultBalance,
          address: ownerAddress,
          txHash: mockTx,
          blockNumber: 1250323,
          timestamp: Date.now(),
          tokenSymbol: selectedToken,
          isSimulated: true
        };
        setSimulatedTransactions(prev => [newSimTx, ...prev]);

        saveTransaction({
          id: newSimTx.id,
          action: newSimTx.action,
          amount: newSimTx.amount,
          from: deployedContractAddress,
          to: connectedAccount || '0xUser',
          txHash: mockTx,
          status: 'COMPLETE',
          timestamp: newSimTx.timestamp,
          tokenSymbol: selectedToken
        });
        setLoading(false);
        handleRefresh();
      }, 1500);
      return;
    }

    try {
      if (walletProvider) {
        await switchOrAddArcNetwork(walletProvider);
      }
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
      const errMsg = err.message || err.toString();
      addLog(`Withdrawal transaction failed: ${errMsg}`);
      alert(`Withdrawal failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Landmark size={24} color="#0ea5e9" /> Smart Treasury Vaults</h1>
          <p className="page-subtitle">Deploy and manage automated Smart Treasury Vaults on Circle Arc L1</p>
        </div>
      </div>

      {isWrongNetwork && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.25rem',
          color: '#f87171',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.95rem',
          gap: '1.5rem'
        }}>
          <span>⚠️ Your wallet is connected to a different network. Please switch to Build on Arc to view balances and make transactions.</span>
          <button
            onClick={async () => {
              if (walletProvider) {
                await switchOrAddArcNetwork(walletProvider);
                const chainId = await walletProvider.request({ method: 'eth_chainId' });
                setIsWrongNetwork(chainId && chainId.toLowerCase() !== '0x4cef52');
                handleRefresh();
              }
            }}
            style={{
              background: '#ef4444',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Switch to Build on Arc
          </button>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>

        {/* Token selection dropdown bar */}
        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: 500 }}>Select Asset to Manage:</span>
          <select
            value={selectedToken}
            onChange={(e) => {
              setSelectedToken(e.target.value as TokenType);
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

              <p>Deploy with your connected wallet on Arc Testnet. You will confirm the transaction and pay its gas fee.</p>

              {/* Deployment Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label"><User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} /> Owner Address (Admin Wallet Address)</label>
                  <input
                    type="text"
                    className="kit-input"
                    placeholder="0x..."
                    value={ownerAddress || connectedAccount || ''}
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
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem' }}>MerchantTreasury.sol (Compiled)</h4>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.3)' }}>Solidity v0.8.20</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div>
                    <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-primary)', maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-input)', border: '1px solid var(--border-input)', padding: '10px', borderRadius: '8px' }}>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ABI Size: {MerchantTreasuryArtifact.abi.length} elements</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Decimals: {TOKEN_CONFIGS[selectedToken].decimals} units</div>
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
                disabled={loading || !connectedAccount || !usdcAddress}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Contract Address:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleCopy(deployedContractAddress)}>
                      {deployedContractAddress} <Copy size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                    </span>
                  </div>
                  {deploymentTxHash && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Deploy Tx Hash:</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleCopy(deploymentTxHash)}>
                        {deploymentTxHash.slice(0, 10)}...{deploymentTxHash.slice(-8)} <Copy size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{selectedToken} Token Address:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{vaultUsdcAddress || usdcAddress}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Owner (Admin):</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{vaultOwner || ownerAddress}</span>
                  </div>
                  {isSimulated && (
                    <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.8rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', fontSize: '0.85rem', color: '#0284c7', lineHeight: '1.4', fontWeight: 500 }}>
                      💡 <strong>Simulation Mode Active:</strong> This contract was simulated in the browser and does not exist on the live blockchain. Real transactions on <a href="https://testnet.arcscan.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'underline' }}>ArcScan Explorer</a> are only generated when <strong>Live On-Chain</strong> mode is enabled with a real contract deployed.
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Card */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', boxShadow: 'var(--shadow-card)' }}>
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>{selectedToken} Balance in Vault</span>
                <span style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 700, 
                  color: 'var(--text-primary)', 
                  fontFamily: 'Outfit, sans-serif',
                  opacity: isRefreshing ? 0.6 : 1,
                  transition: 'opacity 0.2s ease'
                }}>
                  {isRefreshing && vaultBalance === '0' ? 'Loading...' : vaultBalance} <span style={{ fontSize: '1.2rem', color: '#8b5cf6' }}>{selectedToken}</span>
                </span>
              </div>

              {/* Action grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* Deposit Form */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                    <Send size={16} color="#8b5cf6" /> Deposit {selectedToken}
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
                      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0d9488)', width: 'auto', whiteSpace: 'nowrap', padding: '0.75rem 1.5rem', marginTop: 0 }}
                    >
                      Deposit
                    </button>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    * Requires MetaMask approval (Approve) and {selectedToken} transfer transaction.
                  </p>
                </div>

                {/* Withdraw Form (Owner Only) */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)', height: '100%' }}>
                  <h4 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                    🔓 Withdraw Funds
                  </h4>
                  <button
                    onClick={handleWithdraw}
                    disabled={loading || parseFloat(vaultBalance) <= 0}
                    className="kit-action-btn"
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)', marginTop: 0, fontWeight: 600 }}
                  >
                    Withdraw all funds to Owner
                  </button>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
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
                              {!tx.isSimulated && tx.txHash && (
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

      {toast && createPortal(
        <>
          <style>{`
            @keyframes toastSlideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: 'rgba(124, 58, 237, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            zIndex: 99999, // Ensure it floats on top of everything
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'toastSlideIn 0.3s ease-out',
            pointerEvents: 'none'
          }}>
            <CheckCircle size={18} color="#34d399" />
            {toast}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
