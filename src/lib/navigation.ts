export const views = ['dashboard', 'swap', 'uniswap', 'payments', 'logs', 'analytics', 'faucet', 'contracts', 'doc', 'memos', 'merchant-treasury', 'bridge', 'arbitrage', 'presentation', 'agent-stack'] as const;
export type ViewState = typeof views[number];
export function viewFromPath(pathname: string): ViewState {
  const path = pathname.replace(/^\/+|\/+$/g, '');
  return views.includes(path as ViewState) ? path as ViewState : 'dashboard';
}
export function pathForView(view: ViewState): string {
  return view === 'dashboard' ? '/' : `/${view}`;
}
