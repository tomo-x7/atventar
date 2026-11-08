import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { timingSafeEqual } from 'hono/utils/buffer'
import { CID } from 'multiformats/cid'
import { records } from './db/schema.js'
import type { Env } from './env.js'
import { ApiError } from './errors.js'
import {
	type Record as CalendarRecord,
	validateRecord as validateCalendar,
} from './lexicons/types/win/tomo-x/atventar/calendar.js'
import {
	type Record as EntryRecord,
	validateRecord as validateEntry,
} from './lexicons/types/win/tomo-x/atventar/entry.js'
import { calendarCollection, entryCollection } from './service.js'

const tid = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/
const didPattern = /^did:[a-z]+:[A-Za-z0-9._:%-]+(?::[A-Za-z0-9._:%-]+)*$/
const recordUri =
	/^at:\/\/(did:[a-z]+:[A-Za-z0-9._:%-]+(?::[A-Za-z0-9._:%-]+)*)\/([A-Za-z0-9.-]+)\/([A-Za-z0-9._~:-]{1,512})$/

function invalid(message: string): never {
	throw new ApiError(400, 'InvalidRequest', message)
}

function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Expected a JSON object')
	return value as Record<string, unknown>
}

function validCid(value: unknown): string {
	if (typeof value !== 'string' || value.length > 256) invalid('Invalid CID')
	try {
		CID.parse(value)
	} catch {
		invalid('Invalid CID')
	}
	return value
}

function checkRef(value: unknown, collection?: string) {
	const ref = object(value)
	const match = typeof ref.uri === 'string' ? recordUri.exec(ref.uri) : null
	if (
		!match ||
		match[3] === '.' ||
		match[3] === '..' ||
		(collection && (match[2] !== collection || !tid.test(match[3] ?? '')))
	) {
		invalid('References must be DID-based record URIs with the expected collection')
	}
	validCid(ref.cid)
}

function parseEvent(value: unknown) {
	const event = object(value)
	if (typeof event.did !== 'string' || event.did.length > 2048 || !didPattern.test(event.did)) invalid('Invalid DID')
	if (event.collection !== calendarCollection && event.collection !== entryCollection) invalid('Unsupported collection')
	if (typeof event.rkey !== 'string' || !tid.test(event.rkey)) invalid('rkey must be a TID')
	if (typeof event.rev !== 'string' || !tid.test(event.rev)) invalid('rev must be a repository revision TID')
	return {
		event,
		did: event.did,
		collection: event.collection,
		rev: event.rev,
		uri: `at://${event.did}/${event.collection}/${event.rkey}`,
	}
}

function parseRecord(value: unknown, collection: string): CalendarRecord | EntryRecord {
	const record = object(value)
	const result = collection === calendarCollection ? validateCalendar(record) : validateEntry(record)
	if (!result.success) invalid(result.error.message)
	if (collection === entryCollection) {
		checkRef(record.calendar, calendarCollection)
		if (record.article !== undefined) checkRef(record.article)
		if (record.url !== undefined) {
			try {
				const url = new URL(String(record.url))
				if (url.protocol !== 'https:' && url.protocol !== 'http:') invalid('Article URL must use HTTP(S)')
			} catch {
				invalid('Article URL must use HTTP(S)')
			}
		}
	}
	return result.value
}

export const ingest = new Hono<Env>()

ingest.use('*', async (c, next) => {
	if (!c.env.INGEST_TOKEN) throw new ApiError(503, 'IngestUnavailable', 'INGEST_TOKEN is not configured')
	const match = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/i.exec(c.req.header('Authorization') ?? '')
	if (!match?.[1] || !(await timingSafeEqual(match[1], c.env.INGEST_TOKEN))) {
		c.header('WWW-Authenticate', 'Bearer')
		throw new ApiError(401, 'AuthenticationRequired', 'A valid ingest token is required')
	}
	await next()
})
ingest.use(
	'*',
	bodyLimit({
		maxSize: 256 * 1024,
		onError: (c) => c.json({ error: 'PayloadTooLarge', message: 'Maximum body size is 256 KiB' }, 413),
	}),
)

function mutation(db: ReturnType<typeof drizzle>, operation: 'upsert' | 'delete', input: unknown) {
	const { event, uri, did, collection, rev } = parseEvent(input)
	const record = operation === 'upsert' ? parseRecord(event.record, collection) : null
	const cid = operation === 'upsert' ? validCid(event.cid) : null
	const calendar = record?.$type === calendarCollection ? (record as CalendarRecord) : null
	const entry = record?.$type === entryCollection ? (record as EntryRecord) : null
	const values = {
		uri,
		did,
		collection,
		rev,
		cid,
		record,
		indexedAt: new Date().toISOString(),
		year: calendar?.year ?? null,
		title: calendar?.title ?? null,
		description: calendar?.description ?? null,
		calendarUri: entry?.calendar.uri ?? null,
		day: entry?.day ?? null,
	}
	// Compare versions inside the same statement; concurrent requests cannot overwrite a newer event.
	const { indexedAt: _indexedAt, ...update } = values
	return {
		uri,
		query: db
			.insert(records)
			.values(values)
			.onConflictDoUpdate({
				target: records.uri,
				set: update,
				setWhere: sql`excluded.rev > ${records.rev}`,
			})
			.returning({ uri: records.uri }),
	}
}

async function jsonBody(c: Context<Env>) {
	if (!c.env.DB) throw new ApiError(503, 'DatabaseUnavailable', 'D1 DB binding is not configured')
	if (c.req.header('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
		invalid('Content-Type must be application/json')
	try {
		return await c.req.json<unknown>()
	} catch {
		invalid('Malformed JSON')
	}
}

for (const operation of ['upsert', 'delete'] as const) {
	ingest.post(`/${operation}`, async (c) => {
		const input = await jsonBody(c)
		const { uri, query } = mutation(drizzle(c.env.DB), operation, input)
		const changed = await query
		return c.json({ uri, applied: changed.length > 0 })
	})
}

ingest.post('/batch', async (c) => {
	const input = object(await jsonBody(c))
	if (!Array.isArray(input.events) || input.events.length < 1 || input.events.length > 32)
		invalid('events must contain between 1 and 32 items')
	const db = drizzle(c.env.DB)
	const mutations = input.events.map((item: unknown) => {
		const event = object(item)
		if (event.operation !== 'upsert' && event.operation !== 'delete') invalid('Unsupported operation')
		return mutation(db, event.operation, event)
	})
	const first = mutations[0]
	if (!first) invalid('Empty batch')
	// D1 batch is transactional: ACK only after every mutation has committed.
	const changed = await db.batch([first.query, ...mutations.slice(1).map((m) => m.query)])
	return c.json({
		status: 'committed',
		results: mutations.map((m, i) => ({ uri: m.uri, applied: (changed[i]?.length ?? 0) > 0 })),
	})
})
