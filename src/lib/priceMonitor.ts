import { ethers } from 'ethers';

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'event Sync(uint112 reserve0, uint112 reserve1)'
];

export interface PoolReserves {
  poolName: string;
  poolAddress: string;
  reserve0: bigint;
  reserve1: bigint;
  token0: string;
  token1: string;
  price: number;
}

export interface ArbitrageOpportunity {
  id: string;
  pair: string;
  dexA: string;
  dexB: string;
  priceA: number;
  priceB: number;
  spread: number;
  expectedProfit: number;
  optimalAmountIn: number;
  timestamp: string;
  status: 'active' | 'executing' | 'completed' | 'expired';
  buyPool: string;
  sellPool: string;
  isRealOnChain: boolean;
}

export interface RealChainStatus {
  blockNumber: number;
  latencyMs: number;
  chainId: number;
  gasPriceGwei: string;
  timestamp: string;
}

export class PriceMonitor {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async getPoolReserves(poolAddress: string, poolName: string = 'UnitFlow V3'): Promise<PoolReserves> {
    try {
      const pair = new ethers.Contract(poolAddress, PAIR_ABI, this.provider);
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      const r0Float = Number(reserve0);
      const r1Float = Number(reserve1);
      const price = r0Float > 0 ? r1Float / r0Float : 0;

      return {
        poolName,
        poolAddress,
        reserve0,
        reserve1,
        token0,
        token1,
        price,
      };
    } catch (err) {
      throw new Error(`Cannot read reserves for ${poolName}; no estimate is substituted.`, { cause: err });
    }
  }

  async fetchRealChainStatus(): Promise<RealChainStatus> {
    const start = Date.now();
    const blockNumber = await this.provider.getBlockNumber();
    const latencyMs = Date.now() - start;
    const network = await this.provider.getNetwork();
    const feeData = await this.provider.getFeeData();
    const gasPriceGwei = feeData.gasPrice ? (Number(feeData.gasPrice) / 1e9).toFixed(4) : '0.0001';

    return {
      blockNumber,
      latencyMs,
      chainId: Number(network.chainId),
      gasPriceGwei,
      timestamp: new Date().toLocaleTimeString(),
    };
  }

  static calculateArbitrageOpportunity(
    poolA: PoolReserves,
    poolB: PoolReserves,
    pairName: string = 'USDC / EURC',
    feeBps: number = 30
  ): ArbitrageOpportunity | null {
    if (poolA.poolAddress.toLowerCase() === poolB.poolAddress.toLowerCase() ||
        poolA.token0.toLowerCase() !== poolB.token0.toLowerCase() ||
        poolA.token1.toLowerCase() !== poolB.token1.toLowerCase() ||
        poolA.price <= 0 || poolB.price <= 0) return null;
    const priceA = poolA.price;
    const priceB = poolB.price;

    let buyPool = poolA;
    let sellPool = poolB;
    let priceDiff = priceA > 0 ? ((priceB - priceA) / priceA) * 100 : 0;

    if (priceA > priceB) {
      buyPool = poolB;
      sellPool = poolA;
      priceDiff = priceB > 0 ? ((priceA - priceB) / priceB) * 100 : 0;
    }

    const spread = Number(Math.abs(priceDiff).toFixed(2));

    if (spread <= feeBps * 2 / 100) return null;
    const optimalAmountIn = 150 + Math.floor(spread * 50);
    const expectedProfit = Number(((optimalAmountIn * (spread - feeBps * 2 / 100)) / 100 * 0.9).toFixed(2));

    return {
      id: `opp-${Date.now()}`,
      pair: pairName,
      dexA: buyPool.poolName,
      dexB: sellPool.poolName,
      priceA: Number(buyPool.price.toFixed(4)),
      priceB: Number(sellPool.price.toFixed(4)),
      spread,
      expectedProfit,
      optimalAmountIn,
      timestamp: new Date().toLocaleTimeString(),
      status: 'active',
      buyPool: buyPool.poolAddress,
      sellPool: sellPool.poolAddress,
      isRealOnChain: true,
    };
  }
}
