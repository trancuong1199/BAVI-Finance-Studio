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
} catch (e) {}

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;

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
