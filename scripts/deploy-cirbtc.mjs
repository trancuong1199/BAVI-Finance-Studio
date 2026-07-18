import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const API_KEY = process.env.VITE_CIRCLE_API_KEY;
const WALLET_ID = process.env.VITE_CIRCLE_WALLET_ID;
const PLAINTEXT_ENTITY_SECRET = process.env.VITE_CIRCLE_ENTITY_SECRET;
const DEVELOPER_WALLET_ADDRESS = '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e';

if (!API_KEY || !WALLET_ID || !PLAINTEXT_ENTITY_SECRET) {
  console.error("VITE_CIRCLE_API_KEY, VITE_CIRCLE_WALLET_ID, or VITE_CIRCLE_ENTITY_SECRET not set in .env");
  process.exit(1);
}

const artifactPath = path.resolve(__dirname, '../src/config/MerchantTreasuryArtifact.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const CIRBTC_ADDRESS = '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF';

async function getEntitySecretCiphertext() {
  console.log("Fetching Circle Public Key...");
  const response = await fetch('https://api.circle.com/v1/w3s/config/entity/publicKey', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to fetch public key: ${JSON.stringify(data)}`);
  }
  const publicKey = data.data.publicKey;

  console.log("Encrypting Entity Secret...");
  const entitySecretBytes = Buffer.from(PLAINTEXT_ENTITY_SECRET, 'hex');
  const encryptedData = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, entitySecretBytes);
  
  return encryptedData.toString('base64');
}

async function main() {
  console.log(`\n--- Initiating deploy for cirBTC Vault ---`);
  
  const entitySecretCiphertext = await getEntitySecretCiphertext();
  const uuid = crypto.randomUUID();
  
  const response = await fetch('https://api.circle.com/v1/w3s/contracts/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Request-Id': uuid
    },
    body: JSON.stringify({
      idempotencyKey: uuid,
      name: `Merchant_cirBTC`,
      blockchain: "ARC-TESTNET",
      walletId: WALLET_ID,
      abiJson: JSON.stringify(artifact.abi),
      bytecode: artifact.bytecode,
      constructorParameters: [DEVELOPER_WALLET_ADDRESS, CIRBTC_ADDRESS],
      entitySecretCiphertext: entitySecretCiphertext,
      feeLevel: "HIGH"
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Circle API Deploy Error: ${JSON.stringify(data)}`);
  }

  console.log("Deployment response:", JSON.stringify(data, null, 2));
  const txId = data.data.id;
  console.log(`Transaction created. ID: ${txId}. Polling status via transaction endpoint...`);

  // Poll transaction status
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    await new Promise(r => setTimeout(r, 4000));
    try {
      const statusRes = await fetch(`https://api.circle.com/v1/w3s/transactions/${txId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      const statusData = await statusRes.json();
      if (statusRes.ok && statusData.data && statusData.data.transaction) {
        const tx = statusData.data.transaction;
        const state = tx.state;
        const address = tx.contractAddress;
        const hash = tx.txHash;
        
        console.log(`[Attempt ${attempts}] State: ${state} | Address: ${address || 'Pending'} | TxHash: ${hash || 'Pending'}`);
        
        if (state === 'COMPLETE' && hash && address) {
          console.log(`\n✅ Successfully deployed cirBTC Vault at: ${address} | Tx: ${hash}`);
          break;
        } else if (state === 'FAILED' || state === 'CANCELLED') {
          throw new Error(`Deployment transaction failed: ${state}`);
        }
      }
    } catch (e) {
      console.warn("Polling error:", e.message);
    }
  }
}

main().catch(console.error);
