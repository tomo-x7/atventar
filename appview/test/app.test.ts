import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import { drizzle } from 'drizzle-orm/d1'
import { Miniflare } from 'miniflare'
import { loadConfig } from '../../ingester/src/config.js'
import { deliverOnce } from '../../ingester/src/delivery.js'
import { Outbox } from '../../ingester/src/outbox.js'
import { app } from '../src/app.js'
import { records } from '../src/db/schema.js'
import type { Record as CalendarRecord } from '../src/lexicons/types/win/tomo-x/atventar/calendar.js'
import type { Record as EntryRecord } from '../src/lexicons/types/win/tomo-x/atventar/entry.js'
import { calendarCollection, entryCollection, Service } from '../src/service.js'

const mf = new Miniflare({
	modules: true,
	script: 'export default { fetch() { return new Response() } }',
	d1Databases: ['DB'],
	compatibilityDate: '2026-07-01',
})
let binding: D1Database
let db: ReturnType<typeof drizzle>
const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const other = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb'
const calendarUri = `at://${did}/${calendarCollection}/3mabcdefghij2`
const cid = 'bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'
const indexedAt = '2026-01-01T00:00:00.000Z'
const realFetch = globalThis.fetch

before(async () => {
	binding = (await mf.getD1Database('DB')) as unknown as D1Database
	db = drizzle(binding)
	const migration = await readFile(new URL('../migrations/0000_married_tusk.sql', import.meta.url), 'utf8')
	for (const statement of migration.split('--> statement-breakpoint')) await binding.prepare(statement).run()
	globalThis.fetch = async (input) => {
		const url = new URL(String(input))
		if (url.pathname.endsWith('resolveHandle')) return Response.json({ did })
		return Response.json({ did: url.searchParams.get('actor'), handle: 'test.bsky.social' })
	}
})
beforeEach(async () => {
	await db.delete(records)
})
after(async () => {
	globalThis.fetch = realFetch
	await mf.dispose()
})

async function seedCalendar(uri = calendarUri, title = 'TypeScript', description = 'アドベントカレンダー') {
	const record: CalendarRecord = { $type: calendarCollection, title, description, year: 2026, createdAt: indexedAt }
	await db.insert(records).values({
		uri,
		did,
		collection: calendarCollection,
		cid,
		rev: '3mabcdefghij2',
		record,
		indexedAt,
		title,
		description,
		year: 2026,
	})
}

async function seedEntry(key: string, author = did, time = indexedAt) {
	const record: EntryRecord = {
		$type: entryCollection,
		calendar: { uri: calendarUri, cid },
		day: 1,
		title: '予定タイトル',
		createdAt: indexedAt,
		url: 'https://example.com/article',
		article: { uri: `at://${did}/app.bsky.feed.post/3mabcdefghij2`, cid },
	}
	await db.insert(records).values({
		uri: `at://${author}/${entryCollection}/${key}`,
		did: author,
		collection: entryCollection,
		cid,
		rev: '3mabcdefghij2',
		record,
		indexedAt: time,
		calendarUri,
		day: 1,
	})
}

test('XRPC routes validate parameters and return declared errors', async () => {
	const env = { DB: binding, INGEST_TOKEN: 'test-token' }
	for (const path of ['getCalendar', 'getActorEntries', 'getProfile']) {
		assert.equal((await app.request(`/xrpc/win.tomo-x.atventar.${path}`, {}, env)).status, 400)
	}
	const invalid = await app.request('/xrpc/win.tomo-x.atventar.listCalendars?limit=0', {}, env)
	assert.equal(invalid.status, 400)
	const missing = await app.request(
		`/xrpc/win.tomo-x.atventar.getCalendar?uri=${encodeURIComponent(calendarUri)}`,
		{},
		env,
	)
	assert.equal(missing.status, 404)
	assert.equal(((await missing.json()) as { error: string }).error, 'CalendarNotFound')
	const whitespace = await app.request('/xrpc/win.tomo-x.atventar.searchCalendars?q=%20%20', {}, env)
	assert.equal(whitespace.status, 400)
	assert.equal(((await whitespace.json()) as { error: string }).error, 'InvalidRequest')
	const list = await app.request('/xrpc/win.tomo-x.atventar.listCalendars', {}, env)
	assert.equal(list.status, 200)
	assert.deepEqual(await list.json(), { calendars: [] })
})

