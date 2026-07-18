import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rpcUrl = "https://rpc.testnet.arc.network";
const explorerApiUrl = "https://testnet.arcscan.app/api";

const contractsToVerify = [
  {
    name: "USDC Vault",
    address: "0x428266f0Fc0a3B0926a6E81D4ba53203104F0E26",
    constructorArgs: "0000000000000000000000004a86c0b160decf8db472f5ad2078fc0ca5e9e69e0000000000000000000000003600000000000000000000000000000000000000" // owner, usdc_token
  },
  {
    name: "EURC Vault",
    address: "0x66fe48c23b5f5363ea73f860e7671adbc62b3d04",
    constructorArgs: "0000000000000000000000004a86c0b160decf8db472f5ad2078fc0ca5e9e69e00000000000000000000000089b50855aa3be2f677cd6303cec089b5f319d72a" // owner, eurc_token
  },
  {
    name: "cirBTC Vault",
    address: "0xf592f76a4e08c7efb394bd222b2580a2da39805e",
    constructorArgs: "0000000000000000000000004a86c0b160decf8db472f5ad2078fc0ca5e9e69e000000000000000000000000f0c4a4ce82a5746abaad9425360ab04fbba432bf" // owner, cirbtc_token
  }
];

async function main() {
  const sourcePath = path.resolve(__dirname, '../contracts/MerchantTreasuryUSDC.sol');
  const sourceCode = fs.readFileSync(sourcePath, 'utf8');
  
  for (const contract of contractsToVerify) {
    console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
    
    const params = new URLSearchParams();
    params.append('apikey', 'dummy');
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', contract.address);
    params.append('sourceCode', sourceCode);
    params.append('codeformat', 'solidity-single-file');
    params.append('contractname', 'MerchantTreasuryUSDC.sol:MerchantTreasuryUSDC');
    params.append('compilerversion', 'v0.8.35+commit.47b9dedd');
    params.append('optimizationUsed', '0'); // no optimization
    params.append('constructorArguements', contract.constructorArgs);
    params.append('evmversion', 'cancun');

    try {
      const response = await fetch(explorerApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      
      const resultText = await response.text();
      let result;
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        result = resultText;
      }
      
      console.log(`Verification result:`, JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(`Verification request failed:`, e.message);
    }
  }
}

main();
