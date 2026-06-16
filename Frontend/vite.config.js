import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-socket':  ['socket.io-client'],
          'vendor-query':   ['@tanstack/react-query'],
          'vendor-emoji':   ['@emoji-mart/react', '@emoji-mart/data'],
          'vendor-crypto':  ['crypto-js'],
          'vendor-icons':   ['react-icons'],
          'vendor-ui':      ['react-easy-crop', 'react-intersection-observer'],
        },
      },
    },
  },
})
