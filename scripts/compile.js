import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.resolve(__dirname, '../contracts/MerchantTreasuryUSDC.sol');
const outputPath = path.resolve(__dirname, '../src/config/MerchantTreasuryArtifact.json');

async function main() {
  console.log("Reading contract source...");
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  // Check if solc is installed, otherwise install it
  try {
    import.meta.resolve('solc');
  } catch (e) {
    console.log("Installing 'solc' compiler package...");
    execSync('npm install --no-save solc', { stdio: 'inherit' });
  }

  const { default: solc } = await import('solc');

  console.log("Compiling contract...");
  const input = {
    language: 'Solidity',
    sources: {
      'MerchantTreasuryUSDC.sol': {
        content: sourceCode
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasErrors = false;
    for (const error of output.errors) {
      console.error(error.formattedMessage);
      if (error.severity === 'error') {
        hasErrors = true;
      }
    }
    if (hasErrors) {
      throw new Error("Compilation failed with errors.");
    }
  }

  const contractOutput = output.contracts['MerchantTreasuryUSDC.sol']['MerchantTreasuryUSDC'];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  console.log("Compilation successful!");
  console.log(`Bytecode length: ${bytecode.length} hex chars`);

  const artifact = {
    abi,
    bytecode: '0x' + bytecode
  };

  const parentDir = path.dirname(outputPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`Saved artifact to: ${outputPath}`);
}

main().catch(err => {
  console.error("Compilation error:", err);
  process.exit(1);
});
