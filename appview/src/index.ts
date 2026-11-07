import { serve } from '@hono/node-server'
import { app } from './app.js'

const hostname = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 3000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
	throw new Error('PORT must be an integer between 1 and 65535')
}

const server = serve({ fetch: app.fetch, hostname, port }, (info) => {
	console.log(`Appview listening on http://${hostname}:${info.port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
	process.once(signal, () => {
		server.close((error) => {
			if (error) {
				console.error(error)
				process.exitCode = 1
			}
		})
	})
}
