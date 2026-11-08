import { loadConfig } from './config.js'
import { runDelivery } from './delivery.js'
import { Outbox } from './outbox.js'
import { runSource } from './source.js'
import type { Logger } from './types.js'

const log: Logger = (event, fields = {}) =>
	console.log(JSON.stringify({ time: new Date().toISOString(), event, ...fields }))

async function main() {
	const config = loadConfig()
	const outbox = new Outbox(config.dbPath, config.identity, config.maxOutboxBytes)
	const controller = new AbortController()
	const shutdown = () => controller.abort()
	process.once('SIGINT', shutdown)
	process.once('SIGTERM', shutdown)
	let lastError: unknown
	const heartbeat = setInterval(() => {
		try {
			outbox.heartbeat()
			log('status', outbox.stats())
		} catch (error) {
			lastError = error
			controller.abort()
		}
	}, 10_000)
	const protect = async (run: () => Promise<void>) => {
		try {
			await run()
		} catch (error) {
			lastError = error
			controller.abort()
		}
	}
	try {
		log('started', { source: config.source, ...outbox.stats() })
		await Promise.all([
			protect(() => runSource(outbox, config, controller.signal, log)),
			protect(() => runDelivery(outbox, config, controller.signal, log)),
		])
		if (lastError) throw lastError
	} finally {
		clearInterval(heartbeat)
		process.removeListener('SIGINT', shutdown)
		process.removeListener('SIGTERM', shutdown)
		outbox.close()
		log('stopped')
	}
}

main().catch((error: unknown) => {
	log('fatal', { message: error instanceof Error ? error.message : 'Unknown error' })
	process.exitCode = 1
})
