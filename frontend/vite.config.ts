import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // The backend runs on :3000 (backend/.env PORT). Proxying keeps dev same-origin, so no CORS setup.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
