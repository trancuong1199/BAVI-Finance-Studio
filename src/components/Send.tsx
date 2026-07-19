import React, { useState } from "react";
import { AppKit } from "@circle-fin/app-kit";
import { switchOrAddArcNetwork } from "../utils/arcChain";

interface SendProps {
  adapter: any;
  userAddress: string;
  isMetaMask: boolean;
  onRefreshBalance: () => void;
}

export const Send: React.FC<SendProps> = ({ adapter, userAddress, isMetaMask, onRefreshBalance }) => {
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("USDC");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string; txHash?: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adapter) {
      setStatus({ type: "error", msg: "Please connect your wallet first." });
      return;
    }
    if (!toAddress || !amount) {
      setStatus({ type: "error", msg: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", msg: "Preparing transaction..." });

    try {
      // If MetaMask is used, ensure we are on Arc Testnet first
      if (isMetaMask) {
        setStatus({ type: "info", msg: "Switching network to Build on Arc in MetaMask..." });
        const switched = await switchOrAddArcNetwork();
        if (!switched) {
          throw new Error("Failed to switch to Build on Arc network in MetaMask.");
        }
      }

      setStatus({ type: "info", msg: "Broadcasting send transaction on Build on Arc..." });
      
      const kit = new AppKit();
      
      // Execute Send Kit
      const result = await kit.send({
        from: {
          adapter,
          chain: "Arc_Testnet",
        },
        to: toAddress,
        amount: amount,
        token: token,
      });

      console.log("Send result:", result);
      
      setStatus({
        type: "success",
        msg: `Successfully transferred ${amount} ${token} on Build on Arc!`,
        txHash: (result as any).txHash || (result as any).transactionHash || (result as any).id || (typeof result === "string" ? result : undefined),
      });
      
      // Reset form
      setToAddress("");
      setAmount("");
      
      // Refresh balances
      onRefreshBalance();
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        msg: err.message || "An error occurred during the transfer. Ensure you have claimed gas USDC from the faucet.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-primary)" }}>
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Send Tokens
        </h2>
        <p>Transfer stablecoins between wallets on the same blockchain (Build on Arc).</p>
      </div>

      <form onSubmit={handleSend}>
        <div className="form-group">
          <label className="form-label">Select Token</label>
          <select 
            className="form-select" 
            value={token} 
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
          >
            <option value="USDC">USDC (Gas Token)</option>
            <option value="EURC">EURC</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Recipient Address</label>
          <input
            type="text"
            className="form-input"
            placeholder="0x..."
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Amount</label>
          <div className="input-wrapper">
            <input
              type="number"
              step="any"
              min="0.000001"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              required
            />
            <span className="input-suffix">{token}</span>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading || !userAddress}>
          {loading && <div className="spinner"></div>}
          {loading ? "Processing..." : `Send ${amount || "0"} ${token}`}
        </button>
      </form>

      {status && (
        <div className={`status-box ${status.type}`}>
          <div style={{ fontWeight: 600 }}>
            {status.type === "success" && "✓ Success"}
            {status.type === "error" && "⚠ Error"}
            {status.type === "info" && "ℹ Processing"}
          </div>
          <div>{status.msg}</div>
          {status.txHash && (
            <div style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Tx Hash:{" "}
              <a 
                href={`https://testnet.arcscan.app/tx/${status.txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {status.txHash} ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
