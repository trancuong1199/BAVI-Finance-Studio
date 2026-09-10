import './load-env.mjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const WALLET_ID = process.env.CIRCLE_WALLET_ID;
const PLAINTEXT_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;
const DEVELOPER_WALLET_ADDRESS = '0x4a86c0b160decf8db472f5ad2078fc0ca5e9e69e';

if (!API_KEY || !WALLET_ID || !PLAINTEXT_ENTITY_SECRET) {
  console.error("CIRCLE_API_KEY, CIRCLE_WALLET_ID, or CIRCLE_ENTITY_SECRET not set in .env.local");
  process.exit(1);
}

const artifactPath = path.resolve(__dirname, '../src/config/MerchantTreasuryArtifact.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const TOKENS = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  cirBTC: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF'
};

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

  console.log("Encrypting Entity Secret on the fly...");
  const entitySecretBytes = Buffer.from(PLAINTEXT_ENTITY_SECRET, 'hex');
  const encryptedData = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, entitySecretBytes);
  
  return encryptedData.toString('base64');
}

async function deployTokenVault(tokenSymbol, tokenAddress) {
  console.log(`\n--- Initiating deploy for ${tokenSymbol} Vault (${tokenAddress}) ---`);
  
  // Encrypt on the fly for each transaction to avoid reuse error
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
      name: `Merchant_${tokenSymbol}`,
      blockchain: "ARC-TESTNET",
      walletId: WALLET_ID,
      abiJson: JSON.stringify(artifact.abi),
      bytecode: artifact.bytecode,
      constructorParameters: [DEVELOPER_WALLET_ADDRESS, tokenAddress],
      entitySecretCiphertext: entitySecretCiphertext,
      feeLevel: "HIGH"
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Circle API Deploy Error: ${JSON.stringify(data)}`);
  }

  console.log("Deployment response:", JSON.stringify(data, null, 2));
  const contractId = data.data.contractId;
  const transactionId = data.data.transactionId;
  console.log(`Contract deployment initiated. Contract ID: ${contractId}, Tx ID: ${transactionId}. Polling status...`);

  // Now, poll status
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for ${tokenSymbol} vault deployment`));
        return;
      }

      try {
        const statusRes = await fetch(`https://api.circle.com/v1/w3s/smart-contracts/${contractId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          }
        });
        const statusData = await statusRes.json();
        if (statusRes.ok && statusData.data) {
          const scInfo = statusData.data;
          const status = scInfo.status;
          const contractAddress = scInfo.contractAddress;
          const txHash = scInfo.txHash;
          
          console.log(`[Attempt ${attempts}] Status: ${status} | Address: ${contractAddress || 'Pending'} | TxHash: ${txHash || 'Pending'}`);
          
          if (status === 'ACTIVE' && contractAddress) {
            clearInterval(interval);
            resolve({ address: contractAddress, txHash: txHash || '' });
          } else if (status === 'FAILED') {
            clearInterval(interval);
            reject(new Error(`Deployment failed for ${tokenSymbol}`));
          }
        }
      } catch (err) {
        console.warn("Polling error:", err.message);
      }
    }, 4000);
  });
}

async function main() {
  const deployed = {};
  
  // 1. Deploy USDC Vault
  try {
    const usdcVault = await deployTokenVault('USDC', TOKENS.USDC);
    deployed.USDC = usdcVault;
    console.log(`✅ USDC Vault successfully deployed at: ${usdcVault.address} | Tx: ${usdcVault.txHash}`);
  } catch (err) {
    console.error(`❌ USDC Vault deployment failed:`, err.message);
  }

  // 2. Deploy EURC Vault
  try {
    const eurcVault = await deployTokenVault('EURC', TOKENS.EURC);
    deployed.EURC = eurcVault;
    console.log(`✅ EURC Vault successfully deployed at: ${eurcVault.address} | Tx: ${eurcVault.txHash}`);
  } catch (err) {
    console.error(`❌ EURC Vault deployment failed:`, err.message);
  }

  // 3. Deploy cirBTC Vault
  try {
    const cirBtcVault = await deployTokenVault('cirBTC', TOKENS.cirBTC);
    deployed.cirBTC = cirBtcVault;
    console.log(`✅ cirBTC Vault successfully deployed at: ${cirBtcVault.address} | Tx: ${cirBtcVault.txHash}`);
  } catch (err) {
    console.error(`❌ cirBTC Vault deployment failed:`, err.message);
  }

  console.log("\nDeployment summary:", JSON.stringify(deployed, null, 2));

  // Update .env for USDC if deployed
  if (deployed.USDC) {
    console.log("\nUpdating .env file with new VITE_CIRCLE_DEPLOYED_CONTRACT...");
    let envContent = fs.readFileSync('.env.local', 'utf8');
    
    // Replace VITE_CIRCLE_DEPLOYED_CONTRACT
    if (envContent.includes('VITE_CIRCLE_DEPLOYED_CONTRACT=')) {
      envContent = envContent.replace(/VITE_CIRCLE_DEPLOYED_CONTRACT=.*/, `VITE_CIRCLE_DEPLOYED_CONTRACT=${deployed.USDC.address}`);
    } else {
      envContent += `\nVITE_CIRCLE_DEPLOYED_CONTRACT=${deployed.USDC.address}`;
    }

    // Replace VITE_CIRCLE_DEPLOY_TX_HASH
    if (envContent.includes('VITE_CIRCLE_DEPLOY_TX_HASH=')) {
      envContent = envContent.replace(/VITE_CIRCLE_DEPLOY_TX_HASH=.*/, `VITE_CIRCLE_DEPLOY_TX_HASH=${deployed.USDC.txHash}`);
    } else {
      envContent += `\nVITE_CIRCLE_DEPLOY_TX_HASH=${deployed.USDC.txHash}`;
    }

    fs.writeFileSync('.env.local', envContent, 'utf8');
    console.log("Successfully updated .env file!");
  }
}

main().catch(console.error);
