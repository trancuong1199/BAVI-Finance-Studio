import { JsonRpcProvider, Contract } from 'ethers';

const CONTRACT_ADDRESS = '0x5E04b177D2848D937B8DDE57a0C2a60d51AF3d5b';
const RPC_URL = 'https://rpc.testnet.arc.network';

const ABI = [
  "event PaymentReceived(address indexed sender, uint256 amount)",
  "event FundsWithdrawn(address indexed to, uint256 amount)"
];

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);
  
  console.log("Querying deposit events from block 0 to latest...");
  try {
    const depositFilter = contract.filters.PaymentReceived();
    const events = await contract.queryFilter(depositFilter, 0, 'latest');
    console.log(`Success! Found ${events.length} deposit events.`);
  } catch (e) {
    console.error("Failed to query deposit events:", e.message || e);
  }
}

main().catch(console.error);
