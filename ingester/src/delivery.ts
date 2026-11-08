import { setTimeout as delay } from 'node:timers/promises'
import type { Config } from './config.js'
import type { Outbox } from './outbox.js'
import type { ForwardEvent, Logger, Pending } from './types.js'

export class DeliveryError extends Error {}

export async function sleep(ms: number, signal: AbortSignal) {
	try {
		await delay(ms, undefined, { signal })
	} catch (error) {
		if (!signal.aborted) throw error
	}
}

export function retryAfter(value: string | null, now = Date.now()): number {
	if (value === null) return 0
	if (/^\d+$/.test(value.trim())) return Math.min(Number(value) * 1000, 7 * 24 * 60 * 60 * 1000)
	const date = Date.parse(value)
	return Number.isFinite(date) ? Math.max(0, date - now) : 0
}

export function pack(rows: Pending[], maxBytes: number) {
	const selected: Pending[] = []
	let bytes = Buffer.byteLength('{"events":[]}')
	for (const row of rows) {
		const next = bytes + row.bytes + (selected.length ? 1 : 0)
		if (next > maxBytes) break
		selected.push(row)
		bytes = next
	}
	if (rows.length && !selected.length)
		throw new DeliveryError(`Event ${rows[0]?.seq} exceeds the batch size limit; retained in outbox`)
	return { rows: selected, body: `{"events":[${selected.map((r) => r.payload).join(',')}]}` }
}

function key(event: ForwardEvent) {
	return `at://${event.did}/${event.collection}/${event.rkey}`
}

async function validAck(response: Response, rows: Pending[]) {
	const reader = response.body?.getReader()
	if (!reader) return false
	const chunks: Uint8Array[] = []
	let size = 0
	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			size += value.byteLength
			if (size > 128 * 1024) return false
			chunks.push(value)
		}
		const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
		if (
			!data ||
			typeof data !== 'object' ||
			!('status' in data) ||
			data.status !== 'committed' ||
			!('results' in data) ||
			!Array.isArray(data.results)
		)
			return false
		return (
			data.results.length === rows.length &&
			data.results.every((result: unknown, i: number) => {
				const row = rows[i]
				return (
					row &&
					result &&
					typeof result === 'object' &&
					'uri' in result &&
					result.uri === key(JSON.parse(row.payload)) &&
					'applied' in result &&
					typeof result.applied === 'boolean'
				)
			})
		)
	} finally {
		await reader.cancel().catch(() => {})
	}
}

export async function deliverOnce(
	outbox: Outbox,
	config: Config,
	signal: AbortSignal,
	log: Logger,
	fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
	const pending = outbox.peek(config.batchSize)
	if (!pending[0] || pending[0].nextAttemptAt > Date.now()) return false
	const batch = pack(pending, config.batchBytes)
	let response: Response | undefined
	try {
		response = await fetchImpl(config.endpoint, {
			method: 'POST',
			redirect: 'error',
			headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
			body: batch.body,
			signal: AbortSignal.any([signal, AbortSignal.timeout(config.timeoutMs)]),
		})
		if (response.status === 200) {
			if (!(await validAck(response, batch.rows)))
				throw new DeliveryError('Invalid commit ACK; events retained in outbox')
			outbox.ack(batch.rows)
			log('delivery_committed', { events: batch.rows.length, lastSeq: batch.rows.at(-1)?.seq })
			return true
		}
		await response.body?.cancel()
		if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
			throw new DeliveryError(`AppView rejected batch with HTTP ${response.status}; events retained in outbox`)
		}
	} catch (error) {
		if (signal.aborted) return false
		if (error instanceof DeliveryError) {
			outbox.retry(batch.rows, Date.now() + 60_000)
			throw error
		}
	}
	const attempt = Math.max(...batch.rows.map((r) => r.attempts))
	const backoff = Math.max(250, Math.random() * Math.min(60_000, 500 * 2 ** Math.min(attempt, 16)))
	const wait = Math.max(backoff, retryAfter(response?.headers.get('Retry-After') ?? null))
	outbox.retry(batch.rows, Date.now() + wait)
	log('delivery_retry', { events: batch.rows.length, status: response?.status ?? null, retryMs: Math.ceil(wait) })
	return false
}

export async function runDelivery(outbox: Outbox, config: Config, signal: AbortSignal, log: Logger) {
	while (!signal.aborted) {
		if (await deliverOnce(outbox, config, signal, log)) continue
		const first = outbox.peek(1)[0]
		const wait = first ? Math.max(config.flushMs, first.nextAttemptAt - Date.now()) : config.flushMs
		await sleep(Math.min(30_000, wait), signal)
	}
}
