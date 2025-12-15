import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { viteSingleFile } from "vite-plugin-singlefile"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: {
    host: '0.0.0.0', // Listen on all local IPs
    port: 5173,
    strictPort: true,
  },
})