test('calendar projection releases article fields exactly at midnight JST', async () => {
	await seedCalendar()
	await seedEntry('3mabcdefghij2')
	const before = await new Service(binding, new Date('2026-11-30T14:59:59.999Z')).getCalendar(calendarUri)
	assert.equal(before.calendar.entryCount, 1)
	assert.equal(before.entries[0]?.title, '予定タイトル')
	const entry = before.entries[0]
	assert.ok(entry)
	assert.equal('url' in entry, false)
	assert.equal('article' in entry, false)
	assert.equal('record' in entry, false)
	const at = await new Service(binding, new Date('2026-11-30T15:00:00Z')).getCalendar(calendarUri)
	assert.equal(at.entries[0]?.url, 'https://example.com/article')
	assert.ok(at.entries[0]?.article)
})

test('sheet numbers include other participants, and reassign after withdrawal', async () => {
	await seedCalendar()
	await seedEntry('3mabcdefghij2', other)
	await seedEntry('3mabcdefghij3', did, '2026-01-02T00:00:00.000Z')
	const service = new Service(binding)
	assert.equal((await service.actorEntries({ actor: did, limit: 50 })).entries[0]?.sheet, 2)
	await binding.prepare('DELETE FROM records WHERE did = ? AND collection = ?').bind(other, entryCollection).run()
	assert.equal((await service.actorEntries({ actor: did, limit: 50 })).entries[0]?.sheet, 1)
	assert.equal((await service.getCalendar(calendarUri)).calendar.entryCount, 1)
})

test('list and search paginate deterministically with filter-bound cursors', async () => {
	await seedCalendar()
	await seedCalendar(`${calendarUri}3`, 'Other', 'TypeScript')
	const service = new Service(binding)
	const page = await service.listCalendars({ limit: 1 })
	assert.equal(page.calendars[0]?.uri, calendarUri)
	assert.ok(page.cursor)
	const next = await service.listCalendars({ limit: 1, cursor: page.cursor })
	assert.equal(next.calendars[0]?.uri, `${calendarUri}3`)
	assert.equal(next.cursor, undefined)
	await assert.rejects(() => service.listCalendars({ limit: 2, cursor: page.cursor }), { error: 'InvalidCursor' })
	await assert.rejects(() => service.listCalendars({ limit: 1, cursor: 'garbage' }), { error: 'InvalidCursor' })
	const search = await service.listCalendars({ q: 'TypeScript', limit: 1 })
	assert.equal(search.calendars[0]?.uri, calendarUri)
	assert.ok(search.cursor)
	assert.equal(
		(await service.listCalendars({ q: 'TypeScript', limit: 1, cursor: search.cursor })).calendars[0]?.uri,
		`${calendarUri}3`,
	)
	assert.deepEqual((await service.listCalendars({ q: '%', limit: 50 })).calendars, [])
	assert.equal((await service.listCalendars({ author: 'test.bsky.social', year: 2026, limit: 50 })).calendars.length, 2)
})

test('orphan entries are hidden and become visible when the calendar arrives', async () => {
	await seedEntry('3mabcdefghij2')
	const service = new Service(binding)
	assert.deepEqual((await service.actorEntries({ actor: did, limit: 50 })).entries, [])
	await seedCalendar()
	assert.equal((await service.actorEntries({ actor: did, limit: 50 })).entries.length, 1)
})

test('profile falls back to DID-only when Bluesky is unavailable', async () => {
	globalThis.fetch = async () => new Response('', { status: 503 })
	try {
		assert.deepEqual(await new Service(binding).profile(did), { did })
		await assert.rejects(() => new Service(binding).profile('missing.bsky.social'), { error: 'UpstreamUnavailable' })
	} finally {
		globalThis.fetch = async (input) => Response.json({ did: new URL(String(input)).searchParams.get('actor') })
	}
})

function event(rev = '3mabcdefghij2') {
	return {
		did,
		collection: calendarCollection,
		rkey: '3mabcdefghij2',
		rev,
		cid,
		record: { $type: calendarCollection, year: 2026, title: 'Imported', createdAt: indexedAt },
	}
}

