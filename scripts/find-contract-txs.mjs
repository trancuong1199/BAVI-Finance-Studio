import { JsonRpcProvider } from 'ethers';

const rpcUrl = "https://rpc.testnet.arc.network";
const provider = new JsonRpcProvider(rpcUrl);

const contractAddress = "0x428266f0Fc0a3B0926a6E81D4ba53203104F0E26";

async function main() {
  const latestBlock = await provider.getBlockNumber();
  const startBlock = latestBlock - 50; // Scan the last 50 blocks
  
  console.log(`Scanning blocks ${startBlock} to ${latestBlock} for transactions to contract ${contractAddress}...`);
  
  for (let i = startBlock; i <= latestBlock; i++) {
    const block = await provider.getBlock(i, true); // Get block with transaction details
    if (block && block.prefetchedTransactions) {
      for (const tx of block.prefetchedTransactions) {
        if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
          console.log(`Found Tx: ${tx.hash}`);
          console.log(`From: ${tx.from}`);
          console.log(`Value: ${tx.value.toString()} wei`);
          console.log(`Input: ${tx.data.slice(0, 10)}...`);
        }
      }
    }
  }
  
  console.log("Scan finished.");
}

main().catch(console.error);
