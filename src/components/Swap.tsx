import React, { useState, useEffect } from "react";
import { AppKit } from "@circle-fin/app-kit";
import { switchOrAddArcNetwork } from "../utils/arcChain";

interface SwapProps {
  adapter: any;
  userAddress: string;
  isMetaMask: boolean;
  kitKey: string;
  onRefreshBalance: () => void;
}

const TOKEN_PRICES: Record<string, number> = {
  USDC: 1.0,
  EURC: 1.08,
  cirBTC: 60000.0
};

export const Swap: React.FC<SwapProps> = ({ adapter, userAddress, isMetaMask, kitKey, onRefreshBalance }) => {
  const [tokenIn, setTokenIn] = useState("USDC");
  const [tokenOut, setTokenOut] = useState("EURC");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string; txHash?: string } | null>(null);

  // Dynamic exchange rate calculation
  const priceIn = TOKEN_PRICES[tokenIn] || 1.0;
  const priceOut = TOKEN_PRICES[tokenOut] || 1.0;
  const exchangeRate = priceIn / priceOut;

  useEffect(() => {
    if (amountIn) {
      const val = parseFloat(amountIn);
      if (!isNaN(val)) {
        setAmountOut((val * exchangeRate).toFixed(tokenOut === 'cirBTC' ? 8 : 6));
      } else {
        setAmountOut("");
      }
    } else {
      setAmountOut("");
    }
  }, [amountIn, tokenIn, tokenOut, exchangeRate]);

  const handleSwitchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adapter) {
      setStatus({ type: "error", msg: "Please connect your wallet first." });
      return;
    }
    if (!amountIn) {
      setStatus({ type: "error", msg: "Please enter an amount to swap." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", msg: "Preparing swap..." });

    try {
      // If MetaMask, switch to Arc Testnet
      if (isMetaMask) {
        setStatus({ type: "info", msg: "Switching network to Arc Testnet in MetaMask..." });
        const switched = await switchOrAddArcNetwork();
        if (!switched) {
          throw new Error("Failed to switch network in MetaMask.");
        }
      }

      // Check for kitKey
      if (!kitKey) {
        throw new Error("Missing Kit Key. The Swap Kit requires a valid 'kitKey' from the Circle Console. Please enter one in the Settings tab, or try our Simulation mode below!");
      }

      setStatus({ type: "info", msg: "Submitting swap request to Circle App Kit..." });

      const kit = new AppKit();
      
      const result = await kit.swap({
        from: {
          adapter,
          chain: "Arc_Testnet",
        },
        tokenIn: tokenIn as any,
        tokenOut: tokenOut as any,
        amountIn: amountIn,
        config: {
          kitKey: kitKey,
        },
      });

      console.log("Swap result:", result);

      setStatus({
        type: "success",
        msg: `Successfully swapped ${amountIn} ${tokenIn} for ${amountOut} ${tokenOut} on Arc Testnet!`,
        txHash: (result as any).txHash || (result as any).transactionHash || (result as any).id || (typeof result === "string" ? result : undefined),
      });

      setAmountIn("");
      onRefreshBalance();
    } catch (err: any) {
      console.error(err);
      
      if (!kitKey || err.message.includes("Kit Key") || err.message.includes("401") || err.message.includes("unauthorized")) {
        setStatus({
          type: "error",
          msg: `${err.message}\n\n[SIMULATION MODE AVAILABLE] Since you are testing, would you like to run a mock simulation of this swap?`,
        });
      } else {
        setStatus({
          type: "error",
          msg: err.message || "An error occurred during the swap. Check that your account has gas USDC and token balances.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSwap = () => {
    setLoading(true);
    setStatus({ type: "info", msg: "[SIMULATION] Simulating Smart Contract execution for same-chain Swap on Arc..." });
    
    setTimeout(() => {
      setLoading(false);
      const mockTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setStatus({
        type: "success",
        msg: `[SIMULATED] Successfully swapped ${amountIn} ${tokenIn} for ${amountOut} ${tokenOut} on Arc Testnet!`,
        txHash: mockTxHash,
      });
      setAmountIn("");
      onRefreshBalance();
    }, 2000);
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-primary)" }}>
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Token Swap
        </h2>
        <p>Exchange stablecoins or wrapped assets instantly on the same blockchain (Arc Testnet).</p>
      </div>

      <form onSubmit={handleSwap}>
        <div className="swap-container">
          {/* Token In */}
          <div className="swap-card">
            <div className="swap-card-left">
              <label>You Pay</label>
              <input
                type="number"
                step="any"
                min="0.000001"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="swap-card-right">
              <select
                value={tokenIn}
                onChange={(e) => {
                  const val = e.target.value;
                  setTokenIn(val);
                  if (val === tokenOut) {
                    setTokenOut(val === "USDC" ? "EURC" : "USDC");
                  }
                }}
                disabled={loading}
              >
                <option value="USDC">USDC</option>
                <option value="EURC">EURC</option>
                <option value="cirBTC">cirBTC</option>
              </select>
            </div>
          </div>

          {/* Switch Button */}
          <div className="swap-divider" onClick={handleSwitchTokens}>
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </div>

          {/* Token Out */}
          <div className="swap-card" style={{ marginTop: "0.5rem" }}>
            <div className="swap-card-left">
              <label>You Receive (Estimated)</label>
              <input
                type="text"
                placeholder="0.0"
                value={amountOut}
                readOnly
              />
            </div>
            <div className="swap-card-right">
              <select
                value={tokenOut}
                onChange={(e) => {
                  const val = e.target.value;
                  setTokenOut(val);
                  if (val === tokenIn) {
                    setTokenIn(val === "USDC" ? "EURC" : "USDC");
                  }
                }}
                disabled={loading}
              >
                <option value="USDC">USDC</option>
                <option value="EURC">EURC</option>
                <option value="cirBTC">cirBTC</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
          <span>Exchange Rate:</span>
          <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
            1 {tokenIn} ≈ {exchangeRate.toFixed(tokenOut === 'cirBTC' ? 8 : 6)} {tokenOut}
          </span>
        </div>

        <button type="submit" className="submit-btn" disabled={loading || !userAddress || !amountIn}>
          {loading && <div className="spinner"></div>}
          {loading ? "Swapping..." : `Swap ${tokenIn} to ${tokenOut}`}
        </button>

        {status?.type === "error" && status.msg.includes("SIMULATION") && (
          <button
            type="button"
            className="submit-btn"
            style={{ background: "linear-gradient(135deg, var(--color-secondary), var(--color-accent))", marginTop: "1rem" }}
            onClick={handleSimulateSwap}
            disabled={loading}
          >
            Run Demo Swap Simulation 🚀
          </button>
        )}
      </form>

      {status && (
        <div className={`status-box ${status.type}`}>
          <div style={{ fontWeight: 600 }}>
            {status.type === "success" && "✓ Success"}
            {status.type === "error" && "⚠ Error"}
            {status.type === "info" && "ℹ Processing Swap"}
          </div>
          <div style={{ whiteSpace: "pre-line" }}>{status.msg}</div>
          {status.txHash && !status.msg.includes("[SIMULATED]") && (
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
          {status.txHash && status.msg.includes("[SIMULATED]") && (
            <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", opacity: 0.7 }}>
              Mock Tx Hash: <span style={{ fontFamily: "monospace" }}>{status.txHash.substring(0, 16)}...</span> (Simulated on Client)
            </div>
          )}
        </div>
      )}
    </div>
  );
};
