# Recover exposed Circle credentials

Deleting a file does not invalidate credentials or remove old commits and deployments.

1. Revoke the exposed API key in Circle Console. Rotate/reset the exposed entity secret using Circle's supported flow and save the new recovery file securely. Coordinate other applications sharing the Circle account.
2. The web app now deploys treasury vaults with a connected browser wallet. It does not need a Circle API key, wallet ID or entity secret on Vercel. Local operator scripts use CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET and CIRCLE_WALLET_ID in ignored .env.local.
3. Remove VITE_CIRCLE_API_KEY, VITE_CIRCLE_ENTITY_SECRET and VITE_CIRCLE_WALLET_ID from every applicable Vercel environment. Public contract address/hash settings may remain. Use Node 22.13+ and npm run build.
4. Push the reviewed fix and deploy. Check dashboard, /swap and /agent-stack, then confirm downloaded assets contain no credentials. Preview before promoting if production continuity is required.
5. Remove/protect older Vercel deployments containing keys. A new deployment does not alter them. Avoid rollback to a vulnerable deployment.
6. For Git history cleanup, coordinate before a git-filter-repo rewrite and force push. Remove .env from affected refs and replace hardcoded secrets in affected scripts. Existing clones/forks may retain copies. Rotation is the primary containment.

The old treasury swap implementation only forwarded funds. The replacement artifact rejects that entry point and the UI uses the swap router directly. Existing on-chain contracts are immutable: local edits do not patch them. Existing deposit/withdraw access remains; deploying replacement vaults and moving funds requires their owner to sign.

Arbitrage execution is unavailable because this repository has no verified atomic two-pool executor. Failed RPC or transaction requests must not be presented as successful trades.

Sources:
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- https://developers.circle.com/wallets/dev-controlled/entity-secret-management
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/deployments/managing-deployments
