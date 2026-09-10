import { BrowserProvider, Contract, type Eip1193Provider } from 'ethers';
import { confirmTransaction, minimumOutput, parseSwapAmount } from './swapSafety.ts';

export const ARC_ROUTER = '0x509cF58CdA08C7aee83a2BdBb4A1Eac907343D01';
const WUSDC = '0x911b4000D3422F482F4062a913885f7b035382Df';
const EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
const TOKEN_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function deposit() payable',
  'function withdraw(uint256)',
];

/** Simulate the route for a quote; broadcast only with a nonzero output minimum. */
export async function executeArcSwap(wallet: Eip1193Provider, amount: string, fromToken: 'USDC' | 'EURC', slippageBps = 50, progress: (message: string) => void = () => {}) {
  if (fromToken !== 'USDC' && fromToken !== 'EURC') throw new Error('Unsupported swap token.');
  minimumOutput(10000n, slippageBps);
  parseSwapAmount(amount, fromToken === 'USDC' ? 18 : 6);
  const provider = new BrowserProvider(wallet);
  const assertChain = async () => {
    const chainId = await wallet.request({ method: 'eth_chainId' });
    if (BigInt(chainId) !== 5042002n) throw new Error('Switch your wallet to Arc Testnet first.');
  };
  await assertChain();
  const signer = await provider.getSigner();
  const owner = await signer.getAddress();
  const reversed = fromToken === 'EURC';
  const tokenIn = new Contract(reversed ? EURC : WUSDC, TOKEN_ABI, signer);
  const tokenOut = new Contract(reversed ? WUSDC : EURC, TOKEN_ABI, signer);
  for (const address of [ARC_ROUTER, WUSDC, EURC]) {
    if (await provider.getCode(address) === '0x') throw new Error('Swap contract is unavailable on this network.');
  }
  const decimals = Number(await tokenIn.decimals());
  if (!reversed && decimals !== 18) throw new Error('Unsupported wrapped USDC decimals.');
  const amountIn = parseSwapAmount(amount, decimals);
  const initialOutput = BigInt(await tokenOut.balanceOf(owner));
  if (!reversed) {
    progress('Confirm wrapping USDC. If a later step fails, wrapped USDC remains in your wallet.');
    await assertChain();
    await confirmTransaction(await tokenIn.deposit({ value: amountIn }));
  }
  if (BigInt(await tokenIn.allowance(owner, ARC_ROUTER)) < amountIn) {
    progress('Confirm the exact token allowance in your wallet.');
    await assertChain();
    await confirmTransaction(await tokenIn.approve(ARC_ROUTER, amountIn));
  }
  const router = new Contract(ARC_ROUTER, [
    'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)',
  ], signer);
  const params = {
    tokenIn: reversed ? EURC : WUSDC, tokenOut: reversed ? WUSDC : EURC,
    fee: 100, recipient: owner, deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n,
  };
  progress('Checking the executable quote and slippage limit.');
  const quote = BigInt(await router.exactInputSingle.staticCall(params));
  params.amountOutMinimum = minimumOutput(quote, slippageBps);
  await assertChain();
  progress(`Confirm swap with ${slippageBps / 100}% maximum slippage.`);
  const receipt = await confirmTransaction(await router.exactInputSingle(params));
  let received = 0n;
  let unwrapWarning: string | undefined;
  try {
    received = BigInt(await tokenOut.balanceOf(owner)) - initialOutput;
    if (reversed && received > 0n) {
      await assertChain();
      progress('Confirm unwrapping the received WUSDC.');
      await confirmTransaction(await tokenOut.withdraw(received));
    }
  } catch {
    unwrapWarning = 'Swap confirmed. Balance refresh or unwrapping did not complete; check your wallet before retrying.';
  }
  return { txHash: receipt.hash, received, unwrapWarning };
}
