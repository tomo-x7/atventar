import { Client, type FetchHandler, XrpcResponseError } from '@atproto/lex'
import calendarRecord, { type Main as CalendarRecord } from '../lexicons/win/tomo-x/atventar/calendar'
import entryRecord, { type Main as EntryRecord } from '../lexicons/win/tomo-x/atventar/entry'
import type { AppViewClient, ReadOptions } from './appview'
import { DataError } from './errors'
import {
	calendarCollection,
	entryCollection,
	httpUrl,
	parseRecordUri,
	requiredTitle,
	validateDay,
	validateDid,
	validateYear,
} from './validation'

export interface RepositorySession {
	readonly sub: string
	fetchHandler: FetchHandler
}

export interface CalendarInput {
	title: string
	year: number
	description: string
}

export interface EntryInput {
	day: number
	title: string
	url: string
	comment: string
}

const sourceSnapshot = Symbol('PDS source snapshot')
type Snapshot<T> = {
	readonly uri: `at://${string}`
	readonly cid: string
	readonly record: Readonly<T>
	readonly [sourceSnapshot]: true
}
export type EntrySnapshot = Snapshot<EntryRecord>
export type CalendarSnapshot = Snapshot<CalendarRecord>

/** An AppView projection cannot be used as the source of a record update. */
function assertSnapshot<T>(snapshot: Snapshot<T>) {
	if (!snapshot || snapshot[sourceSnapshot] !== true)
		throw new DataError('invalid-record', '編集前にPDSから現在の登録を取得してください')
	if (!snapshot.cid) throw new DataError('invalid-record', '現在の登録CIDがありません')
}

async function handleConflict<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation()
	} catch (error) {
		if (error instanceof XrpcResponseError && (error.error === 'InvalidSwap' || error.status === 409)) {
			throw new DataError('conflict', '登録内容が更新されています。再読み込みしてからやり直してください', {
				cause: error,
			})
		}
		throw error
	}
}

function entryFields(input: EntryInput) {
	return {
		day: validateDay(input.day),
		title: requiredTitle(input.title),
		url: httpUrl(input.url),
		comment: input.comment.trim() || undefined,
	}
}

export function createRepositoryClient(
	session: RepositorySession,
	appView: Pick<AppViewClient, 'getCalendar'>,
	options: { now?: () => Date } = {},
) {
	const did = validateDid(session.sub)
	const client = new Client({ did, fetchHandler: session.fetchHandler.bind(session) })
	const now = options.now ?? (() => new Date())

	function ownRecord(uri: string, collection: string) {
		const parsed = parseRecordUri(uri, collection)
		if (parsed.did !== did) throw new DataError('not-owner', '自分の登録だけを変更できます')
		return parsed
	}

	async function currentCalendarRef(uri: string, readOptions: ReadOptions) {
		parseRecordUri(uri, calendarCollection)
		const { calendar } = await appView.getCalendar(uri, readOptions)
		if (calendar.uri !== uri) throw new DataError('invalid-record', '参照先のカレンダーが一致しません')
		return { uri: calendar.uri, cid: calendar.cid }
	}

	return {
		did,
		/** Read the complete record from the signed-in participant's PDS only for editing. */
		async readEntryForEdit(uri: string, readOptions: ReadOptions = {}): Promise<EntrySnapshot> {
			const { rkey } = ownRecord(uri, entryCollection)
			const { body } = await client.getRecord(entryCollection, rkey, { ...readOptions, repo: did })
			if (body.uri !== uri || !body.cid)
				throw new DataError('invalid-record', '取得した登録URIまたはCIDが正しくありません')
			const record = entryRecord.parse(body.value)
			parseRecordUri(record.calendar.uri, calendarCollection)
			if (record.article) parseRecordUri(record.article.uri)
			return Object.freeze({
				uri: body.uri,
				cid: body.cid,
				record: Object.freeze(record),
				[sourceSnapshot]: true as const,
			})
		},
		async readCalendarForEdit(uri: string, readOptions: ReadOptions = {}): Promise<CalendarSnapshot> {
			const { rkey } = ownRecord(uri, calendarCollection)
			const { body } = await client.getRecord(calendarCollection, rkey, { ...readOptions, repo: did })
			if (body.uri !== uri || !body.cid)
				throw new DataError('invalid-record', '取得したカレンダーURIまたはCIDが正しくありません')
			const record = calendarRecord.parse(body.value)
			return Object.freeze({
				uri: body.uri,
				cid: body.cid,
				record: Object.freeze(record),
				[sourceSnapshot]: true as const,
			})
		},
		async createCalendar(input: CalendarInput, readOptions: ReadOptions = {}) {
			const record = calendarRecord.parse({
				$type: calendarCollection,
				title: requiredTitle(input.title),
				year: validateYear(input.year),
				description: input.description.trim() || undefined,
				createdAt: now().toISOString(),
			})
			return (await client.createRecord(record, undefined, { ...readOptions, repo: did })).body
		},
		async updateCalendar(snapshot: CalendarSnapshot, input: CalendarInput, readOptions: ReadOptions = {}) {
			assertSnapshot(snapshot)
			const { rkey } = ownRecord(snapshot.uri, calendarCollection)
			const record = calendarRecord.parse({
				...snapshot.record,
				title: requiredTitle(input.title),
				year: validateYear(input.year),
				description: input.description.trim() || undefined,
			})
			return handleConflict(
				async () =>
					(await client.putRecord(record, rkey, { ...readOptions, repo: did, swapRecord: snapshot.cid })).body,
			)
		},
		async createEntry(calendarUri: string, input: EntryInput, readOptions: ReadOptions = {}) {
			const fields = entryFields(input)
			const calendar = await currentCalendarRef(calendarUri, readOptions)
			const record = entryRecord.parse({ $type: entryCollection, ...fields, calendar, createdAt: now().toISOString() })
			return (await client.createRecord(record, undefined, { ...readOptions, repo: did })).body
		},
		async updateEntry(snapshot: EntrySnapshot, input: EntryInput, readOptions: ReadOptions = {}) {
			assertSnapshot(snapshot)
			const { rkey } = ownRecord(snapshot.uri, entryCollection)
			const fields = entryFields(input)
			const calendar = await currentCalendarRef(snapshot.record.calendar.uri, readOptions)
			// Preserve article and createdAt from the complete PDS record, including before publication.
			const record = entryRecord.parse({ ...snapshot.record, ...fields, calendar })
			return handleConflict(
				async () =>
					(await client.putRecord(record, rkey, { ...readOptions, repo: did, swapRecord: snapshot.cid })).body,
			)
		},
		async withdrawEntry(snapshot: EntrySnapshot, readOptions: ReadOptions = {}) {
			assertSnapshot(snapshot)
			const { rkey } = ownRecord(snapshot.uri, entryCollection)
			return handleConflict(
				async () =>
					(await client.deleteRecord(entryCollection, rkey, { ...readOptions, repo: did, swapRecord: snapshot.cid }))
						.body,
			)
		},
	}
}

export type RepositoryClient = ReturnType<typeof createRepositoryClient>
