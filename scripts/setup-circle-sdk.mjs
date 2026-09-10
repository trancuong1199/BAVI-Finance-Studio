import './load-env.mjs';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';
import fs from 'fs';

const API_KEY = process.env.CIRCLE_API_KEY;

async function main() {
  console.log("Starting Circle SDK setup...");
  
  // 1. Generate a new 32-byte hex secret
  const entitySecret = crypto.randomBytes(32).toString('hex');
  console.log("Generated 32-byte Entity Secret.");
  
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY,
    entitySecret: entitySecret,
    baseUrl: 'https://api-sandbox.circle.com'
  });
  
  try {
    // 2. Create Wallet Set
    console.log("Creating Wallet Set...");
    const walletSetRes = await client.createWalletSet({
      name: "ARC App Wallet Set"
    });
    const walletSetId = walletSetRes.data?.walletSet?.id;
    console.log("Wallet Set ID:", walletSetId);

    // 3. Create Developer Wallet
    console.log("Creating Developer Wallet...");
    const walletRes = await client.createWallets({
      blockchains: ["ETH-SEPOLIA"],
      count: 1,
      walletSetId: walletSetId
    });
    
    const walletId = walletRes.data?.wallets[0]?.id;
    console.log("Wallet ID:", walletId);
    
    // 4. Update .env
    // Note: To use entitySecret Ciphertext in the frontend for deploying templates, 
    // we need to encrypt it. But using the SDK for deployment on backend is better.
    // Let's generate a single-use ciphertext for the frontend just so it works? 
    // No, the client provides it? The SDK handles it internally.
    // Let's fetch the public key and encrypt it so the frontend can use it.
    console.log("Fetching Public Key to encrypt secret for frontend use...");
    let pubKeyRes = await fetch(`https://api-sandbox.circle.com/v1/w3s/config/entity/publicKey`, {
       headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    let pubKeyData = await pubKeyRes.json();
    let entitySecretCiphertext = "";
    if (pubKeyRes.ok) {
       const publicKey = pubKeyData.data.publicKey;
       const encryptedData = crypto.publicEncrypt({
         key: publicKey,
         padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
         oaepHash: 'sha256'
       }, Buffer.from(entitySecret));
       entitySecretCiphertext = encryptedData.toString('base64');
    } else {
       console.log("Warning: Could not fetch public key for frontend ciphertext generation", pubKeyData);
    }
    
    const envContent = `CIRCLE_API_KEY=${API_KEY}
CIRCLE_WALLET_ID=${walletId}
VITE_CIRCLE_TEMPLATE_ID=
CIRCLE_ENTITY_SECRET=${entitySecret}
`;
    fs.writeFileSync('/home/avada/ARC-swap-/.env.local', envContent, { mode: 0o600 });
    fs.writeFileSync('/home/avada/ARC-swap-/circle-recovery.txt', `Entity Secret: ${entitySecret}\n`);
    console.log("Successfully wrote to .env and circle-recovery.txt");
    
  } catch (error) {
    console.error("Error creating resources:", error?.response?.data || error);
  }
}

main().catch(console.error);
