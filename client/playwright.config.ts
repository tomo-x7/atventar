import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './test/e2e',
	fullyParallel: true,
	workers: 2,
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'retain-on-failure',
		launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
	],
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
	},
})
