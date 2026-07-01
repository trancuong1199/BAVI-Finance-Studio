import fs from 'fs';
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
} catch (e) {}

const API_KEY = process.env.VITE_CIRCLE_API_KEY || 'TEST_API_KEY:9798b8d535ebe61aab310b688bfac5b2:5f169aecff6da1ea654460d180056ac5';
const ENTITY_SECRET = process.env.VITE_CIRCLE_ENTITY_SECRET || 'c36770ef802cf860ce6f4dd9f187d3f7d43ed7ce5340631eaa4236c884b2fec6';

const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY,
    entitySecret: ENTITY_SECRET,
    baseUrl: 'https://api.circle.com'
});

async function main() {
    console.log("Listing tokens for ARC-TESTNET...");
    // Let's try calling listTokens
    const res = await client.listTokens({
        blockchain: "ARC-TESTNET"
    });
    console.log("Tokens on ARC-TESTNET:", JSON.stringify(res.data?.tokens, null, 2));
}

main().catch(err => {
    console.error("Error listing tokens:", err?.response?.data || err.message || err);
});
