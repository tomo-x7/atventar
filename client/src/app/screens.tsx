import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth'
import {
	AccountPanel,
	CalendarCollection,
	CalendarDetail,
	CalendarForm,
	type CalendarFormValue,
	ContentLayout,
	EntryForm,
	type EntryFormValue,
	PageMessage,
	ParticipationDetail,
	ProjectShare,
	RemoteCalendarDirectory,
	UserCalendarPage,
} from '../components'
import type { ProfileTab } from '../components/calendar-directory/CalendarDirectory'
import { IndexingResult } from '../components/calendar-forms/IndexingResult'
import { config } from '../config'
import {
	createRepositoryClient,
	DataError,
	profileName,
	toArticleSummary,
	toCalendarEntry,
	toCalendarFormValue,
	toCalendarSheets,
	toCalendarSummary,
	toEntryFormValue,
} from '../data'
import { calendarDocumentUri, calendarUri, entryUri, paths } from './paths'
import { go } from './router'
import {
	api,
	isNotFound,
	message,
	queryClient,
	repositoryForWrite,
	type SavedWrite,
	useCalendar,
	useEntry,
	useIndexing,
	useServerInfo,
} from './services'

type Search = { year?: number; q?: string; day?: number; returnTo?: string; tab?: ProfileTab }
function useRouteSearch() {
	return useSearch({ strict: false }) as Search
}
function useRecordUri(kind: 'calendar' | 'entry') {
	const { did, rkey } = useParams({ strict: false }) as { did: string; rkey: string }
	return kind === 'calendar' ? calendarUri(did, rkey) : entryUri(did, rkey)
}
function errorView(error: unknown, retry: () => void) {
	return (
		<PageMessage
			title={isNotFound(error) ? '見つかりませんでした' : message(error)}
			onRetry={isNotFound(error) ? undefined : retry}
		>
			<a href="/">カレンダー一覧へ</a>
		</PageMessage>
	)
}
function useProfileLinks() {
	const { session } = useAuth()
	return { viewerDid: session?.sub, getProfileHref: paths.profile }
}
function useRefreshAfterIndexing(saved: SavedWrite | null, complete: boolean | undefined) {
	useEffect(() => {
		if (saved && complete)
			void queryClient.invalidateQueries({
				predicate: (query) => query.queryKey[0] !== 'indexing' && !String(query.queryKey[0]).startsWith('raw-'),
			})
	}, [saved, complete])
}

export function RequireSession({ children }: { children: ReactNode }) {
	const auth = useAuth()
	const location = useLocation()
	const returnTo = useRef(location.href)
	const navigate = useNavigate()
	useEffect(() => {
		if (auth.status === 'anonymous' && location.href === returnTo.current) {
			void navigate({ to: '/login', search: { returnTo: returnTo.current }, replace: true })
		}
	}, [auth.status, location.href, navigate])
	if (!auth.session) return <PageMessage title="ログイン状態を確認中…" />
	return children
}

export function CallbackPage() {
	return <PageMessage title="ログイン処理中…" />
}

export function LoginPage() {
	const auth = useAuth()
	const { returnTo = '/' } = useRouteSearch()
	const [busy, setBusy] = useState(false)
	if (auth.status === 'loading') return <PageMessage title="ログイン状態を確認中…" />
	if (auth.session)
		return (
			<PageMessage title="ログイン済みです">
				<a href="/">カレンダー一覧へ</a>
			</PageMessage>
		)
	async function login(handle?: string) {
		setBusy(true)
		try {
			if (handle) await auth.login(handle, returnTo)
			else await auth.loginWithAtPassport(returnTo)
		} catch {
			/* AuthProvider supplies the user-visible error. */
		} finally {
			setBusy(false)
		}
	}
	return (
		<ContentLayout>
			<AccountPanel
				onSignIn={(handle) => {
					void login(handle)
				}}
				onAtPassport={() => {
					void login()
				}}
				isSubmitting={busy}
				error={auth.error ?? undefined}
			/>
		</ContentLayout>
	)
}

