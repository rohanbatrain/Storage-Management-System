import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
    base: command === 'serve' ? '/' : './',
    plugins: [react()],
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/api': {
                target: process.env.DOCKER ? 'http://backend:8000' : 'http://127.0.0.1:8000',
                changeOrigin: true,
            }
        }
    }
}))
