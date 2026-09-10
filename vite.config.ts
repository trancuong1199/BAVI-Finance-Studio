import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Only public metadata may enter a client bundle, even if old Vercel variables remain.
  envPrefix: ['PUBLIC_', 'VITE_CIRCLE_DEPLOYED_CONTRACT', 'VITE_CIRCLE_DEPLOY_TX_HASH'],
})
