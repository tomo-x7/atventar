import { useQuery } from '@tanstack/react-query'
import {
	createRootRouteWithContext,
	createRoute,
	createRouter,
	type ErrorComponentProps,
	Outlet,
	useLocation,
} from '@tanstack/react-router'
import type { AuthState } from '../auth'
import { useAuth } from '../auth'
import { PageMessage, ServiceHelp, ServiceShell } from '../components'
import { profileName } from '../data'
import { paths } from './paths'
import {
	CalendarEditorPage,
	CalendarPage,
	CallbackPage,
	DirectoryPage,
	EntryEditorPage,
	EntryPage,
	LoginPage,
	ProfilePage,
	RequireSession,
	SharePage,
} from './screens'
import { api, message, queryClient } from './services'

function RootLayout() {
	const auth = useAuth()
	const location = useLocation()
	const ownProfile = useQuery({
		queryKey: ['profile', auth.session?.sub],
		enabled: Boolean(auth.session),
		queryFn: ({ signal }) => api.getProfile(auth.session?.sub ?? '', { signal }),
	})
	const active = location.pathname.startsWith('/archive')
		? 'archive'
		: location.pathname === '/help'
			? 'help'
			: location.pathname.startsWith('/users')
				? 'profile'
				: location.pathname === '/login'
					? 'login'
					: 'calendars'
	return (
		<ServiceShell
			user={auth.session ? (ownProfile.data ? profileName(ownProfile.data) : auth.session.sub) : undefined}
			active={active}
			onNavigate={(destination) => {
				go(
					destination === 'profile' && auth.session
						? paths.profile(auth.session.sub)
						: { calendars: '/', archive: '/archive', help: '/help', login: '/login', profile: '/login' }[destination],
				)
			}}
			onSignOut={() => {
				void auth.logout().then(() => {
					queryClient.clear()
					go('/')
				})
			}}
		>
			{auth.error && location.pathname !== '/login' && <PageMessage title={auth.error} onRetry={() => go('/login')} />}
			<Outlet />
		</ServiceShell>
	)
}

function RouteError({ error, reset }: ErrorComponentProps) {
	return <PageMessage title={message(error)} onRetry={reset} />
}
const root = createRootRouteWithContext<{ auth: AuthState }>()({
	component: RootLayout,
	errorComponent: RouteError,
	notFoundComponent: () => (
		<PageMessage title="ページが見つかりません">
			<a href="/">カレンダー一覧へ</a>
		</PageMessage>
	),
})

type Search = { year?: number; q?: string; day?: number; returnTo?: string; tab?: 'joined' | 'hosted' | 'articles' }
export function validateSearch(raw: Record<string, unknown>): Search {
	const year = Number(raw.year)
	const day = Number(raw.day)
	return {
		...(Number.isInteger(year) && year >= 1 && year <= 9999 ? { year } : {}),
		...(Number.isInteger(day) && day >= 1 && day <= 25 ? { day } : {}),
		...(typeof raw.q === 'string' && raw.q.trim() ? { q: raw.q.trim().slice(0, 1000) } : {}),
		...(typeof raw.returnTo === 'string' ? { returnTo: raw.returnTo } : {}),
		...(raw.tab === 'joined' || raw.tab === 'hosted' || raw.tab === 'articles' ? { tab: raw.tab } : {}),
	}
}

const routes = [
	createRoute({ getParentRoute: () => root, path: '/', validateSearch, component: DirectoryPage }),
	createRoute({ getParentRoute: () => root, path: '/archive', validateSearch, component: DirectoryPage }),
	createRoute({ getParentRoute: () => root, path: '/help', component: ServiceHelp }),
	createRoute({ getParentRoute: () => root, path: '/login', validateSearch, component: LoginPage }),
	createRoute({ getParentRoute: () => root, path: '/auth/callback', component: CallbackPage }),
	createRoute({ getParentRoute: () => root, path: '/auth/atpassport/callback', component: CallbackPage }),
	createRoute({
		getParentRoute: () => root,
		path: '/calendars/new',
		component: () => (
			<RequireSession>
				<CalendarEditorPage mode="create" />
			</RequireSession>
		),
	}),
	createRoute({ getParentRoute: () => root, path: '/calendars/$did/$rkey', component: CalendarPage }),
	createRoute({ getParentRoute: () => root, path: '/calendars/$did/$rkey/sheets/$number', component: CalendarPage }),
	createRoute({
		getParentRoute: () => root,
		path: '/calendars/$did/$rkey/join',
		remountDeps: ({ params, search }) => [params.did, params.rkey, search.day],
		validateSearch,
		component: () => (
			<RequireSession>
				<EntryEditorPage mode="join" />
			</RequireSession>
		),
	}),
	createRoute({
		getParentRoute: () => root,
		path: '/calendars/$did/$rkey/edit',
		remountDeps: ({ params }) => [params.did, params.rkey],
		component: () => (
			<RequireSession>
				<CalendarEditorPage mode="edit" />
			</RequireSession>
		),
	}),
	createRoute({ getParentRoute: () => root, path: '/calendars/$did/$rkey/share', component: SharePage }),
	createRoute({ getParentRoute: () => root, path: '/entries/$did/$rkey', component: EntryPage }),
	createRoute({
		getParentRoute: () => root,
		path: '/entries/$did/$rkey/edit',
		remountDeps: ({ params }) => [params.did, params.rkey],
		component: () => (
			<RequireSession>
				<EntryEditorPage mode="edit" />
			</RequireSession>
		),
	}),
	createRoute({ getParentRoute: () => root, path: '/entries/$did/$rkey/share', component: SharePage }),
	createRoute({ getParentRoute: () => root, path: '/users/$actor', validateSearch, component: ProfilePage }),
]

export const router = createRouter({
	routeTree: root.addChildren(routes),
	context: { auth: undefined as unknown as AuthState },
	defaultPendingComponent: () => <PageMessage title="読み込み中…" />,
	scrollRestoration: true,
})
export function go(href: string) {
	router.history.push(href)
}

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
