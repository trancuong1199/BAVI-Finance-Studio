import { parseUnits } from 'ethers';
export function parseSwapAmount(amount: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error('Enter a positive decimal amount.');
  const value = parseUnits(amount, decimals);
  if (value <= 0n) throw new Error('Swap amount must be greater than zero.');
  return value;
}
export function minimumOutput(quote: bigint, slippageBps = 50): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 500) {
    throw new Error('Slippage must be between 0% and 5%.');
  }
  const minimum = quote * BigInt(10000 - slippageBps) / 10000n;
  if (minimum <= 0n) throw new Error('No usable swap quote. No swap was submitted.');
  return minimum;
}
export async function confirmTransaction(tx: { wait: (confirmations?: number, timeout?: number) => Promise<{ status: number | null; hash: string } | null> }) {
  const receipt = await tx.wait(1, 180000);
  if (!receipt || receipt.status !== 1) throw new Error('Transaction was not confirmed successfully.');
  return receipt;
}
