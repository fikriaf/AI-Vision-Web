import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // ← wajib untuk resolve path

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // alias @ ke ./src
    },
  },
})
