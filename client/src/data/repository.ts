import { TID } from '@atproto/common-web'
import { Client, type FetchHandler, XrpcResponseError } from '@atproto/lex'
import getLatestCommit from '../lexicons/com/atproto/sync/getLatestCommit'
import documentRecord, { type Main as DocumentRecord } from '../lexicons/site/standard/document'
import calendarRecord, { type Main as CalendarRecord, documentContent } from '../lexicons/win/tomo-x/atventar/calendar'
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
const calendarSource = Symbol('calendar document source')
const documentCollection = 'site.standard.document'
type DocumentSource = { readonly cid: string; readonly record: Readonly<DocumentRecord> }
export type CalendarSnapshot = Snapshot<CalendarRecord> & {
	readonly [calendarSource]: { readonly commit: string; readonly document: DocumentSource | null }
}

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
	options: { now?: () => Date; appOrigin?: string; publication?: string } = {},
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

	function documentForCalendar(
		uri: string,
		record: CalendarRecord,
		previous?: Readonly<DocumentRecord>,
		updatedAt?: string,
	) {
		const { rkey } = ownRecord(uri, calendarCollection)
		const appOrigin = httpUrl(options.appOrigin)
		if (!appOrigin) throw new DataError('invalid-input', '公開アプリのURLが設定されていません')
		if (options.publication !== undefined) parseRecordUri(options.publication, 'site.standard.publication')
		if (previous) {
			assertCalendarDocument(previous, uri)
			if (!previous.site.startsWith('at://') && new URL(previous.site).origin !== new URL(appOrigin).origin)
				throw new DataError('invalid-record', 'ドキュメントの公開先がこのアプリと一致しません')
		}
		return documentRecord.parse({
			...previous,
			$type: documentCollection,
			site: previous?.site.startsWith('at://')
				? previous.site
				: (options.publication ?? previous?.site ?? new URL(appOrigin).origin),
			path: previous?.path ?? `/calendars/${encodeURIComponent(did)}/${encodeURIComponent(rkey)}`,
			title: record.title,
			description: record.description,
			publishedAt: previous?.publishedAt ?? record.createdAt,
			...(updatedAt ? { updatedAt } : {}),
			content: documentContent.parse({ $type: `${calendarCollection}#documentContent`, calendar: uri }),
			textContent: '',
		})
	}

	function assertCalendarDocument(record: Readonly<DocumentRecord>, uri: string) {
		const { rkey } = ownRecord(uri, calendarCollection)
		const path = `/calendars/${encodeURIComponent(did)}/${encodeURIComponent(rkey)}`
		const content = documentContent.safeParse(record.content)
		if (!content.success || content.value.calendar !== uri || record.path !== path)
			throw new DataError('invalid-record', '同じキーのドキュメントが別の内容に使われています')
		if (record.site.startsWith('at://')) parseRecordUri(record.site, 'site.standard.publication')
		else {
			const site = httpUrl(record.site)
			if (!site) throw new DataError('invalid-record', 'ドキュメントの公開先が正しくありません')
			const url = new URL(site)
			if (url.username || url.password || url.search || url.hash || url.pathname !== '/')
				throw new DataError('invalid-record', 'ドキュメントの公開先が正しくありません')
		}
	}

	async function readDocument(uri: string, rkey: string, readOptions: ReadOptions): Promise<DocumentSource | null> {
		try {
			const { body } = await client.getRecord(documentCollection, rkey, { ...readOptions, repo: did })
			if (body.uri !== `at://${did}/${documentCollection}/${rkey}` || !body.cid)
				throw new DataError('invalid-record', '取得したドキュメントURIまたはCIDが正しくありません')
			const record = documentRecord.parse(body.value)
			assertCalendarDocument(record, uri)
			return Object.freeze({ cid: body.cid, record: Object.freeze(record) })
		} catch (error) {
			if (error instanceof XrpcResponseError && error.error === 'RecordNotFound') return null
			throw error
		}
	}

	function calendarWriteResult(
		body: Awaited<ReturnType<typeof client.applyWrites>>['body'],
		uri: string,
		rkey: string,
	) {
		const calendar = body.results?.[0]
		const document = body.results?.[1]
		const documentUri = `at://${did}/${documentCollection}/${rkey}` as const
		if (
			!calendar ||
			!('uri' in calendar) ||
			calendar.uri !== uri ||
			typeof calendar.cid !== 'string' ||
			!document ||
			!('uri' in document) ||
			document.uri !== documentUri ||
			typeof document.cid !== 'string'
		)
			throw new DataError('invalid-record', '保存結果を確認できませんでした。再送信する前にPDSを確認してください')
		return { uri: calendar.uri, cid: calendar.cid, documentUri, documentCid: document.cid }
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
			// applyWrites only supports repository-wide CAS. Read the commit before both sources.
			const commit = await client.call(getLatestCommit, { did }, readOptions)
			const { body } = await client.getRecord(calendarCollection, rkey, { ...readOptions, repo: did })
			if (body.uri !== uri || !body.cid)
				throw new DataError('invalid-record', '取得したカレンダーURIまたはCIDが正しくありません')
			const record = calendarRecord.parse(body.value)
			const document = await readDocument(uri, rkey, readOptions)
			return Object.freeze({
				uri: body.uri,
				cid: body.cid,
				record: Object.freeze(record),
				[sourceSnapshot]: true as const,
				[calendarSource]: Object.freeze({ commit: commit.cid, document }),
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
			const rkey = TID.nextStr()
			const uri = `at://${did}/${calendarCollection}/${rkey}` as const
			const document = documentForCalendar(uri, record)
			const { body } = await client.applyWrites(
				(op) => [op.create(calendarRecord, record, { rkey }), op.create(documentRecord, document, { rkey })],
				{ ...readOptions, repo: did },
			)
			return calendarWriteResult(body, uri, rkey)
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
			const source = snapshot[calendarSource]
			if (!source) throw new DataError('invalid-record', '編集前にPDSから現在のカレンダーを取得してください')
			const document = documentForCalendar(snapshot.uri, record, source.document?.record, now().toISOString())
			return handleConflict(async () => {
				const { body } = await client.applyWrites(
					(op) => [
						op.update(calendarRecord, record, { rkey }),
						source.document
							? op.update(documentRecord, document, { rkey })
							: op.create(documentRecord, document, { rkey }),
					],
					{ ...readOptions, repo: did, swapCommit: source.commit },
				)
				return calendarWriteResult(body, snapshot.uri, rkey)
			})
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
