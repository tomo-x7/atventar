import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	const proxy = { target: env.APPVIEW_DEV_ORIGIN || 'http://127.0.0.1:8787', changeOrigin: true }
	return {
		plugins: [react()],
		server: { proxy: { '/xrpc': proxy, '/health': proxy } },
	}
})
