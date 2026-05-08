import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const server = mode === 'development'
    ? {
        port: 5173,
        proxy: {
          '/api': {
            target: 'https://sia-act.onrender.com',
            changeOrigin: true,
          },
        },
      }
    : undefined

  return {
    plugins: [react()],
    server,
  }
})
