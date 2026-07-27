import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Presentation,
  Zap,
  Shield,
  Layers,
  Bot,
  FileText,
  Sparkles,
  RefreshCw,
  Code,
  CheckCircle2,
  Globe,
  Database,
  Terminal,
  Cpu
} from 'lucide-react';

export const PresentationDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const presentationUrl = typeof window !== 'undefined' ? `${window.location.origin}/presentation` : '';

  const slides = [
    // Slide 1: Cover
    {
      id: 'title',
      category: 'Build on Arc Hackathon 2026',
      title: 'BAVI Finance Studio',
      subtitle: 'Next-Generation DeFi Hub & Autonomous Agentic Commerce Engine on Circle Arc L1',
      badge: 'Dual Track Submission: DeFi & Agentic Economy',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            padding: '8px 18px',
            borderRadius: '20px',
            color: '#38bdf8',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            <Sparkles size={18} /> Built Natively on Arc (Circle L1 Network)
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', width: '100%', maxWidth: '850px', marginTop: '1rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1.25rem', borderRadius: '16px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>
                <Zap size={22} /> DeFi Track
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                Native & Universal Swaps, Uniswap V3 Portal, Unified Balance Kit (UBK), Arbitrage Scanner, & CCTP Bridges.
              </p>
            </div>
            
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '1.25rem', borderRadius: '16px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c084fc', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>
                <Bot size={22} /> Agentic Economy Track
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                ERC-8183 Escrow Jobs, Vyper Policy Engine, SCP Treasury Vaults, & Gemini AI Assistant.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
            <span>⚡ Sub-Second Finality</span>
            <span>•</span>
            <span>🪙 USDC Native Gas</span>
            <span>•</span>
            <span>🔒 Programmable Escrow</span>
            <span>•</span>
            <span>🌐 Circle SCP & CCTP</span>
          </div>
        </div>
      )
    },

    // Slide 2: Problem Statement
    {
      id: 'problem',
      category: 'Market Problem',
      title: 'The Challenge in Web3 DeFi & Agent Commerce',
      subtitle: 'Current blockchain ecosystems suffer from high friction, gas volatility, and lack of agent financial rails',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ color: '#f87171', marginTop: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⚠️ Volatile Gas & Unpredictable FX
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Transacting on networks using volatile native gas tokens (ETH, SOL) introduces accounting nightmares and unpredictable gas cost spikes for merchants and automated systems.
            </p>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ color: '#fbbf24', marginTop: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🤖 AI Agents Lack Financial Guardrails
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Autonomous AI agents cannot safely execute financial contracts without enforceable spending limits, programmable policy rules, and secure multiphase escrow hooks.
            </p>
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ color: '#c084fc', marginTop: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🧩 Fragmented Liquidity & Metadata
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Cross-chain stablecoin liquidity is fragmented across bridges, and traditional transfers lack structured invoice context and compliance tracking.
            </p>
          </div>
        </div>
      )
    },

    // Slide 3: The Solution
    {
      id: 'solution',
      category: 'Our Solution',
      title: 'BAVI Finance Studio Architecture',
      subtitle: 'A unified financial OS combining stablecoin-native L1 speed with agentic programmable commerce',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(168, 85, 247, 0.12))', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div>
                <span style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>CORE ADVANTAGE</span>
                <h3 style={{ color: '#fff', fontSize: '1.3rem', margin: '10px 0' }}>Stablecoin-Native Arc L1</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
                  Uses <strong>USDC as native gas token</strong>. Every transaction fee is fixed, deterministic, and micro-cents cheap. Sub-second block finality.
                </p>
              </div>

              <div>
                <span style={{ background: '#c084fc', color: '#0f172a', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>AGENTIC REVOLUTION</span>
                <h3 style={{ color: '#fff', fontSize: '1.3rem', margin: '10px 0' }}>Programmable Policy & Escrow</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
                  <strong>ERC-8183 Escrows</strong> & <strong>Vyper Policy Engine</strong> enable AI agents to safely budget, hire services, and auto-settle upon delivery.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }} className="deck-grid-4">
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <Zap color="#38bdf8" size={24} style={{ marginBottom: '6px' }} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Uniswap V3 Portal</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>On-chain DEX Trading</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <Layers color="#10b981" size={24} style={{ marginBottom: '6px' }} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>CCTP Bridge</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>1:1 Circle Liquidity</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <FileText color="#fbbf24" size={24} style={{ marginBottom: '6px' }} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Tx Memos</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Structured On-Chain Metadata</div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <Bot color="#c084fc" size={24} style={{ marginBottom: '6px' }} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>BaviAgent AI</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Gemini-Powered Chatbot</div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 4: DeFi Track Features
    {
      id: 'defi-track',
      category: 'DeFi Track Deep Dive',
      title: 'Full-Suite DeFi Infrastructure',
      subtitle: 'Native trading, multi-chain liquidity aggregation, spend safeguards, and transaction tracking',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '1.25rem', borderRadius: '14px' }}>
            <h4 style={{ color: '#38bdf8', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={18} /> Native & Universal Swaps
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Direct UnitFlow V3 Router integration for Arc native swaps (USDC ↔ EURC) plus universal cross-chain swap routing via LI.FI.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.25rem', borderRadius: '14px' }}>
            <h4 style={{ color: '#34d399', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} /> Unified Balance Kit (UBK)
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Multi-chain USDC balance management featuring preflight safety checks (<code>estimateSpend()</code>), pending/confirmed balance tracking, and fallback routes.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '1.25rem', borderRadius: '14px' }}>
            <h4 style={{ color: '#fbbf24', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Transaction Memos
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Attach structured JSON context (invoice references, batch payout tags) to USDC transfers via Arc Memo registry without modifying token contracts.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(236, 72, 153, 0.2)', padding: '1.25rem', borderRadius: '14px' }}>
            <h4 style={{ color: '#f472b6', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} /> On-Chain Arbitrage Scanner
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Real-time spread detection and automated arbitrage trade execution across Arc liquidity pools with gas profitability checks.
            </p>
          </div>
        </div>
      )
    },

    // Slide 5: Agentic Economy Track Features
    {
      id: 'agentic-track',
      category: 'Agentic Economy Track Deep Dive',
      title: 'Autonomous Commerce & Policy Framework',
      subtitle: 'Enabling AI agents to transact, budget, hire, and settle contracts autonomously',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ color: '#c084fc', fontWeight: 700, fontSize: '1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={20} /> ERC-8183 Escrow Standard
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Complete multiphase escrow lifecycle: Job Creation ➔ Budget Specification ➔ Escrow Funding ➔ Deliverable Hash Verification ➔ Settlement Release.
              </p>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: '1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={20} /> Vyper Policy Engine
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                On-chain spending limits, automated split payment rules, and subscription schedules compiled with Vyper for mathematical correctness and safety.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.25rem', borderRadius: '14px' }}>
            <h4 style={{ color: '#fff', marginTop: 0, marginBottom: '8px', fontSize: '1rem' }}>
              🏺 Merchant Treasury Vaults (Solidity + Circle SCP)
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              Custom smart contract <code>MerchantTreasuryUSDC.sol</code> deployed programmatically via Circle's Smart Contract Platform (SCP) API. Supports automated token deposits, vault balance management, and direct on-chain token swaps for asset hedging.
            </p>
          </div>
        </div>
      )
    },

    // Slide 6: Smart Contracts Deployed
    {
      id: 'contracts',
      category: 'On-Chain Validations',
      title: 'Deployed Smart Contracts on Arc Testnet',
      subtitle: 'Production-ready contracts deployed using Circle Developer-Controlled Wallets & SCP',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', color: '#cbd5e1' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.8)', color: '#38bdf8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '10px 12px' }}>Contract Name</th>
                  <th style={{ padding: '10px 12px' }}>Purpose</th>
                  <th style={{ padding: '10px 12px' }}>Deployed Contract Address</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#fff' }}>USDC Treasury Vault</td>
                  <td style={{ padding: '10px 12px' }}>Merchant USDC Treasury & Automated Swaps</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>0x428266f0fc0a3b0926a6e81d4ba53203104f0e26</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#fff' }}>EURC Treasury Vault</td>
                  <td style={{ padding: '10px 12px' }}>Merchant EURC Treasury & Hedging</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>0x66fe48c23b5f5363ea73f860e7671adbc62b3d04</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#fff' }}>cirBTC Treasury Vault</td>
                  <td style={{ padding: '10px 12px' }}>Wrapped Bitcoin Vault</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>0xf592f76a4e08c7efb394bd222b2580a2da39805e</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#fff' }}>Agentic Escrow Job</td>
                  <td style={{ padding: '10px 12px' }}>ERC-8183 Agent Multiphase Escrow Engine</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#c084fc' }}>0x0747EEf0706327138c69792bF28Cd525089e4583</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#fff' }}>Arc Native Gas Token</td>
                  <td style={{ padding: '10px 12px' }}>USDC Native L1 Gas Token</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#34d399' }}>0x3600000000000000000000000000000000000000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#34d399' }}>
            <CheckCircle2 size={18} />
            <span>All smart contracts are verified and interacting live on Arc Testnet JSON-RPC endpoint.</span>
          </div>
        </div>
      )
    },

    // Slide 7: Tech Stack & Circle Integration
    {
      id: 'tech-stack',
      category: 'Technology & Tooling',
      title: 'Technology Stack & Circle Developer Tools',
      subtitle: 'Leveraging Circle’s complete developer suite for native Web3 UX',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '1.25rem', borderRadius: '14px' }}>
            <Globe color="#38bdf8" size={24} style={{ marginBottom: '8px' }} />
            <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem' }}>Arc Network L1</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              Stablecoin-native Layer-1 blockchain operating with sub-second block finality and native USDC gas token.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '1.25rem', borderRadius: '14px' }}>
            <Terminal color="#c084fc" size={24} style={{ marginBottom: '8px' }} />
            <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem' }}>Circle SCP Platform</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              Smart Contract Platform API using 32-byte hex entity secret encryption to deploy custom Solidity bytecode programmatically.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '1.25rem', borderRadius: '14px' }}>
            <Cpu color="#34d399" size={24} style={{ marginBottom: '8px' }} />
            <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem' }}>Circle Developer Wallets</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              Developer-Controlled Wallets executing automated approvals, token swaps, and vault contract transactions securely.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '1.25rem', borderRadius: '14px' }}>
            <Database color="#fbbf24" size={24} style={{ marginBottom: '8px' }} />
            <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem' }}>Circle CCTP Protocol</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              Cross-Chain Transfer Protocol for zero-slippage 1:1 USDC burn and mint transfers across supported L1/L2 chains.
            </p>
          </div>
        </div>
      )
    },

    // Slide 8: Roadmap & Summary
    {
      id: 'roadmap',
      category: 'Vision & Next Steps',
      title: 'Roadmap & Future Impact',
      subtitle: 'Building the standard OS for stablecoin payments and AI agent economy',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1.2rem', borderRadius: '14px' }}>
              <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem', marginBottom: '4px' }}>PHASE 1 (CURRENT)</div>
              <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem' }}>Hackathon MVP Deployed</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                Live testnet app, deployed SCP vaults, ERC-8183 escrow flow, UBK spend safeguards, and Gemini AI assistant.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1.2rem', borderRadius: '14px' }}>
              <div style={{ color: '#c084fc', fontWeight: 800, fontSize: '0.85rem', marginBottom: '4px' }}>PHASE 2 (MAINNET)</div>
              <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem' }}>Mainnet & Security Audits</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                Security audits for <code>MerchantTreasuryUSDC</code> and Vyper policy engine contracts before Arc Mainnet launch.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '1.2rem', borderRadius: '14px' }}>
              <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.85rem', marginBottom: '4px' }}>PHASE 3 (ECOSYSTEM)</div>
              <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '1rem' }}>Agent Service Marketplace</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                Open mesh for autonomous AI agents to list capabilities, quote jobs, and auto-settle services on Arc.
              </p>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', padding: '1.25rem', borderRadius: '16px', textAlign: 'center', color: '#fff' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: 800 }}>Thank You for Reviewing BAVI Finance Studio!</h3>
            <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.95 }}>
              Ready to power the next generation of stablecoin DeFi & Agentic Commerce on Arc L1.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const copyLink = () => {
    navigator.clipboard.writeText(presentationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slide = slides[currentSlide];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isFullscreen ? '100vw' : '1100px',
        height: isFullscreen ? '100vh' : 'auto',
        minHeight: isFullscreen ? '100vh' : '650px',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 99999 : 1,
        margin: isFullscreen ? 0 : '0 auto',
        background: '#090d16',
        borderRadius: isFullscreen ? '0' : '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        color: '#f8fafc'
      }}
      className="animate-fade-in"
    >
      {/* Top Deck Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800
          }}>
            <Presentation size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
              BAVI Finance Studio — Presentation Deck
            </div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
              Build on Arc Hackathon 2026 Submission
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={copyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: copied ? '#34d399' : '#e2e8f0',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Link Copied!' : 'Copy Presentation Link'}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              padding: '6px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Presentation"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Main Slide Content Area */}
      <div style={{
        flex: 1,
        padding: '2.5rem 3rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflowY: 'auto'
      }}>
        {/* Category Pill */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '0.78rem',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {slide.category}
          </span>
        </div>

        {/* Slide Title */}
        <h1 style={{
          fontSize: isFullscreen ? '2.8rem' : '2.2rem',
          fontWeight: 800,
          margin: '0 0 0.5rem 0',
          background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.15
        }}>
          {slide.title}
        </h1>

        {/* Slide Subtitle */}
        <p style={{
          fontSize: '1.05rem',
          color: '#94a3b8',
          margin: '0 0 2rem 0',
          lineHeight: 1.5,
          maxWidth: '900px'
        }}>
          {slide.subtitle}
        </p>

        {/* Slide Main Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {slide.content}
        </div>
      </div>

      {/* Deck Controls & Progress Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        background: 'rgba(15, 23, 42, 0.8)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Slide Navigator Dots */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              style={{
                width: currentSlide === idx ? '28px' : '10px',
                height: '10px',
                borderRadius: '5px',
                background: currentSlide === idx ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              title={`Slide ${idx + 1}: ${s.title}`}
            />
          ))}
        </div>

        {/* Counter */}
        <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
          Slide <span style={{ color: '#fff' }}>{currentSlide + 1}</span> of {slides.length}
        </div>

        {/* Prev / Next Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentSlide === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: currentSlide === 0 ? '#475569' : '#fff',
              padding: '8px 16px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={18} /> Previous
          </button>

          <button
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentSlide === slides.length - 1 ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
              border: 'none',
              color: currentSlide === slides.length - 1 ? '#475569' : '#fff',
              padding: '8px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: currentSlide === slides.length - 1 ? 'not-allowed' : 'pointer',
              boxShadow: currentSlide === slides.length - 1 ? 'none' : '0 4px 14px rgba(14, 165, 233, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
