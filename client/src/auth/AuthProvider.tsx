import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { consumePassportCallback, passportRedirect } from './atpassport'
import { ATPASSPORT_CALLBACK_PATH, createPassport, getOAuthClient, OAUTH_CALLBACK_PATH, OAUTH_SCOPE } from './client'
import { consumePendingLogin, localReturnTo, normalizeHandle, savePendingLogin } from './security'

type AuthStatus = 'loading' | 'anonymous' | 'authenticated'
export type AuthState = {
	session: OAuthSession | null
	status: AuthStatus
	error: string | null
	login: (handle: string, returnTo?: string) => Promise<void>
	loginWithAtPassport: (returnTo?: string) => Promise<void>
	logout: () => Promise<void>
}
const AuthContext = createContext<AuthState | null>(null)

function replaceLocation(path: string): void {
	window.history.replaceState(null, '', localReturnTo(path, window.location.origin))
	window.dispatchEvent(new PopStateEvent('popstate'))
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'ログイン処理に失敗しました。もう一度お試しください。'
}

async function startOAuth(handle: string, returnTo: string): Promise<void> {
	const normalized = normalizeHandle(handle)
	const client = await getOAuthClient()
	const state = crypto.randomUUID()
	savePendingLogin(sessionStorage, 'oauth', state, window.location.origin, returnTo)
	await client.signInRedirect(normalized, { state, scope: OAUTH_SCOPE })
}

// React StrictMode must not exchange one authorization code twice.
let initialization: Promise<OAuthSession | null> | undefined
function initialize(): Promise<OAuthSession | null> {
	initialization ??= (async () => {
		const url = new URL(window.location.href)
		if (url.pathname === ATPASSPORT_CALLBACK_PATH) {
			try {
				const hint = consumePassportCallback(createPassport(), sessionStorage, url, window.location.origin)
				replaceLocation(hint.returnTo)
				await startOAuth(hint.handle, hint.returnTo)
				return null
			} catch (error) {
				replaceLocation('/')
				throw error
			}
		}
		if (url.pathname === OAUTH_CALLBACK_PATH) {
			try {
				const client = await getOAuthClient()
				const params = client.readCallbackParams()
				if (!params) throw new Error('ログインの応答が見つかりません。もう一度ログインしてください。')
				const result = await client.initCallback(params)
				try {
					const pending = consumePendingLogin(sessionStorage, 'oauth', result.state, window.location.origin)
					replaceLocation(pending.returnTo)
					return result.session
				} catch (error) {
					await client.revoke(result.session.sub).catch(() => undefined)
					throw error
				}
			} catch (error) {
				replaceLocation('/')
				throw error
			}
		}
		const client = await getOAuthClient()
		const restored = (await client.initRestore())?.session ?? null
		if (restored && !(await restored.getTokenInfo(false)).scope.split(' ').includes('repo:site.standard.document'))
			throw new Error('カレンダーの保存権限が追加されました。もう一度ログインしてください。')
		return restored
	})()
	return initialization
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<OAuthSession | null>(null)
	const [status, setStatus] = useState<AuthStatus>('loading')
	const [error, setError] = useState<string | null>(null)
	const signingOut = useRef(false)

	useEffect(() => {
		let active = true
		void initialize().then(
			(restored) => {
				if (!active) return
				setSession(restored)
				setStatus(restored ? 'authenticated' : 'anonymous')
			},
			(cause: unknown) => {
				if (!active) return
				setError(errorMessage(cause))
				setStatus('anonymous')
			},
		)
		return () => {
			active = false
		}
	}, [])

	useEffect(() => {
		const onDeleted = (event: Event) => {
			if (!signingOut.current && event instanceof CustomEvent && event.detail === session?.sub) {
				initialization = Promise.resolve(null)
				setSession(null)
				setStatus('anonymous')
				setError('セッションの有効期限が切れました。もう一度ログインしてください。')
			}
		}
		window.addEventListener('atventar:session-deleted', onDeleted)
		return () => window.removeEventListener('atventar:session-deleted', onDeleted)
	}, [session])

	async function login(handle: string, returnTo = '/') {
		setError(null)
		try {
			await startOAuth(handle, returnTo)
		} catch (cause) {
			setError(errorMessage(cause))
			throw cause
		}
	}

	async function loginWithAtPassport(returnTo = '/') {
		setError(null)
		try {
			const passport = createPassport()
			// Invoke from the click before any await, preserving FedCM user activation.
			const result = await passport.requestHandleAssist({
				fallback: () => {
					window.location.assign(passportRedirect(passport, sessionStorage, window.location.origin, returnTo))
					return null
				},
			})
			if (result) await startOAuth(result.username, returnTo)
		} catch (cause) {
			setError(errorMessage(cause))
			throw cause
		}
	}

	async function logout() {
		setError(null)
		signingOut.current = true
		try {
			if (session) await (await getOAuthClient()).revoke(session.sub)
		} catch {
			setError('ログアウト処理に失敗しました。再読み込み後に状態を確認してください。')
		} finally {
			setSession(null)
			setStatus('anonymous')
			initialization = Promise.resolve(null)
			signingOut.current = false
		}
	}

	return <AuthContext value={{ session, status, error, login, loginWithAtPassport, logout }}>{children}</AuthContext>
}

export function useAuth(): AuthState {
	const context = useContext(AuthContext)
	if (!context) throw new Error('useAuth must be used within AuthProvider')
	return context
}
