import React, { useState, useEffect, useRef } from "react";
import { BridgeKit } from "@circle-fin/bridge-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Terminal, 
  ExternalLink, 
  HelpCircle, 
  Coins, 
  Info, 
  Play 
} from "lucide-react";
import { SUPPORTED_CHAINS } from "../utils/arcChain";

interface BridgeProps {
  connectedAccount: string | null;
  getProvider: () => any;
}

interface StepState {
  name: string;
  label: string;
  desc: string;
  status: "idle" | "active" | "success" | "error";
  txHash?: string;
  explorerUrl?: string;
}

const FAUCET_LINKS = [
  { name: "Circle USDC Faucet", url: "https://faucet.circle.com", desc: "Get testnet USDC on any chain" },
  { name: "Ethereum Sepolia Faucet", url: "https://sepoliafaucet.com", desc: "Get Sepolia ETH for gas" },
  { name: "Base Sepolia Faucet", url: "https://coinbase.com/faucets/base-ethereum-sepolia-faucet", desc: "Get Base Sepolia ETH for gas" }
];

export const Bridge: React.FC<BridgeProps> = ({ connectedAccount, getProvider }) => {
  const [srcChain, setSrcChain] = useState("Ethereum_Sepolia");
  const [dstChain, setDstChain] = useState("Base_Sepolia");
  const [amount, setAmount] = useState("1.00");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // visual steps representation
  const [steps, setSteps] = useState<StepState[]>([
    {
      name: "approve",
      label: "Approve USDC Spending",
      desc: "Approve the TokenMessenger contract to transfer your USDC",
      status: "idle"
    },
    {
      name: "burn",
      label: "Burn USDC on Source Chain",
      desc: "Initiate transfer by calling depositForBurn on source TokenMessenger",
      status: "idle"
    },
    {
      name: "attestation",
      label: "Fetch Circle Attestation",
      desc: "Wait for Circle's Iris API to verify the burn and sign the attestation (~2 mins)",
      status: "idle"
    },
    {
      name: "mint",
      label: "Mint USDC on Destination Chain",
      desc: "Submit the attestation to the destination MessageTransmitter to claim tokens",
      status: "idle"
    }
  ]);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-fill recipient
  useEffect(() => {
    if (connectedAccount && !recipient) {
      setRecipient(connectedAccount);
    }
  }, [connectedAccount]);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("Terminal cleared. Ready.");
  };

  // Reset steps
  const resetSteps = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: "idle", txHash: undefined, explorerUrl: undefined })));
  };

  const handleBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const eth = getProvider();
    if (!eth) {
      setStatusMsg({ type: "error", msg: "Wallet provider not found. Please connect your wallet." });
      return;
    }

    if (!connectedAccount) {
      setStatusMsg({ type: "error", msg: "Please connect your wallet first." });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatusMsg({ type: "error", msg: "Please enter a valid USDC amount." });
      return;
    }

    if (srcChain === dstChain) {
      setStatusMsg({ type: "error", msg: "Source and destination chains must be different." });
      return;
    }

    setLoading(true);
    resetSteps();
    setLogs([]);
    setStatusMsg({ type: "info", msg: "Preparing wallet and BridgeKit..." });
    addLog(`🚀 Initializing bridge: ${amount} USDC from ${srcChain.replace("_", " ")} to ${dstChain.replace("_", " ")}`);
    addLog(`Recipient: ${recipient}`);

    const amountString = parseFloat(amount).toFixed(2);

    try {
      // Switch MetaMask network to Source Chain
      const selectedSrcChainObj = SUPPORTED_CHAINS.find(c => c.id === srcChain);
      if (selectedSrcChainObj) {
        addLog(`🔄 Switching wallet network to ${selectedSrcChainObj.name}...`);
        setStatusMsg({ type: "info", msg: `Please switch network to ${selectedSrcChainObj.name} in MetaMask.` });
        
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: selectedSrcChainObj.chainIdHex }],
          });
          addLog(`✅ Network successfully switched to ${selectedSrcChainObj.name}.`);
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            addLog(`➕ Adding network ${selectedSrcChainObj.name} to MetaMask...`);
            const networkParams: any = {
              chainId: selectedSrcChainObj.chainIdHex,
              chainName: selectedSrcChainObj.name,
            };
            if (selectedSrcChainObj.id === "Base_Sepolia") {
              networkParams.rpcUrls = ["https://sepolia.base.org"];
              networkParams.nativeCurrency = { name: "Ether", symbol: "ETH", decimals: 18 };
              networkParams.blockExplorerUrls = ["https://sepolia.basescan.org"];
            } else if (selectedSrcChainObj.id === "Ethereum_Sepolia") {
              networkParams.rpcUrls = ["https://rpc.sepolia.org"];
              networkParams.nativeCurrency = { name: "Ether", symbol: "ETH", decimals: 18 };
              networkParams.blockExplorerUrls = ["https://sepolia.etherscan.io"];
            } else if (selectedSrcChainObj.id === "Arbitrum_Sepolia") {
              networkParams.rpcUrls = ["https://sepolia-rollup.arbitrum.io/rpc"];
              networkParams.nativeCurrency = { name: "Ether", symbol: "ETH", decimals: 18 };
              networkParams.blockExplorerUrls = ["https://sepolia.arbiscan.io"];
            } else if (selectedSrcChainObj.id === "Avalanche_Fuji") {
              networkParams.rpcUrls = ["https://api.avax-test.network/ext/bc/C/rpc"];
              networkParams.nativeCurrency = { name: "AVAX", symbol: "AVAX", decimals: 18 };
              networkParams.blockExplorerUrls = ["https://testnet.snowtrace.io"];
            } else if (selectedSrcChainObj.id === "Arc_Testnet") {
              networkParams.rpcUrls = ["https://rpc.testnet.arc.network"];
              networkParams.nativeCurrency = { name: "USDC", symbol: "USDC", decimals: 18 };
              networkParams.blockExplorerUrls = ["https://testnet.arcscan.app"];
            }
            
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [networkParams],
            });
            addLog(`✅ Network ${selectedSrcChainObj.name} added and switched.`);
          } else {
            throw new Error(`Failed to switch network: ${switchErr.message}`);
          }
        }
      }

      addLog("🔌 Connecting to wallet injected provider...");
      const adapter = await createViemAdapterFromProvider({ provider: eth });
      addLog("✅ Viem Adapter instantiated successfully.");

      const kit = new BridgeKit();
      addLog("✅ BridgeKit SDK successfully initialized.");

      // Setup detailed event listeners to drive the stepper UI
      kit.on("*", (payload: any) => {
        const method = payload.method;
        const state = payload.state;
        const txHash = payload.values?.txHash || payload.values?.transactionHash;
        const explorerUrl = payload.values?.explorerUrl;

        addLog(`[SDK EVENT] ${method}: ${state}${txHash ? ` | Tx: ${txHash}` : ""}`);

        setSteps(prevSteps => prevSteps.map((step, idx) => {
          let isMatch = false;
          if (idx === 0 && method === "approve") isMatch = true;
          if (idx === 1 && (method === "burn" || method === "depositForBurn")) isMatch = true;
          if (idx === 2 && (method === "attestation" || method === "fetchAttestation" || method === "pollAttestation")) isMatch = true;
          if (idx === 3 && (method === "mint" || method === "receiveMessage")) isMatch = true;

          if (isMatch) {
            let statusVal: StepState["status"] = "idle";
            if (state === "pending" || state === "started" || state === "executing") statusVal = "active";
            else if (state === "success" || state === "complete") statusVal = "success";
            else if (state === "error" || state === "failed") statusVal = "error";

            return {
              ...step,
              status: statusVal,
              txHash: txHash || step.txHash,
              explorerUrl: explorerUrl || step.explorerUrl
            };
          }

          // Advance logic
          if (state === "success" || state === "complete") {
            const completedIdx = (method === "approve") ? 0 : 
                               (method === "burn" || method === "depositForBurn") ? 1 :
                               (method === "attestation" || method === "fetchAttestation") ? 2 : -1;
            
            if (completedIdx !== -1 && idx === completedIdx + 1 && step.status === "idle") {
              return { ...step, status: "active" };
            }
          }

          return step;
        }));
      });

      addLog("🔄 Starting CCTP Bridge process...");
      // Set the first step active
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "active" } : s));
      
      const resultObj = await kit.bridge({
        from: {
          adapter,
          chain: srcChain as any
        },
        to: {
          adapter,
          chain: dstChain as any,
          recipientAddress: recipient
        },
        amount: amountString
      });

      console.log("CCTP Bridge response object:", resultObj);
      addLog(`🎉 Bridge completed successfully! State: ${resultObj.state}`);

      setSteps(prev => prev.map(s => ({ ...s, status: "success" })));
      setStatusMsg({
        type: "success",
        msg: `Successfully bridged ${amount} USDC! The tokens will arrive in your wallet on ${dstChain.replace("_", " ")} shortly.`
      });

    } catch (err: any) {
      console.error("CCTP Bridge error:", err);
      addLog(`❌ ERROR: ${err.message || err.toString()}`);
      
      // Update any active step to error
      setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "error" } : s));
      
      setStatusMsg({
        type: "error",
        msg: err.message || "Bridge process failed. Check the logs below for specific details. Make sure you have gas funds on both networks."
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (status: StepState["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 size={24} className="step-icon success-glow" style={{ color: "#10b981" }} />;
      case "active":
        return <Loader2 size={24} className="step-icon spin-rotation" style={{ color: "#3b82f6" }} />;
      case "error":
        return <AlertTriangle size={24} className="step-icon error-glow" style={{ color: "#f87171" }} />;
      case "idle":
      default:
        return (
          <div className="step-icon-idle">
            <div className="step-icon-dot"></div>
          </div>
        );
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: "900px", width: "100%", paddingBottom: "4rem" }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <Coins color="var(--color-primary)" size={28} />
            Moving USDC with CCTP
          </h1>
          <p className="page-subtitle" style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: "0.5rem 0 0 0" }}>
            Transfer native USDC securely between Ethereum Sepolia, Base Sepolia, and other EVM chains without wrapped tokens.
          </p>
        </div>
      </div>



      <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "2.5rem" }}>

        <form onSubmit={handleBridge} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Source and Destination chains */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Source Chain</label>
              <select
                className="form-select"
                value={srcChain}
                onChange={(e) => {
                  setSrcChain(e.target.value);
                  resetSteps();
                }}
                disabled={loading}
              >
                {SUPPORTED_CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "center", paddingTop: "1.5rem" }}>
              <ArrowRight size={20} color="var(--text-secondary)" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Destination Chain</label>
              <select
                className="form-select"
                value={dstChain}
                onChange={(e) => {
                  setDstChain(e.target.value);
                  resetSteps();
                }}
                disabled={loading}
              >
                {SUPPORTED_CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount input */}
          <div className="form-group">
            <label className="form-label">Amount to Bridge</label>
            <div className="input-wrapper">
              <input
                type="number"
                step="any"
                min="0.01"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
              />
              <span className="input-suffix">USDC</span>
            </div>
          </div>

          {/* Recipient Address */}
          <div className="form-group">
            <label className="form-label">Recipient Address</label>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={loading}
              required
            />
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
              Leave this as your connected wallet address to receive the USDC yourself.
            </div>
          </div>



          <button 
            type="submit" 
            className="submit-btn" 
            disabled={loading || !connectedAccount || srcChain === dstChain}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "8px", 
              marginTop: "0.5rem",
              background: loading ? "rgba(59, 130, 246, 0.2)" : undefined
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-rotation" />
                Bridging USDC via CCTP...
              </>
            ) : (
              <>
                <Play size={16} />
                Execute CCTP Bridge
              </>
            )}
          </button>
        </form>

        {statusMsg && (
          <div className={`status-box ${statusMsg.type}`} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <Info size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>{statusMsg.msg}</div>
          </div>
        )}

        {/* Stepper visual progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
          <h3 style={{ fontSize: "1rem", color: "#fff", marginBottom: "0.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
            Bridge Progress
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {steps.map((step, idx) => (
              <div 
                key={step.name} 
                className={`step-item ${step.status}`} 
                style={{ 
                  display: "flex", 
                  gap: "1rem", 
                  opacity: step.status === "idle" ? 0.4 : 1,
                  transition: "opacity 0.3s ease"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {getStepIcon(step.status)}
                  {idx < steps.length - 1 && (
                    <div 
                      className={`step-connector ${step.status === "success" ? "active" : ""}`}
                      style={{ 
                        width: "2px", 
                        height: "24px", 
                        background: step.status === "success" ? "#10b981" : "rgba(255,255,255,0.15)",
                        marginTop: "8px",
                        marginBottom: "-8px"
                      }}
                    ></div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontWeight: 600, color: step.status === "active" ? "#3b82f6" : "#fff", fontSize: "0.95rem" }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                    {step.desc}
                  </div>
                  {step.txHash && (
                    <div style={{ marginTop: "4px", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-dim)" }}>Tx: </span>
                      {step.explorerUrl ? (
                        <a 
                          href={step.explorerUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: "3px" }}
                        >
                          {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span style={{ color: "#a0aec0" }}>
                          {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* Terminal Logs */}
        <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(10, 11, 16, 0.8)", border: "1px solid rgba(255,255,255,0.05)", padding: "1.75rem" }}>
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
            <h3 style={{ fontSize: "1rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Terminal size={16} color="#10b981" />
              Developer Logs
            </h3>
            <button 
              onClick={clearLogs}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                padding: "2px 8px",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          </div>
          
          <div 
            className="custom-scrollbar"
            style={{ 
              flex: 1, 
              overflowY: "auto", 
              maxHeight: "320px",
              fontFamily: "monospace", 
              fontSize: "0.75rem", 
              lineHeight: "1.4",
              color: "#38bdf8",
              padding: "0.5rem 0.25rem",
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "6px"
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: "var(--text-dim)" }}>No active bridging logs. Click execute to begin.</div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  style={{ 
                    whiteSpace: "pre-wrap", 
                    marginBottom: "4px",
                    color: log.includes("ERROR") ? "#f87171" : log.includes("SDK EVENT") ? "#a78bfa" : "#38bdf8"
                  }}
                >
                  {log}
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>

        {/* Faucet Links */}
        <div className="glass-panel" style={{ background: "rgba(30, 41, 59, 0.15)", padding: "1.75rem" }}>
          <h3 style={{ fontSize: "0.95rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
            <HelpCircle size={16} color="var(--color-secondary)" />
            Need Testnet Tokens?
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "1rem" }}>
            CCTP requires native gas on both source and destination chains, plus Sepolia USDC. Get tokens from:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {FAUCET_LINKS.map(link => (
              <a 
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "6px",
                  color: "#fff",
                  textDecoration: "none",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600, fontSize: "0.8rem" }}>
                  {link.name}
                  <ExternalLink size={12} color="var(--text-secondary)" />
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
                  {link.desc}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
  );
};
