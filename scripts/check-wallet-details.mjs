import './load-env.mjs';
import fs from 'fs';
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

// Parse .env manually
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
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

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;
const WALLET_ID = process.env.CIRCLE_WALLET_ID || '7aae54e9-2746-5563-ac4a-ae3fff91f21f';

if (!API_KEY || !ENTITY_SECRET) {
  console.error("API_KEY or ENTITY_SECRET not set in .env.local");
  process.exit(1);
}

const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY,
    entitySecret: ENTITY_SECRET,
    baseUrl: 'https://api.circle.com'
});

async function main() {
    console.log("Fetching wallet details for WALLET_ID:", WALLET_ID);
    const walletRes = await client.getWallet({
        id: WALLET_ID
    });
    console.log("Wallet info:", JSON.stringify(walletRes.data?.wallet, null, 2));

    const balanceRes = await client.getWalletTokenBalance({
        id: WALLET_ID
    });
    console.log("Balances:", JSON.stringify(balanceRes.data?.tokenBalances, null, 2));
}

main().catch(err => {
    console.error("Execution error:", err?.response?.data || err.message || err);
});
