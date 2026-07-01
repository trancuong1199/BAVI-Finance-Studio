import crypto from 'crypto';
import fs from 'fs';

const API_KEY = 'TEST_API_KEY:ca21ddf43344f814a3b699f8205a961e:5b9d8a9098e9b24de94162eaa7c39fac';
const BASE_URL = 'https://api-sandbox.circle.com/v1/w3s';

const getHeaders = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'X-Request-Id': crypto.randomUUID()
});

async function main() {
  console.log("Starting Circle setup...");

  // 1. Get Public Key
  console.log("Fetching Public Key...");
  let pubKeyRes = await fetch(`${BASE_URL}/config/entity/publicKey`, { headers: getHeaders() });
  let pubKeyData = await pubKeyRes.json();
  if (!pubKeyRes.ok) throw new Error("pubKey: " + JSON.stringify(pubKeyData));
  const publicKey = pubKeyData.data.publicKey;

  // 2. Generate Secret and Encrypt
  const secret = crypto.randomBytes(32).toString('hex');
  const entitySecret = Buffer.from(secret);
  const encryptedData = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, entitySecret);
  const entitySecretCiphertext = encryptedData.toString('base64');
  console.log("Generated Entity Secret Ciphertext.");

  // 3. Register Entity Secret
  console.log("Registering Entity Secret...");
  let regRes = await fetch(`${BASE_URL}/config/entity/secret`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      entitySecretCiphertext,
      pubKeyId: pubKeyData.data.pubKeyId,
    })
  });
  let regData = await regRes.json();
  console.log("Register response:", regData);

  // 4. Create Wallet Set
  console.log("Creating Wallet Set...");
  let wsRes = await fetch(`${BASE_URL}/walletSets`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      name: "ARC Dev Wallet Set",
      entitySecretCiphertext
    })
  });
  let wsData = await wsRes.json();
  if (!wsRes.ok) throw new Error("walletSet: " + JSON.stringify(wsData));
  const walletSetId = wsData.data.walletSet.id;
  console.log("Wallet Set ID:", walletSetId);

  // 5. Create Developer Wallet
  console.log("Creating Developer Wallet...");
  const newEncryptedData = crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, Buffer.from(secret));
  
  let walletRes = await fetch(`${BASE_URL}/developer/wallets`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      walletSetId,
      entitySecretCiphertext: newEncryptedData.toString('base64'),
      blockchains: ["ETH-SEPOLIA"],
      count: 1
    })
  });
  let walletData = await walletRes.json();
  if (!walletRes.ok) throw new Error("wallet: " + JSON.stringify(walletData));
  const walletId = walletData.data.wallets[0].id;
  console.log("Wallet ID:", walletId);
  
  // 6. Fetch Templates
  console.log("Fetching Templates...");
  let tplRes = await fetch(`${BASE_URL}/smart-contracts/templates`, { headers: getHeaders() });
  let tplData = await tplRes.json();
  let templateId = "";
  if (tplRes.ok && tplData.data && tplData.data.length > 0) {
    const erc20 = tplData.data.find((t) => t.name === "ERC20");
    templateId = erc20 ? erc20.id : tplData.data[0].id;
  }
  
  console.log("Template ID:", templateId);

  // 7. Update .env file
  const envContent = `VITE_CIRCLE_API_KEY=${API_KEY}
VITE_CIRCLE_WALLET_ID=${walletId}
VITE_CIRCLE_TEMPLATE_ID=${templateId}
VITE_CIRCLE_ENTITY_SECRET=${newEncryptedData.toString('base64')}
`;
  fs.writeFileSync('/home/avada/ARC-swap-/.env', envContent);
  console.log("Successfully updated .env file!");
  fs.writeFileSync('/home/avada/ARC-swap-/circle-recovery.txt', `Entity Secret (KEEP SAFE): ${secret}\n`);
}

main().catch(console.error);
