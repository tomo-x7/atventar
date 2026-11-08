import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, test } from 'node:test'
import type { LiveTransport } from '@bsky/jetstream'
import { loadConfig } from '../src/config.js'
import { DeliveryError, deliverOnce, pack, retryAfter } from '../src/delivery.js'
import { CapacityError, Outbox } from '../src/outbox.js'
import { runSource } from '../src/source.js'
import type { RecordEvent } from '../src/types.js'

const roots: string[] = []
const opened: Outbox[] = []
afterEach(() => {
	for (const box of opened.splice(0)) box.close()
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const event: RecordEvent = {
	operation: 'upsert',
	did: 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa',
	collection: 'win.tomo-x.atventar.calendar',
	rkey: '3mabcdefghij2',
	rev: '3mabcdefghij3',
	cid: 'bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
	record: { $type: 'win.tomo-x.atventar.calendar', year: 2026, title: '予定', createdAt: '2026-11-01T00:00:00Z' },
}
const config = () => loadConfig({ APPVIEW_URL: 'https://example.com', INGEST_TOKEN: 'test-token' })
function file() {
	const root = mkdtempSync(join(tmpdir(), 'atventar-ingester-'))
	roots.push(root)
	return join(root, 'outbox.sqlite')
}
function open(path = ':memory:', identity = 'test', capacity = 512 * 1024 * 1024) {
	const box = new Outbox(path, identity, capacity)
	opened.push(box)
	return box
}
function close(box: Outbox) {
	box.close()
	opened.splice(opened.indexOf(box), 1)
}
const log = () => {}

function ack(rows: ReturnType<Outbox['peek']>) {
	return Response.json({
		status: 'committed',
		results: rows.map((r) => {
			const e = JSON.parse(r.payload) as RecordEvent
			return { uri: `at://${e.did}/${e.collection}/${e.rkey}`, applied: false }
		}),
	})
}

test('configuration requires credentials and secure endpoints, and scopes source and filters', () => {
	assert.throws(() => loadConfig({}), /APPVIEW_URL/)
	assert.throws(() => loadConfig({ APPVIEW_URL: 'http://example.com', INGEST_TOKEN: 'test' }), /HTTPS/)
	assert.throws(() => loadConfig({ APPVIEW_URL: 'https://user:pass@example.com', INGEST_TOKEN: 'test' }), /credentials/)
	assert.throws(
		() => loadConfig({ APPVIEW_URL: 'https://example.com', INGEST_TOKEN: 'test', INGESTER_BATCH_SIZE: '33' }),
		/BATCH_SIZE/,
	)
	assert.equal(config().endpoint, 'https://example.com/ingest/batch')
	assert.equal(config().identity.includes('test-token'), false)
	assert.equal(
		loadConfig({ APPVIEW_URL: 'http://localhost:3000', INGEST_TOKEN: 'test' }).endpoint,
		'http://localhost:3000/ingest/batch',
	)
})

test('outbox and durable cursor survive reopening, with inclusive duplicate detection', () => {
	const path = file()
	let box = open(path)
	assert.equal(box.enqueue(10, { seq: 10, a: 1 }, event), true)
	assert.equal(box.enqueue(10, { a: 1, seq: 10 }, event), false)
	assert.throws(() => box.enqueue(10, { seq: 10, a: 2 }, event), /Conflicting/)
	assert.equal(box.enqueue(30, { seq: 30 }, event), true)
	assert.equal(box.enqueue(20, { seq: 20 }, event), false)
	close(box)
	box = open(path)
	assert.equal(box.checkpoint().seq, 30)
	assert.deepEqual(
		box.peek(32).map((r) => r.seq),
		[10, 30],
	)
	assert.equal(box.knows(event.did), true)
	box.ack(box.peek(32))
	assert.equal(box.checkpoint().pendingBytes, 0)
	assert.equal(box.checkpoint().seq, 30)
	assert.equal(box.enqueue(30, { seq: 30 }, event), false)
})

test('failed checkpoint commit rolls back the inserted outbox event and known DID', () => {
	const path = file()
	const box = open(path)
	const db = new DatabaseSync(path)
	try {
		db.exec("CREATE TRIGGER fail_checkpoint BEFORE UPDATE ON state BEGIN SELECT RAISE(ABORT, 'injected failure'); END")
		assert.throws(() => box.enqueue(1, { seq: 1 }, event), /injected failure/)
		assert.deepEqual(box.peek(32), [])
		assert.equal(box.checkpoint().seq, null)
		assert.equal(box.knows(event.did), false)
	} finally {
		db.close()
	}
})

test('outbox capacity pauses intake without advancing the checkpoint or evicting pending events', () => {
	const bytes = Buffer.byteLength(JSON.stringify(event))
	const box = open(':memory:', 'test', bytes)
	box.enqueue(1, { seq: 1 }, event)
	assert.throws(() => box.enqueue(2, { seq: 2 }, event), CapacityError)
	assert.equal(box.checkpoint().seq, 1)
	assert.equal(box.peek(32).length, 1)
	box.ack(box.peek(32))
	assert.equal(box.enqueue(2, { seq: 2 }, event), true)
})

test('source changes and concurrent processes cannot share an outbox', () => {
	const path = file()
	const box = open(path)
	assert.throws(() => new Outbox(path, 'test', 1024), /lease/)
	close(box)
	assert.throws(() => new Outbox(path, 'other-source', 1024), /Source, filters, or destination changed/)
})

test('ACK deletion is atomic even if a requested row is missing', () => {
	const box = open()
	box.enqueue(1, { seq: 1 }, event)
	const row = box.peek(1)[0]
	assert.ok(row)
	assert.throws(() => box.ack([row, { ...row, seq: 99 }]), /missing/)
	assert.equal(box.peek(32).length, 1)
	assert.equal(box.checkpoint().pendingBytes, row.bytes)
})

test('batch packing counts UTF-8 bytes and envelope overhead', () => {
	const box = open()
	box.enqueue(1, { seq: 1 }, event)
	box.enqueue(2, { seq: 2 }, event)
	const all = box.peek(32)
	const full = pack(all, 262144)
	assert.equal(Buffer.byteLength(full.body), Buffer.byteLength(JSON.stringify({ events: [event, event] })))
	assert.equal(pack(all, Buffer.byteLength(full.body) - 1).rows.length, 1)
	assert.throws(() => pack(all, 1), DeliveryError)
})

test('delivery ACKs applied:false retries and preserves records after network and 202 responses', async () => {
	const box = open()
	box.enqueue(1, { seq: 1 }, event)
	const signal = new AbortController().signal
	assert.equal(
		await deliverOnce(box, config(), signal, log, async () => {
			throw new Error('lost ACK')
		}),
		false,
	)
	assert.equal(box.peek(32).length, 1)
	box.retry(box.peek(32), 0)
	assert.equal(await deliverOnce(box, config(), signal, log, async () => new Response('', { status: 202 })), false)
	box.retry(box.peek(32), 0)
	assert.equal(
		await deliverOnce(box, config(), signal, log, async (_url, init) => {
			assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token')
			assert.equal(init?.redirect, 'error')
			return ack(box.peek(32))
		}),
		true,
	)
	assert.deepEqual(box.peek(32), [])
})

test('429 respects Retry-After; permanent rejections and invalid ACKs retain pending events', async () => {
	const box = open()
	box.enqueue(1, { seq: 1 }, event)
	const signal = new AbortController().signal
	const now = Date.now()
	await deliverOnce(
		box,
		config(),
		signal,
		log,
		async () => new Response('', { status: 429, headers: { 'Retry-After': '10' } }),
	)
	assert.ok((box.peek(1)[0]?.nextAttemptAt ?? 0) >= now + 10000)
	assert.equal(retryAfter('10', now), 10000)
	assert.equal(retryAfter(new Date(now + 60000).toUTCString(), now) > 59000, true)
	assert.equal(retryAfter('invalid', now), 0)
	for (const status of [400, 401, 403, 413, 422]) {
		box.retry(box.peek(32), 0)
		await assert.rejects(
			() => deliverOnce(box, config(), signal, log, async () => new Response('', { status })),
			DeliveryError,
		)
	}
	box.retry(box.peek(32), 0)
	await assert.rejects(
		() => deliverOnce(box, config(), signal, log, async () => Response.json({ status: 'committed', results: [] })),
		DeliveryError,
	)
	assert.equal(box.peek(32).length, 1)
})

function frame(seq: number) {
	return JSON.stringify({
		$type: 'message',
		payload: {
			$type: 'network.bsky.jetstream.subscribeEvents#commit',
			seq,
			time: '2026-11-01T00:00:00Z',
			...event,
			operation: 'create',
		},
	})
}

test('official SDK resumes from durable cursor, requests only app collections, and persists raw commits', async () => {
	const box = open()
	const controller = new AbortController()
	const transport: LiveTransport = {
		async *stream(url) {
			const request = new URL(url())
			assert.deepEqual(request.searchParams.getAll('collections'), [
				'win.tomo-x.atventar.calendar',
				'win.tomo-x.atventar.entry',
			])
			yield frame(10)
			yield frame(12)
			controller.abort()
		},
	}
	await runSource(box, config(), controller.signal, log, transport)
	assert.equal(box.checkpoint().seq, 12)
	assert.equal(box.peek(32).length, 2)
	const controller2 = new AbortController()
	await runSource(box, config(), controller2.signal, log, {
		async *stream(url) {
			assert.equal(new URL(url()).searchParams.get('cursor'), '11')
			yield frame(12)
			yield frame(14)
			controller2.abort()
		},
	})
	assert.equal(box.checkpoint().seq, 14)
	assert.equal(box.peek(32).length, 3)
})

test('outdated cursor advisory stops intake instead of jumping forward', async () => {
	const box = open()
	box.enqueue(1, { seq: 1 }, event)
	const controller = new AbortController()
	await assert.rejects(
		() =>
			runSource(box, config(), controller.signal, log, {
				async *stream() {
					yield JSON.stringify({
						$type: 'message',
						payload: { $type: 'network.bsky.jetstream.subscribeEvents#info', name: 'OutdatedCursor' },
					})
				},
			}),
		/recovery requires operator action/,
	)
	assert.equal(box.checkpoint().seq, 1)
})
