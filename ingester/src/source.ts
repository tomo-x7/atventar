import { Jetstream, type LiveTransport, type RawEvent, type RawRecordJson, websocketTransport } from '@bsky/jetstream'
import { type Config, collections } from './config.js'
import { sleep } from './delivery.js'
import { CapacityError, type Outbox } from './outbox.js'
import type { ForwardEvent, Logger } from './types.js'

export function forward(event: RawEvent<RawRecordJson>, outbox: Outbox): ForwardEvent | undefined {
	if (event.kind !== 'commit') return undefined
	const commit = event.commit
	if (!collections.some((collection) => collection === commit.collection)) return undefined
	if (commit.operation === 'delete') {
		return { operation: 'delete', did: event.did, collection: commit.collection, rkey: commit.rkey, rev: commit.rev }
	}
	// The raw SDK path preserves invalid records for explicit receiver rejection.
	void outbox
	return {
		operation: 'upsert',
		did: event.did,
		collection: commit.collection,
		rkey: commit.rkey,
		rev: commit.rev,
		cid: commit.cid,
		record: commit.record,
	}
}

export async function runSource(
	outbox: Outbox,
	config: Config,
	signal: AbortSignal,
	log: Logger,
	transport?: LiveTransport,
) {
	const jetstream = new Jetstream({ service: config.source, validateWire: true })
	while (!signal.aborted) {
		try {
			const stream = jetstream.live({
				collections,
				dids: config.dids as `did:${string}:${string}`[],
				raw: true,
				kinds: ['commit'],
				signal,
				cursor: {
					// Include the last durable event again so its digest can be checked.
					load: async () => {
						const seq = outbox.checkpoint().seq
						return seq === null ? undefined : Math.max(0, seq - 1)
					},
					save: async () => {
						throw new Error('Cursor must only be saved with the outbox transaction')
					},
				},
				liveTransport: transport ?? websocketTransport({ maxBufferedBytes: 4 * 1024 * 1024 }),
				onInfo: (info) => {
					throw new Error(`Jetstream advisory ${info.name}: recovery requires operator action; cursor retained`)
				},
				onError: () => log('source_reconnecting'),
			})
			for await (const event of stream) {
				if (config.dids.length && !config.dids.includes(event.did)) continue
				const item = forward(event, outbox)
				if (item) outbox.enqueue(event.seq, event, item)
			}
			if (!signal.aborted) throw new Error('Jetstream stream ended unexpectedly; cursor retained')
		} catch (error) {
			if (signal.aborted) return
			if (!(error instanceof CapacityError)) throw error
			log('source_backpressure', outbox.stats())
			while (!signal.aborted && outbox.checkpoint().pendingBytes > config.maxOutboxBytes / 2) await sleep(1000, signal)
		}
	}
}