export function DirectoryPage() {
	const search = useRouteSearch()
	const location = useLocation()
	const server = useServerInfo()
	const year =
		search.year ?? (server.data ? server.data.currentYear - (location.pathname === '/archive' ? 1 : 0) : undefined)
	const [query, setQuery] = useState(search.q ?? '')
	useEffect(() => setQuery(search.q ?? ''), [search.q])
	const calendars = useInfiniteQuery({
		queryKey: ['calendars', year, search.q],
		enabled: year !== undefined,
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam, signal }) =>
			search.q
				? api.searchCalendars({ q: search.q, year, cursor: pageParam, limit: 30 }, { signal })
				: api.listCalendars({ year, cursor: pageParam, limit: 30 }, { signal }),
		getNextPageParam: (page) => page.cursor,
	})
	if (server.isError)
		return errorView(server.error, () => {
			void server.refetch()
		})
	if (year === undefined) return <PageMessage title="読み込み中…" />
	const base = location.pathname === '/archive' ? '/archive' : '/'
	const update = (nextYear: number) =>
		go(`${base}?year=${nextYear}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''}`)
	return (
		<RemoteCalendarDirectory
			query={query}
			onQueryChange={setQuery}
			year={year}
			years={Array.from({ length: 15 }, (_, index) => (server.data?.currentYear ?? year) - index).filter(
				(value) => value > 0,
			)}
			onYearChange={update}
			onSearch={() => update(year)}
			calendars={calendars.data?.pages.flatMap((page) => page.calendars.map((item) => toCalendarSummary(item))) ?? []}
			hasMore={Boolean(calendars.hasNextPage)}
			onLoadMore={() => {
				void (calendars.isError ? calendars.refetch() : calendars.fetchNextPage())
			}}
			isLoading={calendars.isFetching}
			error={calendars.isError ? message(calendars.error) : undefined}
			onCreate={() => go('/calendars/new')}
			onCalendarSelect={(item) => go(paths.calendar(item.id))}
		/>
	)
}

export function CalendarPage() {
	const uri = useRecordUri('calendar')
	const params = useParams({ strict: false }) as { number?: string }
	useEffect(() => {
		if (params.number !== undefined) return
		const link = document.createElement('link')
		link.rel = 'site.standard.document'
		link.href = calendarDocumentUri(uri)
		document.head.append(link)
		return () => link.remove()
	}, [uri, params.number])
	const calendar = useCalendar(uri)
	const links = useProfileLinks()
	if (calendar.isPending) return <PageMessage title="読み込み中…" />
	if (calendar.isError)
		return errorView(calendar.error, () => {
			void calendar.refetch()
		})
	const { calendar: item, entries } = calendar.data
	const sheets = toCalendarSheets(item, entries, links)
	const common = {
		title: item.record.title,
		year: item.record.year,
		description: item.record.description ?? '',
		organizer: profileName(item.author),
		organizerHref: paths.profile(item.author.did),
		sheets,
		projectHref: paths.calendar(uri),
		getCalendarHref: (number: number) => paths.sheet(uri, number),
		getJoinHref: (day?: number) => paths.join(uri, day),
		shareHref: paths.share(uri),
		getEntryHref: paths.entry,
		onJoin: (day?: number) => go(paths.join(uri, day)),
		onShare: () => go(paths.share(uri)),
		onCalendarSelect: (number: number) => go(paths.sheet(uri, number)),
		onEdit: links.viewerDid === item.author.did ? () => go(paths.editCalendar(uri)) : undefined,
		onEditEntry: (entry: { uri: string }) => go(paths.editEntry(entry.uri)),
	}
	return params.number === undefined ? (
		<CalendarCollection {...common} />
	) : (
		<CalendarDetail {...common} currentNumber={Number(params.number)} />
	)
}

export function EntryPage() {
	const uri = useRecordUri('entry')
	const entry = useEntry(uri)
	const links = useProfileLinks()
	if (entry.isPending) return <PageMessage title="読み込み中…" />
	if (entry.isError)
		return errorView(entry.error, () => {
			void entry.refetch()
		})
	const item = entry.data
	return (
		<ParticipationDetail
			projectTitle={item.calendar.record.title}
			year={item.calendar.record.year}
			projectHref={paths.calendar(item.calendar.uri)}
			entry={toCalendarEntry(item, links)}
			placement={{ calendarNumber: item.sheet, href: paths.sheet(item.calendar.uri, item.sheet) }}
			shareHref={paths.shareEntry(uri)}
			onShare={() => go(paths.shareEntry(uri))}
			onEditEntry={() => go(paths.editEntry(uri))}
		/>
	)
}

