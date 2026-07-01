import { JsonRpcProvider, Contract, formatUnits } from 'ethers';

// Arc Testnet RPC
const provider = new JsonRpcProvider("https://rpc.testnet.arc.network");

// Circle Gateway (UBK) contracts on testnet
const GATEWAY_WALLET  = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
const GATEWAY_MINTER  = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B';
const USDC_ADDRESS    = '0x3600000000000000000000000000000000000000'; // native USDC on Arc

// Replace with your wallet address
const USER_ADDRESS = process.argv[2] || '0xb59b2C4efDAe4a9d9eb497E435cF25b65001D224';

const erc20Abi = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const gatewayAbi = [
  // Try common view functions for balance in vault
  "function depositorBalance(address depositor) view returns (uint256)",
  "function balanceOf(address depositor) view returns (uint256)",
  "function getBalance(address depositor) view returns (uint256)",
];

async function main() {
  console.log("=== Circle Gateway Unified Balance Check ===\n");
  console.log("User Address     :", USER_ADDRESS);
  console.log("GatewayWallet    :", GATEWAY_WALLET);
  console.log("GatewayMinter    :", GATEWAY_MINTER);
  console.log("USDC Contract    :", USDC_ADDRESS);
  console.log("");

  const usdc = new Contract(USDC_ADDRESS, erc20Abi, provider);
  const decimals = await usdc.decimals();

  // 1. USDC balance in user's wallet (native on Arc)
  const walletBal = await usdc.balanceOf(USER_ADDRESS);
  console.log("1. Ví MetaMask (Arc Testnet) USDC:", formatUnits(walletBal, decimals), "USDC");

  // 2. USDC held BY the GatewayWallet contract (vault total)
  const vaultBal = await usdc.balanceOf(GATEWAY_WALLET);
  console.log("2. GatewayWallet Contract holds  :", formatUnits(vaultBal, decimals), "USDC (total vault)");

  // 3. USDC held BY the GatewayMinter contract
  const minterBal = await usdc.balanceOf(GATEWAY_MINTER);
  console.log("3. GatewayMinter Contract holds  :", formatUnits(minterBal, decimals), "USDC");

  // 4. Native gas balance
  const nativeBal = await provider.getBalance(USER_ADDRESS);
  console.log("4. Native gas balance            :", formatUnits(nativeBal, 18), "USDC (gas)");

  console.log("\n💡 USDC của bạn sau Deposit nằm trong GatewayWallet contract.");
  console.log("   Circle Gateway theo dõi phần depositor = địa chỉ ví bạn trong contract đó.");
  console.log("   Dùng kit.unifiedBalance.getBalances() (qua Circle API) để xem phần của bạn.");
}

main().catch(console.error);
