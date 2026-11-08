import { XrpcResponseError } from '@atproto/lex'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { config } from '../config'
import type { RepositorySession } from '../data'
import { createAppViewClient, createRepositoryClient, DataError } from '../data'

export const api = createAppViewClient(config.appViewUrl)
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

export function message(error: unknown) {
	return error instanceof DataError ? error.message : '通信に失敗しました。もう一度お試しください。'
}
export function isNotFound(error: unknown) {
	return (
		(error instanceof DataError && error.code === 'not-found') ||
		(error instanceof XrpcResponseError && (error.status === 404 || error.error === 'CalendarNotFound'))
	)
}
export function useServerInfo() {
	return useQuery({
		queryKey: ['server-info'],
		queryFn: ({ signal }) => api.getServerInfo({ signal }),
		staleTime: 60_000,
	})
}
export function useCalendar(uri: string) {
	return useQuery({ queryKey: ['calendar', uri], queryFn: ({ signal }) => api.getCalendar(uri, { signal }) })
}
export function useEntry(uri: string) {
	return useQuery({ queryKey: ['entry', uri], queryFn: ({ signal }) => api.findEntry(uri, { signal }) })
}

export async function repositoryForWrite(session: RepositorySession, trustedServerTime?: string) {
	const serverTime = trustedServerTime ?? (await api.getServerInfo()).serverTime
	return createRepositoryClient(session, api, { now: () => new Date(serverTime) })
}

export type SavedWrite = { uri: string; cid?: string; kind: 'calendar' | 'entry'; deleted?: boolean; started: number }

export function useIndexing(saved: SavedWrite | null) {
	return useQuery({
		queryKey: ['indexing', saved?.uri, saved?.cid, saved?.deleted, saved?.started],
		enabled: saved !== null,
		retry: false,
		staleTime: 0,
		queryFn: async ({ signal }) => {
			if (!saved) return false
			try {
				const record =
					saved.kind === 'calendar'
						? (await api.getCalendar(saved.uri, { signal })).calendar
						: await api.findEntry(saved.uri, { signal })
				return !saved.deleted && record.cid === saved.cid
			} catch (error) {
				if (isNotFound(error)) return Boolean(saved.deleted)
				throw error
			}
		},
		refetchInterval: (query) =>
			!saved || query.state.data === true || performance.now() - saved.started > 120_000 ? false : 2000,
	})
}
