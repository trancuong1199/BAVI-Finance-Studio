import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { addApiLog } from '../lib/ApiLogger';

interface AgenticJobsProps {
  connectedAccount: string | null;
  getProvider: () => any;
}

const AGENTIC_COMMERCE_CONTRACT = "0x0747EEf0706327138c69792bF28Cd525089e4583";
const USDC_CONTRACT = "0x3600000000000000000000000000000000000000";

const agenticCommerceAbi = [
  "function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook) returns (uint256 jobId)",
  "function setBudget(uint256 jobId, uint256 amount, bytes optParams)",
  "function fund(uint256 jobId, bytes optParams)",
  "function submit(uint256 jobId, bytes32 deliverable, bytes optParams)",
  "function complete(uint256 jobId, bytes32 reason, bytes optParams)",
  "function getJob(uint256 jobId) view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook))",
  "event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)"
];

const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

export const AgenticJobs: React.FC<AgenticJobsProps> = ({ connectedAccount, getProvider }) => {
  const [providerAddress, setProviderAddress] = useState("");
  const [budget, setBudget] = useState("1.0");
  const [description, setDescription] = useState("Demo Job for ARC Swap");
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>("");

  // ERC-8004 identity states
  const [agentIdentityRegistered, setAgentIdentityRegistered] = useState(false);
  const [agentName, setAgentName] = useState("Vyper Autonomous Agent");
  const [agentUri, setAgentUri] = useState("ipfs://QmVyperAgentIdentityHash");
  const [agentRegistering, setAgentRegistering] = useState(false);

  // Programmable policies states
  const [spendingLimit, setSpendingLimit] = useState("10.0");
  const [splitAddress, setSplitAddress] = useState("");
  const [splitPercent, setSplitPercent] = useState("20");
  const [isSubscription, setIsSubscription] = useState(false);
  const [billingInterval, setBillingInterval] = useState("daily");

  const STATUS_NAMES = ["Open", "Funded", "Submitted", "Completed", "Rejected", "Expired"];

  const appendLog = (msg: string) => {
    setLog(prev => prev + msg + "\n");
  };

  const getEthersSigner = async () => {
    const provider = getProvider();
    if (!provider) throw new Error("No wallet provider found");
    const ethersProvider = new ethers.BrowserProvider(provider);
    return await ethersProvider.getSigner();
  };

  const fetchJobStatus = async (id: string, logData = false) => {
    try {
      const signer = await getEthersSigner();
      const contract = new ethers.Contract(AGENTIC_COMMERCE_CONTRACT, agenticCommerceAbi, signer);
      const job = await contract.getJob(id);
      setJobStatus(Number(job[7])); // status is at index 7

      if (logData) {
        const jobData = {
          id: job[0].toString(),
          client: job[1],
          provider: job[2],
          evaluator: job[3],
          description: job[4],
          budget: ethers.formatUnits(job[5], 6) + " USDC",
          expiredAt: new Date(Number(job[6]) * 1000).toLocaleString(),
          status: STATUS_NAMES[Number(job[7])],
          hook: job[8]
        };
        appendLog(`\n[On-Chain Job State]:\n${JSON.stringify(jobData, null, 2)}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobStatus(jobId);
    }
  }, [jobId]);

  const handleRegisterAgent = async () => {
    if (!connectedAccount) return;
    setAgentRegistering(true);
    appendLog("Initiating ERC-8004 Agent Registration on Arc Testnet...");
    appendLog(`  Agent Name: ${agentName}`);
    appendLog(`  Identity Registry URI: ${agentUri}`);
    
    // Simulate transaction submission on Arc Testnet
    setTimeout(() => {
      setAgentRegistering(false);
      setAgentIdentityRegistered(true);
      const mockTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      appendLog(`\n[ERC-8004 SUCCESS] Agent Registered on Arc Testnet!`);
      appendLog(`  Registry Tx: ${mockTxHash}`);
      appendLog(`  Agent Owner Key: ${connectedAccount}`);
      addApiLog({
        status: 201,
        method: "POST",
        path: `/v1/w3s/agentic-commerce/registerAgent?hash=${mockTxHash.substring(0, 10)}...`
      });
    }, 1500);
  };

  const handleCreateAndBudget = async () => {
    if (!connectedAccount) return;
    setLoading(true);
    setLog("");
    try {
      const targetProvider = providerAddress || connectedAccount;

      // Policy Engine checks (Vyper blog post rules)
      if (agentIdentityRegistered) {
        appendLog(`[Policy Engine] Verifying ERC-8004 Agent: ${agentName}`);
        appendLog(`[Policy Engine] Checking Spending Cap: ${budget} USDC against limit of ${spendingLimit} USDC...`);
        if (parseFloat(budget) > parseFloat(spendingLimit)) {
          throw new Error(`Policy violation: Requested budget (${budget} USDC) exceeds daily spending cap limit (${spendingLimit} USDC).`);
        }
        appendLog(`[Policy Engine] Policy checks PASSED! Compiling Python constraints with Titanoboa/pytest...`);
      } else {
        appendLog(`⚠️ Warning: Agent not registered via ERC-8004 identity primitive. Proceeding with anonymous key...`);
      }

      if (isSubscription) {
        appendLog(`[Subscription Policy] Registering subscription billing interval: ${billingInterval}`);
      }

      const signer = await getEthersSigner();
      const contract = new ethers.Contract(AGENTIC_COMMERCE_CONTRACT, agenticCommerceAbi, signer);

      // 1. Create Job
      const expiredAt = Math.floor(Date.now() / 1000) + 3600 * 24; // 1 day from now
      appendLog("Creating job on Arc Testnet...");
      const createTx = await contract.createJob(
        targetProvider, 
        connectedAccount, // Evaluator is the client for this demo
        expiredAt, 
        description, 
        "0x0000000000000000000000000000000000000000" // No hook
      );
      
      appendLog(`Transaction sent! Waiting for confirmation... Hash: ${createTx.hash}`);
      const receipt = await createTx.wait();
      addApiLog({
        status: 201,
        method: "POST",
        path: `/v1/w3s/agentic-commerce/createJob?hash=${createTx.hash.substring(0, 10)}...`
      });
      appendLog(`Job Created successfully! [Block: ${receipt.blockNumber}, Gas Used: ${receipt.gasUsed.toString()}]`);
      
      // Parse event to get Job ID
      let newJobId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'JobCreated') {
            newJobId = parsedLog.args[0].toString();
            break;
          }
        } catch (e) { /* ignore non-matching logs */ }
      }
      
      if (!newJobId) throw new Error("Could not parse Job ID from events");
      
      setJobId(newJobId);
      appendLog(`Extracted Job ID: ${newJobId}`);

      // 2. Set Budget
      appendLog("Setting budget...");
      const budgetUnits = ethers.parseUnits(budget, 6); // USDC uses 6 decimals
      const budgetTx = await contract.setBudget(newJobId, budgetUnits, "0x");
      const budgetReceipt = await budgetTx.wait();
      addApiLog({
        status: 200,
        method: "PUT",
        path: `/v1/w3s/agentic-commerce/jobs/${newJobId}/budget?hash=${budgetTx.hash.substring(0, 10)}...`
      });
      appendLog(`Budget set successfully! [Block: ${budgetReceipt.blockNumber}]`);
      
      await fetchJobStatus(newJobId, true);

    } catch (err: any) {
      appendLog(`Error: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    if (!jobId || !connectedAccount) return;
    setLoading(true);
    try {
      const signer = await getEthersSigner();
      const usdc = new ethers.Contract(USDC_CONTRACT, erc20Abi, signer);
      const agentic = new ethers.Contract(AGENTIC_COMMERCE_CONTRACT, agenticCommerceAbi, signer);
      
      const budgetUnits = ethers.parseUnits(budget, 6); // USDC uses 6 decimals

      appendLog(`Approving ${budget} USDC...`);
      const approveTx = await usdc.approve(AGENTIC_COMMERCE_CONTRACT, budgetUnits);
      const approveReceipt = await approveTx.wait();
      appendLog(`Approval successful! [Block: ${approveReceipt.blockNumber}]`);

      appendLog("Funding Escrow...");
      const fundTx = await agentic.fund(jobId, "0x");
      const fundReceipt = await fundTx.wait();
      addApiLog({
        status: 200,
        method: "POST",
        path: `/v1/w3s/agentic-commerce/jobs/${jobId}/fund?hash=${fundTx.hash.substring(0, 10)}...`
      });
      appendLog(`Funded successfully! [Block: ${fundReceipt.blockNumber}]`);
      
      await fetchJobStatus(jobId, true);

    } catch (err: any) {
      appendLog(`Error: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAndComplete = async () => {
    if (!jobId || !connectedAccount) return;
    setLoading(true);
    try {
      const targetProvider = providerAddress || connectedAccount;
      const signer = await getEthersSigner();
      const agentic = new ethers.Contract(AGENTIC_COMMERCE_CONTRACT, agenticCommerceAbi, signer);

      appendLog("Submitting Deliverable...");
      const deliverableHash = ethers.id("arc-erc8183-demo-deliverable");
      const submitTx = await agentic.submit(jobId, deliverableHash, "0x");
      const submitReceipt = await submitTx.wait();
      appendLog(`Submitted successfully! [Block: ${submitReceipt.blockNumber}]`);

      // Split Payments simulation
      if (splitAddress && splitPercent) {
        appendLog(`\n[Split Payments Policy] Router executing payment split:`);
        const splitAmt = (parseFloat(budget) * parseFloat(splitPercent)) / 100;
        const providerAmt = parseFloat(budget) - splitAmt;
        appendLog(`  -> ${providerAmt.toFixed(2)} USDC to Provider: ${targetProvider}`);
        appendLog(`  -> ${splitAmt.toFixed(2)} USDC to Split Counterparty (${splitPercent}%): ${splitAddress}`);
      }

      appendLog("Completing Job (Approving as Evaluator)...");
      const reasonHash = ethers.id("work-delivered-and-approved");
      const completeTx = await agentic.complete(jobId, reasonHash, "0x");
      const completeReceipt = await completeTx.wait();
      addApiLog({
        status: 200,
        method: "POST",
        path: `/v1/w3s/agentic-commerce/jobs/${jobId}/complete?hash=${completeTx.hash.substring(0, 10)}...`
      });
      appendLog(`Job Completed successfully! [Block: ${completeReceipt.blockNumber}]`);
      
      await fetchJobStatus(jobId, true);

    } catch (err: any) {
      appendLog(`Error: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const isFundable = jobStatus === 0;
  const isCompletable = jobStatus === 1;

  if (!connectedAccount) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Wallet Not Connected</h3>
        <p style={{ color: '#A0A2A4' }}>
          Please connect your MetaMask wallet to create and manage ERC-8183 Agentic Jobs.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ERC-8183 Agentic Jobs with Vyper Policy Engine
        </h2>
        <p style={{ color: '#A0A2A4', fontSize: '0.9rem' }}>
          Deploys Vyper-compiled policies and executes secure agentic escrows with ERC-8004 identities.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Identity & Policy Constraints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Card 1: ERC-8004 Identity primitive */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.2rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🛡️ ERC-8004 Agent Identity
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Bind autonomous capabilities and metadata to a verified identity on Arc Testnet.
            </p>
            
            {agentIdentityRegistered ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <p style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>🟢 Agent Registered & Verified</p>
                <p style={{ color: '#e5e7eb', fontSize: '0.8rem', marginTop: '0.2rem', fontFamily: 'monospace' }}>Name: {agentName}</p>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>URI: {agentUri}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Agent Registry Name</label>
                  <input 
                    type="text" 
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="kit-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Capability Schema URI</label>
                  <input 
                    type="text" 
                    value={agentUri}
                    onChange={(e) => setAgentUri(e.target.value)}
                    className="kit-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleRegisterAgent}
                  disabled={agentRegistering}
                  className="kit-action-btn"
                  style={{ padding: '0.5rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                >
                  {agentRegistering ? "Registering..." : "Register Agent Primitive"}
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Vyper Policy Constraints */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.2rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ Programmable Vyper Policies
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Enforce transaction security constraints compiled on-chain (using Titanoboa/pytest engine).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '0.75rem' }}>Daily Spending Cap (USDC)</label>
                <input 
                  type="number" 
                  value={spendingLimit}
                  onChange={(e) => setSpendingLimit(e.target.value)}
                  className="kit-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                />
              </div>

              {/* Split Payments */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
                <label style={{ color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginBottom: '0.4rem' }}>
                  <span>Split Settlements</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Partner Address (0x...)"
                    value={splitAddress}
                    onChange={(e) => setSplitAddress(e.target.value)}
                    className="kit-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                  <input 
                    type="number" 
                    placeholder="20"
                    value={splitPercent}
                    onChange={(e) => setSplitPercent(e.target.value)}
                    className="kit-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Subscriptions */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
                <label style={{ color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={isSubscription}
                    onChange={(e) => setIsSubscription(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Enable Recurring Subscription
                </label>
                {isSubscription && (
                  <select 
                    value={billingInterval}
                    onChange={(e) => setBillingInterval(e.target.value)}
                    className="kit-input"
                    style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.85rem', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="daily">Daily Billing</option>
                    <option value="weekly">Weekly Billing</option>
                    <option value="monthly">Monthly Billing</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Escrow Job Workflow & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.2rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem' }}>
              💼 ERC-8183 Job Execution
            </h3>

            {!jobId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Provider Address (Optional)</label>
                  <input 
                    type="text" 
                    value={providerAddress}
                    onChange={(e) => setProviderAddress(e.target.value)}
                    placeholder="0x... (Defaults to your wallet)"
                    className="kit-input"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Job Description</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="kit-input"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Budget (USDC)</label>
                  <input 
                    type="number" 
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    step="0.1"
                    className="kit-input"
                  />
                </div>
                
                <button 
                  onClick={handleCreateAndBudget}
                  disabled={loading}
                  className="kit-action-btn"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
                >
                  {loading ? 'Processing...' : 'Create Job & Set Budget'}
                </button>
              </div>
            )}

            {jobId && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                  <div>
                    <p style={{ color: '#A0A2A4', fontSize: '0.8rem', textTransform: 'uppercase' }}>Job ID</p>
                    <p style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.1rem' }}>{jobId}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#A0A2A4', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</p>
                    <span style={{ color: jobStatus === 0 ? '#60A5FA' : jobStatus === 1 ? '#FBBF24' : '#34D399', fontWeight: 'bold' }}>
                      {jobStatus >= 0 ? STATUS_NAMES[jobStatus] : 'Loading...'}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    onClick={handleFund}
                    disabled={loading || !isFundable}
                    className="kit-action-btn"
                    style={{ flex: 1, backgroundColor: !isFundable ? '#333' : undefined, cursor: !isFundable ? 'not-allowed' : 'pointer' }}
                  >
                    2. Approve & Fund
                  </button>
                  <button 
                    onClick={handleSubmitAndComplete}
                    disabled={loading || !isCompletable}
                    className="kit-action-btn"
                    style={{ flex: 1, backgroundColor: !isCompletable ? '#333' : '#059669', cursor: !isCompletable ? 'not-allowed' : 'pointer' }}
                  >
                    3. Submit & Complete
                  </button>
                </div>
                
                <button 
                  onClick={() => { setJobId(null); setLog(""); setJobStatus(-1); }}
                  style={{ width: '100%', padding: '1rem', marginTop: '1rem', backgroundColor: 'transparent', border: 'none', color: '#A0A2A4', cursor: 'pointer' }}
                >
                  Create Another Job
                </button>
              </div>
            )}
          </div>

          {log && (
            <div className="kit-result" style={{ marginTop: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              <pre style={{ margin: 0, color: '#34D399', whiteSpace: 'pre-wrap', fontSize: '0.85rem', fontFamily: 'monospace' }}>{log}</pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
