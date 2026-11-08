import { and, asc, desc, eq, gt, isNotNull, lt, or, type SQL, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { alias } from 'drizzle-orm/sqlite-core'
import { readCursor, writeCursor } from './cursor.js'
import { records } from './db/schema.js'
import { ApiError } from './errors.js'
import type { Record as CalendarRecord } from './lexicons/types/win/tomo-x/atventar/calendar.js'
import type { CalendarView, EntryView } from './lexicons/types/win/tomo-x/atventar/defs.js'
import type { Record as EntryRecord } from './lexicons/types/win/tomo-x/atventar/entry.js'
import { Profiles } from './profiles.js'

export const calendarCollection = 'win.tomo-x.atventar.calendar'
export const entryCollection = 'win.tomo-x.atventar.entry'
type Row = typeof records.$inferSelect
type Filters = { year?: number; author?: string; limit: number; cursor?: string; q?: string }
const sibling = alias(records, 'sibling')
const calendar = alias(records, 'calendar')
const countEntries =
	sql<number>`(select count(*) from records as counted where counted.calendar_uri = records.uri and counted.record is not null and counted.collection = ${entryCollection})`.mapWith(
		Number,
	)
const sheet =
	sql<number>`(select count(*) from records as counted where counted.calendar_uri = records.calendar_uri and counted.day = records.day and counted.record is not null and counted.collection = ${entryCollection} and (counted.indexed_at < records.indexed_at or (counted.indexed_at = records.indexed_at and counted.uri <= records.uri)))`.mapWith(
		Number,
	)

export class Service {
	private db
	private profiles = new Profiles()

	constructor(
		db: D1Database,
		private now = new Date(),
	) {
		this.db = drizzle(db)
	}

	async profile(actor: string) {
		return this.profiles.get(await this.profiles.resolve(actor))
	}

	private async calendarView(row: Row, entryCount: number): Promise<CalendarView> {
		if (row.cid === null) throw new Error('Active calendar has no CID')
		return {
			uri: row.uri,
			cid: row.cid,
			record: row.record as CalendarRecord,
			indexedAt: row.indexedAt,
			entryCount,
			author: await this.profiles.get(row.did),
		}
	}

	private async entryView(row: Row, parent: CalendarView, sheet: number): Promise<EntryView> {
		if (row.cid === null) throw new Error('Active entry has no CID')
		const record = row.record as EntryRecord
		const view: EntryView = {
			uri: row.uri,
			cid: row.cid,
			day: record.day,
			title: record.title,
			createdAt: record.createdAt,
			indexedAt: row.indexedAt,
			sheet,
			author: await this.profiles.get(row.did),
			calendar: parent,
		}
		if (record.comment !== undefined) view.comment = record.comment
		const date = `${String(parent.record.year).padStart(4, '0')}-12-${String(record.day).padStart(2, '0')}T00:00:00+09:00`
		if (this.now.getTime() >= Date.parse(date)) {
			if (record.url !== undefined) view.url = record.url
			if (record.article !== undefined) view.article = record.article
		}
		return view
	}

	async getCalendar(uri: string) {
		// One SQL statement gives the calendar and its entries a consistent snapshot.
		const rows = await this.db
			.select({ parent: records, entry: sibling })
			.from(records)
			.leftJoin(
				sibling,
				and(eq(sibling.calendarUri, records.uri), eq(sibling.collection, entryCollection), isNotNull(sibling.record)),
			)
			.where(and(eq(records.uri, uri), eq(records.collection, calendarCollection), isNotNull(records.record)))
			.orderBy(asc(sibling.day), asc(sibling.indexedAt), asc(sibling.uri))
		const first = rows[0]
		if (!first) throw new ApiError(404, 'CalendarNotFound', 'Calendar was not found')
		const entries = rows.flatMap((r) => (r.entry ? [r.entry] : []))
		await this.profiles.preload([first.parent.did, ...entries.map((r) => r.did)])
		const parent = await this.calendarView(first.parent, entries.length)
		const sheets = new Map<number, number>()
		return {
			calendar: parent,
			entries: await Promise.all(
				entries.map((row) => {
					const day = (row.record as EntryRecord).day
					const sheet = (sheets.get(day) ?? 0) + 1
					sheets.set(day, sheet)
					return this.entryView(row, parent, sheet)
				}),
			),
		}
	}

	async listCalendars(params: Filters) {
		const q = params.q?.trim()
		if (q !== undefined && !q) throw new ApiError(400, 'InvalidRequest', 'Search text must not be blank')
		const author = params.author ? await this.profiles.resolve(params.author) : undefined
		const scope = JSON.stringify(['calendars', q ?? null, params.year ?? null, params.author ?? null, params.limit])
		const cursor = readCursor(params.cursor, scope)
		// A title match ranks above a description-only match. instr treats % and _ literally.
		const titleMatch = sql`instr(lower(${records.title}), lower(${q ?? ''})) > 0`
		const descriptionMatch = sql`instr(lower(coalesce(${records.description}, '')), lower(${q ?? ''})) > 0`
		const score = sql<number>`case when ${titleMatch} then 2 else 1 end`.mapWith(Number)
		const key = q === undefined ? sql<string | number>`${records.indexedAt}` : sql<string | number>`${score}`
		const conditions: (SQL | undefined)[] = [eq(records.collection, calendarCollection), isNotNull(records.record)]
		if (params.year !== undefined) conditions.push(eq(records.year, params.year))
		if (author) conditions.push(eq(records.did, author))
		if (q !== undefined) conditions.push(or(titleMatch, descriptionMatch))
		if (cursor) {
			if ((q === undefined && typeof cursor.key !== 'string') || (q !== undefined && typeof cursor.key !== 'number')) {
				throw new ApiError(400, 'InvalidCursor', 'Invalid cursor sort key')
			}
			conditions.push(or(lt(key, cursor.key), and(eq(key, cursor.key), gt(records.uri, cursor.uri))))
		}
		const rows = await this.db
			.select({ row: records, entryCount: countEntries, key })
			.from(records)
			.where(and(...conditions))
			.orderBy(desc(key), asc(records.uri))
			.limit(params.limit + 1)
		const page = rows.slice(0, params.limit)
		const last = page.at(-1)
		await this.profiles.preload(page.map((r) => r.row.did))
		return {
			calendars: await Promise.all(page.map((r) => this.calendarView(r.row, r.entryCount))),
			...(rows.length > params.limit && last ? { cursor: writeCursor(scope, last.key, last.row.uri) } : {}),
		}
	}

	async actorEntries(params: { actor: string; year?: number; limit: number; cursor?: string }) {
		const did = await this.profiles.resolve(params.actor)
		const scope = JSON.stringify(['entries', params.actor, params.year ?? null, params.limit])
		const cursor = readCursor(params.cursor, scope)
		const conditions: (SQL | undefined)[] = [
			eq(records.did, did),
			eq(records.collection, entryCollection),
			isNotNull(records.record),
		]
		if (params.year !== undefined) conditions.push(eq(calendar.year, params.year))
		if (cursor) {
			if (typeof cursor.key !== 'string') throw new ApiError(400, 'InvalidCursor', 'Invalid cursor sort key')
			conditions.push(
				or(lt(records.indexedAt, cursor.key), and(eq(records.indexedAt, cursor.key), gt(records.uri, cursor.uri))),
			)
		}
		const entryCount =
			sql<number>`(select count(*) from records as counted where counted.calendar_uri = calendar.uri and counted.record is not null and counted.collection = ${entryCollection})`.mapWith(
				Number,
			)
		const rows = await this.db
			.select({ row: records, parent: calendar, entryCount, sheet })
			.from(records)
			.innerJoin(
				calendar,
				and(
					eq(calendar.uri, records.calendarUri),
					eq(calendar.collection, calendarCollection),
					isNotNull(calendar.record),
				),
			)
			.where(and(...conditions))
			.orderBy(desc(records.indexedAt), asc(records.uri))
			.limit(params.limit + 1)
		const page = rows.slice(0, params.limit)
		const last = page.at(-1)
		await this.profiles.preload(page.flatMap((r) => [r.row.did, r.parent.did]))
		return {
			entries: await Promise.all(
				page.map(async (r) => this.entryView(r.row, await this.calendarView(r.parent, r.entryCount), r.sheet)),
			),
			...(rows.length > params.limit && last ? { cursor: writeCursor(scope, last.row.indexedAt, last.row.uri) } : {}),
		}
	}
}
