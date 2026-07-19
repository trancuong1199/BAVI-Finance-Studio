import { createViemAdapterFromProvider, createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import { AppKit } from "@circle-fin/app-kit";
import { JsonRpcProvider } from "ethers";

export const globalRpcProvider = new JsonRpcProvider("https://rpc.testnet.arc.network", undefined, { staticNetwork: true });


declare global {
  interface Window {
    ethereum?: any;
  }
}

export const ARC_TESTNET_CONFIG = {
  chainId: "0x4cef52", // 5042002 in hex
  chainName: "Build on Arc",
  rpcUrls: ["https://rpc.testnet.arc.network"],
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

export const SUPPORTED_CHAINS = [
  { name: "Build on Arc", id: "Arc_Testnet", chainIdHex: "0x4cef52", isArc: true },
  { name: "Base Sepolia", id: "Base_Sepolia", chainIdHex: "0x14a34", isArc: false },
  { name: "Arbitrum Sepolia", id: "Arbitrum_Sepolia", chainIdHex: "0x66eee", isArc: false },
  { name: "Avalanche Fuji", id: "Avalanche_Fuji", chainIdHex: "0x2a", isArc: false },
  { name: "Ethereum Sepolia", id: "Ethereum_Sepolia", chainIdHex: "0xaa36a7", isArc: false },
];

export async function switchOrAddArcNetwork(provider?: any): Promise<boolean> {
  const activeProvider = provider || window.ethereum;
  if (!activeProvider) {
    throw new Error("Wallet provider is not available");
  }

  try {
    // Try switching first
    await activeProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET_CONFIG.chainId }],
    });
    return true;
  } catch (switchError: any) {
    // Fallback: Attempt to add the network if switch fails for any reason
    try {
      await activeProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ARC_TESTNET_CONFIG.chainId,
            chainName: ARC_TESTNET_CONFIG.chainName,
            rpcUrls: ARC_TESTNET_CONFIG.rpcUrls,
            nativeCurrency: ARC_TESTNET_CONFIG.nativeCurrency,
            blockExplorerUrls: ARC_TESTNET_CONFIG.blockExplorerUrls,
          },
        ],
      });
      return true;
    } catch (addError) {
      console.error("Error adding Build on Arc network", addError);
      return false;
    }
  }
}

export async function switchOrAddNetwork(provider: any, chainIdHex: string, chainName: string, rpcUrl: string, symbol: string, decimals: number, explorer: string): Promise<boolean> {
  const activeProvider = provider || window.ethereum;
  if (!activeProvider) {
    throw new Error("No wallet provider found");
  }

  try {
    await activeProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // Fallback: Attempt to add the network if switch fails for any reason
    try {
      await activeProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: chainName,
            rpcUrls: [rpcUrl],
            nativeCurrency: { name: symbol, symbol: symbol, decimals: decimals },
            blockExplorerUrls: [explorer],
          },
        ],
      });
      return true;
    } catch (addError) {
      console.error(`Error adding network ${chainName}`, addError);
      return false;
    }
  }
}

export async function createAdapterFromMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available");
  }
  return await createViemAdapterFromProvider({
    provider: window.ethereum,
  });
}

export function createAdapterFromPrivateKey(privateKey: string) {
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }
  return createViemAdapterFromPrivateKey({
    privateKey,
  });
}

export function initAppKit(): AppKit {
  return new AppKit();
}
