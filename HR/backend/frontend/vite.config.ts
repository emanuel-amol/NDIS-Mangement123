import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  return {
    plugins: [react(), tailwindcss()],
    base: isDev ? '/' : '/static/forms/',
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: '../static/forms',
      emptyOutDir: true,
    },
  }
})
