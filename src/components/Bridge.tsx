import React, { useState } from "react";
import { AppKit } from "@circle-fin/app-kit";
import { SUPPORTED_CHAINS, switchOrAddNetwork } from "../utils/arcChain";

interface BridgeProps {
  adapter: any;
  userAddress: string;
  isMetaMask: boolean;
  onRefreshBalance: () => void;
}

const CHAIN_NETWORK_DETAILS: Record<string, { chainIdHex: string; chainName: string; rpcUrl: string; symbol: string; decimals: number; explorer: string }> = {
  Arc_Testnet: {
    chainIdHex: "0x4cef52",
    chainName: "Arc Testnet",
    rpcUrl: "https://rpc.testnet.arc.network",
    symbol: "USDC",
    decimals: 18,
    explorer: "https://testnet.arcscan.app",
  },
  Base_Sepolia: {
    chainIdHex: "0x14a34",
    chainName: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    symbol: "ETH",
    decimals: 18,
    explorer: "https://sepolia.basescan.org",
  },
  Arbitrum_Sepolia: {
    chainIdHex: "0x66eee",
    chainName: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    symbol: "ETH",
    decimals: 18,
    explorer: "https://sepolia.arbiscan.io",
  },
  Avalanche_Fuji: {
    chainIdHex: "0x2a",
    chainName: "Avalanche Fuji",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    symbol: "AVAX",
    decimals: 18,
    explorer: "https://testnet.snowtrace.io",
  },
  Ethereum_Sepolia: {
    chainIdHex: "0xaa36a7",
    chainName: "Ethereum Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    symbol: "ETH",
    decimals: 18,
    explorer: "https://sepolia.etherscan.io",
  },
};

export const Bridge: React.FC<BridgeProps> = ({ adapter, userAddress, isMetaMask, onRefreshBalance }) => {
  const [srcChain, setSrcChain] = useState("Arc_Testnet");
  const [dstChain, setDstChain] = useState("Base_Sepolia");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState(userAddress);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string; txHash?: string } | null>(null);

  // Auto-fill recipient when userAddress changes
  React.useEffect(() => {
    if (userAddress && !recipient) {
      setRecipient(userAddress);
    }
  }, [userAddress]);

  const handleBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adapter) {
      setStatus({ type: "error", msg: "Please connect your wallet first." });
      return;
    }
    if (!amount || !recipient) {
      setStatus({ type: "error", msg: "Please fill in all fields." });
      return;
    }
    if (srcChain === dstChain) {
      setStatus({ type: "error", msg: "Source and Destination chains must be different." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", msg: "Initializing bridge operation..." });

    try {
      // If MetaMask is used, ensure we are on the Source Chain first
      if (isMetaMask) {
        setStatus({ type: "info", msg: `Switching network to ${srcChain.replace("_", " ")} in MetaMask...` });
        const netInfo = CHAIN_NETWORK_DETAILS[srcChain];
        if (netInfo) {
          const switched = await switchOrAddNetwork(
            adapter,
            netInfo.chainIdHex,
            netInfo.chainName,
            netInfo.rpcUrl,
            netInfo.symbol,
            netInfo.decimals,
            netInfo.explorer
          );
          if (!switched) {
            throw new Error(`Failed to switch MetaMask to ${netInfo.chainName}.`);
          }
        }
      }

      setStatus({ type: "info", msg: `Executing CCTP Bridge: Transferring ${amount} USDC from ${srcChain.replace("_", " ")} to ${dstChain.replace("_", " ")}...` });
      
      const kit = new AppKit();

      // Trigger Bridge Kit
      const result = await kit.bridge({
        from: {
          adapter,
          chain: srcChain as any,
        },
        to: {
          adapter,
          chain: dstChain as any,
          recipientAddress: recipient,
        },
        amount: amount,
      });

      console.log("Bridge result:", result);

      setStatus({
        type: "success",
        msg: `Bridge transaction successfully submitted! ${amount} USDC is bridging to ${dstChain.replace("_", " ")}.`,
        txHash: (result as any).txHash || (result as any).transactionHash || (result as any).id || (typeof result === "string" ? result : undefined),
      });

      // Clear fields
      setAmount("");
      onRefreshBalance();
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        msg: err.message || "An error occurred during the bridge process. Ensure you have the source chain native token for gas and sufficient USDC balance.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-secondary)" }}>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          Bridge Assets (CCTP)
        </h2>
        <p>Transfer USDC securely across blockchains using Circle's CCTP protocol.</p>
      </div>

      <form onSubmit={handleBridge}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label">Source Chain</label>
            <select
              className="form-select"
              value={srcChain}
              onChange={(e) => setSrcChain(e.target.value)}
              disabled={loading}
            >
              {SUPPORTED_CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Destination Chain</label>
            <select
              className="form-select"
              value={dstChain}
              onChange={(e) => setDstChain(e.target.value)}
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
            Make sure to provide an EVM address compatible with the destination chain.
          </div>
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
            <span className="input-suffix">USDC</span>
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading || !userAddress || srcChain === dstChain}>
          {loading && <div className="spinner"></div>}
          {loading ? "Processing CCTP..." : `Bridge ${amount || "0"} USDC to ${dstChain.replace("_", " ")}`}
        </button>
      </form>

      {status && (
        <div className={`status-box ${status.type}`}>
          <div style={{ fontWeight: 600 }}>
            {status.type === "success" && "✓ Success"}
            {status.type === "error" && "⚠ Error"}
            {status.type === "info" && "ℹ Processing CCTP"}
          </div>
          <div>{status.msg}</div>
          {status.txHash && (
            <div style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Tx Hash:{" "}
              <a
                href={
                  srcChain === "Arc_Testnet"
                    ? `https://testnet.arcscan.app/tx/${status.txHash}`
                    : `https://sepolia.etherscan.io/tx/${status.txHash}`
                }
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
