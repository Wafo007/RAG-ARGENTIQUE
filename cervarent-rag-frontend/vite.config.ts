import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite : on utilise le plugin React classique.
// Le proxy /api permet d'appeler le backend Spring Boot (port 8087)
// sans souci de CORS pendant le développement.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
    },
  },
})
