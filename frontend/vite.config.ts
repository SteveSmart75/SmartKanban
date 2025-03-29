import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
      // Deduplicate styled-components - point all instances to the same copy
      'styled-components': path.resolve(__dirname, 'node_modules', 'styled-components'),
      // Replace Emotion with styled-components
      '@mui/styled-engine': '@mui/styled-engine-sc',
    },
    dedupe: ['styled-components', 'react', 'react-dom'] // Explicitly deduplicate these packages
  },
  optimizeDeps: {
    include: ['styled-components', '@mui/styled-engine-sc', '@mui/material'],
    force: true
  }
})
