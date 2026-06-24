import { JsonRpcProvider, Contract, formatUnits } from 'ethers';

const rpcUrl = "https://rpc.testnet.arc.network";
const provider = new JsonRpcProvider(rpcUrl);

const usdcAddress = "0x3600000000000000000000000000000000000000";
const userAddress = "0xb59b2C4efDAe4a9d9eb497E435cF25b65001D224";
const memoAddress = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505";

const erc20Abi = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

async function main() {
  const usdc = new Contract(usdcAddress, erc20Abi, provider);
  
  try {
    const decimals = await usdc.decimals();
    const balance = await usdc.balanceOf(userAddress);
    const allowance = await usdc.allowance(userAddress, memoAddress);
    const nativeBalance = await provider.getBalance(userAddress);

    console.log("User Address:", userAddress);
    console.log("Decimals:", decimals);
    console.log("USDC Balance:", formatUnits(balance, decimals), `(${balance.toString()})`);
    console.log("Allowance to Memo Contract:", formatUnits(allowance, decimals), `(${allowance.toString()})`);
    console.log("Native USDC (Gas) Balance:", formatUnits(nativeBalance, 18), "USDC");
  } catch (e) {
    console.error("Error checking balance:", e);
  }
}

main();