export function SharePage() {
	const location = useLocation()
	const kind = location.pathname.startsWith('/entries/') ? 'entry' : 'calendar'
	const uri = useRecordUri(kind)
	const entry = useQuery({
		queryKey: ['entry', uri],
		queryFn: ({ signal }) => api.findEntry(uri, { signal }),
		enabled: kind === 'entry',
	})
	const calendar = useQuery({
		queryKey: ['calendar', uri],
		queryFn: ({ signal }) => api.getCalendar(uri, { signal }),
		enabled: kind === 'calendar',
	})
	const query = kind === 'entry' ? entry : calendar
	if (query.isPending) return <PageMessage title="読み込み中…" />
	if (query.isError)
		return errorView(query.error, () => {
			void query.refetch()
		})
	const item = kind === 'entry' ? entry.data?.calendar : calendar.data?.calendar
	if (!item) return <PageMessage title="見つかりませんでした" />
	return (
		<ContentLayout>
			<ProjectShare
				projectName={item.record.title}
				year={item.record.year}
				projectHref={new URL(paths.calendar(item.uri), config.appOrigin).href}
				isParticipant={kind === 'entry'}
				day={entry.data?.day}
				recordHref={kind === 'entry' ? new URL(paths.entry(uri), config.appOrigin).href : undefined}
				onShare={
					navigator.share
						? async ({ text, url }) => {
								await navigator.share({ title: item.record.title, text, url })
							}
						: undefined
				}
			/>
		</ContentLayout>
	)
}

export function ProfilePage() {
	const { actor } = useParams({ strict: false }) as { actor: string }
	const search = useRouteSearch()
	const tab = search.tab ?? 'joined'
	const profile = useQuery({ queryKey: ['profile', actor], queryFn: ({ signal }) => api.getProfile(actor, { signal }) })
	const entries = useInfiniteQuery({
		queryKey: ['actor-entries', actor],
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam, signal }) => api.getActorEntries({ actor, cursor: pageParam, limit: 30 }, { signal }),
		getNextPageParam: (page) => page.cursor,
	})
	const hosted = useInfiniteQuery({
		queryKey: ['actor-calendars', actor],
		initialPageParam: undefined as string | undefined,
		queryFn: ({ pageParam, signal }) => api.listCalendars({ author: actor, cursor: pageParam, limit: 30 }, { signal }),
		getNextPageParam: (page) => page.cursor,
	})
	if (profile.isPending) return <PageMessage title="読み込み中…" />
	if (profile.isError)
		return errorView(profile.error, () => {
			void profile.refetch()
		})
	const items = entries.data?.pages.flatMap((page) => page.entries) ?? []
	const joined = [...new Map(items.map((entry) => [entry.calendar.uri, entry.calendar])).values()].map((item) =>
		toCalendarSummary(item),
	)
	const active = tab === 'hosted' ? hosted : entries
	return (
		<UserCalendarPage
			name={profileName(profile.data)}
			avatarUrl={profile.data.avatar}
			joined={joined}
			hosted={hosted.data?.pages.flatMap((page) => page.calendars.map((item) => toCalendarSummary(item))) ?? []}
			articles={items.flatMap((item) => {
				const article = toArticleSummary(item)
				return article ? [article] : []
			})}
			tab={tab}
			onTabChange={(next) => go(`${paths.profile(actor)}?tab=${next}`)}
			hasMore={Boolean(active.hasNextPage)}
			isLoading={active.isFetching}
			error={active.isError ? message(active.error) : undefined}
			onLoadMore={() => {
				void (active.isError ? active.refetch() : active.fetchNextPage())
			}}
			onCalendarSelect={(item) => go(paths.calendar(item.id))}
		/>
	)
}