function ingestEvent(operation: 'upsert' | 'delete', data: unknown, token = 'test-token') {
	return app.request(
		`/ingest/${operation}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify(data),
		},
		{ DB: binding, INGEST_TOKEN: 'test-token' },
	)
}

test('ingest requires authentication and rejects malformed input without writing', async () => {
	assert.equal((await ingestEvent('upsert', event(), 'wrong-token')).status, 401)
	assert.equal((await app.request('/ingest/upsert', { method: 'POST' }, { DB: binding, INGEST_TOKEN: '' })).status, 503)
	const invalidEvents = [
		{ ...event(), did: 'alice.bsky.social' },
		{ ...event(), collection: 'app.bsky.feed.post' },
		{ ...event(), rkey: '../unsafe' },
		{ ...event(), rev: 'arbitrary-version' },
		{ ...event(), cid: 'invalid-cid' },
		{ ...event(), record: { ...event().record, year: 0 } },
		{ ...event(), record: { ...event().record, $type: entryCollection } },
	]
	for (const data of invalidEvents) assert.equal((await ingestEvent('upsert', data)).status, 400)
	const malformed = await app.request(
		'/ingest/upsert',
		{
			method: 'POST',
			headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
			body: '{',
		},
		{ DB: binding, INGEST_TOKEN: 'test-token' },
	)
	assert.equal(malformed.status, 400)
	const oversized = await ingestEvent('upsert', { ...event(), padding: 'a'.repeat(256 * 1024) })
	assert.equal(oversized.status, 413)
	assert.equal((await db.select().from(records)).length, 0)
})

test('ingest updates preserve first indexedAt and ignore duplicate and older revisions', async () => {
	await seedCalendar()
	const newer = { ...event('3mabcdefghij4'), record: { ...event().record, title: 'Updated', year: 2027 } }
	const response = await ingestEvent('upsert', newer)
	assert.equal(response.status, 200)
	assert.deepEqual(await response.json(), { uri: calendarUri, applied: true })
	assert.deepEqual(await (await ingestEvent('upsert', newer)).json(), { uri: calendarUri, applied: false })
	assert.deepEqual(await (await ingestEvent('upsert', event())).json(), { uri: calendarUri, applied: false })
	const rows = await db.select().from(records)
	assert.equal(rows[0]?.indexedAt, indexedAt)
	assert.equal(rows[0]?.title, 'Updated')
	assert.equal(rows[0]?.year, 2027)
	assert.equal((await new Service(binding).listCalendars({ year: 2026, limit: 50 })).calendars.length, 0)
	assert.equal((await new Service(binding).listCalendars({ year: 2027, limit: 50 })).calendars.length, 1)
})

test('delete tombstones prevent delayed upserts from resurrecting records', async () => {
	assert.equal((await ingestEvent('delete', event('3mabcdefghij4'))).status, 200)
	assert.deepEqual(await (await ingestEvent('upsert', event())).json(), { uri: calendarUri, applied: false })
	await assert.rejects(() => new Service(binding).getCalendar(calendarUri), { error: 'CalendarNotFound' })
	assert.equal((await db.select().from(records))[0]?.record, null)
	assert.deepEqual(await (await ingestEvent('upsert', event('3mabcdefghij5'))).json(), {
		uri: calendarUri,
		applied: true,
	})
	assert.equal((await new Service(binding).getCalendar(calendarUri)).calendar.record.title, 'Imported')
	await ingestEvent('delete', event('3mabcdefghij6'))
	const row = (await db.select().from(records))[0]
	assert.equal(row?.record, null)
	assert.equal(row?.title, null)
	assert.equal(row?.cid, null)
	assert.deepEqual((await new Service(binding).listCalendars({ limit: 50 })).calendars, [])
})

test('entry ingest validates references and HTTP(S), then reflects day changes and deletion', async () => {
	await seedCalendar()
	const record: EntryRecord = {
		$type: entryCollection,
		calendar: { uri: calendarUri, cid },
		title: 'Article',
		day: 1,
		createdAt: indexedAt,
		url: 'https://example.com/',
	}
	const data = { ...event(), collection: entryCollection, record }
	for (const bad of [
		{ ...record, day: 26 },
		{ ...record, url: 'javascript:alert(1)' },
		{ ...record, calendar: { uri: calendarUri.replace(did, 'alice.bsky.social'), cid } },
		{ ...record, calendar: { uri: calendarUri.replace(calendarCollection, entryCollection), cid } },
		{ ...record, article: { uri: 'https://example.com', cid } },
	])
		assert.equal((await ingestEvent('upsert', { ...data, record: bad })).status, 400)
	assert.equal((await ingestEvent('upsert', data)).status, 200)
	const service = new Service(binding)
	assert.equal((await service.getCalendar(calendarUri)).calendar.entryCount, 1)
	assert.equal((await service.actorEntries({ actor: did, limit: 50 })).entries[0]?.sheet, 1)
	await ingestEvent('upsert', { ...data, rev: '3mabcdefghij3', record: { ...record, day: 2 } })
	assert.equal((await service.getCalendar(calendarUri)).entries[0]?.day, 2)
	await ingestEvent('delete', { ...data, rev: '3mabcdefghij4' })
	assert.equal((await service.getCalendar(calendarUri)).calendar.entryCount, 0)
	assert.deepEqual((await service.actorEntries({ actor: did, limit: 50 })).entries, [])
})

test('concurrent deliveries keep only the highest revision', async () => {
	const revisions = ['3mabcdefghij4', '3mabcdefghij2', '3mabcdefghij5', '3mabcdefghij3', '3mabcdefghij5']
	const responses = await Promise.all(revisions.map((rev) => ingestEvent('upsert', event(rev))))
	for (const response of responses) assert.equal(response.status, 200)
	const rows = await db.select().from(records)
	assert.equal(rows.length, 1)
	assert.equal(rows[0]?.rev, '3mabcdefghij5')
})

function batch(events: unknown[]) {
	return app.request(
		'/ingest/batch',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
			body: JSON.stringify({ events }),
		},
		{ DB: binding, INGEST_TOKEN: 'test-token' },
	)
}

test('batch ingestion commits every mutation and ACKs duplicate deliveries', async () => {
	const events = [
		{ ...event(), operation: 'upsert' },
		{ ...event(), rkey: '3mabcdefghij3', operation: 'upsert' },
	]
	const first = await batch(events)
	assert.equal(first.status, 200)
	assert.deepEqual(await first.json(), {
		status: 'committed',
		results: [
			{ uri: calendarUri, applied: true },
			{ uri: calendarUri.replace(/2$/, '3'), applied: true },
		],
	})
	assert.deepEqual(await (await batch(events)).json(), {
		status: 'committed',
		results: [
			{ uri: calendarUri, applied: false },
			{ uri: calendarUri.replace(/2$/, '3'), applied: false },
		],
	})
	assert.equal((await batch([])).status, 400)
	assert.equal((await batch(Array.from({ length: 33 }, () => events[0]))).status, 400)
})

test('batch rejects invalid records before writes and rolls back on SQL failure', async (t) => {
	const valid = { ...event(), operation: 'upsert' }
	assert.equal((await batch([valid, { ...valid, cid: 'bad' }])).status, 400)
	assert.equal((await db.select().from(records)).length, 0)
	await binding
		.prepare(
			`CREATE TRIGGER fail_second BEFORE INSERT ON records WHEN NEW.did = '${other}' BEGIN SELECT RAISE(ABORT, 'injected failure'); END`,
		)
		.run()
	t.mock.method(console, 'error', () => {})
	try {
		assert.equal((await batch([valid, { ...valid, did: other }])).status, 500)
		assert.equal((await db.select().from(records)).length, 0)
	} finally {
		await binding.prepare('DROP TRIGGER fail_second').run()
	}
})

test('ingester delivers its durable outbox through the AppView batch endpoint into D1', async () => {
	const box = new Outbox(':memory:', 'integration', 1024 * 1024)
	try {
		const data = { ...event(), operation: 'upsert' as const }
		box.enqueue(10, { seq: 10 }, data)
		const config = loadConfig({ APPVIEW_URL: 'https://example.com', INGEST_TOKEN: 'test-token' })
		const delivered = await deliverOnce(
			box,
			config,
			new AbortController().signal,
			() => {},
			async (input, init) => {
				return app.request(String(input), init, { DB: binding, INGEST_TOKEN: 'test-token' })
			},
		)
		assert.equal(delivered, true)
		assert.equal(box.peek(32).length, 0)
		assert.equal(box.checkpoint().seq, 10)
		assert.equal((await new Service(binding).getCalendar(calendarUri)).calendar.record.title, 'Imported')
	} finally {
		box.close()
	}
})
