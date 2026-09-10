# 🚀 BAVI Finance Studio

BAVI Finance Studio is a experimental testnet DeFi & Agentic Commerce platform built natively on **Arc**—Circle's stablecoin-native Layer-1 network. Arc uses USDC as the native gas token, offers sub-second transaction finality, and natively integrates Circle’s complete suite of developer tools.

This project is submitted for the **Build on Arc Hackathon**, addressing both the **DeFi Track** and the **Agentic Economy Track** by showing the capabilities of USDC-denominated transaction flows, CCTP bridges, Uniswap portals, and autonomous agent-to-agent escrows.

---

## 🌟 Key Features

### 1. DeFi Hub (DeFi Track)
*   **Native & Universal Swaps**: Standard swapping on Arc with support for multi-chain liquidity widgets (LI.FI).
*   **Uniswap V3 Portal**: Interactive trading interface using Uniswap liquidity pools natively deployed on Arc.
*   **Unified Bridges (CCTP)**: Fast, native cross-chain USDC/EURC transfers via Circle's Cross-Chain Transfer Protocol (CCTP).
*   **Transaction Memos**: Append rich metadata to transactions on-chain for reporting, tracking, and compliance.

### 2. Custom SCP Treasury Vaults (DeFi & Agentic Tracks)
Our custom-built solidity contract `MerchantTreasuryUSDC` supports programmable token deposits, withdrawals, and direct on-chain token swaps via routing interfaces:
*   Allows merchants or autonomous agents to hold treasuries in stablecoins.
*   Vaults accept deposits and owner withdrawals. Swaps use a separate wallet-signed router path; the old treasury swap entry point is disabled.

### 3. ERC-8183 Agentic Jobs with Vyper Policy Engine (Agentic Track)
A secure escrow framework for autonomous AI agent commerce:
*   **ERC-8004 Verified Agent Identities**: Register autonomous agents with verified capability schemas and registry metadata.
*   **Vyper-Compiled Policy Constraints**: Restrict spending limits, schedule recurring subscriptions, and define split payment criteria on-chain.
*   **Multiphase Escrow Execution**: Secure workflow containing job creation, budgeting, escrow funding, deliverable submission, and automatic validation/release of funds.

---

## 🏺 Deployed Contract Addresses (Build on Arc)

The following custom solidity contracts are deployed using **Circle's Developer-Controlled Programmable Wallets** on Build on Arc:

| Contract | Purpose | Deployed Address | Deployment Transaction Hash |
| :--- | :--- | :--- | :--- |
| **USDC Vault** | Merchant Treasury Vault for USDC | `0x428266f0fc0a3b0926a6e81d4ba53203104f0e26` | `0xc3e140aef2e8137c3ce86da29b47d00bfa556a98f86af1c2c2653078828fd22d` |
| **EURC Vault** | Merchant Treasury Vault for EURC | `0x66fe48c23b5f5363ea73f860e7671adbc62b3d04` | `0x16671fc68657ab32519753751ca3190023564cc9f83a01dd39f9c209df8c999b` |
| **cirBTC Vault** | Merchant Treasury Vault for cirBTC | `0xf592f76a4e08c7efb394bd222b2580a2da39805e` | `0x90ed667ae98888a8bd40aa7b8d44429710342584e8e97df05ba557acf316e640` |
| **USDC Native Token** | Gas Token & Gas asset | `0x3600000000000000000000000000000000000000` | *Built-in Network Native Asset* |
| **EURC Token** | EURC asset on Arc | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | *System deployed contract* |
| **cirBTC Token** | Wrapped Bitcoin on Arc | `0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` | *System deployed contract* |
| **Mock Router** | Swap Routing Target | `0xE592427a0cC86a461e2d486D38aAA1e7b686D11b` | *System deployed mock router* |

---

## 🛠️ Technology Stack & Circle Tools Used

1.  **Arc Network L1**: Native network deployment using USDC as gas token.
2.  **Circle Smart Contract Platform (SCP)**: Dynamic, programmatic contract deployment on the fly utilizing base64 entity secret encryption.
3.  **Circle Developer-Controlled Wallets**: Managed transactions, approvals, and contract calls securely via developer wallets.
4.  **CCTP (Cross-Chain Transfer Protocol)**: Interoperability routing for stablecoin liquidity across chains.
5.  **React 19 + TypeScript + Vite**: Frontend foundation offering reactive, modern client experience.
6.  **Ethers.js v6 & Viem**: Interfacing with the Arc JSON-RPC and executing smart contract methods.

---

## 🚀 Getting Started

### 📋 Prerequisites
*   Node.js (v22.13 or higher)
*   A Web3 browser wallet (e.g., MetaMask, OKX, Phantom)

### 📥 Installation & Local Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/trancuong1199/ARC-swap-.git
    cd ARC-swap-
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Copy `.env.example` to `.env.local`. The browser needs only optional public contract metadata.
    Never put API keys or entity secrets in a `VITE_*` variable or commit `.env` files.
    Treasury deployment is signed by the connected wallet. Circle credentials are only for local operator scripts.
    If credentials were previously pushed or deployed, follow [credential recovery](docs/credential-recovery.md).

4.  **Start development server**:
    ```bash
    npm run dev
    ```

5.  **Build production version**:
    ```bash
    npm run build
    ```

---

## 🔬 Compilation and Development Scripts
*   **Compile Solidity Contract**:
    ```bash
    node scripts/compile.js
    ```
    This compiles `contracts/MerchantTreasuryUSDC.sol` and writes the ABI/bytecode artifact to `src/config/MerchantTreasuryArtifact.json`.
*   **Deploy Vaults**:
    ```bash
    node scripts/deploy-vault-scp.mjs
    ```
    Triggers Circle SCP API calls to deploy vaults on Build on Arc.
*   **Verify Deployments**:
    ```bash
    node scripts/verify-deployed.mjs
    ```
    Queries Arc RPC `https://rpc.testnet.arc.network` to check contract deployment bytecode states.