export function CalendarEditorPage({ mode }: { mode: 'create' | 'edit' }) {
	const params = useParams({ strict: false }) as { did?: string; rkey?: string }
	const uri = mode === 'edit' ? calendarUri(params.did ?? '', params.rkey ?? '') : ''
	const { session } = useAuth()
	const server = useServerInfo()
	const repository = useMemo(() => (session ? createRepositoryClient(session, api) : null), [session])
	const [saved, setSaved] = useState<SavedWrite | null>(null)
	const [conflict, setConflict] = useState(false)
	const source = useQuery({
		queryKey: ['raw-calendar', session?.sub, uri],
		enabled: mode === 'edit' && repository !== null && saved === null,
		staleTime: 0,
		refetchOnWindowFocus: false,
		queryFn: ({ signal }) => {
			if (!repository) throw new Error('ログインしてください')
			return repository.readCalendarForEdit(uri, { signal })
		},
	})
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string>()
	const [savedName, setSavedName] = useState('')
	const indexed = useIndexing(saved)
	useRefreshAfterIndexing(saved, indexed.data)
	if (saved)
		return (
			<ContentLayout>
				<IndexingResult
					title={mode === 'create' ? 'カレンダーを作成' : 'カレンダーを編集'}
					projectName={savedName}
					pending={!indexed.data}
					recordHref={paths.calendar(saved.uri)}
					onCheck={() => {
						void indexed.refetch()
					}}
					isChecking={indexed.isFetching}
					error={indexed.isError ? message(indexed.error) : undefined}
					onShare={() => go(paths.share(saved.uri))}
				/>
			</ContentLayout>
		)
	if (server.isPending || (mode === 'edit' && (source.isPending || source.isFetching)))
		return <PageMessage title="読み込み中…" />
	if (server.isError)
		return errorView(server.error, () => {
			void server.refetch()
		})
	if (!saved && mode === 'edit' && source.isError)
		return errorView(source.error, () => {
			void source.refetch()
		})
	async function submit(value: CalendarFormValue) {
		if (!session || saving) return
		setSaving(true)
		setError(undefined)
		setConflict(false)
		try {
			const clock = await api.getServerInfo()
			if (mode === 'create' && value.year !== clock.currentYear)
				throw new DataError('invalid-input', '開催年が変わりました。再読み込みしてください')
			const client = await repositoryForWrite(session, clock.serverTime)
			const result =
				mode === 'edit' && source.data
					? await client.updateCalendar(source.data, value)
					: await client.createCalendar({ ...value, year: clock.currentYear })
			setSavedName(value.title)
			setSaved({ ...result, kind: 'calendar', started: performance.now() })
		} catch (cause) {
			setError(message(cause))
			setConflict(cause instanceof DataError && cause.code === 'conflict')
		} finally {
			setSaving(false)
		}
	}
	const shared = {
		currentYear: server.data.currentYear,
		isSubmitting: saving,
		error,
		onReload: conflict
			? () => {
					setError(undefined)
					setConflict(false)
					void source.refetch()
				}
			: undefined,
		onSave: (value: CalendarFormValue) => {
			void submit(value)
		},
		onCancel: () => go(mode === 'edit' ? paths.calendar(uri) : '/'),
	}
	return (
		<ContentLayout>
			{mode === 'edit' && source.data ? (
				<CalendarForm key={source.data.cid} {...shared} mode="edit" initialValue={toCalendarFormValue(source.data)} />
			) : (
				<CalendarForm {...shared} />
			)}
		</ContentLayout>
	)
}

