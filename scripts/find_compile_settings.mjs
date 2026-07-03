import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JsonRpcProvider } from 'ethers';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT_ADDRESS = '0x5E04b177D2848D937B8DDE57a0C2a60d51AF3d5b';
const RPC_URL = 'https://rpc.testnet.arc.network';

// Original contract code (without swap)
const originalSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MerchantTreasuryUSDC {
    address public immutable owner;
    IERC20 public immutable usdc;

    event PaymentReceived(address indexed sender, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(address _owner, address _usdc) {
        require(_owner != address(0), "Invalid owner");
        require(_usdc != address(0), "Invalid USDC");
        owner = _owner;
        usdc = IERC20(_usdc);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "USDC transferFrom failed");
        emit PaymentReceived(msg.sender, amount);
    }

    function withdraw() external {
        require(msg.sender == owner, "Unauthorized");

        uint256 amount = usdc.balanceOf(address(this));
        require(amount > 0, "No funds");

        bool ok = usdc.transfer(owner, amount);
        require(ok, "USDC transfer failed");
        emit FundsWithdrawn(owner, amount);
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
`;

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  let deployedBytecode = (await provider.getCode(CONTRACT_ADDRESS)).toLowerCase();
  
  // Normalize deployed bytecode (remove constructor metadata from end of bytecode)
  // Deployed bytecode contains metadata hash which varies. Let's compare just the core bytecode.
  // The metadata starts with a264697066735822... (usually near the end).
  const metadataStart = deployedBytecode.lastIndexOf("a264697066735822");
  const coreDeployed = metadataStart !== -1 ? deployedBytecode.substring(0, metadataStart) : deployedBytecode;
  console.log("Core deployed bytecode length:", coreDeployed.length);

  console.log("Loading solc v0.8.20...");
  
  // Load remote solc version
  const solcVersion = 'v0.8.20+commit.a1b79de6';
  const compiler = await new Promise((resolve, reject) => {
    solc.loadRemoteVersion(solcVersion, (err, compiledSolc) => {
      if (err) reject(err);
      else resolve(compiledSolc);
    });
  });

  const evmVersions = ['default', 'shanghai', 'paris', 'london'];
  const optimizations = [false, true];

  console.log("\nStarting combinations check...");
  
  for (const evmVersion of evmVersions) {
    for (const opt of optimizations) {
      const settings = {
        optimizer: {
          enabled: opt,
          runs: 200
        },
        outputSelection: {
          '*': {
            '*': ['evm.bytecode.object']
          }
        }
      };
      
      if (evmVersion !== 'default') {
        settings.evmVersion = evmVersion;
      }

      const input = {
        language: 'Solidity',
        sources: {
          'MerchantTreasuryUSDC.sol': {
            content: originalSource
          }
        },
        settings
      };

      const output = JSON.parse(compiler.compile(JSON.stringify(input)));
      if (output.errors && output.errors.some(e => e.severity === 'error')) {
        console.log(`Error compiling with EVM: ${evmVersion}, Opt: ${opt}`);
        continue;
      }

      const compiledBytecode = ('0x' + output.contracts['MerchantTreasuryUSDC.sol']['MerchantTreasuryUSDC'].evm.bytecode.object).toLowerCase();
      const compiledMetadataStart = compiledBytecode.lastIndexOf("a264697066735822");
      const coreCompiled = compiledMetadataStart !== -1 ? compiledBytecode.substring(0, compiledMetadataStart) : compiledBytecode;

      const isMatch = coreDeployed === coreCompiled;
      console.log(`- EVM: ${evmVersion.padEnd(8)} | Opt: ${opt ? 'Enabled ' : 'Disabled'} | Compiled Core Length: ${coreCompiled.length} | Match: ${isMatch ? '✅ MATCH' : '❌ NO'}`);
    }
  }
}

main().catch(console.error);
