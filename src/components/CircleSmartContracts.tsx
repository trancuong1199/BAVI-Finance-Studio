import { Code } from 'lucide-react';

export function CircleSmartContracts() {
  return (
    <div className="page-container">
      <h1 className="page-title"><Code size={24} /> Smart Contracts</h1>
      <p>Deploy a treasury from the Smart Treasury Vaults page using your connected wallet.</p>
      <p>Circle-managed template deployment is available to the operator through the Circle Console.</p>
      <a href="https://console.circle.com" target="_blank" rel="noreferrer">Open Circle Console</a>
    </div>
  );
}
