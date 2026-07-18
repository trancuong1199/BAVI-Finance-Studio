import { JsonRpcProvider } from 'ethers';

const rpcUrl = "https://rpc.testnet.arc.network";
const provider = new JsonRpcProvider(rpcUrl);

const addresses = {
  USDC_Vault: '0x5e04b177d2848d937b8dde57a0c2a60d51af3d5b',
  EURC_Vault: '0x28805311caef7d48484b36cda5266449caeb493e',
  cirBTC_Vault: '0x06f9ca202abc362ff528b8c8c9617495db597d92',
};

async function main() {
  for (const [name, addr] of Object.entries(addresses)) {
    try {
      const code = await provider.getCode(addr);
      console.log(`${name} (${addr}):`, code === '0x' ? '❌ No Code (Not deployed/EOA)' : `✅ Contract Exists (Length: ${code.length})`);
    } catch (e) {
      console.error(`Error checking ${name}:`, e.message);
    }
  }
}

main();
