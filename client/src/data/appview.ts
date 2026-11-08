import { Client, l } from '@atproto/lex'
import getActorEntries, {
	$params as actorEntriesParams,
	type $Params as GeneratedActorEntriesParams,
} from '../lexicons/win/tomo-x/atventar/getActorEntries'
import getCalendar from '../lexicons/win/tomo-x/atventar/getCalendar'
import getProfile from '../lexicons/win/tomo-x/atventar/getProfile'
import listCalendars, {
	type $Params as GeneratedListCalendarsParams,
	$params as listCalendarsParams,
} from '../lexicons/win/tomo-x/atventar/listCalendars'
import searchCalendars, {
	type $Params as GeneratedSearchCalendarsParams,
	$params as searchCalendarsParams,
} from '../lexicons/win/tomo-x/atventar/searchCalendars'
import { DataError } from './errors'
import { entryCollection, parseRecordUri, validateYear } from './validation'

export type ListCalendarsParams = Omit<GeneratedListCalendarsParams, 'limit' | 'author'> & {
	limit?: number
	author?: string
}
export type SearchCalendarsParams = Omit<GeneratedSearchCalendarsParams, 'limit' | 'author'> & {
	limit?: number
	author?: string
}
export type ActorEntriesParams = Omit<GeneratedActorEntriesParams, 'limit' | 'actor'> & {
	limit?: number
	actor: string
}

export interface ServerInfo {
	currentYear: number
	serverTime: string
}

export type ReadOptions = { signal?: AbortSignal }

export function createAppViewClient(serviceUrl: string, fetcher: typeof fetch = globalThis.fetch) {
	const client = new Client({ service: serviceUrl, fetch: fetcher })
	const api = {
		listCalendars(params: ListCalendarsParams = {}, options: ReadOptions = {}) {
			return client.call(listCalendars, listCalendarsParams.parse(params), options)
		},
		searchCalendars(params: SearchCalendarsParams, options: ReadOptions = {}) {
			return client.call(searchCalendars, searchCalendarsParams.parse({ ...params, q: params.q.trim() }), options)
		},
		getCalendar(uri: string, options: ReadOptions = {}) {
			return client.call(getCalendar, { uri: l.string({ format: 'at-uri' }).parse(uri) }, options)
		},
		getProfile(actor: string, options: ReadOptions = {}) {
			return client.call(getProfile, { actor: l.string({ format: 'at-identifier' }).parse(actor) }, options)
		},
		getActorEntries(params: ActorEntriesParams, options: ReadOptions = {}) {
			return client.call(getActorEntries, actorEntriesParams.parse(params), options)
		},
		async getServerInfo(options: ReadOptions = {}): Promise<ServerInfo> {
			const response = await fetcher(new URL('/health', serviceUrl), { signal: options.signal })
			if (!response.ok) throw new Error(`サーバー情報を取得できませんでした (${response.status})`)
			const value: unknown = await response.json()
			if (
				!value ||
				typeof value !== 'object' ||
				!('currentYear' in value) ||
				!('serverTime' in value) ||
				typeof value.currentYear !== 'number' ||
				typeof value.serverTime !== 'string' ||
				!Number.isFinite(Date.parse(value.serverTime))
			)
				throw new DataError('invalid-record', 'サーバー情報が正しくありません')
			l.string({ format: 'datetime' }).parse(value.serverTime)
			validateYear(value.currentYear)
			const jstYear = new Date(Date.parse(value.serverTime) + 9 * 60 * 60 * 1000).getUTCFullYear()
			if (jstYear !== value.currentYear) throw new DataError('invalid-record', 'サーバーの年と時刻が一致しません')
			return { currentYear: value.currentYear, serverTime: value.serverTime }
		},
		/** Resolve a stable participation URI without reading the public raw PDS record. */
		async findEntry(uri: string, options: ReadOptions = {}) {
			const { did } = parseRecordUri(uri, entryCollection)
			let cursor: string | undefined
			const visited = new Set<string>()
			do {
				options.signal?.throwIfAborted()
				const page = await api.getActorEntries({ actor: did, limit: 100, cursor }, options)
				const entry = page.entries.find((item) => item.uri === uri)
				if (entry) return entry
				cursor = page.cursor
				if (cursor && visited.has(cursor)) throw new DataError('invalid-record', 'ページング情報が正しくありません')
				if (cursor) visited.add(cursor)
			} while (cursor)
			throw new DataError('not-found', '参加登録が見つかりません')
		},
	}
	return api
}

export type AppViewClient = ReturnType<typeof createAppViewClient>
