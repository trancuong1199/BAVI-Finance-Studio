import fs from 'fs';

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

async function checkStatus(contractId, txId) {
  console.log(`Checking status for Contract ID: ${contractId} & Tx ID: ${txId}...`);
  if (contractId) {
    try {
      const scRes = await fetch(`https://api.circle.com/v1/w3s/smart-contracts/${contractId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      const scData = await scRes.json();
      console.log("Smart Contract API Response:", JSON.stringify(scData, null, 2));
    } catch (e) {
      console.error("Error fetching smart contract status:", e.message);
    }
  }

  if (txId) {
    try {
      const txRes = await fetch(`https://api.circle.com/v1/w3s/transactions/${txId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      const txData = await txRes.json();
      console.log("Transaction API Response:", JSON.stringify(txData, null, 2));
    } catch (e) {
      console.error("Error fetching transaction status:", e.message);
    }
  }
}

const contractId = process.argv[2] || '019f5a69-126a-744c-b0b1-34f597a772e7';
const txId = process.argv[3] || '7b522697-c4b3-5daa-83bb-481e6ad6586f';

checkStatus(contractId, txId);
