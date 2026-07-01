import fs from 'fs';
import path from 'path';
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

// Parse .env manually
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log("No .env file found");
}

const API_KEY = process.env.VITE_CIRCLE_API_KEY || 'TEST_API_KEY:9798b8d535ebe61aab310b688bfac5b2:5f169aecff6da1ea654460d180056ac5';
const ENTITY_SECRET = process.env.VITE_CIRCLE_ENTITY_SECRET || 'c36770ef802cf860ce6f4dd9f187d3f7d43ed7ce5340631eaa4236c884b2fec6';
const WALLET_ID = '7aae54e9-2746-5563-ac4a-ae3fff91f21f';
const VAULT_ADDRESS = '0x5e04b177d2848d937b8dde57a0c2a60d51af3d5b';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY,
    entitySecret: ENTITY_SECRET,
    baseUrl: 'https://api.circle.com'
});

async function main() {
    console.log("Checking wallet balance for:", WALLET_ID);
    const balanceRes = await client.getWalletTokenBalance({
        id: WALLET_ID
    });
    console.log("Balances:", JSON.stringify(balanceRes.data?.tokenBalances, null, 2));

    const usdcBalance = balanceRes.data?.tokenBalances?.find(b => b.token.tokenAddress && b.token.tokenAddress.toLowerCase() === USDC_ADDRESS.toLowerCase());
    console.log("USDC Balance:", usdcBalance?.amount || '0');

    // Let's send an Approve transaction first
    console.log("Step 1: Approving vault contract...");
    const approveTx = await client.createContractExecutionTransaction({
        walletId: WALLET_ID,
        contractAddress: USDC_ADDRESS,
        abiFunctionSignature: "approve(address,uint256)",
        abiParameters: [VAULT_ADDRESS, "10000000"], // 10 USDC (6 decimals)
        fee: {
            type: "level",
            config: { feeLevel: "HIGH" }
        }
    });

    const approveTxId = approveTx.data?.id;
    console.log("Approve Tx ID:", approveTxId);

    // Wait for Approve transaction to be COMPLETE
    let state = approveTx.data?.state || "";
    while (state !== "COMPLETE" && state !== "FAILED" && state !== "CANCELLED") {
        console.log("Waiting for Approve to complete... Current state:", state);
        await new Promise(r => setTimeout(r, 4000));
        const statusRes = await client.getTransaction({ id: approveTxId });
        state = statusRes.data?.transaction?.state || "";
        if (state === "COMPLETE") {
            console.log("Approve transaction completed! Hash:", statusRes.data?.transaction?.txHash);
            break;
        }
    }

    if (state !== "COMPLETE") {
        throw new Error("Approve transaction failed");
    }

    // Let's call deposit() on the vault contract
    console.log("Step 2: Calling deposit() on vault contract...");
    const depositTx = await client.createContractExecutionTransaction({
        walletId: WALLET_ID,
        contractAddress: VAULT_ADDRESS,
        abiFunctionSignature: "deposit(uint256)",
        abiParameters: ["10000000"], // 10 USDC (6 decimals)
        fee: {
            type: "level",
            config: { feeLevel: "HIGH" }
        }
    });

    const depositTxId = depositTx.data?.id;
    console.log("Deposit Tx ID:", depositTxId);

    // Wait for Deposit transaction to be COMPLETE
    state = depositTx.data?.state || "";
    while (state !== "COMPLETE" && state !== "FAILED" && state !== "CANCELLED") {
        console.log("Waiting for Deposit to complete... Current state:", state);
        await new Promise(r => setTimeout(r, 4000));
        const statusRes = await client.getTransaction({ id: depositTxId });
        state = statusRes.data?.transaction?.state || "";
        if (state === "COMPLETE") {
            console.log("Deposit transaction completed! Hash:", statusRes.data?.transaction?.txHash);
            break;
        }
    }

    console.log("Finished! Check the transaction on ArcScan!");
}

main().catch(err => {
    console.error("Execution error:", err?.response?.data || err.message || err);
});