export function EntryEditorPage({ mode }: { mode: 'join' | 'edit' }) {
	const uri = useRecordUri(mode === 'join' ? 'calendar' : 'entry')
	const search = useRouteSearch()
	const { session } = useAuth()
	const repository = useMemo(() => (session ? createRepositoryClient(session, api) : null), [session])
	const [saved, setSaved] = useState<SavedWrite | null>(null)
	const [conflict, setConflict] = useState(false)
	const source = useQuery({
		queryKey: ['raw-entry', session?.sub, uri],
		enabled: mode === 'edit' && repository !== null && saved === null,
		staleTime: 0,
		refetchOnWindowFocus: false,
		queryFn: ({ signal }) => {
			if (!repository) throw new Error('ログインしてください')
			return repository.readEntryForEdit(uri, { signal })
		},
	})
	const parentUri = mode === 'join' ? uri : source.data?.record.calendar.uri
	const parent = useQuery({
		queryKey: ['calendar', parentUri],
		enabled: Boolean(parentUri),
		queryFn: ({ signal }) => api.getCalendar(parentUri ?? '', { signal }),
	})
	const ownProfile = useQuery({
		queryKey: ['profile', session?.sub],
		enabled: Boolean(session),
		queryFn: ({ signal }) => api.getProfile(session?.sub ?? '', { signal }),
	})
	const [saving, setSaving] = useState<'save' | 'delete' | null>(null)
	const [error, setError] = useState<{ action: 'save' | 'delete'; text: string }>()
	const indexed = useIndexing(saved)
	useRefreshAfterIndexing(saved, indexed.data)
	if (!saved && mode === 'edit' && source.isError)
		return errorView(source.error, () => {
			void source.refetch()
		})
	if (!saved && (parent.isPending || (mode === 'edit' && (source.isPending || source.isFetching))))
		return <PageMessage title="読み込み中…" />
	if (!saved && parent.isError)
		return errorView(parent.error, () => {
			void parent.refetch()
		})
	async function submit(value?: EntryFormValue) {
		if (!session || saving || !parentUri) return
		const action = value ? 'save' : 'delete'
		setSaving(action)
		setError(undefined)
		setConflict(false)
		try {
			const client = await repositoryForWrite(session)
			if (value) {
				const result =
					mode === 'edit' && source.data
						? await client.updateEntry(source.data, value)
						: await client.createEntry(parentUri, value)
				setSaved({ ...result, kind: 'entry', started: performance.now() })
			} else if (source.data) {
				await client.withdrawEntry(source.data)
				setSaved({ uri, kind: 'entry', deleted: true, started: performance.now() })
			}
		} catch (cause) {
			setError({ action, text: message(cause) })
			setConflict(cause instanceof DataError && cause.code === 'conflict')
		} finally {
			setSaving(null)
		}
	}
	const state = (action: 'save' | 'delete') =>
		saving === action
			? ('submitting' as const)
			: error?.action === action
				? ('error' as const)
				: saved && Boolean(saved.deleted) === (action === 'delete')
					? indexed.data
						? ('complete' as const)
						: ('awaiting-index' as const)
					: ('idle' as const)
	return (
		<ContentLayout>
			<EntryForm
				key={mode === 'join' ? `${uri}:${search.day ?? 1}` : (source.data?.cid ?? uri)}
				mode={mode}
				calendarTitle={parent.data?.calendar.record.title ?? ''}
				day={mode === 'join' ? search.day : source.data?.record.day}
				participant={ownProfile.data ? profileName(ownProfile.data) : (session?.sub ?? '')}
				initialValue={source.data ? toEntryFormValue(source.data) : undefined}
				onSave={(value) => {
					void submit(value)
				}}
				onWithdraw={
					mode === 'edit'
						? () => {
								void submit()
							}
						: undefined
				}
				onCancel={() => go(paths.calendar(parentUri ?? ''))}
				recordHref={saved && !saved.deleted ? paths.entry(saved.uri) : undefined}
				onShare={saved && !saved.deleted ? () => go(paths.shareEntry(saved.uri)) : undefined}
				submissionState={state('save')}
				withdrawalState={state('delete')}
				error={error?.action === 'save' ? error.text : saved && indexed.isError ? message(indexed.error) : undefined}
				withdrawalError={
					error?.action === 'delete'
						? error.text
						: saved?.deleted && indexed.isError
							? message(indexed.error)
							: undefined
				}
				onReload={
					conflict
						? () => {
								setError(undefined)
								setConflict(false)
								void source.refetch()
							}
						: undefined
				}
				onCheckIndex={() => {
					void indexed.refetch()
				}}
				isCheckingIndex={indexed.isFetching}
			/>
		</ContentLayout>
	)
}
