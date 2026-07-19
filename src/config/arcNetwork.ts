import { type Chain } from 'viem';

export const arcTestnet = {
  id: 5042002,
  name: 'Build on Arc',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
} as const satisfies Chain;

export const ARC_GAS_TOKEN_DECIMALS = 18;
export const ARC_ERC20_TOKEN_DECIMALS = 6;
export const ARC_USDC_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder for native gas address or ERC20 address based on docs
