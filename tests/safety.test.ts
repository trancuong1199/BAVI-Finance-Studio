import assert from 'node:assert/strict';
import test from 'node:test';
import { minimumOutput, parseSwapAmount, confirmTransaction } from '../src/lib/swapSafety.ts';
import { views, pathForView, viewFromPath } from '../src/lib/navigation.ts';
import { executeArcSwap } from '../src/lib/arcSwap.ts';

test('every view survives refresh and browser navigation', () => {
  for (const view of views) assert.equal(viewFromPath(pathForView(view)), view);
  assert.equal(viewFromPath('/agent-stack/'), 'agent-stack');
  assert.equal(viewFromPath('/missing'), 'dashboard');
});
test('amount conversion preserves decimal precision without floating point', () => {
  assert.equal(parseSwapAmount('1.000000000000000001', 18), 1000000000000000001n);
  for (const input of ['0', '-1', 'NaN', 'Infinity', '1e3', '', '1.0000001']) assert.throws(() => parseSwapAmount(input, 6));
});
test('a quote always has a positive bounded output minimum', () => {
  assert.equal(minimumOutput(1000000n, 50), 995000n);
  for (const quote of [0n, -1n, 1n]) assert.throws(() => minimumOutput(quote));
  for (const bps of [-1, 501, NaN, 1.5]) assert.throws(() => minimumOutput(10000n, bps));
});
test('failed or missing receipts never become success', async () => {
  for (const receipt of [null, { status: 0, hash: 'failed' }]) await assert.rejects(confirmTransaction({ wait: async () => receipt }));
  await assert.rejects(confirmTransaction({ wait: async () => { throw new Error('User rejected'); } }));
  assert.equal((await confirmTransaction({ wait: async () => ({ status: 1, hash: 'confirmed' }) })).hash, 'confirmed');
});
test('invalid input and wrong networks fail before wallet transactions', async () => {
  const requests: string[] = [];
  const wallet = { request: async ({ method }: { method: string }) => { requests.push(method); return '0x1'; } };
  await assert.rejects(executeArcSwap(wallet, '-1', 'USDC'));
  assert.deepEqual(requests, []);
  await assert.rejects(executeArcSwap(wallet, '1', 'USDC'), /Arc Testnet/);
  assert.deepEqual(requests, ['eth_chainId']);
});
