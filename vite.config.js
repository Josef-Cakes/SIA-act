import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  const apiOrigin = env.VITE_API_ORIGIN || 'http://localhost:8080'
  const devServerPort = Number(env.VITE_DEV_SERVER_PORT || 5173)

  return {
    envDir: '..',
    plugins: [react()],
    server: {
      port: devServerPort,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
        }
      }
    }
  }
})
