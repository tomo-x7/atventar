import { resolve } from 'node:path'

export const collections = ['win.tomo-x.atventar.calendar', 'win.tomo-x.atventar.entry'] as const

function integer(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number) {
	const value = env[key] === undefined ? fallback : Number(env[key])
	if (!Number.isSafeInteger(value) || value < min || value > max)
		throw new Error(`${key} must be an integer between ${min} and ${max}`)
	return value
}

function secureUrl(value: string, name: string) {
	const url = new URL(value)
	if (url.username || url.password || url.search || url.hash)
		throw new Error(`${name} must not include credentials, query, or fragment`)
	if (
		url.protocol !== 'https:' &&
		!(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
	) {
		throw new Error(`${name} must use HTTPS (HTTP is allowed on loopback for development)`)
	}
	return url
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
	if (!env.APPVIEW_URL) throw new Error('APPVIEW_URL is required')
	if (!env.INGEST_TOKEN || !/^[A-Za-z0-9._~+/-]+=*$/.test(env.INGEST_TOKEN))
		throw new Error('INGEST_TOKEN must be a valid Bearer token')
	const target = secureUrl(env.APPVIEW_URL, 'APPVIEW_URL')
	const source = secureUrl(env.JETSTREAM_URL ?? 'https://jetstream.us-east.bsky.network', 'JETSTREAM_URL')
	if (source.pathname !== '/') throw new Error('JETSTREAM_URL must be an origin without a path')
	const dids = [
		...new Set(
			(env.JETSTREAM_DIDS ?? '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean),
		),
	].sort()
	if (dids.length > 10_000 || dids.some((s) => !/^did:[a-z]+:[A-Za-z0-9._:%-]+(?::[A-Za-z0-9._:%-]+)*$/.test(s)))
		throw new Error('JETSTREAM_DIDS must contain at most 10000 comma-separated DIDs')
	const endpoint = `${target.href.replace(/\/$/, '')}/ingest/batch`
	return {
		source: source.origin,
		dids,
		endpoint,
		token: env.INGEST_TOKEN,
		dbPath: resolve(env.INGESTER_DB_PATH ?? 'data/outbox.sqlite'),
		batchSize: integer(env, 'INGESTER_BATCH_SIZE', 32, 1, 32),
		batchBytes: integer(env, 'INGESTER_BATCH_BYTES', 256 * 1024, 1024, 256 * 1024),
		flushMs: integer(env, 'INGESTER_FLUSH_MS', 250, 1, 60_000),
		timeoutMs: integer(env, 'INGESTER_HTTP_TIMEOUT_MS', 10_000, 1, 300_000),
		maxOutboxBytes: integer(env, 'INGESTER_OUTBOX_BYTES', 512 * 1024 * 1024, 256 * 1024, 2 ** 40),
		identity: JSON.stringify({ source: source.origin, endpoint, collections, dids }),
	}
}

export type Config = ReturnType<typeof loadConfig>
