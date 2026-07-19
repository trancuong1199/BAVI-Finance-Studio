export interface Transaction {
  id: string;
  action: string;
  amount: string;
  from: string;
  to: string;
  txHash: string;
  status: 'PENDING' | 'COMPLETE' | 'FAILED';
  explorerUrl?: string;
  timestamp: number;
  tokenSymbol?: string;
}

const STORAGE_KEY = 'bavi_finance_transactions';

export const saveTransaction = (tx: Transaction) => {
  const history = getTransactionHistory();
  history.unshift(tx);
  // Keep only the last 50 transactions
  const trimmedHistory = history.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
  // Dispatch an event so UI can update immediately
  window.dispatchEvent(new Event('transaction_history_updated'));
};

export const updateTransactionStatus = (id: string, status: Transaction['status'], txHash?: string) => {
  const history = getTransactionHistory();
  const txIndex = history.findIndex(tx => tx.id === id);
  if (txIndex !== -1) {
    history[txIndex].status = status;
    if (txHash) {
      history[txIndex].txHash = txHash;
      history[txIndex].explorerUrl = `https://testnet.arcscan.app/tx/${txHash}`;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event('transaction_history_updated'));
  }
};

export const getTransactionHistory = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
